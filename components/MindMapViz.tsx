
import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { MindMapNode } from '../types';

interface Props {
  data: MindMapNode;
  onNodeClick: (nodeId: string) => void;
  onNodeDoubleClick: (node: MindMapNode) => void;
}

const MindMapViz: React.FC<Props> = ({ data, onNodeClick, onNodeDoubleClick }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<SVGGElement>(null);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!svgRef.current || !data) return;

    const svg = d3.select(svgRef.current);
    const g = d3.select(containerRef.current);

    // Setup zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Initial positioning
    const initialTransform = d3.zoomIdentity.translate(dimensions.width / 4, dimensions.height / 2).scale(0.8);
    svg.call(zoom.transform, initialTransform);

    // Tree layout
    const treeLayout = d3.tree<MindMapNode>()
      .nodeSize([60, 240]); // spacing between nodes

    const root = d3.hierarchy(data);
    treeLayout(root);

    // Color scale
    const colorScale = d3.scaleOrdinal(d3.schemeTableau10);

    // Links (Curves)
    const linkGenerator = d3.linkHorizontal<any, any>()
      .x(d => d.y)
      .y(d => d.x);

    const links = g.selectAll('.link')
      .data(root.links(), (d: any) => `${d.source.data.id}-${d.target.data.id}`);

    links.enter()
      .append('path')
      .attr('class', 'link')
      .attr('fill', 'none')
      .attr('stroke', '#cbd5e1')
      .attr('stroke-width', 2)
      .merge(links as any)
      .transition()
      .duration(500)
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

    // Node Rects
    nodeEnter.append('rect')
      .attr('rx', 8)
      .attr('ry', 8)
      .attr('x', -10)
      .attr('y', -20)
      .attr('width', d => Math.max(120, d.data.text.length * 8 + 20))
      .attr('height', 40)
      .attr('fill', d => d.depth === 0 ? '#1e293b' : 'white')
      .attr('stroke', d => d.depth === 0 ? '#1e293b' : colorScale(d.depth.toString()))
      .attr('stroke-width', 2)
      .style('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.05))')
      .attr('class', 'node-transition group-hover:stroke-blue-500');

    // Node Text
    nodeEnter.append('text')
      .attr('dy', '0.35em')
      .attr('x', 10)
      .attr('y', 0)
      .attr('text-anchor', 'start')
      .attr('fill', d => d.depth === 0 ? 'white' : '#334155')
      .style('font-size', d => d.depth === 0 ? '14px' : '12px')
      .style('font-weight', d => d.depth === 0 ? '600' : '400')
      .style('pointer-events', 'none')
      .text(d => d.data.text);

    // Expand/Collapse Hint
    nodeEnter.filter(d => !!d.data.children?.length)
      .append('circle')
      .attr('r', 4)
      .attr('cx', d => Math.max(120, d.data.text.length * 8 + 20) - 10)
      .attr('cy', 0)
      .attr('fill', '#94a3b8');

    const nodeUpdate = nodeEnter.merge(nodes as any);

    nodeUpdate.transition()
      .duration(500)
      .attr('transform', d => `translate(${d.y},${d.x})`);

    nodes.exit().transition()
      .duration(500)
      .attr('transform', d => `translate(${d.y},${d.x})`)
      .style('opacity', 0)
      .remove();

  }, [data, dimensions, onNodeClick, onNodeDoubleClick]);

  return (
    <div className="w-full h-full bg-slate-50 relative overflow-hidden">
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="w-full h-full block"
      >
        <g ref={containerRef} />
      </svg>
      
      {/* Interaction Guide */}
      <div className="absolute bottom-6 right-6 bg-white/80 backdrop-blur-sm border border-slate-200 px-4 py-2 rounded-lg text-xs text-slate-500 flex flex-col gap-1 shadow-sm">
        <p>🖱️ Drag to pan</p>
        <p>☸️ Scroll to zoom</p>
        <p>👆 Click to toggle children</p>
        <p>✌️ Double-click to expand with AI</p>
      </div>
    </div>
  );
};

export default MindMapViz;
