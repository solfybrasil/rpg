import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { GRAPH, type OathTreeNode } from '../../../entities/oath-tree';

const { N, E } = GRAPH;

interface OathTreeCanvasProps {
  curTree: {
    m?: Record<string, number>;
    g?: Record<string, boolean>;
  };
  heroLevel: number;
  highlightedNodeIds?: Set<string>;
  selectedNodeId: string | null;
  onSelectNode: (node: OathTreeNode) => void;
  isParchmentMode: boolean;
}

const getNodeRadius = (tipo: string) => {
  switch (tipo) {
    case 'hub':
      return 18;
    case 'entry':
      return 8;
    case 'minor':
      return 5;
    case 'notable':
      return 9;
    case 'skill':
      return 10;
    case 'key':
      return 14;
    default:
      return 6;
  }
};

export const OathTreeCanvas: React.FC<OathTreeCanvasProps> = ({
  curTree,
  heroLevel,
  highlightedNodeIds,
  selectedNodeId,
  onSelectNode,
  isParchmentMode,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Pan & Zoom state
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 0.65 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, tx: 0, ty: 0 });

  // Node state helpers
  const marks = useCallback((id: string) => curTree.m?.[id] || 0, [curTree]);
  const isDone = useCallback(
    (id: string) => id === 'hub' || marks(id) >= (N[id]?.custo ?? 999) || Boolean(curTree.g?.[id]),
    [marks, curTree],
  );

  const isConnected = useCallback(
    (id: string) => {
      const node = N[id];
      if (!node) return false;
      for (const a of node.adj) {
        if (isDone(a)) return true;
      }
      return false;
    },
    [isDone],
  );

  const getNodeState = useCallback(
    (id: string) => {
      if (isDone(id)) return 'done';
      const node = N[id];
      if (!node) return 'locked';
      const conn = isConnected(id);
      if (!conn && marks(id) === 0) return 'locked';
      if (heroLevel < (node.lv ?? 1)) return 'lvlock';
      return 'avail';
    },
    [isDone, isConnected, marks, heroLevel],
  );

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // only left click
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      tx: transform.x,
      ty: transform.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setTransform((prev) => ({
      ...prev,
      x: dragStartRef.current.tx + dx,
      y: dragStartRef.current.ty + dy,
    }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Wheel zoom handler
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.88;
    setTransform((prev) => {
      const newScale = Math.min(Math.max(prev.scale * zoomFactor, 0.2), 2.2);
      return { ...prev, scale: newScale };
    });
  };

  // Zoom buttons
  const handleZoomIn = () => {
    setTransform((prev) => ({ ...prev, scale: Math.min(prev.scale * 1.2, 2.2) }));
  };

  const handleZoomOut = () => {
    setTransform((prev) => ({ ...prev, scale: Math.max(prev.scale * 0.8, 0.2) }));
  };

  const handleResetZoom = () => {
    setTransform({ x: 0, y: 0, scale: 0.65 });
  };

  // Colors based on theme
  const edgeColorDone = isParchmentMode ? '#9c7426' : '#c9a961';
  const edgeColorDefault = isParchmentMode ? 'rgba(92, 70, 45, 0.25)' : 'rgba(255, 255, 255, 0.12)';
  const nodeFillDone = isParchmentMode ? '#9c7426' : '#c9a961';
  const nodeStrokeDone = isParchmentMode ? '#5e4414' : '#f5e4b3';

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-[640px] md:h-[720px] rounded-xl overflow-hidden border select-none transition-colors ${
        isParchmentMode
          ? 'bg-[#f4ebd0] border-[#c4b595] text-[#2e261a]'
          : 'bg-[#0d0c0b] border-[var(--border)] text-[#e8e2d4]'
      }`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
    >
      {/* Zoom and Reset Controls Floating */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-1.5 p-1.5 rounded-lg bg-black/60 backdrop-blur-xs border border-white/10 shadow-lg">
        <button
          type="button"
          onClick={handleZoomIn}
          className="p-2 rounded hover:bg-white/10 text-white/80 hover:text-white transition-colors"
          title="Aumentar Zoom"
        >
          <ZoomIn size={16} />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          className="p-2 rounded hover:bg-white/10 text-white/80 hover:text-white transition-colors"
          title="Diminuir Zoom"
        >
          <ZoomOut size={16} />
        </button>
        <button
          type="button"
          onClick={handleResetZoom}
          className="p-2 rounded hover:bg-white/10 text-white/80 hover:text-white transition-colors"
          title="Centralizar Árvore"
        >
          <RotateCcw size={16} />
        </button>
      </div>

      {/* SVG Canvas */}
      <svg
        className="w-full h-full overflow-visible"
        viewBox="-1100 -1100 2200 2200"
      >
        <defs>
          <filter id="glow-gold" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <g
          transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}
        >
          {/* 1. Edges / Conexões */}
          <g className="edges-layer">
            {E.map(([idA, idB], idx) => {
              const nodeA = N[idA];
              const nodeB = N[idB];
              if (!nodeA || !nodeB) return null;

              const doneA = isDone(idA);
              const doneB = isDone(idB);
              const edgeDone = doneA && doneB;

              return (
                <line
                  key={`${idA}-${idB}-${idx}`}
                  x1={nodeA.x}
                  y1={nodeA.y}
                  x2={nodeB.x}
                  y2={nodeB.y}
                  stroke={edgeDone ? edgeColorDone : edgeColorDefault}
                  strokeWidth={edgeDone ? 1.5 : 1}
                  strokeOpacity={edgeDone ? 0.9 : 0.6}
                />
              );
            })}
          </g>

          {/* 2. Nodes / Nós */}
          <g className="nodes-layer">
            {Object.keys(N).map((id) => {
              const node = N[id];
              if (!node) return null;

              const state = getNodeState(id);
              const r = getNodeRadius(node.tipo);
              const isSelected = selectedNodeId === id;
              const isHighlighted = highlightedNodeIds?.has(id);

              let fill = isParchmentMode ? '#dfd4ba' : '#14120e';
              let stroke = isParchmentMode ? '#8c7b64' : '#3a352d';
              let strokeWidth = 1;
              let filter = undefined;

              if (state === 'done') {
                fill = nodeFillDone;
                stroke = nodeStrokeDone;
                strokeWidth = 2;
                if (!isParchmentMode) filter = 'url(#glow-gold)';
              } else if (state === 'avail') {
                fill = isParchmentMode ? '#fdfbf4' : '#1c1914';
                stroke = isParchmentMode ? '#9c7426' : '#c9a961';
                strokeWidth = 2;
              } else if (state === 'lvlock') {
                fill = isParchmentMode ? '#e6dec8' : '#161310';
                stroke = isParchmentMode ? '#a14232' : '#8a4030';
                strokeWidth = 1.5;
              }

              if (isSelected) {
                stroke = isParchmentMode ? '#1a140b' : '#ffffff';
                strokeWidth = 3;
              }

              if (isHighlighted) {
                stroke = '#38bdf8';
                strokeWidth = 3;
              }

              return (
                <g
                  key={id}
                  transform={`translate(${node.x}, ${node.y})`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectNode(node as OathTreeNode);
                  }}
                  className="cursor-pointer group"
                >
                  {/* Outer pulse for available nodes */}
                  {state === 'avail' && (
                    <circle
                      r={r + 3}
                      fill="none"
                      stroke={stroke}
                      strokeWidth={1}
                      strokeDasharray="3 3"
                      className="animate-spin"
                      style={{ animationDuration: '8s' }}
                    />
                  )}

                  {/* Main Node Circle */}
                  <circle
                    r={r}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                    filter={filter}
                    className="transition-transform group-hover:scale-125"
                  />

                  {/* Node icon / indicator inside */}
                  {node.tipo === 'hub' && (
                    <text
                      textAnchor="middle"
                      dy="4"
                      fontSize="9"
                      fill={isParchmentMode ? '#fff' : '#000'}
                      fontWeight="bold"
                      className="pointer-events-none font-cinzel"
                    >
                      J
                    </text>
                  )}

                  {/* Node Name for notable/skill/key nodes */}
                  {(node.tipo === 'hub' ||
                    node.tipo === 'key' ||
                    node.tipo === 'skill' ||
                    node.tipo === 'entry' ||
                    isSelected) && (
                    <text
                      textAnchor="middle"
                      y={r + 11}
                      fontSize="9"
                      fill={
                        isParchmentMode
                          ? state === 'done'
                            ? '#5e4414'
                            : '#473a27'
                          : state === 'done'
                            ? '#f5e4b3'
                            : '#9a917f'
                      }
                      fontWeight={node.tipo === 'key' || node.tipo === 'hub' ? 'bold' : 'normal'}
                      className="pointer-events-none font-cinzel"
                    >
                      {node.nm}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </g>
      </svg>
    </div>
  );
};
