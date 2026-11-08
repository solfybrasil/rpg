import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import {
  GRAPH,
  REG,
  P,
  rad,
  type OathTreeNode,
  type OathTreeState,
} from '../../../entities/oath-tree';

const { N, E, IDS } = GRAPH;

const SIZE: Record<string, number> = {
  hub: 34,
  entry: 13,
  minor: 10,
  notable: 17,
  skill: 18,
  key: 27,
};

export interface OathTreeCanvasProps {
  curTree: OathTreeState;
  heroLevel: number;
  highlightedNodeIds?: Set<string>;
  selectedNodeId: string | null;
  onSelectNode: (node: OathTreeNode | null) => void;
  isParchmentMode?: boolean;
}

export const OathTreeCanvas: React.FC<OathTreeCanvasProps> = ({
  curTree,
  heroLevel,
  highlightedNodeIds,
  selectedNodeId,
  onSelectNode,
  isParchmentMode = false,
}) => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<SVGGElement | null>(null);

  // Pan & Zoom via Ref (zero re-renders during pan and zoom for 60-120fps fluid speed)
  const viewRef = useRef({ x: 0, y: 0, s: 0.35 });
  const ptsRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchDistRef = useRef<number | null>(null);
  const movedRef = useRef<number>(0);
  const startNodeRef = useRef<string | null>(null);

  // Node state helpers
  const marks = useCallback((id: string) => curTree.m?.[id] || 0, [curTree.m]);

  const isNodeDone = useCallback(
    (id: string) => {
      const node = N[id];
      if (!node) return false;
      return id === 'hub' || marks(id) >= (node.custo ?? 999) || Boolean(curTree.g?.[id]);
    },
    [curTree.g, marks],
  );

  const isConnected = useCallback(
    (id: string) => {
      const node = N[id];
      if (!node) return false;
      for (const a of node.adj) {
        if (isNodeDone(a)) return true;
      }
      return false;
    },
    [isNodeDone],
  );

  const getNodeState = useCallback(
    (id: string): 'done' | 'avail' | 'lvlock' | 'locked' => {
      if (isNodeDone(id)) return 'done';
      const node = N[id];
      if (!node) return 'locked';
      const conn = isConnected(id);
      if (!conn && marks(id) === 0) return 'locked';
      if (heroLevel < (node.lv ?? 1)) return 'lvlock';
      return 'avail';
    },
    [heroLevel, isConnected, isNodeDone, marks],
  );

  // Apply GPU accelerated transform directly to SVG <g>
  const applyTransform = useCallback((x: number, y: number, s: number) => {
    viewRef.current = { x, y, s };
    if (sceneRef.current) {
      sceneRef.current.setAttribute('transform', `translate(${x}, ${y}) scale(${s})`);
    }
  }, []);

  // Fit view to container size
  const fitView = useCallback(() => {
    if (!mapRef.current) return;
    const w = mapRef.current.clientWidth;
    const h = mapRef.current.clientHeight;
    if (w <= 0 || h <= 0) return;
    const s = Math.max(0.18, Math.min(w, h) / 2280);
    applyTransform(w / 2, h / 2, s);
  }, [applyTransform]);

  useEffect(() => {
    fitView();
    const handleResize = () => {
      fitView();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [fitView]);

  // Center on node if selected externally
  useEffect(() => {
    if (!selectedNodeId || !mapRef.current) return;
    const node = N[selectedNodeId];
    if (node) {
      const w = mapRef.current.clientWidth;
      const h = mapRef.current.clientHeight;
      const s = Math.max(viewRef.current.s, 0.7);
      const nx = w / 2 - node.x * s;
      const ny = h / 2 - node.y * s;
      applyTransform(nx, ny, s);
    }
  }, [applyTransform, selectedNodeId]);

  const zoomAt = useCallback(
    (factor: number, cx: number, cy: number) => {
      const v = viewRef.current;
      const ns = Math.min(2.8, Math.max(0.16, v.s * factor));
      const k = ns / v.s;
      const nx = cx - (cx - v.x) * k;
      const ny = cy - (cy - v.y) * k;
      applyTransform(nx, ny, ns);
    },
    [applyTransform],
  );

  // Wheel zoom handler with passive: false
  useEffect(() => {
    const el = mapRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const factor = Math.exp(-e.deltaY * 0.0018);
      zoomAt(factor, e.clientX - r.left, e.clientY - r.top);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomAt]);

  // Pointer drag & pinch handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('.oath-zoom-controls')) return;
    mapRef.current?.setPointerCapture(e.pointerId);
    ptsRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    movedRef.current = 0;
    const g = (e.target as HTMLElement).closest('.oath-node-group') as SVGElement | null;
    startNodeRef.current = g ? g.dataset.id || null : null;
    if (mapRef.current) mapRef.current.style.cursor = 'grabbing';
    if (ptsRef.current.size === 2) {
      const [p1, p2] = Array.from(ptsRef.current.values());
      pinchDistRef.current = Math.hypot(p1.x - p2.x, p1.y - p2.y);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!ptsRef.current.has(e.pointerId)) return;
    const prevPt = ptsRef.current.get(e.pointerId)!;
    const dx = e.clientX - prevPt.x;
    const dy = e.clientY - prevPt.y;
    ptsRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (ptsRef.current.size === 1) {
      const v = viewRef.current;
      applyTransform(v.x + dx, v.y + dy, v.s);
      movedRef.current += Math.abs(dx) + Math.abs(dy);
    } else if (ptsRef.current.size === 2) {
      const [p1, p2] = Array.from(ptsRef.current.values());
      const curDist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      if (pinchDistRef.current && pinchDistRef.current > 0 && curDist > 0) {
        const factor = curDist / pinchDistRef.current;
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        if (mapRef.current) {
          const r = mapRef.current.getBoundingClientRect();
          zoomAt(factor, midX - r.left, midY - r.top);
        }
        movedRef.current += 20;
      }
      pinchDistRef.current = curDist;
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!ptsRef.current.has(e.pointerId)) return;
    ptsRef.current.delete(e.pointerId);
    if (ptsRef.current.size < 2) {
      pinchDistRef.current = null;
    }
    if (ptsRef.current.size === 0) {
      if (mapRef.current) mapRef.current.style.cursor = 'grab';
      if (movedRef.current < 8) {
        if (startNodeRef.current) {
          const clickedNode = N[startNodeRef.current] || null;
          onSelectNode(clickedNode);
        } else if (selectedNodeId) {
          onSelectNode(null);
        }
      }
    }
  };

  // 1. SETORES E ANÉIS RADIAIS COLORIDOS DAS 8 REGIÕES
  const staticSectors = useMemo(() => {
    return (
      <g pointerEvents="none" className="sectors-layer">
        {/* Círculos concêntricos de referência */}
        {[255, 560, 930, 1010].map((r, i) => (
          <circle
            key={r}
            cx={0}
            cy={0}
            r={r}
            fill="none"
            stroke={isParchmentMode ? '#9c7b4a' : '#6b5334'}
            strokeOpacity={i === 3 ? 0.75 : 0.35}
            strokeWidth={i === 3 ? 2.5 : 1}
            strokeDasharray={i === 3 ? undefined : '4 10'}
          />
        ))}

        {/* 8 Setores Radiais Coloridos */}
        {REG.map((R, k) => {
          const a0 = rad(k * 45 - 22.5);
          const a1 = rad(k * 45 + 22.5);
          const [x0, y0] = P(1010, a0);
          const [x1, y1] = P(1010, a1);
          const [i0, j0] = P(200, a0);
          const [i1, j1] = P(200, a1);
          const [lx, ly] = P(1065, rad(k * 45));

          return (
            <g key={R.nome}>
              <path
                d={`M${i0},${j0} L${x0},${y0} A1010,1010 0 0 1 ${x1},${y1} L${i1},${j1} A200,200 0 0 0 ${i0},${j0}Z`}
                fill={R.cor}
                fillOpacity={isParchmentMode ? 0.09 : 0.07}
                stroke={R.cor}
                strokeOpacity={isParchmentMode ? 0.35 : 0.22}
              />
              <text
                x={lx}
                y={ly + 8}
                textAnchor="middle"
                fill={R.cor}
                fontSize={42}
                fontFamily="var(--font-title, 'Cinzel', serif)"
                fontWeight={700}
                letterSpacing="0.1em"
                style={{
                  filter: isParchmentMode ? undefined : 'drop-shadow(0 2px 8px rgba(0,0,0,0.8))',
                }}
              >
                {R.nome.toUpperCase()}
              </text>
              <text
                x={lx}
                y={ly + 38}
                textAnchor="middle"
                fill={isParchmentMode ? '#7a5a2d' : '#a88b5a'}
                fontSize={22}
                fontFamily="var(--font-title, 'Cinzel', serif)"
              >
                {R.attr}
              </text>
            </g>
          );
        })}
      </g>
    );
  }, [isParchmentMode]);

  // 2. CONEXÕES / EDGES COLORIDAS
  const renderedEdges = useMemo(() => {
    return (
      <g pointerEvents="none" className="edges-layer" shapeRendering="optimizeSpeed">
        {E.map(([a, b], idx) => {
          const nodeA = N[a];
          const nodeB = N[b];
          if (!nodeA || !nodeB) return null;

          const da = isNodeDone(a);
          const db = isNodeDone(b);
          const isLit = da && db;
          const isHalf = da || db;

          const strokeColor = isLit
            ? nodeB.cor === nodeA.cor
              ? nodeA.cor
              : isParchmentMode
              ? '#9c7426'
              : '#c9a961'
            : isHalf
            ? isParchmentMode
              ? '#9c825a'
              : '#6e5635'
            : isParchmentMode
            ? 'rgba(120, 95, 60, 0.25)'
            : '#3d2e1c';

          return (
            <line
              key={idx}
              x1={nodeA.x}
              y1={nodeA.y}
              x2={nodeB.x}
              y2={nodeB.y}
              stroke={strokeColor}
              strokeWidth={isLit ? 3.5 : isHalf ? 2.2 : 1.2}
              strokeDasharray={isHalf && !isLit ? '6 4' : undefined}
              strokeLinecap="round"
            />
          );
        })}
      </g>
    );
  }, [isNodeDone, isParchmentMode]);

  return (
    <div
      ref={mapRef}
      className="oath-map-viewport"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        position: 'relative',
        width: '100%',
        height: '620px',
        overflow: 'hidden',
        cursor: 'grab',
        touchAction: 'none',
        userSelect: 'none',
        background: isParchmentMode
          ? 'radial-gradient(ellipse at 50% 50%, #f7f1df 0%, #ebe0c5 60%, #ded1b1 100%)'
          : 'radial-gradient(ellipse at 50% 50%, #1e1710 0%, #110d09 60%, #080604 100%)',
      }}
    >
      <svg
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          overflow: 'hidden',
        }}
      >
        <g
          ref={sceneRef}
          transform={`translate(${viewRef.current.x}, ${viewRef.current.y}) scale(${viewRef.current.s})`}
          style={{ willChange: 'transform' }}
        >
          {/* Setores de fundo memoizados */}
          {staticSectors}

          {/* Linhas / Conexões (Edges) memoizadas */}
          {renderedEdges}

          {/* Nós Interativos */}
          {IDS.map((id) => {
            const n = N[id];
            if (!n) return null;
            const r = SIZE[n.tipo] || 15;
            const s = getNodeState(id);
            const isDone = s === 'done';
            const isSel = selectedNodeId === id;
            const isMatch = highlightedNodeIds?.has(id);
            const part = !isDone && marks(id) > 0;

            const haloStroke = isMatch
              ? '#38bdf8'
              : isSel
              ? '#ffffff'
              : s === 'avail'
              ? '#f59e0b'
              : 'transparent';

            const haloWidth = isMatch ? 3.5 : isSel ? 3 : s === 'avail' ? 2 : 0;

            return (
              <g
                key={id}
                className="oath-node-group"
                data-id={id}
                transform={`translate(${n.x}, ${n.y})`}
                style={{ cursor: 'pointer' }}
              >
                {/* Halo de destaque / pulso */}
                <circle
                  r={r + 6}
                  fill="transparent"
                  stroke={haloStroke}
                  strokeWidth={haloWidth}
                  strokeOpacity={s === 'avail' ? 0.85 : 1}
                />

                {/* Núcleo do nó (quadrado rotacionado para perícias, círculo para os demais) */}
                {n.tipo === 'skill' ? (
                  <rect
                    x={-r * 0.78}
                    y={-r * 0.78}
                    width={r * 1.56}
                    height={r * 1.56}
                    transform="rotate(45)"
                    rx={3}
                    fill={isDone ? n.cor : part ? '#5c3e21' : isParchmentMode ? '#ede1c7' : '#1c150e'}
                    stroke={isDone || part ? n.cor : isParchmentMode ? '#a89478' : '#6b5334'}
                    strokeWidth={2.5}
                  />
                ) : (
                  <circle
                    r={r}
                    fill={isDone ? n.cor : part ? '#5c3e21' : isParchmentMode ? '#ede1c7' : '#1c150e'}
                    stroke={isDone || part ? n.cor : isParchmentMode ? '#a89478' : '#6b5334'}
                    strokeWidth={2.5}
                  />
                )}

                {/* Anel interno para nó lendário ou centro */}
                {(n.tipo === 'key' || n.tipo === 'hub') && (
                  <circle
                    r={r - 6}
                    fill="none"
                    stroke={isDone ? '#ffffff' : n.cor}
                    strokeWidth={1.5}
                  />
                )}

                {/* Rótulo do nó com textShadow */}
                {n.tipo !== 'minor' && (
                  <text
                    x={0}
                    y={r + 14}
                    textAnchor="middle"
                    fill={isParchmentMode ? '#2e261a' : '#f3e8c8'}
                    fontSize={n.tipo === 'key' || n.tipo === 'hub' ? 16 : 12}
                    fontFamily="var(--font-title, 'Cinzel', serif)"
                    fontWeight={700}
                    pointerEvents="none"
                    style={{
                      textShadow: isParchmentMode
                        ? '0 1px 2px rgba(255,255,255,0.8)'
                        : '0 1px 3px #000, 0 2px 6px #000',
                    }}
                  >
                    {n.nm}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Controles de Zoom Flutuantes */}
      <div
        className="oath-zoom-controls"
        style={{
          position: 'absolute',
          right: 14,
          top: 14,
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          zIndex: 5,
        }}
      >
        <button
          type="button"
          onClick={() => {
            if (mapRef.current) {
              zoomAt(1.3, mapRef.current.clientWidth / 2, mapRef.current.clientHeight / 2);
            }
          }}
          className="oath-tree-btn"
          style={{
            width: '36px',
            height: '36px',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '6px',
          }}
          title="Aproximar Zoom"
        >
          <ZoomIn size={16} />
        </button>
        <button
          type="button"
          onClick={() => {
            if (mapRef.current) {
              zoomAt(1 / 1.3, mapRef.current.clientWidth / 2, mapRef.current.clientHeight / 2);
            }
          }}
          className="oath-tree-btn"
          style={{
            width: '36px',
            height: '36px',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '6px',
          }}
          title="Afastar Zoom"
        >
          <ZoomOut size={16} />
        </button>
        <button
          type="button"
          onClick={fitView}
          className="oath-tree-btn"
          style={{
            width: '36px',
            height: '36px',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '6px',
          }}
          title="Ver Árvore Inteira"
        >
          <Maximize2 size={16} />
        </button>
      </div>

      {/* Legenda Resumida Flutuante */}
      <div
        style={{
          position: 'absolute',
          left: 14,
          top: 14,
          background: isParchmentMode ? 'rgba(247, 241, 223, 0.92)' : 'rgba(17, 13, 9, 0.92)',
          border: isParchmentMode
            ? '1px solid rgba(160, 130, 90, 0.4)'
            : '1px solid rgba(201, 169, 97, 0.25)',
          borderRadius: '6px',
          padding: '6px 10px',
          fontSize: '11px',
          fontFamily: "var(--font-title, 'Cinzel', serif)",
          color: isParchmentMode ? '#4a3b25' : '#c4b59f',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          zIndex: 5,
          pointerEvents: 'none',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: '#6b5334',
              display: 'inline-block',
            }}
          />
          Menor · 1 marca
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              width: '11px',
              height: '11px',
              transform: 'rotate(45deg)',
              background: '#d47426',
              display: 'inline-block',
            }}
          />
          Perícia (+1 / +2)
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              border: '2px solid #f59e0b',
              display: 'inline-block',
            }}
          />
          Disponível para investir
        </span>
      </div>
    </div>
  );
};
