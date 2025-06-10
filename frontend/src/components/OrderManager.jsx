
import React, { useEffect, useState } from "react";
import summaryData from "../../../log/summary_orders.json";
import openOrders from "../../../log/open_orders.json";
import closedOrders from "../../../log/closed_orders.json";

export default function OrderManager() {
  const [mode, setMode] = useState("FUTURE");
  const [summary, setSummary] = useState({});
  const [filterText, setFilterText] = useState("");
  const [filterDates, setFilterDates] = useState({ from: "", to: "" });
  const [assetFilter, setAssetFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [orderTab, setOrderTab] = useState("OPEN");


  const [filteredOpen, setFilteredOpen] = useState([]);
  const [filteredClosed, setFilteredClosed] = useState([]);

  const loadSummary = () => {
    const data = summaryData.find(s => s.scope === mode);
    setSummary(data || {});
  };

  const filterOrders = () => {
    const { from, to } = filterDates;
    const isInRange = (time) => {
      const t = new Date(time).getTime();
      return (!from || t >= new Date(from).getTime()) && (!to || t <= new Date(to).getTime());
    };
    setFilteredOpen(
      openOrders.filter(o =>
        o.order_scope === mode &&
        (!assetFilter || o.symbol.includes(assetFilter)) &&
        isInRange(o.time)
      )
    );
    setFilteredClosed(
      closedOrders.filter(o =>
        o.order_scope === mode &&
        (!assetFilter || o.symbol.includes(assetFilter)) &&
        (statusFilter === "ALL" || o.status === statusFilter) &&
        isInRange(o.time)
      )
    );
  };

  useEffect(() => {
    loadSummary();
    const interval = setInterval(loadSummary, 10000);
    return () => clearInterval(interval);
  }, [mode]);

  useEffect(() => {
    filterOrders();
    const interval = setInterval(filterOrders, 10000);
    return () => clearInterval(interval);
  }, [filterDates, mode, assetFilter, statusFilter]);

  const assetList = mode === "SPOT"
    ? Object.entries(summary?.holdings || {}).filter(([k]) => k.toLowerCase().includes(filterText.toLowerCase()))
    : Object.entries(summary?.positions || {}).filter(([k]) => k.toLowerCase().includes(filterText.toLowerCase()));

  const handleAssetClick = (asset) => {
    const symbol = mode === "SPOT" ? asset + "USDT" : asset;
    setAssetFilter(prev => prev === symbol ? "" : symbol);
  }

  const ordersToRender = orderTab === "OPEN" ? filteredOpen : filteredClosed;
  const sumQty = ordersToRender.reduce((acc, o) => acc + parseFloat(o.executedQty || 0), 0);
  const sumTotal = ordersToRender.reduce((acc, o) =>
    acc + parseFloat(mode === "FUTURE" ? o.cumQuote || 0 : o.cummulativeQuoteQty || 0),
    0
  );

  const filledClosed = filteredClosed.filter(o => o.status === "FILLED");
  const totalProfit = filledClosed.reduce((acc, o) => {
    const total = parseFloat(mode === "FUTURE" ? o.cumQuote || 0 : o.cummulativeQuoteQty || 0);
    return acc + (o.side === "SELL" ? total : -total);
  }, 0);
  const winTrades = filledClosed.filter(o => o.side === "SELL").length;
  const winrate = filledClosed.length > 0 ? (winTrades / filledClosed.length) * 100 : 0;

  return (
    <div className="ordermanager-container">
      <div className="ordermanager-header">
        <div className="ordermanager-toggle">
          <button onClick={() => setMode("SPOT")} className={mode === "SPOT" ? "active" : ""}>Spot</button>
          <button onClick={() => setMode("FUTURE")} className={mode === "FUTURE" ? "active" : ""}>Future</button>
        </div>
        <div className="ordermanager-stats">
            <span><b>Balance:</b> ${summary?.balance_usdt?.toFixed(2)}</span>
            
            <span style={{ color: totalProfit > 0 ? "limegreen" : totalProfit < 0 ? "crimson" : "#ccc" }}>
            <b>PnL:</b>{" "}
            {totalProfit > 0 && "🔺 "}
            {totalProfit < 0 && "🔻 "}
            {totalProfit >= 0 ? "+" : ""}${totalProfit.toFixed(2)} 
            ({((totalProfit / sumTotal) * 100 || 0).toFixed(2)}%)
            </span>

            <span style={{ 
            color: winrate > 50 ? "limegreen" : winrate < 50 ? "crimson" : "#ffeb3b" 
            }}>
            <b>Winrate:</b> {winrate.toFixed(2)}%
            </span>

            {assetFilter && (
            <span style={{ marginLeft: 12, color: "#0e639c" }}>
                Filter: {assetFilter}
            </span>
            )}
        </div>
      </div>

      <div className="ordermanager-body">
        <div className="ordermanager-pane">
          <h3>Assets Summary</h3>
          <input placeholder="Filter asset name..." value={filterText} onChange={e => setFilterText(e.target.value)} />
          <div className="scrollable-pane">
            <table className="asset-summary-table">
                <thead>
                <tr>
                    <th>Asset</th>
                    <th>Amount</th>
                    {mode === "FUTURE" && (
                    <>
                        <th style={{ textAlign: "center" }}>Entry Price</th>
                        <th style={{ textAlign: "center" }}>Market Price</th>
                        <th style={{ textAlign: "center" }}>PnL</th>
                    </>
                    )}
                </tr>
                </thead>
                <tbody>
                {assetList.map(([name, amount]) => {
                    const isSelected = assetFilter.includes(name);
                    const rowStyle = { cursor: "pointer", backgroundColor: isSelected ? "#2a2a2a" : "inherit" };

                    if (typeof amount === "object") {
                    const { positionAmt, entryPrice, markPrice, unrealizedPnL } = amount;
                    const isProfit = parseFloat(unrealizedPnL) >= 0;
                    const pctPnL = (unrealizedPnL/(entryPrice*Math.abs(positionAmt)))*100
                    return (
                        <tr key={name} style={rowStyle} onClick={() => handleAssetClick(name)}>
                        <td>
                            <span style={{
                            fontWeight: "bold",
                            backgroundColor: isProfit ? "limegreen" : "crimson",
                            color: "black",
                            padding: "2px 6px",
                            borderRadius: "4px"
                            }}>
                            {name}
                            </span>
                        </td>
                        <td>{parseFloat(positionAmt).toFixed(3)}</td>
                        <td style={{ textAlign: "center",color: "#4FC3F7" }}>{parseFloat(entryPrice).toFixed(2)}</td>
                        <td style={{ textAlign: "center",color: "#BA68C8" }}>{parseFloat(markPrice).toFixed(2)}</td>
                        <td style={{ textAlign: "center", color: isProfit ? "limegreen" : "red" }}>{parseFloat(unrealizedPnL).toFixed(2)}USDT ({pctPnL.toFixed(2)}% {pctPnL > 0 ? "↑" : pctPnL < 0 ? "↓" : ""})</td>
                        </tr>
                    );
                    } else {
                    return (
                        <tr key={name} style={rowStyle} onClick={() => handleAssetClick(name)}>
                        <td>
                            <span style={{
                            fontWeight: "bold",
                            backgroundColor: "limegreen",
                            color: "black",
                            padding: "2px 6px",
                            borderRadius: "4px"
                            }}>
                            {name}
                            </span>
                        </td>
                        <td>{parseFloat(amount).toFixed(3)}</td>
                        </tr>
                    );
                    }
                })}
                </tbody>
            </table>
        </div>
        </div>
</div>
<div className="ordermanager-pane">
  <h3>Orders List</h3>
  <div className="ordermanager-toggle" style={{ display: "flex" }}>
    <button onClick={() => setOrderTab("OPEN")} className={orderTab === "OPEN" ? "active" : ""}>Open Orders</button>
    <button onClick={() => setOrderTab("CLOSED")} className={orderTab === "CLOSED" ? "active" : ""}>Closed Orders</button>
  </div>
  <div className="date-filters">
    <input type="datetime-local" value={filterDates.from} onChange={e => setFilterDates(prev => ({ ...prev, from: e.target.value }))} />
    <input type="datetime-local" value={filterDates.to} onChange={e => setFilterDates(prev => ({ ...prev, to: e.target.value }))} />
    {orderTab === "CLOSED" && (
      <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
        <option value="ALL">All</option>
        <option value="FILLED">FILLED</option>
        <option value="CANCELED">CANCELED</option>
      </select>
    )}
  </div>
  <div className="scrollable-pane">
    <table className="order-table asset-summary-table">
      <thead>
        <tr>
          <th>Order Date</th>
          <th>Symbol</th>
          <th>Side</th>
          <th>Status</th>
          <th>Price</th>
          <th>Amount</th>
          <th>USD Cost</th>
        </tr>
      </thead>
      <tbody>
        {(orderTab === "OPEN" ? filteredOpen : filteredClosed).map(order => {
          const isBuy = order.side === "BUY";
          const statusClass = order.status === "FILLED"
            ? "status-filled"
            : order.status === "NEW"
            ? "status-new"
            : "status-cancelled";

          let price;
          if (mode === "FUTURE") {
            price = orderTab === "CLOSED"
                ? order.avgPrice || order.stopPrice
                : order.stopPrice;
          } else {
            price = (parseFloat(order.price) > 0)
                ? order.price
                : (order.cummulativeQuoteQty / order.executedQty);
          }

          const qty = order.executedQty;
          const total = mode === "FUTURE" ? order.cumQuote : order.cummulativeQuoteQty;

          return (
            <tr key={order.orderId}>
              <td>{new Date(order.time).toLocaleString()}</td>
              <td>{order.symbol}</td>
              <td className={isBuy ? "buy" : "sell"}>{order.side}</td>
              <td className={statusClass}>{order.status}</td>
              <td className="price-highlight">{parseFloat(price).toFixed(2)}</td>
              <td>{parseFloat(qty).toFixed(3)}</td>
              <td>{parseFloat(total).toFixed(2)}</td>
            </tr>
          );
        })}
      </tbody>
       <tfoot style={{ fontWeight: "bold",color: "#4FC3F7" }}>
            <tr>
            <td colSpan="5" >Total</td>
            <td>{sumQty.toFixed(3)}</td>
            <td>{sumTotal.toFixed(2)}</td>
            </tr>
        </tfoot>
    </table>
  </div>
</div>

      </div>
  );
}
