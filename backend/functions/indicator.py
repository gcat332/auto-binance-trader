import pandas as pd
import numpy as np
import json
from typing import List, Dict, Any

class IndicatorCalculator:
    """
    คำนวณ Technical Indicators หลายชุดพร้อมกัน (EMA, RSI, MACD) และ indicator เสริม เช่น BREAKOUT, PRICE, VOLUME, CANDLE
    """
    def __init__(self, config_folder: str):
        """
        Args:
            config_folder: path ไปยังโฟลเดอร์ที่มีไฟล์ ema.json, rsi.json, macd.json
        """
        self.ema_config = self._load_json(f"{config_folder}/ema.json")
        self.rsi_config = self._load_json(f"{config_folder}/rsi.json")
        self.macd_config = self._load_json(f"{config_folder}/macd.json")
        self.data = []
        self.maxlen = 500
        self.latest_ind = {}

    def _load_json(self, path):
        try:
            with open(path, 'r') as f:
                return json.load(f)
        except Exception as e:
            print(f"error loading {path}: {e}")
            return None

    def update(self, price_data: dict):
        """
        อัปเดตข้อมูลล่าสุดและคำนวณ indicators
        Args:
            price_data: dict ที่ต้องมี key 'open', 'high', 'low', 'close', 'volume'
        Returns:
            dict indicators ล่าสุด
        """
        self.data.append(price_data)
        if len(self.data) > self.maxlen:
            self.data.pop(0)
        self.latest_ind = self.calc_indicators()
        return self.latest_ind

    def calc_indicators(self):
        """
        คำนวณ indicators ทั้งหมด
        Returns:
            dict รวมค่าของ EMA, RSI, MACD, PRICE, BREAKOUT, VOLUME, CANDLE
        """
        if len(self.data) < 2:
            return {}
        df = pd.DataFrame(self.data)
        res = {}

        # --- EMA: รองรับหลายเส้น ---
        if self.ema_config:
            ema_group = {}
            for ema in self.ema_config:
                L = ema['Length']
                name = ema['Name']
                value = df['close'].ewm(span=L).mean().iloc[-1]
                prev = df['close'].ewm(span=L).mean().iloc[-2]
                ema_group[name] = {"name": name, "value": value, "prev": prev}
            res["EMA"] = ema_group
        
        # --- RSI: รองรับหลายชุด ---
        if self.rsi_config:
            rsi_group = {}
            for rsi in self.rsi_config:
                L = rsi["Length"]
                name = rsi["Name"]
                delta = df["close"].diff()
                gain = (delta.where(delta > 0, 0)).rolling(L).mean()
                loss = (-delta.where(delta < 0, 0)).rolling(L).mean()
                rs = gain / loss
                rsi_val = 100 - (100 / (1 + rs))
                rsi_group[name] = {
                    "name": name,
                    "value": rsi_val.iloc[-1],
                    "prev": rsi_val.iloc[-2],
                    "Overbought": rsi.get("Overbought Level"),
                    "Oversold": rsi.get("Oversold Level")
                }
            res["RSI"] = rsi_group

        # --- MACD: รองรับหลายชุด ---
        if self.macd_config:
            macd_group = {}
            for macd_cfg in self.macd_config:
                name = macd_cfg.get("Name", f"MACD_{macd_cfg.get('Fast Length', 12)}_{macd_cfg.get('Slow Length', 26)}")
                f, s, sig = macd_cfg["Fast Length"], macd_cfg["Slow Length"], macd_cfg["Signal Smoothing"]
                ema_fast = df["close"].ewm(span=f).mean()
                ema_slow = df["close"].ewm(span=s).mean()
                macd_val = ema_fast - ema_slow
                signal = macd_val.ewm(span=sig).mean()
                macd = macd_val.iloc[-1]
                macd_prev = macd_val.iloc[-2]
                sigv = signal.iloc[-1]
                sigv_prev = signal.iloc[-2]
                macd_group[name] = {
                    "name": name,
                    "value": macd,
                    "prev": macd_prev,
                    "signal": sigv,
                    "prev_signal": sigv_prev
                }
            res["MACD"] = macd_group

        # --- VOLUME (current) ---
        res["VOLUME"] = {
            "name": "VOLUME",
            "value": df["volume"].iloc[-1]
        }

        # --- PRICE ---
        price_group = {}
        for key in ["CLOSE", "OPEN", "HIGH", "LOW", "VOLUME"]:
            col = key.lower()
            if col in df.columns:
                price_group[key] = {
                    "name": key,
                    "value": df[col].iloc[-1],
                    "prev": df[col].iloc[-2]
                }
        res["PRICE"] = price_group

        # --- BREAKOUT (max/min ของ N bar ล่าสุด, N = 10, 20, 50, 100) ---
        breakout_group = {}
        for target in ["HIGH", "LOW"]:
            if target.lower() in df.columns:
                for lookback in [10, 20, 50, 100]:
                    values = df[target.lower()].iloc[-lookback:]
                    if target == "HIGH":
                        breakout_value = values.max()
                    else:
                        breakout_value = values.min()
                    breakout_group[f"{target}_{lookback}"] = {
                        "name": target,
                        "lookback": lookback,
                        "value": breakout_value
                    }
        res["BREAKOUT"] = breakout_group
        # --- CANDLE PATTERN (Mock/Example) ---
        res["CANDLE"] = self.detect_candlestick_patterns(df)
        return res

    def current(self):
        """Return indicator ล่าสุด"""
        return self.latest_ind

    def get_configs(self):
        """Return config ทั้งหมด"""
        return {
            "ema": self.ema_config,
            "rsi": self.rsi_config,
            "macd": self.macd_config
        }

    def detect_candlestick_patterns(self,df: pd.DataFrame) -> dict:
        """
        ตรวจจับแท่งเทียนแพทเทิร์นยอดนิยม (Bullish Engulfing, Bearish Engulfing, Doji, Hammer, Inverted Hammer)
        Args:
            df: DataFrame ที่มีคอลัมน์ open, high, low, close
        Returns:
            dict (key: ชื่อแพทเทิร์น, value: True/False)
        """
        res = {
            "BULLISH_ENGULFING": False,
            "BEARISH_ENGULFING": False,
            "DOJI": False,
            "HAMMER": False,
            "INVERTED_HAMMER": False
        }
        if len(df) < 2:
            return res

        # ล่าสุดกับก่อนหน้า
        o1, h1, l1, c1 = df['open'].iloc[-2], df['high'].iloc[-2], df['low'].iloc[-2], df['close'].iloc[-2]
        o2, h2, l2, c2 = df['open'].iloc[-1], df['high'].iloc[-1], df['low'].iloc[-1], df['close'].iloc[-1]
        # --- Bullish Engulfing ---
        if c1 < o1 and c2 > o2 and c2 > o1 and o2 < c1:
            res["BULLISH_ENGULFING"] = True
        # --- Bearish Engulfing ---
        if c1 > o1 and c2 < o2 and c2 < o1 and o2 > c1:
            res["BEARISH_ENGULFING"] = True
        # --- Doji ---
        body = abs(c2 - o2)
        rng = h2 - l2
        if rng > 0 and body / rng < 0.1:
            res["DOJI"] = True
        # --- Hammer ---
        lower_shadow = o2 - l2 if o2 > c2 else c2 - l2
        upper_shadow = h2 - o2 if o2 > c2 else h2 - c2
        if body > 0 and lower_shadow > 2 * body and upper_shadow < body:
            res["HAMMER"] = True
        # --- Inverted Hammer ---
        if body > 0 and upper_shadow > 2 * body and lower_shadow < body:
            res["INVERTED_HAMMER"] = True

        return res
