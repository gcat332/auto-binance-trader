import React, { useState, useEffect } from "react";
import RuleBuilderModal from "./RuleBuilderModal";


async function loadRuleConfig() {
  try {
    const res = await fetch("http://localhost:8000/rules");
    if (!res.ok) throw new Error("API Error");
    return JSON.parse(await res.text());
  } catch (e) {
    console.log('error : ', e);
    return [];
  }
}
async function saveRuleConfig(newConfig) {
  await fetch("http://localhost:8000/rules", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(newConfig)
  });
}

export default function RuleManager() {
  const [rules, setRules] = useState([]);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editIdx, setEditIdx] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    // mock
    const ls = localStorage.getItem("ruleset");
    if (ls) setRules(JSON.parse(ls));
    else loadRuleConfig().then(setRules);
  }, []);

  function handleAddRule() {
    setEditIdx(-1);
    setShowBuilder(true);
  }
  function handleEditRule(idx) {
    setEditIdx(idx);
    setShowBuilder(true);
  }
  async function handleDeleteRule(idx) {
    if (!window.confirm("Delete this rule?")) return;
    const newRules = [...rules];
    newRules.splice(idx, 1);
    setRules(newRules);
    await saveRuleConfig(newRules);
  }
  async function handleSaveRule(ruleObj) {
    let newRules = [];
    if (editIdx === -1) newRules = [...rules, ruleObj];
    else {
      newRules = [...rules];
      newRules[editIdx] = ruleObj;
    }
    setRules(newRules);
    await saveRuleConfig(newRules);
    setShowBuilder(false);
  }
  async function handleTestRule(rule) {
    const start = prompt("📅 Start Date/Time (e.g., 2025-06-01 00:00)");
    const end = prompt("📅 End Date/Time (e.g., 2025-06-05 23:59)");
    if (!start || !end) return;

    const cleanStart = start.replace("T", " ");
    const cleanEnd = end.replace("T", " ");

    setIsLoading(true);
    setTestResult(null);

    try {
      const res = await fetch("http://localhost:8000/backtest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rule, start: cleanStart, end: cleanEnd })
      });
      const result = await res.json();
      console.log("Backtest result:", result);
      setTestResult({ name: rule.rule_name, summary: result.summary });
    } catch (err) {
      alert("❌ Backtest failed.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="rulemanager-container">
      <h3>Rule Config Manager</h3>
      <button
        onClick={handleAddRule}
        className="rulemanager-add-btn"
      >+ Add Rule</button>
      <table className="rulemanager-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Active</th>
            <th>Scope</th>
            <th>Trigger</th>
            <th>Symbol</th>
            <th>Size (USDT)</th>
            <th>Take Profit (%)</th>
            <th>Stop Loss (%)</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rules.map((r, i) => (
            <tr key={i}>
              <td>{r.rule_name}</td>
              <td>{r.active ? "🟢" : "🔴"}</td>
              <td>{r.scope}</td>
              <td>{r.trigger}</td>
              <td>{r.symbol}</td>
              <td>{r.size_usdt}</td>
              <td>{r.tp}</td>
              <td>{r.sl}</td>
              <td style={{ display: "flex" }}>
                <button style={{ width: "33%" }} className="rulemanager-action-btn edit" onClick={() => handleEditRule(i)}>Edit</button>
                <button style={{ width: "33%" }} className="rulemanager-action-btn delete" onClick={() => handleDeleteRule(i)}>Delete</button>
                <button style={{ width: "33%" }} className="rulemanager-action-btn test" onClick={() => handleTestRule(r)}>Test</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {isLoading && <div style={{ marginTop: 10 }}>🔄 Running backtest...</div>}

      {testResult && (
        <div className="backtest-result" style={{ marginTop: 10, border: "1px solid #ccc", padding: 10 }}>
          <h4>📊 Backtest Result: {testResult.name}</h4>
          <ul>
            <li>✅ Win Rate: {testResult.summary?.["Win Rate"]}%</li>
            <li>💰 Total PnL (%): {testResult.summary?.["Total PnL %"]}%</li>
            <li>💵 Total PnL (USDT): {testResult.summary?.["Total Net PnL"]}</li>
            <li>🎯 Total Trades: {testResult.summary?.["Total Trades"]}</li>
            <li>✔️ Wins: {testResult.summary?.["Wins"]}</li>
            <li>❌ Losses: {testResult.summary?.["Losses"]}</li>
          </ul>
        </div>
      )}
      {showBuilder && (
        <RuleBuilderModal
          initRule={editIdx !== -1 ? rules[editIdx] : null}
          onSave={handleSaveRule}
          onClose={() => setShowBuilder(false)}
        />
      )}
    </div>
    
  );
}

