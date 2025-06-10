import os
from pathlib import Path
from functions.binance_client import BinanceClient
from functions.log_engine import LogTrade

# ---- Path config ----
BASE_PATH = os.path.dirname(os.getcwd())

INDICATOR_CONFIG = os.path.join(BASE_PATH, "indicator_config")
RULE_SET_PATH = os.path.join(BASE_PATH, "rule_config", "rule_set.json")
USER_CONFIG = os.path.join(BASE_PATH, "user_config", "user.cfg")
LOG_FILE = Path(os.path.join(BASE_PATH, "log", "trade_log.txt"))
ORDER_FILE = Path(os.path.join(BASE_PATH, "log", "order_log.txt"))
# ตั้งค่า
log = LogTrade(log_path=LOG_FILE, order_path=ORDER_FILE)
client = BinanceClient(config_path=USER_CONFIG)

# ทดสอบ
result = client.create_order(
    side="BUY",
    size_usdt=1000,
    symbol="BTCUSDT",
    tp=15.0,
    sl=10.0
)

print(result)
print("✅ Order created:", result["orderId"])