
from datetime import datetime
import pandas as pd
import os
from pathlib import Path
from functions.indicator import IndicatorCalculator
from functions.rule_engine import RuleEngine
from functions.log_engine import LogTrade
from functions.binance_client import BinanceClient


def get_historical_ohlcv(client, symbol, interval, start_time, end_time):
    all_data = []
    start = start_time
    limit = 1000

    while start < end_time:
        klines = client.client.klines(
            symbol=symbol,
            interval=interval,
            startTime=start,
            endTime=end_time,
            limit=limit
        )
        if not klines:
            break

        all_data += klines
        last_time = klines[-1][0]
        if last_time == start:
            break  # ป้องกัน loop ติด
        start = last_time + 1

        if len(klines) < limit:
            break

    df = pd.DataFrame(all_data, columns=[
        "open_time", "open", "high", "low", "close", "volume",
        "close_time", "quote_asset_volume", "num_trades",
        "taker_base_volume", "taker_quote_volume", "ignore"
    ])
    df = df[["open_time", "open", "high", "low", "close", "volume"]]
    df = df.astype({
        "open": float, "high": float, "low": float,
        "close": float, "volume": float
    })
    df["open_time"] = pd.to_datetime(df["open_time"], unit="ms")
    return df

def run_backtest(rule: dict, start_time: str, end_time: str, cfg_path, ind_cfg_path, logger):
    start_dt = datetime.strptime(start_time, "%Y-%m-%d %H:%M")
    end_dt = datetime.strptime(end_time, "%Y-%m-%d %H:%M")

    size = float(rule.get("size_usdt", 100))
    scope = rule.get("scope", "SPOT").upper()
    symbol = rule.get("symbol", "BTCUSDT")
    side = rule.get("trigger", "BUY")
    tp = rule.get("tp", 1)
    sl = rule.get("sl", 1)

    client = BinanceClient(str(cfg_path), override_use_futures=(scope == "FUTURE"))
    indicator = IndicatorCalculator(ind_cfg_path)
    configs = indicator.get_configs()

    engine = RuleEngine("", None, None, logger,
                        ema_config=configs["ema"],
                        rsi_config=configs["rsi"],
                        macd_config=configs["macd"])

    df = get_historical_ohlcv(client, symbol, "1h",
                              int(start_dt.timestamp() * 1000),
                              int(end_dt.timestamp() * 1000))

    price_list = df[["open", "high", "low", "close", "volume"]].to_dict("records")
    time_list = df["open_time"].tolist()

    logs = []
    total_net_pnl = 0.0
    pnl = 0.0
    wins = 0
    losses = 0
    holding = None

    for i in range(len(price_list)):
        price_data = price_list[i]
        ind_data = indicator.update(price_data)

        if i < 15:
            continue  # skip warmup

        matched = engine.eval_logic_direct(rule["logic"], ind_data)
        if matched and not holding:
            entry_price = price_data["close"]
            holding = {
                "side": side,
                "entry": entry_price,
                "tp_price": entry_price * (1 + tp/100) if side == "BUY" else entry_price * (1 - tp/100),
                "sl_price": entry_price * (1 - sl/100) if side == "BUY" else entry_price * (1 + sl/100),
                "time": time_list[i]
            }
            logs.append(f"[{time_list[i]}] {side} @ {entry_price:.2f} (TP {tp}%, SL {sl}%)")
            logger.log_trade(f"[{time_list[i]}] {side} @ {entry_price:.2f} (TP {tp}%, SL {sl}%)")

        elif holding:
            price = price_data["high"] if holding["side"] == "BUY" else price_data["low"]
            exit_reason = None
            if holding["side"] == "BUY" and price >= holding["tp_price"]:
                exit_reason = "TP"
            elif holding["side"] == "BUY" and price <= holding["sl_price"]:
                exit_reason = "SL"
            elif holding["side"] == "SELL" and price <= holding["tp_price"]:
                exit_reason = "TP"
            elif holding["side"] == "SELL" and price >= holding["sl_price"]:
                exit_reason = "SL"

            if exit_reason:
                exit_price = holding["tp_price"] if exit_reason == "TP" else holding["sl_price"]
                pnl_pct = ((exit_price - holding["entry"]) / holding["entry"]) * 100 if holding["side"] == "BUY" else ((holding["entry"] - exit_price) / holding["entry"]) * 100
                pnl += pnl_pct
                pnl_usdt = (pnl_pct / 100.0) * size  # PnL in absolute value
                total_net_pnl += pnl_usdt
                if pnl_pct > 0:
                    wins += 1
                else:
                    losses += 1
                logs.append(f"[{time_list[i]}] EXIT {exit_reason} @ {exit_price:.2f}, PnL: {pnl_pct:.2f}% (Net: {pnl_usdt:.2f} USD)")
                logger.log_trade(f"[{time_list[i]}] EXIT {exit_reason} @ {exit_price:.2f}, PnL: {pnl_pct:.2f}% (Net: {pnl_usdt:.2f} USD)")
                holding = None

    summary = {
        "Total Trades": wins + losses,
        "Wins": wins,
        "Losses": losses,
        "Win Rate": round(100 * wins / (wins + losses), 2) if wins + losses > 0 else 0,
        "Total PnL %": round(pnl, 2),
        "Total Net PnL": round(total_net_pnl, 2),
        "Size Per Trade": size
    }

    return {"logs": logs, "summary": summary}
