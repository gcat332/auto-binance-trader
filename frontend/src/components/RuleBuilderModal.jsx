import React, { useState, useEffect } from "react";
import RuleBuilder from "./RuleBuilder";
import { loadAllIndicatorConfigs } from "./indicatorConfigLoader";
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vs2015 } from 'react-syntax-highlighter/dist/esm/styles/hljs';

export default function RuleBuilderModal({ initRule, onSave, onClose }) {
  const [ruleName, setRuleName] = useState("");
  const [active, setActive] = useState(false);
  const [desc, setDesc] = useState("");
  const [scope, setScope] = useState("FUTURE");
  const [trigger, setTrigger] = useState("BUY");
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [size_usdt, setSize] = useState(5);
  const [tp, setTp] = useState(1);
  const [sl, setSl] = useState(1);
  const [logic, setLogic] = useState(null);
  const [indicatorConfig, setIndicatorConfig] = useState({ ema: [], rsi: [], macd: [] });
  const [showJson, setShowJson] = useState(false);

  // โหลด Indicator Config (ทำครั้งเดียวตอน mount)
  useEffect(() => {
    loadAllIndicatorConfigs().then(cfg => setIndicatorConfig(cfg));
  }, []);

  // reset state ทุกครั้งที่เปิด modal (หรือเปลี่ยน rule ที่ edit)
  useEffect(() => {
    setRuleName(initRule?.rule_name || "");
    setActive(initRule?.active || false);
    setDesc(initRule?.description || "");
    setScope(initRule?.scope || "FUTURE");
    setTrigger(initRule?.trigger || "BUY");
    setSymbol(initRule?.symbol || "BTCUSDT")
    setSize(initRule?.size_usdt || 5)
    setTp(initRule?.tp || 1);
    setSl(initRule?.sl || 1);
    setLogic(initRule?.logic ?? null);  // ถ้า add ใหม่ logic = null
    setShowJson(false);
  }, [initRule]);

  function handleSave() {
    if (!ruleName || !logic) {
      alert("ต้องใส่ชื่อกลยุทธ์ และ logic");
      return;
    }
    const ruleObj = {
      rule_name: ruleName,
      active,
      description: desc,
      scope,
      trigger,
      symbol,
      size_usdt,
      logic,
      tp: Number(tp),
      sl: Number(sl)
    };
    onSave(ruleObj);
  }
  
  return (
    <div className="rulemodal-backdrop" style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 2000
    }}>
      <div className="rulemodal-box"
     style={{
          width: "clamp(320px, 80vw, 85vw)",      // จากมือถือถึงจอใหญ่
          height: "clamp(400px, 80vh, 90vh)",      // สูงตามจอ
          maxWidth: "96vw",
          maxHeight: "92vh",
          borderRadius: "16px",
          margin: "4vh auto",
          padding: "32px 28px",
          boxShadow: "0 10px 40px #000c",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          background: "#1e1e1e",                  // ถ้าต้องการ override class
          
        }}>
          
        <button className="rulemodal-close"
          style={{ top: 28, right: 32, fontSize: 32, borderRadius: 8 }}
          onClick={onClose}>✕</button>
        <h2 className="rulemodal-h2" style={{ textAlign: "center", fontSize: 20, marginBottom: 10, color: "#ff9800" }}>
          {initRule ? "Edit Rule" : "Add New Rule"}
        </h2>
        <div className="rulemodal-form" style={{ maxWidth: 1500, width: "98%", margin: "0 auto" }}>
        <div>
            <label style={{ display: "block", marginBottom: 4 }}>Rule Name *</label>
            <input
              type="text"
              value={ruleName}
              onChange={e => setRuleName(e.target.value)}
            />

          </div>
          <div>
          <div style={{ display: "flex",justifyItems: "center", alignItems: "center", gap: 8, height: "100%", paddingTop: 5, paddingBottom: 5 }}>
            <label htmlFor="active" >Active</label>
            <input
              id="active"
              type="checkbox"
              checked={active}
              onChange={e => setActive(e.target.checked)}
              style={{
                width: 18,
                height: 18,
                accentColor: "#f0b90b" // ✅ เพิ่มสีถ้าต้องการ
              }}
            />
          </div>
        </div>
          <div>
            <label>Description</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} />
          </div>
          <div className="rulemodal-form-row">
            <div style={{ width: "33%"}}>
              <label>Scope</label>
              <select value={scope} onChange={e => setScope(e.target.value)}>
                <option value="SPOT">SPOT</option>
                <option value="FUTURE">FUTURE</option>
              </select>
              </div>
            <div style={{ width: "33%"}}>
              <label>Trigger</label>
              <select value={trigger} onChange={e => setTrigger(e.target.value)}>
                <option value="BUY">Buy</option>
                <option value="SELL">Sell</option>
              </select>
              </div>
              <div style={{ width: "33%"}}>
              <label>Symbol Pair</label>
              <select value={symbol} onChange={e => setSymbol(e.target.value)}>
                <option value="BTCUSDT">BTCUSDT</option>
              </select>
            </div>
            </div>
            <div className="rulemodal-form-row">
            <div style={{ width: "33%", marginRight: "17px" }}>
              <label>Size (USDT)</label>
              <input type="number" value={size_usdt} min={0} max={9999} onChange={e => setSize(e.target.value)} />
            </div>
            <div style={{ width: "33%", marginRight: "17px" }}>
              <label>Take Profit (%)</label>
              <input type="number" value={tp} min={0} max={20} onChange={e => setTp(e.target.value)} />
            </div>
            <div style={{ width: "33%"}}>
              <label>Stop Loss (%)</label>
              <input type="number" value={sl} min={0} max={20} onChange={e => setSl(e.target.value)} />
            </div>
            </div>
          
          <div className="rulemodal-section">
            <div className="rulemodal-section-title">Logic (Drag & Drop):</div>
            <div className="rulemodal-logic-box"
              style={{ width: "100%", maxWidth: "100%", height: "360px", minHeight: 340, borderRadius: 14 }}>
              <RuleBuilder logic={logic} setLogic={setLogic} indicatorConfig={indicatorConfig} />
            </div>
          </div>
        </div>
       <div className="rulemodal-btnbar">
        <button
          className="logic"
          onClick={() => setShowJson(v => !v)}
        >
          {showJson ? "Hide" : "Show"} JSON
        </button>
        <button className="save" onClick={handleSave}>Save</button>
        <button className="cancel" onClick={onClose}>Cancel</button>
      </div >
        {showJson && (
          <div className="rulemodal-form-row" style={{
  marginLeft: "9%",          
  background: "#1e1e1e",
  padding: 16,
  borderRadius: 8,
  border: "1px solid #3c3c3c",
  margin: "20px 0",
  boxShadow: "inset 0 0 8px #0006"
}} >
            <SyntaxHighlighter language="json" style={vs2015}>
              {JSON.stringify(logic, null, 2)}
            </SyntaxHighlighter>
          </div>
        )}
      </div>
    </div>
  );
}