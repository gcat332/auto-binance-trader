import React, { useEffect, useState } from "react";
import ReactFlow, {
  ReactFlowProvider,
  Background,
  Controls,
  Handle,
  Position,
  applyNodeChanges,
  applyEdgeChanges,
} from "reactflow";
import "reactflow/dist/style.css";

const OP_MAP = [
  { value: ">", label: ">" },
  { value: "<", label: "<" },
  { value: ">=", label: ">=" },
  { value: "<=", label: "<=" },
  { value: "=", label: "=" },
  { value: "cross_up", label: "Golden Cross" },
  { value: "cross_down", label: "Death Cross" },
];

const INDICATOR_TYPES = [
  "EMA", "RSI", "MACD", "PRICE", "CANDLE", "BREAKOUT", "VOLUME", "TIME"
];

const PRICE_NAMES = ["CLOSE", "OPEN", "HIGH", "LOW", "VOLUME"];
const CANDLE_NAMES = [
  "BULLISH_ENGULFING", "BEARISH_ENGULFING", "DOJI", "HAMMER", "INVERTED_HAMMER"
];
const BREAKOUT_NAMES = ["HIGH", "LOW"];

// ---- ConditionNode ----
function ConditionNode({ id, data }) {
  const { type, indicator, name, operator, compared, value, setNodeData, allIndicators } = data;

  // Dynamic indicator name options
  const indicatorNameOptions = (() => {
    switch (type) {
      case "EMA":   return (allIndicators?.ema || []).map(e => e.Name);
      case "RSI":   return (allIndicators?.rsi || []).map(e => e.Name);
      case "MACD":  return (allIndicators?.macd || []).map(e => e.Name);
      case "PRICE": return PRICE_NAMES;
      case "CANDLE": return CANDLE_NAMES;
      case "BREAKOUT": return BREAKOUT_NAMES;
      default:      return [];
    }
  })();

  // Operator options by type
  let operatorOptions = [];
  if (["EMA", "RSI", "MACD"].includes(type)) {
    operatorOptions = OP_MAP;
  } else if (["PRICE", "VOLUME"].includes(type)) {
    operatorOptions = OP_MAP.filter(op => !op.value.includes("cross"));
  } else if (type === "BREAKOUT") {
    operatorOptions = [
      { value: ">", label: "Break Above" },
      { value: "<", label: "Break Below" }
    ];
  }

  // Compared options
  let comparedOptions = [];
  if (operator === "cross_up" || operator === "cross_down") {
    if (type === "RSI") {
      comparedOptions = ["overbought", "oversold", "Manual Value"];
    } else if (type === "MACD") {
      comparedOptions = ["signal", "Manual Value"];
    } else if (type === "EMA") {
      const arr = (allIndicators?.ema || []).map(e => e.Name).filter(i => i !== name);
      comparedOptions = arr.concat("Manual Value");
    }
  } else if (["EMA", "RSI", "MACD", "PRICE", "VOLUME"].includes(type)) {
    // Compared กับทุก indicator + Manual Value
    let allNames = [
      ...(allIndicators?.ema || []),
      ...(allIndicators?.rsi || []),
      ...(allIndicators?.macd || []),
    ].map(e => e.Name);
    if (type === "PRICE") {
      allNames = [...PRICE_NAMES, ...allNames];
    }
    comparedOptions = allNames.concat("Manual Value");
  }

  // BREAKOUT ไม่มี compared, TIME ไม่มี compared/operator/name
  // Helper for time range value
  const isTime = type === "TIME";
  const isBreakout = type === "BREAKOUT";
  const showOperator = !["CANDLE", "TIME"].includes(type);
  const showCompared = !isBreakout && !isTime && comparedOptions.length > 0 && operator;
  const showValue = (
    (compared === "Manual Value" && !isTime && !isBreakout) ||
    isBreakout
  );

  // ---- Time Picker สำหรับ TIME FILTER ----
  // value: ["09:00", "17:00"]
  const range = Array.isArray(value) ? value : ["09:00", "17:00"];

  return (
    <div className="rule-node" style={{minWidth:280}}>
      <label>Indicator Type</label>
      <select
        value={type}
        onChange={e => {
          const newType = e.target.value;
          let defaultName = "";
          if (["EMA", "RSI", "MACD"].includes(newType)) {
            defaultName = (allIndicators?.[newType.toLowerCase()] || [])[0]?.Name || "";
          } else if (newType === "PRICE") {
            defaultName = PRICE_NAMES[0];
          } else if (newType === "CANDLE") {
            defaultName = CANDLE_NAMES[0];
          } else if (newType === "BREAKOUT") {
            defaultName = BREAKOUT_NAMES[0];
          }
          setNodeData(id, {
            ...data,
            type: newType,
            name: defaultName,
            indicator: newType,
            operator: null,
            compared: null,
            value: null
          });
        }}
      >
        {INDICATOR_TYPES.map(t => <option key={t}>{t}</option>)}
      </select>

      {indicatorNameOptions.length > 0 && (
        <>
          <label>{type === "CANDLE" ? "Pattern" : type === "BREAKOUT" ? "Target" : "Indicator Name"}</label>
          <select
            value={name || ""}
            onChange={e => setNodeData(id, { ...data, name: e.target.value })}
          >
            {indicatorNameOptions.map(opt => <option key={opt}>{opt}</option>)}
          </select>
        </>
      )}

      {showOperator && (
        <>
          <label>Operation</label>
          <select
            value={operator || ""}
            onChange={e => setNodeData(id, { ...data, operator: e.target.value, compared: null, value: null })}
          >
            <option value="">--</option>
            {operatorOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </>
      )}

      {showCompared && (
        <>
          <label>Compared</label>
          <select
            value={compared || ""}
            onChange={e => setNodeData(id, { ...data, compared: e.target.value, value: null })}
          >
            <option value="">--</option>
            {comparedOptions.map(opt => <option key={opt}>{opt}</option>)}
          </select>
        </>
      )}

      {showValue && (
        <>
          <label>Value</label>
          <input
            type="number"
            value={value || ""}
            onChange={e => setNodeData(id, { ...data, value: e.target.value })}
            placeholder="Value"
          />
        </>
      )}

      {/* Time Picker */}
      {isTime && (
        <div style={{display: "flex", gap: 4, alignItems: "center"}}>
          <label>Time Range</label>
          <input
            type="time"
            value={range[0]}
            onChange={e => setNodeData(id, { ...data, value: [e.target.value, range[1]] })}
            style={{width:90}}
          />
          <span> - </span>
          <input
            type="time"
            value={range[1]}
            onChange={e => setNodeData(id, { ...data, value: [range[0], e.target.value] })}
            style={{width:90}}
          />
        </div>
      )}

      <Handle type="target" position={Position.Top} isConnectable={true} />
      <Handle type="source" position={Position.Bottom} isConnectable={false} />
    </div>
  );
}

// ---- GroupNode ----
function GroupNode({ id, data }) {
  const { type, setNodeData } = data;
  return (
    <div className="rule-group-node">
      <label>Group</label>
      <select value={type} onChange={e => setNodeData(id, { ...data, type: e.target.value })}>
        <option value="AND">AND</option>
        <option value="OR">OR</option>
      </select>
      <Handle type="target" position={Position.Top} isConnectable={true} />
      <Handle type="source" position={Position.Bottom} isConnectable={true} />
    </div>
  );
}

// ---- NodeTypes ----
const nodeTypes = {
  condition: ConditionNode,
  group: GroupNode,
};

// ---- Main RuleBuilder Component ----
export default function RuleBuilder({ indicatorConfig, logic, setLogic }) {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);

  function handleNodeBlur() {
    if (setLogic) {
      const encoded = encodeFlowToLogic(nodes, edges);
      setLogic(encoded);
    }
  }

  function setNodeData(id, newData) {
    setNodes(nds =>
      nds.map(n =>
        n.id === id ? { ...n, data: { ...newData, setNodeData, allIndicators: indicatorConfig } } : n
      )
    );
  }

  useEffect(() => {
    if (!indicatorConfig) return;
    if (logic) {
      const { nodes: parsedNodes, edges: parsedEdges } = decodeLogicToFlow(logic, indicatorConfig, setNodeData);
      setNodes(parsedNodes);
      setEdges(parsedEdges);
    } else {
      setNodes([]);
      setEdges([]);
    }
  }, [indicatorConfig, logic]);

  function addNode(type = "condition") {
    const newId = String(Date.now() + Math.random());
    // Default type & name
    const defaultType = "RSI";
    const defaultName = indicatorConfig?.rsi?.[0]?.Name || "RSI";
    const node = {
      id: newId,
      type,
      data: type === "group"
        ? { type: "AND", setNodeData, allIndicators: indicatorConfig }
        : {
            type: defaultType,
            indicator: defaultType,
            name: defaultName,
            operator: "cross_up",
            compared: "overbought",
            value: null,
            setNodeData,
            allIndicators: indicatorConfig,
          },
      position: { x: 100 + Math.random() * 200, y: 200 + Math.random() * 200 },
    };
    setNodes(nds => [...nds, node]);
    setEdges(eds => [...eds, { id: `e1-${newId}`, source: "1", target: newId }]);
  }

  return (
    <ReactFlowProvider>
      <div style={{ width: "100%", height: "100%" }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={changes => setNodes(nds => applyNodeChanges(changes, nds))}
          onEdgesChange={changes => setEdges(eds => applyEdgeChanges(changes, eds))}
          onConnect={params => setEdges(eds => [...eds, { ...params, id: `e${params.source}-${params.target}` }])}
          nodeTypes={nodeTypes}
          fitView
          connectOnClick={true}
        >
          <Background />
          <Controls />
        </ReactFlow>
        <div style={{fontSize: 14, marginTop: "28px", position: "absolute"}}>
          <button style={{ marginRight: 10 }} onClick={() => addNode("condition")}>+ Condition</button>
          <button style={{ marginRight: 10 }} onClick={() => addNode("group")}>+ Group (AND/OR)</button>
          <button style={{ backgroundColor: "lightgreen"}} onClick={() => handleNodeBlur()}>TF Logic</button>
        </div>
      </div>
    </ReactFlowProvider>
  );
}

// ---- decodeLogicToFlow ----
function decodeLogicToFlow(logic, indicatorConfig, setNodeData) {
  let idCounter = 1;
  const nodes = [];
  const edges = [];

  function createNode(node, parentId = null) {
    if (!node || typeof node !== "object") return;

    const thisId = String(idCounter++);
    if (node.type === "AND" || node.type === "OR") {
      nodes.push({
        id: thisId,
        type: "group",
        data: {
          type: node.type,
          setNodeData,
          allIndicators: indicatorConfig,
        },
        position: { x: 100 + idCounter * 30, y: 100 + idCounter * 50 },
      });
      if (parentId) {
        edges.push({ id: `e${parentId}-${thisId}`, source: parentId, target: thisId });
      }
      (node.conditions || []).forEach(child => createNode(child, thisId));
    } else {
      const data = {
        type: node.indicator,
        indicator: node.indicator,
        name: node.name,
        operator: node.operator,
        compared: node.compared,
        value: node.value,
        setNodeData,
        allIndicators: indicatorConfig,
      };
      // TIME: value เป็น array
      if (node.indicator === "TIME" && Array.isArray(node.value)) {
        data.value = node.value;
      }
      nodes.push({
        id: thisId,
        type: "condition",
        data,
        position: { x: 300 + idCounter * 30, y: 200 + idCounter * 40 },
      });
      if (parentId) {
        edges.push({ id: `e${parentId}-${thisId}`, source: parentId, target: thisId });
      }
    }
  }
  createNode(logic);
  return { nodes, edges };
}

// ---- encodeFlowToLogic ----
function encodeFlowToLogic(nodes, edges) {
  const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]));
  const allTargetIds = new Set(edges.map(e => e.target));
  const possibleRoots = nodes.filter(n => !allTargetIds.has(n.id));
  const root = possibleRoots[0] || nodes[0];

  function traverse(id) {
    const node = nodeMap[id];
    if (!node) return null;

    if (node.type === "group") {
      const conditionList = edges
        .filter(e => e.source === id)
        .map(e => traverse(e.target))
        .filter(Boolean);
      return {
        type: node.data.type,
        conditions: conditionList,
      };
    } else if (node.type === "condition") {
      const { type, indicator, name, operator, compared, value } = node.data;
      let obj = { type: "condition", indicator };
      if (["EMA", "RSI", "MACD", "PRICE", "BREAKOUT"].includes(type)) {
        obj.name = name;
        if (operator) obj.operator = operator;
        if (compared) obj.compared = compared;
        if (value !== null && value !== undefined && value !== "") obj.value = value;
      }
      if (type === "CANDLE") {
        obj.name = name;
      }
      if (type === "VOLUME") {
        if (operator) obj.operator = operator;
        if (compared) obj.compared = compared;
        if (value !== null && value !== undefined && value !== "") obj.value = value;
      }
      if (type === "TIME") {
        obj.value = Array.isArray(value) ? value : ["09:00", "17:00"];
      }
      return obj;
    }
  }
  return traverse(root?.id);
}
