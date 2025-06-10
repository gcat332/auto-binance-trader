import React, { useEffect, useState } from "react";

export default function TradeLogPanel() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [autoTrade, setAutoTrade] = useState(false);

  useEffect(() => {
  const fetchAutoTradeStatus = async () => {
      try {
        const res = await fetch("http://localhost:8000/auto-trade/status");
        const data = await res.json();
        setAutoTrade(data.enabled);
      } catch (err) {
        console.error("Failed to fetch auto-trade status:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAutoTradeStatus();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      fetch("http://localhost:8000/logs")
        .then(res => res.json())
        .then(data => setLogs(data.reverse().slice(0, 50)))
        .catch(err => console.error("Log fetch error", err));
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const toggleAutoTrade = async () => {
    const newState = !autoTrade;
    setAutoTrade(newState);
    await fetch("http://localhost:8000/auto-trade/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enable: newState })
    });
  };

  const getLineClass = (line) => {
    if (line.includes("[ERROR]")) return "log-line error";
    if (line.includes("[WARN]")) return "log-line warn";
    if (line.includes("[INFO]")) return "log-line info";
    return "log-line normal";
  };

  return (
    <div className="logpanel-wrapper">
      <div className="log-container">
        <h3>Trade Logs</h3>
        <div className="log-box">
          {logs.slice(-100).map((line, idx) => (
            <div key={idx} className={getLineClass(line)}>{line}</div>
          ))}
        </div>
      </div>
      {loading ? <p>Loading...</p> : (
      <button
        className={`autotrade-toggle ${autoTrade ? "" : "off"}`}
        onClick={toggleAutoTrade}
      >
        {autoTrade ? "❌ Click to Stop Auto Trade" : "✅ Click to Start Auto Trade"}
      </button>
      )}
    </div>
  );
}
