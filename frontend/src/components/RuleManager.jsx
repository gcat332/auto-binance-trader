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
              <td>
                <button className="rulemanager-action-btn edit" onClick={() => handleEditRule(i)}>Edit</button>
                <button className="rulemanager-action-btn delete" onClick={() => handleDeleteRule(i)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
