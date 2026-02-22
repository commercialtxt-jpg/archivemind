import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { useGraph } from '../../hooks/useGraph';
import type { GraphNode } from '../../types';

type FilterType = 'all' | 'interviews' | 'concepts' | 'locations';

interface KnowledgeGraphProps {
  onClose: () => void;
}

const NODE_COLORS: Record<string, string> = {
  person: '#C4844A',
  artifact: '#C4844A',
  location: '#CF6A4C',
  concept: '#6B8C7A',
};

const FILTER_STYLES: Record<FilterType, { border: string; bg: string; text: string }> = {
  all: { border: 'rgba(255,255,255,0.15)', bg: 'rgba(255,255,255,0.06)', text: 'rgba(250,247,242,0.7)' },
  interviews: { border: 'rgba(207,106,76,0.5)', bg: 'rgba(207,106,76,0.15)', text: '#E07B5A' },
  concepts: { border: 'rgba(107,140,122,0.5)', bg: 'rgba(107,140,122,0.1)', text: '#8BA898' },
  locations: { border: 'rgba(196,132,74,0.5)', bg: 'rgba(196,132,74,0.1)', text: '#E0A060' },
};

export default function KnowledgeGraph({ onClose }: KnowledgeGraphProps) {
  const [filter, setFilter] = useState<FilterType>('all');
  const [visibleTypes, setVisibleTypes] = useState<Set<string>>(new Set(['person', 'artifact', 'location', 'concept']));
  const { data: graphData, isLoading } = useGraph(filter === 'all' ? undefined : filter);
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fgRef = useRef<any>(undefined);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Handle resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Escape key to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Filter toggling
  const handleFilterClick = (f: FilterType) => {
    setFilter(f);
    if (f === 'all') {
      setVisibleTypes(new Set(['person', 'artifact', 'location', 'concept']));
    } else if (f === 'interviews') {
      setVisibleTypes(new Set(['person', 'artifact']));
    } else if (f === 'concepts') {
      setVisibleTypes(new Set(['concept']));
    } else if (f === 'locations') {
      setVisibleTypes(new Set(['location']));
    }
  };

  // Transform data for react-force-graph
  const forceData = useMemo(() => {
    if (!graphData) return { nodes: [], links: [] };
    const filteredNodes = graphData.nodes.filter(n => visibleTypes.has(n.node_type));
    const nodeIds = new Set(filteredNodes.map(n => n.id));
    const links = graphData.edges
      .filter(e => nodeIds.has(e.source) && nodeIds.has(e.target))
      .map(e => ({
        source: e.source,
        target: e.target,
        strength: e.strength,
        is_dashed: e.is_dashed,
        edge_type: e.edge_type,
      }));
    return {
      nodes: filteredNodes.map(n => ({ ...n })),
      links,
    };
  }, [graphData, visibleTypes]);

  const nodeSize = useCallback((node: GraphNode) => {
    const base = 8;
    return base + Math.min(node.note_count * 3, 20);
  }, []);

  const nodeCanvasObject = useCallback((node: GraphNode & { x?: number; y?: number }, ctx: CanvasRenderingContext2D) => {
    const x = node.x ?? 0;
    const y = node.y ?? 0;
    const r = nodeSize(node);
    const color = NODE_COLORS[node.node_type] || '#C4844A';

    // Node circle
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.7;
    ctx.fill();
    ctx.globalAlpha = 1;

    // Label
    ctx.font = '4px "DM Sans", sans-serif';
    ctx.fillStyle = 'rgba(250,247,242,0.85)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(node.label, x, y);
  }, [nodeSize]);

  const linkCanvasObject = useCallback((link: { source: { x?: number; y?: number }; target: { x?: number; y?: number }; strength?: number; is_dashed?: boolean }, ctx: CanvasRenderingContext2D) => {
    const sx = (link.source as { x?: number }).x ?? 0;
    const sy = (link.source as { y?: number }).y ?? 0;
    const tx = (link.target as { x?: number }).x ?? 0;
    const ty = (link.target as { y?: number }).y ?? 0;

    ctx.beginPath();
    if (link.is_dashed) {
      ctx.setLineDash([6, 4]);
    } else {
      ctx.setLineDash([]);
    }
    ctx.moveTo(sx, sy);
    ctx.lineTo(tx, ty);
    ctx.strokeStyle = `rgba(250,247,242,${0.1 + (link.strength ?? 0.5) * 0.3})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.setLineDash([]);
  }, []);

  const handleZoomIn = () => fgRef.current?.zoom(1.5, 300);
  const handleZoomOut = () => fgRef.current?.zoom(0.67, 300);
  const handleReset = () => fgRef.current?.zoomToFit(400, 60);

  return (
    <div className="fixed inset-0 z-50 animate-fade-in" style={{ background: 'rgba(42,36,32,0.92)', backdropFilter: 'blur(4px)' }}>
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-4 z-10">
        <h2 className="font-serif text-[18px] font-semibold text-cream/90">
          🕸 Knowledge Graph
        </h2>

        <div className="flex items-center gap-2">
          {/* Filter pills */}
          {(Object.keys(FILTER_STYLES) as FilterType[]).map((f) => {
            const style = FILTER_STYLES[f];
            const active = filter === f;
            return (
              <button
                key={f}
                onClick={() => handleFilterClick(f)}
                className="px-3 py-1 rounded-full text-[11.5px] font-medium transition-all cursor-pointer capitalize"
                style={{
                  border: `1px solid ${active ? style.text : style.border}`,
                  background: active ? style.bg : 'transparent',
                  color: style.text,
                }}
              >
                {f}
              </button>
            );
          })}

          {/* Close button */}
          <button
            onClick={onClose}
            className="ml-4 w-8 h-8 flex items-center justify-center rounded-full text-cream/60 hover:text-cream hover:bg-white/10 transition-all cursor-pointer text-lg"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Graph canvas */}
      <div ref={containerRef} className="w-full h-full">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-cream/50 text-sm">
            Loading graph...
          </div>
        ) : (
          <ForceGraph2D
            ref={fgRef}
            width={dimensions.width}
            height={dimensions.height}
            graphData={forceData}
            nodeCanvasObject={nodeCanvasObject}
            linkCanvasObject={linkCanvasObject}
            nodeId="id"
            backgroundColor="rgba(0,0,0,0)"
            cooldownTicks={100}
            enableNodeDrag={true}
            enableZoomInteraction={true}
          />
        )}
      </div>

      {/* Legend (bottom-left) */}
      <div className="absolute bottom-6 left-6 flex flex-col gap-1.5 z-10">
        <LegendItem color="#CF6A4C" label="Locations" />
        <LegendItem color="#6B8C7A" label="Concepts" />
        <LegendItem color="#C4844A" label="People / Entities" />
        <div className="flex items-center gap-2">
          <svg width="20" height="6"><line x1="0" y1="3" x2="20" y2="3" stroke="rgba(250,247,242,0.5)" strokeWidth="1.5" strokeDasharray="4,3" /></svg>
          <span className="text-[10.5px] text-cream/50">Cross-region link</span>
        </div>
      </div>

      {/* Zoom controls (bottom-right) */}
      <div className="absolute bottom-6 right-6 flex flex-col gap-1 z-10">
        <ZoomBtn label="+" onClick={handleZoomIn} />
        <ZoomBtn label="−" onClick={handleZoomOut} />
        <ZoomBtn label="⟳" onClick={handleReset} />
      </div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color, opacity: 0.8 }} />
      <span className="text-[10.5px] text-cream/50">{label}</span>
    </div>
  );
}

function ZoomBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/8 border border-white/10 text-cream/60 hover:text-cream hover:bg-white/15 transition-all cursor-pointer text-sm font-mono"
    >
      {label}
    </button>
  );
}
