import time, math, json, websockets
from configparser import ConfigParser
from binance.client import Client as SpotClient
from binance.um_futures import UMFutures as FuturesClient
from decimal import Decimal, ROUND_UP

class BinanceClient:
    def __init__(self, config_path: str, override_symbol: str = None, override_use_futures: bool = None):
        self.config = ConfigParser()
        self.config.read(config_path)
        self.api_key = self.config.get("binance", "api_key")
        self.api_secret = self.config.get("binance", "api_secret")
        self.api_key_test = self.config.get("binance", "api_key_test")
        self.api_secret_test = self.config.get("binance", "api_secret_test")
        self.api_key_future_test = self.config.get("binance", "api_key_future_test")
        self.api_secret_future_test = self.config.get("binance", "api_secret_future_test")
        self.network = self.config.get("binance", "network")
        self.symbol = override_symbol or self.config.get("binance", "symbol")
        self.use_futures = override_use_futures
        self._init_client()

    def _init_client(self):
        if self.use_futures:
            base_url = "https://testnet.binancefuture.com" if self.network == "testnet" else "https://fapi.binance.com"
            self.client = FuturesClient(key=self.api_key_future_test, secret=self.api_secret_future_test, base_url=base_url)
        else:
            if self.network == "testnet":
                self.client = SpotClient(self.api_key_test, self.api_secret_test, testnet=True)
                server_time = self.client.get_server_time()["serverTime"]
                local_time = int(time.time() * 1000)
                self.client.timestamp_offset = server_time - local_time
            else :
                self.client = SpotClient(self.api_key, self.api_secret)
                server_time = self.client.get_server_time()["serverTime"]
                local_time = int(time.time() * 1000)
                self.client.timestamp_offset = server_time - local_time


    def get_symbol_info(self, symbol=None):
        symbol = symbol or self.symbol
        if self.use_futures:
            info = self.client.exchange_info()
        else:
            info = self.client.get_exchange_info()
        for s in info["symbols"]:
            if s["symbol"] == symbol:
                return s  # ✅ ต้อง return symbol object ตรงนี้

        raise ValueError(f"Symbol {symbol} not found")

    def _round_step_size(self, quantity, step_size):
        step = Decimal(str(step_size))
        qty = Decimal(str(quantity))
        rounded = (qty // step) * step
        return float(rounded.quantize(step, rounding=ROUND_UP))
    
    def _round_tick(self,val,tick_size):
        tick = Decimal(str(tick_size))
        value = Decimal(str(val))
        rounded = (value // tick) * tick
        return float(rounded.quantize(tick, rounding=ROUND_UP))

    def create_order(self, side: str, size_usdt: float, symbol: str = None, tp: float = None, sl: float = None):
        symbol = symbol or self.symbol
        side = side.upper()
        opposite = "SELL" if side == "BUY" else "BUY"

        if side not in ("BUY", "SELL"):
            raise ValueError("Invalid order side")

        # Get latest price
        price_data = self.client.ticker_price(symbol=symbol) if self.use_futures else self.client.get_symbol_ticker(symbol=symbol)
        price = float(price_data["price"])

        # Get step size
        info = self.get_symbol_info(symbol)
        step_size = None
        tick_size = None
        for f in info["filters"]:
            if f["filterType"] == "LOT_SIZE":
                step_size = float(f["stepSize"])
            if f["filterType"] == "PRICE_FILTER":
                tick_size = float(f["tickSize"])
        if not step_size or not tick_size:
            raise ValueError("Step size or tick size not found")
        quantity = self._round_step_size((size_usdt/price), step_size)

        # FUTURES
        if self.use_futures:
            self.client.change_leverage(symbol=symbol, leverage=20)
            positions = self.client.get_position_risk(symbol=symbol)
            print(positions)

            try:
                order = self.client.new_order(
                    symbol=symbol,
                    side=side,
                    type="MARKET",
                    quantity=quantity
                )
            except Exception as e:
                print(f"[ERROR] main order failed: {e}")

            entry_price = float(order.get("avgFillPrice") or price)
            tp_price = entry_price * (1 + tp/100) if side == "BUY" else entry_price * (1 - tp/100)
            sl_price = entry_price * (1 - sl/100) if side == "BUY" else entry_price * (1 + sl/100)

            tp_price = self._round_tick(tp_price,tick_size)
            sl_price = self._round_tick(sl_price,tick_size)

            try:
                if tp:
                    self.client.new_order(
                        symbol=symbol,
                        side=opposite,
                        type="TAKE_PROFIT_MARKET",
                        stopPrice=tp_price,
                        closePosition=True,
                        timeInForce="GTC"
                    )
            except Exception as e:
                print(f"[ERROR] TP order failed: {e}")
            try:
                if sl:
                    self.client.new_order(
                        symbol=symbol,
                        side=opposite,
                        type="STOP_MARKET",
                        stopPrice=sl_price,
                        closePosition=True,
                        timeInForce="GTC"
                    )
            except Exception as e:
                print(f"[ERROR] SL: order failed: {e}")

            order["tp_price"] = tp_price
            order["sl_price"] = sl_price
            order["order_scope"] = "FUTURES"

        # SPOT
        else:
            order = self.client.create_order(
                symbol=symbol,
                side=side,
                type="MARKET",
                quantity=quantity
            )
            order["order_scope"] = "SPOT"

        order["calculated_price"] = price
        order["requested_size_usdt"] = size_usdt
        order["tp_percent"] = tp
        order["sl_percent"] = sl
        return order

    def get_balance(self, asset="USDT"):
        if self.use_futures:
            balances = self.client.balance()
            for b in balances:
                if b["asset"] == asset:
                    return float(b["balance"])
        else:
            info = self.client.get_asset_balance(asset=asset)
            return float(info["free"]) if info else 0.0
        return 0.0

    def get_recent_filled_orders(self, symbol=None):
        symbol = symbol or self.symbol
        if self.use_futures:
            orders = self.client.get_all_orders(symbol=symbol, limit=50)
        else:
            orders = self.client.get_all_orders(symbol=symbol, limit=50)
        return [o for o in orders if (o["status"] == "FILLED") or (o["status"] == "CANCELED")]
    
    async def price_stream(self, symbol=None, interval="1m"):
        symbol = (symbol or self.symbol).lower()
        if self.use_futures:
            url = f"wss://fstream.binance.com/ws/{symbol}@kline_{interval}"
        else:
            url = f"wss://stream.binance.com:9443/ws/{symbol}@kline_{interval}"

        async with websockets.connect(url, ping_interval=20, ping_timeout=10) as ws:
            while True:
                try:
                    msg = await ws.recv()
                except websockets.exceptions.ConnectionClosedError as e:
                    print(f"[DEBUG] WebSocket closed: {e.code}, reason: {e.reason}")
                    raise
                yield json.loads(msg)   