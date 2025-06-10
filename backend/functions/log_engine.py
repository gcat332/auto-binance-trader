import os
import json
from datetime import datetime
from pathlib import Path

class LogTrade:
    def __init__(self, log_path: str, order_path: str):
        self.log_path = Path(log_path)
        self.order_path = Path(order_path)

    def log_trade(self, msg: str):
        try:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            with open(self.log_path, "a", encoding="utf-8") as f:
                f.write(f"[{timestamp}] {msg}\n")
            self._trim_log(500)
        except Exception as e:
            print(f"Failed to write log: {e}")

    def _trim_log(self, max_lines=500):
        path = self.log_path
        if not os.path.exists(path):
            return
        with open(path, "r", encoding="utf-8") as f:
            lines = f.readlines()
        if len(lines) > max_lines:
            with open(path, "w", encoding="utf-8") as f:
                f.writelines(lines[-max_lines:])

    def update_all_orders_summary(self, spot_client, future_client):
        def load_orders(client, scope):
            orders = client.client.get_all_orders(symbol=client.symbol)
            for o in orders:
                o["order_scope"] = scope
            return orders

        spot_orders = load_orders(spot_client, "SPOT")
        future_orders = load_orders(future_client, "FUTURE")
        all_orders = spot_orders + future_orders

        open_orders = [o for o in all_orders if o["status"] in ["NEW"]]
        closed_orders = [o for o in all_orders if o["status"] in ["FILLED", "CANCELED"]]

        open_path = Path(self.order_path) / "open_orders.json"
        with open(open_path, "w", encoding="utf-8") as f:
            json.dump(open_orders, f, indent=2)

        closed_path = Path(self.order_path) / "closed_orders.json"
        with open(closed_path, "w", encoding="utf-8") as f:
            json.dump(closed_orders, f, indent=2)

        spot_summary = self._summarize("SPOT", spot_client, closed_orders, {"holdings": self._get_spot_holdings(spot_client)})
        future_summary = self._summarize("FUTURE", future_client, closed_orders, {"positions": self._get_future_positions(future_client)})

        summary_path = Path(self.order_path) / "summary_orders.json"
        with open(summary_path, "w", encoding="utf-8") as f:
            json.dump([spot_summary, future_summary], f, indent=2)

        return {
            "open": len(open_orders),
            "closed": len(closed_orders),
            "summary": [spot_summary, future_summary]
        }

    def _summarize(self, scope, client, closed_orders, asset_data):
            filtered = [o for o in closed_orders if o["status"] == "FILLED" and o.get("order_scope") == scope]
            wins, losses, total_pnl = 0, 0, 0.0
            for o in filtered:
                entry = float(o.get("price", 0))
                fill = float(o.get("avgFillPrice") or o.get("price") or 0)
                qty = float(o.get("origQty", 0))
                if not entry or not fill or not qty:
                    continue
                side = o["side"]
                pnl = (fill - entry) if side == "BUY" else (entry - fill)
                pnl_amount = pnl * qty
                total_pnl += pnl_amount
                if pnl_amount >= 0:
                    wins += 1
                else:
                    losses += 1
            total = wins + losses
            result = {
                "scope": scope,
                "balance_usdt": client.get_balance("USDT"),
                "total_orders": total,
                "wins": wins,
                "losses": losses,
                "winrate": round(wins / total * 100, 2) if total else 0.0,
                "total_pnl": round(total_pnl, 2)
            }
            result.update(asset_data)
            return result

    def _get_spot_holdings(self,client):
        account = client.client.get_account()
        result = {}
        for asset in account["balances"]:
            amt = float(asset["free"])
            if amt > 0:
                result[asset["asset"]] = amt
        return result

    def _get_future_positions(self,client):
        positions = client.client.get_position_risk()
        result = {}

        for pos in positions:
            amt = float(pos["positionAmt"])
            if amt != 0:
                symbol = pos["symbol"]
                entry = float(pos["entryPrice"])
                mark = float(pos["markPrice"])
                pnl = (mark - entry) * amt if amt > 0 else (entry - mark) * abs(amt)
                result[symbol] = {
                    "positionAmt": amt,
                    "entryPrice": entry,
                    "markPrice": mark,
                    "unrealizedPnL": round(pnl, 3)
                }
        return result
