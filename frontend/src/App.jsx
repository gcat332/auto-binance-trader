import React, { useRef, useEffect } from "react";
import RuleManager from "./components/RuleManager";
import TradeLogPanel from "./components/TradeLogPanel";
import OrderManager from "./components/OrderManager";
import './App.css';

export default function App() {
  const splitterRef = useRef(null);

  useEffect(() => {
    const splitter = splitterRef.current;
    let isDragging = false;

    const onMouseDown = () => (isDragging = true);
    const onMouseMove = (e) => {
      if (!isDragging) return;
      const percent = (e.clientX / window.innerWidth) * 100;
      document.documentElement.style.setProperty("--left-width", `${percent}%`);
    };
    const onMouseUp = () => (isDragging = false);

    splitter.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      splitter.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  return (
    <div className="app-layout">
      <div className="left-panel">
        <RuleManager />
        <OrderManager />
      </div>
      <div ref={splitterRef} className="splitter" />
      <div className="right-panel">
        <TradeLogPanel />
      </div>
    </div>
  );
}