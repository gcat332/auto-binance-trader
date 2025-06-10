import json
from datetime import datetime
from typing import List, Dict, Any, Union

class RuleEngine:
    """
    RuleEngine สำหรับประเมิน logic JSON รูปแบบใหม่ (AND/OR + Condition ทุกประเภท)
    """
    def __init__(self, rule_path: str, sclient, fclient, logger, rsi_config=None, ema_config=None, macd_config=None):
        self.rule_path = rule_path
        self.rules = self.load_rule()
        self.sclient = sclient
        self.fclient = fclient
        self.logger = logger
        self.rsi_config = rsi_config or []
        self.ema_config = ema_config or []
        self.macd_config = macd_config or []

    def load_rule(self) -> List[Dict[str, Any]]:
        try:
            with open(self.rule_path, 'r', encoding='utf-8') as f:
                content = f.read().strip()
                if not content:
                    return []
                rules = json.loads(content)
                if isinstance(rules, dict):
                    return [rules]
                if not isinstance(rules, list):
                    print("Rule file format error: not list or dict")
                    return []
                return rules
        except Exception as e:
            print(f"Failed to load rules: {e}")
            return []

    def save_rules(self, rule_list: Union[List[Dict[str, Any]], Dict[str, Any]]):
        rules_to_save = rule_list if isinstance(rule_list, list) else [rule_list]
        self.rules = rules_to_save
        with open(self.rule_path, 'w', encoding='utf-8') as f:
            json.dump(rules_to_save, f, ensure_ascii=False, indent=2)

    def check_create_order(self, sindicator_data: Dict[str, Any], findicator_data: Dict[str, Any]) -> bool:
        """
        ประเมิน rule ทั้งหมด ถ้าผ่านจะสร้าง order (ผ่าน client) และ log ไว้
        """
        self.rules = self.load_rule()
        if not self.rules or not isinstance(self.rules, list):
            self.logger.log_trade("[ERROR] Failed to load rules")
            return False

        matched = False

        for rule in self.rules:
            if rule.get("scope") == "SPOT":
                client = self.sclient
                indicator_data = sindicator_data
            else:
                client = self.fclient
                indicator_data = findicator_data

            if not rule or not isinstance(rule, dict) or not rule.get("active"):
                self.logger.log_trade("[INFO] Skipping inactive rule")
                continue

            rule_name = rule.get("rule_name", "Unnamed Rule")
            logic = rule.get("logic")
            if not logic:
                self.logger.log_trade(f"[WARN] Rule '{rule_name}' has no logic")
                continue

            if not self._validate_logic_structure(logic):
                self.logger.log_trade(f"[ERROR] Invalid logic structure in rule: {rule_name}")
                continue

            if self._eval_logic(logic, indicator_data):
                matched = True
                trigger = rule.get("trigger", "BUY").upper()
                symbol = rule.get("symbol", "BTCUSDT")
                size_usdt = float(rule.get("size_usdt", 0))
                tp = rule.get("tp")
                sl = rule.get("sl")
                try:
                    result = client.create_order(
                        side=trigger,
                        size_usdt=size_usdt,
                        symbol=symbol,
                        tp=tp,
                        sl=sl
                    )
                    self.logger.log_trade(f"[INFO] Rule matched: {rule_name}")
                    self.logger.log_trade(f"[INFO] Order result: {result}")
                except Exception as e:
                    self.logger.log_trade(f"[ERROR] Order failed for rule '{rule_name}': {e}")
        return matched

    def check(self, sindicator_data: Dict[str, Any], findicator_data: Dict[str, Any]) -> bool:
        if not self.rules or not isinstance(self.rules, list):
            self.logger.log_trade("[ERROR] Failed to load rules")
            return False

        matched = False

        for rule in self.rules:
            if rule.get("scope") == "SPOT":
                client = self.sclient
                indicator_data = sindicator_data
            else:
                client = self.fclient
                indicator_data = findicator_data

            if not rule or not isinstance(rule, dict) or not rule.get("active"):
                self.logger.log_trade("[INFO] Skipping inactive rule")
                continue

            rule_name = rule.get("rule_name", "Unnamed Rule")
            logic = rule.get("logic")
            if not logic:
                self.logger.log_trade(f"[WARN] Rule '{rule_name}' has no logic")
                continue

            if not self._validate_logic_structure(logic):
                self.logger.log_trade(f"[ERROR] Invalid logic structure in rule: {rule_name}")
                continue

            if self._eval_logic(logic, indicator_data):
                matched = True
        return matched
    
    def _eval_logic(self, node: dict, data: dict) -> bool:
        ntype = node.get("type")
        if ntype == "AND":
            return all([self._eval_logic(x, data) for x in node.get("conditions", [])])
        if ntype == "OR":
            return any([self._eval_logic(x, data) for x in node.get("conditions", [])])
        result = self._eval_condition(node, data)
        self._log_condition_result(node, data, result)
        return result

    def _eval_condition(self, cond: dict, data: dict) -> bool:
        op = cond.get("operator")
        val = cond.get("value")
        compared = cond.get("compared")
        name = cond.get("name")
        ind_type = (cond.get("indicator") or "").upper()
        # --- TIME FILTER ---
        if ind_type == "TIME":
            # val = ["09:00", "17:00"]
            if not isinstance(val, list) or len(val) != 2:
                return False
            now = datetime.now().strftime("%H:%M")
            return val[0] <= now <= val[1]

        # --- PRICE ---
        if ind_type == "PRICE":
            try:
                price_val = data["PRICE"][name]["value"]
                price_prev = data["PRICE"][name].get("prev")
                comp_val = None
                if compared and compared in data["PRICE"]:
                    comp_val = data["PRICE"][compared]["value"]
                elif compared:
                    comp_val = float(compared)
                else:
                    comp_val = float(val)
                return self._compare(price_val, op, comp_val, price_prev)
            except Exception:
                return False

        # --- VOLUME ---
        if ind_type == "VOLUME":
            try:
                v = data["VOLUME"]["value"]
                comp_val = None
                if compared and compared in data["VOLUME"]:
                    comp_val = data["VOLUME"][compared]["value"]
                elif compared:
                    comp_val = float(compared)
                else:
                    comp_val = float(val)
                return self._compare(v, op, comp_val)
            except Exception:
                return False

        # --- BREAKOUT ---
        if ind_type == "BREAKOUT":
            # rule: { indicator: 'BREAKOUT', name: 'HIGH', operator: '>', value: 20 }
            try:
                target = name  # 'HIGH' or 'LOW'
                lookback = int(val)  # lookback N bar
                breakout_key = f"{target}_{lookback}"
                breakout_val = data["BREAKOUT"][breakout_key]["value"]
                cur_val = data["PRICE"][target]["value"]
                return self._compare(cur_val, op, breakout_val)
            except Exception:
                return False

        # --- CANDLE (Pattern) ---
        if ind_type == "CANDLE":
            # สมมุติถ้ามี data["CANDLE"]["BULLISH_ENGULFING"] = True
            return data.get("CANDLE", {}).get(name, False)

        # --- EMA/RSI/MACD ---
        return self._eval_condition_classic(cond, data)

    def _eval_condition_classic(self, cond, data):
        op = cond.get("operator")
        val = cond.get("value")
        compared = cond.get("compared")
        name = cond.get("name")
        ind_type = (cond.get("indicator") or "").upper()
        # รองรับหลาย EMA/RSI/MACD (ค้นหาด้วยชื่อ)
        group = data.get(ind_type, {})
        indicator = group.get(name) if group else None
        if not indicator:
            return False
        ind_val = indicator.get("value")
        ind_prev = indicator.get("prev")
        comp_val = None

        if ind_type == "RSI":
            if compared == "oversold":
                comp_val = indicator.get("Oversold")
            elif compared == "overbought":
                comp_val = indicator.get("Overbought")
            elif compared in group:
                comp_val = group[compared]["value"]
            elif compared:
                comp_val = float(compared)
        elif ind_type == "MACD":
            if compared == "signal":
                comp_val = indicator.get("signal")
            elif compared in group:
                comp_val = group[compared]["value"]
            elif compared:
                comp_val = float(compared)
        elif ind_type == "EMA":
            if compared in group:
                comp_val = group[compared]["value"]
            elif compared:
                comp_val = float(compared)
        else:
            if compared in group:
                comp_val = group[compared]["value"]
            elif compared:
                comp_val = float(compared)
        if comp_val is None and val is not None:
            comp_val = float(val)
        return self._compare(ind_val, op, comp_val, ind_prev)

    def _compare(self, a, op, b, a_prev=None):
        if a is None or b is None:
            return False
        if op == "cross_up":
            return a_prev is not None and a_prev <= b and a > b
        if op == "cross_down":
            return a_prev is not None and a_prev >= b and a < b
        if op == ">":
            return a > b
        if op == "<":
            return a < b
        if op == "=":
            return a == b
        if op == ">=":
            return a >= b
        if op == "<=":
            return a <= b
        return False

    def _validate_logic_structure(self, node: dict) -> bool:
        if not isinstance(node, dict):
            return False
        node_type = node.get("type")
        conditions = node.get("conditions")
        if node_type in ("AND", "OR"):
            if not conditions or not isinstance(conditions, list):
                return False
            for cond in conditions:
                if "type" in cond and cond["type"] in ("AND", "OR"):
                    if not self._validate_logic_structure(cond):
                        return False
                elif "conditions" in cond:
                    return False
            return True
        else:
            return "indicator" in node

    def _log_condition_result(self, cond: dict, data: dict, result: bool):
        ind_name = cond.get("indicator")
        op = cond.get("operator")
        val = cond.get("value")
        compared = cond.get("compared")
        name = cond.get("name")
        ind_type = cond.get("type", "").upper()
        status = "PASS" if result else "FAIL"

        # เพิ่ม format สำหรับประเภท CANDLE, TIME, BREAKOUT, VOLUME
        if ind_type == "CANDLE":
            self.logger.log_trade(f"[{status}] {ind_name}/{name}")
        elif ind_type == "TIME":
            self.logger.log_trade(f"[{status}] {ind_name}/{name} {val}")
        elif ind_type == "BREAKOUT":
            self.logger.log_trade(f"[{status}] {ind_name}/{name} {op} {val}")
        elif ind_type == "VOLUME":
            self.logger.log_trade(f"[{status}] {ind_name}/{name} {op} {compared or val}")
        else:
            self.logger.log_trade(f"[{status}] {ind_name}/{name} {op} {compared or val}")
