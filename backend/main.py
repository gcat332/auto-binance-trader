from fastapi import FastAPI, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from functions.indicator import IndicatorCalculator
from functions.rule_engine import RuleEngine
from functions.binance_client import BinanceClient
from functions.log_engine import LogTrade
import uvicorn
import os, asyncio, json
from pathlib import Path

# ---- Path config ----
BASE_PATH = os.path.dirname(os.getcwd())

INDICATOR_CONFIG = os.path.join(BASE_PATH, "indicator_config")
RULE_SET_PATH = os.path.join(BASE_PATH, "rule_config", "rule_set.json")
USER_CONFIG = os.path.join(BASE_PATH, "user_config", "user.cfg")
LOG_FILE = Path(os.path.join(BASE_PATH, "log", "trade_log.txt"))
ORDER_PATH = Path(os.path.join(BASE_PATH, "log"))


auto_trade_enabled = False
ind = IndicatorCalculator(config_folder=INDICATOR_CONFIG)
sclient = BinanceClient(config_path=USER_CONFIG, override_use_futures=False)
fclient = BinanceClient(config_path=USER_CONFIG, override_use_futures=True)
logger = LogTrade(log_path=LOG_FILE,order_path=ORDER_PATH)
configs = ind.get_configs()
rule = RuleEngine(rule_path=RULE_SET_PATH, 
    sclient=sclient,
    fclient=fclient,
    logger=logger,
    ema_config=configs["ema"],
    rsi_config=configs["rsi"],
    macd_config=configs["macd"]
)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- REST API ---
@app.get("/rules")
def get_rules():
    return rule.load_rule()

@app.post("/rules")
async def post_rules(request: Request):
    data = await request.json()
    rule.save_rules(data)
    return {"ok": True}

@app.post("/auto-trade/toggle")
async def toggle_auto_trade(request: Request):
    global auto_trade_enabled
    data = await request.json()
    enable = data.get("enable")
    if isinstance(enable, bool):
        auto_trade_enabled = enable
        logger.log_trade(f"[INFO] Auto Trade {'Enabled' if auto_trade_enabled else 'Disabled'}")
        return {"enabled": auto_trade_enabled}
    else:
        logger.log_trade("[ERROR] Invalid format. Use {'enable': true|false}")
        return {"error": "Invalid format. Use {'enable': true|false}"}

@app.get("/auto-trade/status")
async def get_auto_trade_status():
    return {"enabled": auto_trade_enabled}

@app.get("/logs")
async def get_logs():
    if LOG_FILE.exists():
        with open(LOG_FILE, "r", encoding="utf-8") as f:
            lines = f.readlines()
        return [line.strip() for line in lines if line.strip()]
    return []

# --- Background Task ---

def extract_kline_data(msg):
    k = msg["k"]
    return {
        "time": k["t"],
        "open": float(k["o"]),
        "high": float(k["h"]),
        "low": float(k["l"]),
        "close": float(k["c"]),
        "volume": float(k["v"])
    }

async def zip_price_streams():
    while True:
        try:
            spot_stream = sclient.price_stream()
            future_stream = fclient.price_stream()
            while True:
                s_price = await spot_stream.__anext__()
                f_price = await future_stream.__anext__()
                yield extract_kline_data(s_price), extract_kline_data(f_price)
        except Exception as e:
            logger.log_trade(f"[ERROR] WebSocket stream disconnected: {e}. Reconnecting in 10s...")
            await asyncio.sleep(10)

async def auto_trade_loop():
    price_count = 0
    ready = False

    while True:
        try:
            async for s_price, f_price in zip_price_streams():

                if not auto_trade_enabled:
                    await asyncio.sleep(60)
                    continue

                sindicators = ind.update(s_price)
                findicators = ind.update(f_price)
                price_count += 1

                if not ready and price_count == 1:
                    logger.log_trade("[WARN] Warming up...")
                if not ready and price_count >= 15:
                    ready = True
                    logger.log_trade("[WARN] Starting trading...")

                if ready:
                    try: 
                        rule.check_create_order(sindicators, findicators)
                    except Exception as e:
                        logger.log_trade(f"[ERROR] Rule error: {e}")
                await asyncio.sleep(60)
        except Exception as e:
            logger.log_trade(f"[ERROR] Trade loop error: {e}. Restarting in 10s...")
            await asyncio.sleep(10)

async def update_orders_loop():
    while True:
        try:
            result = logger.update_all_orders_summary(sclient, fclient)
        except Exception as e:
            logger.log_trade(f"[ERROR] Background update failed: {e}")
        await asyncio.sleep(60)

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(auto_trade_loop())
    asyncio.create_task(update_orders_loop())

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
