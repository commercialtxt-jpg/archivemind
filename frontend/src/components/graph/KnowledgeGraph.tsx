import * as d3 from 'd3';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGraph } from '../../hooks/useGraph';
import { useUIStore } from '../../stores/uiStore';
import type { GraphEdge, GraphNode } from '../../types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FilterType = 'all' | 'entities' | 'concepts' | 'locations';

/** D3 simulation node — extends GraphNode with mutable x/y/vx/vy */
interface SimNode extends GraphNode {
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

/** D3 simulation link — source/target become SimNode objects after simulation starts */
interface SimLink {
  source: string | SimNode;
  target: string | SimNode;
  edge_type: string;
  strength: number;
  is_dashed: boolean;
}

// ---------------------------------------------------------------------------
// Colours
// ---------------------------------------------------------------------------

const CORAL = '#CF6A4C';
const AMBER = '#C4844A';
const SAGE = '#6B8C7A';
const CONCEPT_COLOR = '#8BA89A';
const CREAM = '#FAF7F2';

function nodeColor(node: GraphNode): string {
  if (node.node_type === 'concept') return CONCEPT_COLOR;
  if (node.entity_type === 'person') return CORAL;
  if (node.entity_type === 'location' || node.node_type === 'location') return SAGE;
  if (node.entity_type === 'artifact') return AMBER;
  return AMBER; // fallback
}

/** Minimum radius 8px, max 24px, scaling on note_count */
function nodeRadius(node: GraphNode): number {
  return 8 + Math.min(node.note_count * 3, 16);
}

// ---------------------------------------------------------------------------
// SVG path helpers for non-circle shapes
// ---------------------------------------------------------------------------

/** Diamond path centred at (0,0) with given half-size */
function diamondPath(size: number): string {
  return `M 0 ${-size} L ${size} 0 L 0 ${size} L ${-size} 0 Z`;
}

/** Equilateral triangle path centred at (0,0) */
function trianglePath(size: number): string {
  const h = size * 1.1;
  return `M 0 ${-h} L ${h} ${h * 0.65} L ${-h} ${h * 0.65} Z`;
}

// ---------------------------------------------------------------------------
// Tooltip helper
// ---------------------------------------------------------------------------

function nodeTypeLabel(node: GraphNode): string {
  if (node.node_type === 'concept') return 'Concept';
  if (node.entity_type === 'person') return 'Person';
  if (node.entity_type === 'location' || node.node_type === 'location') return 'Location';
  if (node.entity_type === 'artifact') return 'Artifact';
  return 'Entity';
}

// ---------------------------------------------------------------------------
// Prop types
// ---------------------------------------------------------------------------

interface KnowledgeGraphProps {
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function KnowledgeGraph({ onClose }: KnowledgeGraphProps) {
  const [filter, setFilter] = useState<FilterType>('all');
  const backendFilter = filter === 'all' ? undefined : filter;

  const { data: graphData, isLoading } = useGraph(backendFilter);

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Tooltip state
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    node: GraphNode | null;
  }>({ visible: false, x: 0, y: 0, node: null });

  const navigate = useNavigate();
  const { setSelectedEntityId, setSidebarFilter, setActiveView } = useUIStore();

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Filter → visible node_types
  const visibleTypes = useMemo<Set<string>>(() => {
    if (filter === 'entities') return new Set(['entity']);
    if (filter === 'concepts') return new Set(['concept']);
    if (filter === 'locations') return new Set(['location']);
    return new Set(['entity', 'concept', 'location']);
  }, [filter]);

  // Build filtered nodes + links for D3
  const { nodes, links } = useMemo<{ nodes: SimNode[]; links: SimLink[] }>(() => {
    if (!graphData) return { nodes: [], links: [] };

    const filteredNodes: SimNode[] = graphData.nodes
      .filter((n) => visibleTypes.has(n.node_type))
      .map((n) => ({ ...n }));

    const nodeIds = new Set(filteredNodes.map((n) => n.id));

    const filteredLinks: SimLink[] = graphData.edges
      .filter((e: GraphEdge) => nodeIds.has(e.source) && nodeIds.has(e.target))
      .map((e: GraphEdge) => ({
        source: e.source,
        target: e.target,
        edge_type: e.edge_type,
        strength: e.strength ?? 0.5,
        is_dashed: e.edge_type === 'entity_concept',
      }));

    return { nodes: filteredNodes, links: filteredLinks };
  }, [graphData, visibleTypes]);

  // Track hoveredId for highlight
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Main D3 effect — runs whenever nodes/links change
  useEffect(() => {
    const svg = svgRef.current;
    const container = containerRef.current;
    if (!svg || !container || nodes.length === 0) return;

    const W = container.clientWidth;
    const H = container.clientHeight;

    // Clear previous render
    d3.select(svg).selectAll('*').remove();

    // Root SVG setup
    const root = d3
      .select(svg)
      .attr('width', W)
      .attr('height', H)
      .attr('viewBox', `0 0 ${W} ${H}`);

    // Zoomable inner group
    const g = root.append('g').attr('class', 'graph-root');

    // Zoom behaviour
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform as unknown as string);
      });

    root.call(zoom);

    // Store zoom ref so controls can access it
    zoomRef.current = zoom;
    svgSelRef.current = root;

    // -----------------------------------------------------------------------
    // Build copies so D3 can mutate them freely
    // -----------------------------------------------------------------------

    const simNodes: SimNode[] = nodes.map((n) => ({ ...n }));
    const nodeById = new Map(simNodes.map((n) => [n.id, n]));

    const simLinks: SimLink[] = links.map((l) => ({
      ...l,
      source: typeof l.source === 'string' ? (nodeById.get(l.source) ?? l.source) : l.source,
      target: typeof l.target === 'string' ? (nodeById.get(l.target) ?? l.target) : l.target,
    }));

    // -----------------------------------------------------------------------
    // Force simulation
    // -----------------------------------------------------------------------

    const simulation = d3
      .forceSimulation<SimNode>(simNodes)
      .force(
        'link',
        d3
          .forceLink<SimNode, SimLink>(simLinks)
          .id((d) => d.id)
          .distance((l) => 120 - (l.strength ?? 0.5) * 60)
          .strength((l) => 0.4 + (l.strength ?? 0.5) * 0.4),
      )
      .force('charge', d3.forceManyBody<SimNode>().strength((d) => -120 - nodeRadius(d) * 8))
      .force('center', d3.forceCenter(W / 2, H / 2).strength(0.08))
      .force(
        'collision',
        d3.forceCollide<SimNode>().radius((d) => nodeRadius(d) + 14),
      )
      .alphaDecay(0.025);

    // -----------------------------------------------------------------------
    // Defs: arrow markers (optional, subtle)
    // -----------------------------------------------------------------------
    const defs = root.append('defs');
    defs
      .append('filter')
      .attr('id', 'node-glow')
      .append('feDropShadow')
      .attr('dx', 0)
      .attr('dy', 0)
      .attr('stdDeviation', 3)
      .attr('flood-color', CREAM)
      .attr('flood-opacity', 0.4);

    // -----------------------------------------------------------------------
    // Links
    // -----------------------------------------------------------------------

    const linkGroup = g.append('g').attr('class', 'links');

    const linkSel = linkGroup
      .selectAll<SVGLineElement, SimLink>('line')
      .data(simLinks)
      .join('line')
      .attr('class', 'graph-edge')
      .attr('stroke', CREAM)
      .attr('stroke-opacity', (l) => 0.15 + (l.strength ?? 0.5) * 0.25)
      .attr('stroke-width', (l) => Math.max(1, Math.min(4, 1 + (l.strength ?? 0.5) * 3)))
      .attr('stroke-dasharray', (l) => (l.is_dashed ? '6 4' : null));

    // -----------------------------------------------------------------------
    // Node groups
    // -----------------------------------------------------------------------

    const nodeGroup = g.append('g').attr('class', 'nodes');

    const nodeSel = nodeGroup
      .selectAll<SVGGElement, SimNode>('g.node-g')
      .data(simNodes, (d) => d.id)
      .join('g')
      .attr('class', 'node-g')
      .attr('cursor', 'pointer');

    // Shape per entity type
    nodeSel.each(function (d) {
      const el = d3.select(this);
      const r = nodeRadius(d);
      const color = nodeColor(d);

      if (d.entity_type === 'location' || d.node_type === 'location') {
        // Diamond
        el.append('path')
          .attr('class', 'node-shape')
          .attr('d', diamondPath(r))
          .attr('fill', color)
          .attr('fill-opacity', 0.8)
          .attr('stroke', color)
          .attr('stroke-width', 1.5)
          .attr('stroke-opacity', 0.6);
      } else if (d.entity_type === 'artifact') {
        // Triangle
        el.append('path')
          .attr('class', 'node-shape')
          .attr('d', trianglePath(r * 0.85))
          .attr('fill', color)
          .attr('fill-opacity', 0.8)
          .attr('stroke', color)
          .attr('stroke-width', 1.5)
          .attr('stroke-opacity', 0.6);
      } else if (d.node_type === 'concept') {
        // Dashed circle
        el.append('circle')
          .attr('class', 'node-shape')
          .attr('r', r)
          .attr('fill', color)
          .attr('fill-opacity', 0.55)
          .attr('stroke', color)
          .attr('stroke-width', 1.5)
          .attr('stroke-opacity', 0.7)
          .attr('stroke-dasharray', '4 3');
      } else {
        // Solid circle (person / default entity)
        el.append('circle')
          .attr('class', 'node-shape')
          .attr('r', r)
          .attr('fill', color)
          .attr('fill-opacity', 0.8)
          .attr('stroke', color)
          .attr('stroke-width', 1.5)
          .attr('stroke-opacity', 0.5);
      }
    });

    // Labels
    nodeSel
      .append('text')
      .attr('class', 'node-label')
      .attr('dy', (d) => nodeRadius(d) + 12)
      .attr('text-anchor', 'middle')
      .attr('font-family', '"DM Sans", sans-serif')
      .attr('font-size', '10px')
      .attr('fill', CREAM)
      .attr('fill-opacity', 0.75)
      .attr('pointer-events', 'none')
      .text((d) => (d.label.length > 18 ? d.label.slice(0, 16) + '…' : d.label));

    // -----------------------------------------------------------------------
    // Simulation tick
    // -----------------------------------------------------------------------

    simulation.on('tick', () => {
      linkSel
        .attr('x1', (l) => (l.source as SimNode).x ?? 0)
        .attr('y1', (l) => (l.source as SimNode).y ?? 0)
        .attr('x2', (l) => (l.target as SimNode).x ?? 0)
        .attr('y2', (l) => (l.target as SimNode).y ?? 0);

      nodeSel.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    // -----------------------------------------------------------------------
    // Drag
    // -----------------------------------------------------------------------

    function dragStarted(event: d3.D3DragEvent<SVGGElement, SimNode, SimNode>, d: SimNode) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }
    function dragged(event: d3.D3DragEvent<SVGGElement, SimNode, SimNode>, d: SimNode) {
      d.fx = event.x;
      d.fy = event.y;
    }
    function dragEnded(event: d3.D3DragEvent<SVGGElement, SimNode, SimNode>, d: SimNode) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    nodeSel.call(
      d3
        .drag<SVGGElement, SimNode>()
        .on('start', dragStarted)
        .on('drag', dragged)
        .on('end', dragEnded),
    );

    // -----------------------------------------------------------------------
    // Hover interactions
    // -----------------------------------------------------------------------

    // Set of neighbour IDs for quick lookup
    const neighbourMap = new Map<string, Set<string>>();
    simNodes.forEach((n) => neighbourMap.set(n.id, new Set()));
    simLinks.forEach((l) => {
      const s = (l.source as SimNode).id;
      const t = (l.target as SimNode).id;
      neighbourMap.get(s)?.add(t);
      neighbourMap.get(t)?.add(s);
    });

    nodeSel
      .on('mouseenter', function (event: MouseEvent, d: SimNode) {
        const neighbours = neighbourMap.get(d.id) ?? new Set<string>();

        // Dim non-neighbours
        nodeSel
          .select('.node-shape')
          .attr('fill-opacity', (nd: SimNode) =>
            nd.id === d.id || neighbours.has(nd.id) ? 0.95 : 0.15,
          )
          .attr('stroke-opacity', (nd: SimNode) =>
            nd.id === d.id || neighbours.has(nd.id) ? 0.9 : 0.1,
          );

        nodeSel
          .select('.node-label')
          .attr('fill-opacity', (nd: SimNode) =>
            nd.id === d.id || neighbours.has(nd.id) ? 1 : 0.1,
          );

        // Highlight connected edges
        linkSel
          .attr('stroke-opacity', (l: SimLink) => {
            const s = (l.source as SimNode).id;
            const t = (l.target as SimNode).id;
            return s === d.id || t === d.id ? 0.9 : 0.04;
          })
          .attr('stroke-width', (l: SimLink) => {
            const s = (l.source as SimNode).id;
            const t = (l.target as SimNode).id;
            const base = Math.max(1, Math.min(4, 1 + (l.strength ?? 0.5) * 3));
            return s === d.id || t === d.id ? base + 1 : base;
          });

        // Hovered node glow
        d3.select(this).select('.node-shape').attr('filter', 'url(#node-glow)');

        // Show tooltip at cursor position
        setHoveredId(d.id);
        const rect = svgRef.current?.getBoundingClientRect();
        setTooltip({
          visible: true,
          x: event.clientX - (rect?.left ?? 0),
          y: event.clientY - (rect?.top ?? 0) - 12,
          node: d,
        });
      })
      .on('mousemove', function (event: MouseEvent) {
        const rect = svgRef.current?.getBoundingClientRect();
        setTooltip((prev) => ({
          ...prev,
          x: event.clientX - (rect?.left ?? 0),
          y: event.clientY - (rect?.top ?? 0) - 12,
        }));
      })
      .on('mouseleave', function () {
        // Restore full opacity
        nodeSel
          .select('.node-shape')
          .attr('fill-opacity', (d: SimNode) => (d.node_type === 'concept' ? 0.55 : 0.8))
          .attr('stroke-opacity', 0.6)
          .attr('filter', null);

        nodeSel.select('.node-label').attr('fill-opacity', 0.75);

        linkSel
          .attr('stroke-opacity', (l: SimLink) => 0.15 + (l.strength ?? 0.5) * 0.25)
          .attr('stroke-width', (l: SimLink) =>
            Math.max(1, Math.min(4, 1 + (l.strength ?? 0.5) * 3)),
          );

        setHoveredId(null);
        setTooltip({ visible: false, x: 0, y: 0, node: null });
      })
      .on('click', (_event: MouseEvent, d: SimNode) => {
        handleNodeClick(d);
      });

    // -----------------------------------------------------------------------
    // Cleanup
    // -----------------------------------------------------------------------

    return () => {
      simulation.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, links]);

  // Suppress "hoveredId" unused warning — it triggers re-highlight via React state
  void hoveredId;

  // Zoom control refs
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const svgSelRef = useRef<d3.Selection<SVGSVGElement, unknown, null, undefined> | null>(null);

  const handleZoomIn = useCallback(() => {
    if (svgSelRef.current && zoomRef.current) {
      svgSelRef.current.transition().duration(250).call(zoomRef.current.scaleBy, 1.5);
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (svgSelRef.current && zoomRef.current) {
      svgSelRef.current.transition().duration(250).call(zoomRef.current.scaleBy, 1 / 1.5);
    }
  }, []);

  const handleReset = useCallback(() => {
    if (svgSelRef.current && zoomRef.current) {
      svgSelRef.current
        .transition()
        .duration(400)
        .call(zoomRef.current.transform, d3.zoomIdentity);
    }
  }, []);

  // Node click handler
  const handleNodeClick = useCallback(
    (node: SimNode) => {
      if (!node?.id) return;
      if (node.node_type === 'entity' || node.node_type === 'location') {
        setSelectedEntityId(node.id);
        setActiveView('journal');
        navigate('/');
        onClose();
      } else if (node.node_type === 'concept') {
        setSidebarFilter({ type: 'concept', id: node.id, label: node.label });
        setActiveView('journal');
        navigate('/');
        onClose();
      }
    },
    [setSelectedEntityId, setSidebarFilter, setActiveView, navigate, onClose],
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const filterOptions: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'entities', label: 'Entities' },
    { key: 'concepts', label: 'Concepts' },
    { key: 'locations', label: 'Locations' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 animate-fade-in"
      style={{ background: 'rgba(42,36,32,0.94)', backdropFilter: 'blur(4px)' }}
    >
      {/* ------------------------------------------------------------------ */}
      {/* Header bar                                                           */}
      {/* ------------------------------------------------------------------ */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-4 z-10">
        <h2 className="font-serif text-[17px] font-semibold text-cream/90 flex items-center gap-2">
          <span>Knowledge Graph</span>
          {nodes.length > 0 && (
            <span
              className="font-sans text-[11px] font-normal px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(250,247,242,0.45)' }}
            >
              {nodes.length} nodes · {links.length} links
            </span>
          )}
        </h2>

        <div className="flex items-center gap-2">
          {/* Filter pills */}
          {filterOptions.map(({ key, label }) => {
            const active = filter === key;
            return (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className="px-3 py-1 rounded-full text-[11.5px] font-medium transition-all cursor-pointer"
                style={{
                  border: active
                    ? '1px solid rgba(250,247,242,0.4)'
                    : '1px solid rgba(255,255,255,0.1)',
                  background: active ? 'rgba(250,247,242,0.12)' : 'transparent',
                  color: active ? 'rgba(250,247,242,0.9)' : 'rgba(250,247,242,0.4)',
                }}
              >
                {label}
              </button>
            );
          })}

          {/* Close */}
          <button
            onClick={onClose}
            className="ml-3 w-8 h-8 flex items-center justify-center rounded-full text-cream/50 hover:text-cream hover:bg-white/10 transition-all cursor-pointer text-base"
            aria-label="Close knowledge graph"
          >
            x
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Graph area                                                            */}
      {/* ------------------------------------------------------------------ */}
      <div ref={containerRef} className="w-full h-full relative">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full animate-bounce"
                  style={{
                    background: 'rgba(250,247,242,0.4)',
                    animationDelay: `${i * 0.15}s`,
                  }}
                />
              ))}
            </div>
            <span className="text-[13px] text-cream/30 font-sans">Building graph…</span>
          </div>
        ) : nodes.length === 0 ? (
          /* ---- Empty state ---- */
          <div className="flex flex-col items-center justify-center h-full gap-5 px-8">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              {/* Network icon */}
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                <circle cx="18" cy="8" r="4" fill="rgba(250,247,242,0.35)" />
                <circle cx="8" cy="26" r="4" fill="rgba(250,247,242,0.35)" />
                <circle cx="28" cy="26" r="4" fill="rgba(250,247,242,0.35)" />
                <line x1="18" y1="12" x2="8" y2="22" stroke="rgba(250,247,242,0.25)" strokeWidth="1.5" />
                <line x1="18" y1="12" x2="28" y2="22" stroke="rgba(250,247,242,0.25)" strokeWidth="1.5" />
                <line x1="8" y1="26" x2="28" y2="26" stroke="rgba(250,247,242,0.25)" strokeWidth="1.5" strokeDasharray="4 3" />
              </svg>
            </div>
            <div className="text-center max-w-[360px]">
              <p className="font-serif text-[18px] font-semibold text-cream/80 mb-2">
                No connections yet
              </p>
              <p className="text-[13px] text-cream/40 leading-relaxed">
                Start adding notes with @entity mentions and #concept tags to build your knowledge
                graph. Connections will appear here automatically.
              </p>
            </div>
          </div>
        ) : (
          /* ---- SVG graph ---- */
          <svg
            ref={svgRef}
            className="w-full h-full"
            style={{ overflow: 'visible' }}
          />
        )}

        {/* ---- Tooltip ---- */}
        {tooltip.visible && tooltip.node && (
          <div
            className="pointer-events-none absolute z-20 px-3 py-2 rounded-lg text-[11.5px] font-sans shadow-lg"
            style={{
              left: tooltip.x + 14,
              top: tooltip.y - 14,
              background: 'rgba(42,36,32,0.95)',
              border: '1px solid rgba(250,247,242,0.12)',
              color: 'rgba(250,247,242,0.85)',
              backdropFilter: 'blur(8px)',
              maxWidth: 180,
              transform: 'translateY(-100%)',
            }}
          >
            <p className="font-medium truncate">{tooltip.node.label}</p>
            <p style={{ color: 'rgba(250,247,242,0.45)', marginTop: 2 }}>
              {nodeTypeLabel(tooltip.node)}
              {tooltip.node.note_count > 0 && (
                <> · {tooltip.node.note_count} note{tooltip.node.note_count !== 1 ? 's' : ''}</>
              )}
            </p>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Legend (bottom-left)                                                 */}
      {/* ------------------------------------------------------------------ */}
      <div
        className="absolute bottom-6 left-6 flex flex-col gap-2 z-10 py-3 px-3.5 rounded-xl"
        style={{ background: 'rgba(42,36,32,0.7)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <p className="text-[9px] font-sans font-semibold uppercase tracking-widest text-cream/25 mb-0.5">
          Legend
        </p>

        {/* Node types */}
        <LegendNode color={CORAL} shape="circle" label="Person" />
        <LegendNode color={SAGE} shape="diamond" label="Location" />
        <LegendNode color={AMBER} shape="triangle" label="Artifact" />
        <LegendNode color={CONCEPT_COLOR} shape="dashed-circle" label="Concept" />

        {/* Edge types */}
        <div className="mt-1 flex flex-col gap-1.5 border-t pt-2" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-2">
            <svg width="22" height="6">
              <line x1="0" y1="3" x2="22" y2="3" stroke="rgba(250,247,242,0.45)" strokeWidth="1.5" />
            </svg>
            <span className="text-[10px] font-sans text-cream/40">Co-mentioned</span>
          </div>
          <div className="flex items-center gap-2">
            <svg width="22" height="6">
              <line x1="0" y1="3" x2="22" y2="3" stroke="rgba(250,247,242,0.45)" strokeWidth="1.5" strokeDasharray="4 3" />
            </svg>
            <span className="text-[10px] font-sans text-cream/40">Concept link</span>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Zoom controls (bottom-right)                                          */}
      {/* ------------------------------------------------------------------ */}
      <div className="absolute bottom-6 right-6 flex flex-col gap-1 z-10">
        <ZoomBtn label="+" title="Zoom in" onClick={handleZoomIn} />
        <ZoomBtn label="−" title="Zoom out" onClick={handleZoomOut} />
        <ZoomBtn label="⟳" title="Reset view" onClick={handleReset} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Legend node item
// ---------------------------------------------------------------------------

type ShapeType = 'circle' | 'diamond' | 'triangle' | 'dashed-circle';

function LegendNode({ color, shape, label }: { color: string; shape: ShapeType; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <svg width="14" height="14" viewBox="-7 -7 14 14">
        {shape === 'circle' && (
          <circle r={5} fill={color} fillOpacity={0.8} />
        )}
        {shape === 'dashed-circle' && (
          <circle r={5} fill={color} fillOpacity={0.55} stroke={color} strokeWidth={1} strokeDasharray="3 2" />
        )}
        {shape === 'diamond' && (
          <path d="M0 -5 L5 0 L0 5 L-5 0 Z" fill={color} fillOpacity={0.8} />
        )}
        {shape === 'triangle' && (
          <path d="M0 -5 L5 4 L-5 4 Z" fill={color} fillOpacity={0.8} />
        )}
      </svg>
      <span className="text-[10.5px] font-sans text-cream/50">{label}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Zoom button
// ---------------------------------------------------------------------------

function ZoomBtn({ label, title, onClick }: { label: string; title: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="w-8 h-8 flex items-center justify-center rounded-lg text-cream/60 hover:text-cream hover:bg-white/15 transition-all cursor-pointer text-sm"
      style={{ background: 'rgba(42,36,32,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}
    >
      {label}
    </button>
  );
}
