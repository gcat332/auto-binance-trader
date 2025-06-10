import json
from rule_engine import RuleEngine

class DummyClient:
    def create_order(self, **kwargs):
        print("Order simulated:", kwargs)
        return {"status": "simulated", "detail": kwargs}

class DummyLogger:
    def log_trade(self, msg):
        print("[LOG]", msg)

if __name__ == "__main__":
    # Load mock data/rules
    with open("functions/mock/mock_indicator_data.json", encoding="utf-8") as f:
        indicator_data = json.load(f)
    with open("functions/mock/mock_rule_set.json", encoding="utf-8") as f:
        rule_set = json.load(f)
    # Save rule_set to temp file for RuleEngine
    with open("functions/mock/temp_rule_set.json", "w", encoding="utf-8") as f:
        json.dump(rule_set, f, ensure_ascii=False, indent=2)

    # Dummy clients
    dummy_client = DummyClient()
    dummy_logger = DummyLogger()

    # สร้าง RuleEngine
    engine = RuleEngine(
        rule_path="functions/mock/temp_rule_set.json",
        sclient=dummy_client,
        fclient=dummy_client,
        logger=dummy_logger,
    )

    print("========= RULE TEST RESULT =========")
    for i, rule in enumerate(rule_set):
        rule_name = rule.get("rule_name", f"Rule {i+1}")
        scope = rule.get("scope", "SPOT")
        print(f"\n---- {i+1}. {rule_name} ----")
        # ถ้าต้องการแยก SPOT/FUTURE, mock data ซ้ำได้
        sind = indicator_data
        find = indicator_data
        # ทดสอบทีละ rule (override rule set)
        engine.rules = [rule]
        # จะเรียก check_create_order() โดยใช้ sind/find ตาม scope
        matched = engine.check_create_order(sindicator_data=sind, findicator_data=find)
        print("Matched:", matched)

    print("\n========= END =========")
