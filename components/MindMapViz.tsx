
import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { Maximize, ZoomIn, ZoomOut, Download } from 'lucide-react';
import { MindMapNode } from '../types';

interface Props {
  data: MindMapNode;
  onNodeClick: (nodeId: string) => void;
  onNodeDoubleClick: (node: MindMapNode) => void;
}

const MindMapViz: React.FC<Props> = ({ data, onNodeClick, onNodeDoubleClick }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<SVGGElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    const handleResize = () => setDimensions({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const recenter = useCallback(() => {
    if (!svgRef.current || !zoomRef.current) return;
    const svg = d3.select(svgRef.current);
    const initialTransform = d3.zoomIdentity.translate(dimensions.width / 4, dimensions.height / 2).scale(0.8);
    svg.transition().duration(750).call(zoomRef.current.transform, initialTransform);
  }, [dimensions]);

  const zoomIn = () => d3.select(svgRef.current!).transition().call(zoomRef.current!.scaleBy, 1.3);
  const zoomOut = () => d3.select(svgRef.current!).transition().call(zoomRef.current!.scaleBy, 0.7);

  const exportSVG = () => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "mindmap.svg";
    link.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (!svgRef.current || !data) return;

    const svg = d3.select(svgRef.current);
    const g = d3.select(containerRef.current);

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.05, 5])
      .on('zoom', (event) => g.attr('transform', event.transform));

    zoomRef.current = zoom;
    svg.call(zoom);

    // Prevent double-click from triggering the built-in zoom behavior,
    // so double-click can be reserved for AI expand on nodes.
    svg.on('dblclick.zoom', null);

    // Initial position if first load
    if (!g.attr('transform')) {
      svg.call(zoom.transform, d3.zoomIdentity.translate(dimensions.width / 4, dimensions.height / 2).scale(0.8));
    }

    const treeLayout = d3.tree<MindMapNode>().nodeSize([120, 360]);
    const root = d3.hierarchy(data);
    treeLayout(root);
        
    // Apply collision force to prevent node overlap
    const nodes_data = root.descendants();
    const simulation = d3.forceSimulation(nodes_data)
      .force('collide', d3.forceCollide().radius(() => 75))
      .stop();
    
    for (let i = 0; i < 100; i++) simulation.tick();
    
    // Update node positions after collision detection
    nodes_data.forEach(d => {
      d.x = d.x;
      d.y = d.y;
    });

    const colorScale = d3.scaleOrdinal(d3.schemeTableau10);

    const nodeBoxWidth = (node: any) => Math.max(140, (node.data?.text?.length || 0) * 9 + 24);

    // Links
    const linkGenerator = d3.linkHorizontal<any, any>()
      .x(d => d.y)
      .y(d => d.x);

    const adjustedLinks = root.links().map((l: any) => {
      const sourceWidth = nodeBoxWidth(l.source);
      return {
        source: {
          x: l.source.x,
          y: l.source.y + (sourceWidth - 10)
        },
        target: {
          x: l.target.x,
          y: l.target.y - 10
        },
        _key: `${l.source.data.id}-${l.target.data.id}`
      };
    });

    const links = g.selectAll('.link')
      .data(adjustedLinks, (d: any) => d._key);

    links.enter()
      .append('path')
      .attr('class', 'link')
      .attr('fill', 'none')
      .attr('stroke', '#e2e8f0')
      .attr('stroke-width', 2)
      .merge(links as any)
      .transition()
      .duration(600)
      .attr('d', linkGenerator as any);

    links.exit().remove();

    // Nodes
    const nodes = g.selectAll('.node')
      .data(root.descendants(), (d: any) => d.data.id);

    const nodeEnter = nodes.enter()
      .append('g')
      .attr('class', 'node cursor-pointer group')
      .attr('transform', d => `translate(${d.y},${d.x})`)
      .on('click', (event, d) => {
        event.stopPropagation();
        onNodeClick(d.data.id);
      })
      .on('dblclick', (event, d) => {
        event.stopPropagation();
        onNodeDoubleClick(d.data);
      });

    // Node Background
    nodeEnter.append('rect')
      .attr('rx', 12)
      .attr('ry', 12)
      .attr('x', -10)
      .attr('y', -22)
      .attr('width', d => Math.max(140, d.data.text.length * 9 + 24))
      .attr('height', 44)
      .attr('fill', d => d.depth === 0 ? '#0f172a' : 'white')
      .attr('stroke', d => d.depth === 0 ? '#0f172a' : colorScale(d.depth.toString()))
      .attr('stroke-width', 2)
      .attr('class', 'node-transition filter drop-shadow-sm group-hover:drop-shadow-md');

    // Node Label
    nodeEnter.append('text')
      .attr('dy', '0.35em')
      .attr('x', 12)
      .attr('y', 0)
      .attr('text-anchor', 'start')
      .attr('fill', d => d.depth === 0 ? '#f8fafc' : '#1e293b')
      .style('font-size', d => d.depth === 0 ? '15px' : '13px')
      .style('font-weight', d => d.depth === 0 ? '700' : '500')
      .style('pointer-events', 'none')
      .text(d => d.data.text);

    // Expansion Badge
    nodeEnter.filter(d => !!d.data.children?.length)
      .append('circle')
      .attr('r', 5)
      .attr('cx', d => Math.max(140, d.data.text.length * 9 + 24) - 10)
      .attr('cy', 0)
      .attr('fill', d => colorScale(d.depth.toString()));

    const nodeUpdate = nodeEnter.merge(nodes as any);
    nodeUpdate.transition()
      .duration(600)
      .attr('transform', d => `translate(${d.y},${d.x})`);

    nodes.exit().transition()
      .duration(400)
      .style('opacity', 0)
      .remove();

  }, [data, dimensions, onNodeClick, onNodeDoubleClick]);

  return (
    <div className="w-full h-full bg-[#fbfcfd] relative overflow-hidden">
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="w-full h-full block touch-none"
      >
        <g ref={containerRef} />
      </svg>
      
      {/* Viewport Controls */}
      <div className="absolute top-6 right-6 flex flex-col gap-2">
        <button onClick={zoomIn} className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 text-slate-600 transition-all" title="Zoom In">
          <ZoomIn className="w-5 h-5" />
        </button>
        <button onClick={zoomOut} className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 text-slate-600 transition-all" title="Zoom Out">
          <ZoomOut className="w-5 h-5" />
        </button>
        <button onClick={recenter} className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 text-slate-600 transition-all" title="Recenter">
          <Maximize className="w-5 h-5" />
        </button>
        <button onClick={exportSVG} className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 text-slate-600 transition-all" title="Export as SVG">
          <Download className="w-5 h-5" />
        </button>
      </div>

      <div className="absolute bottom-6 left-6 bg-white/90 backdrop-blur-md border border-slate-200 p-4 rounded-2xl text-[11px] text-slate-400 font-medium shadow-xl flex gap-4">
        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-slate-200" /> Pan / Drag</div>
        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-400" /> Double-click to AI Expand</div>
      </div>
    </div>
  );
};

export default MindMapViz;
