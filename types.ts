
import * as d3 from 'd3';

export interface MindMapNode {
  id: string;
  text: string;
  children?: MindMapNode[];
  isExpanded?: boolean;
  depth?: number;
  color?: string;
}

export interface AISettings {
  provider: 'gemini' | 'openai';
  openaiEndpoint: string;
  openaiModel: string;
  openaiApiKey: string;
}

export interface TreeLayoutNode extends d3.HierarchyPointNode<MindMapNode> {
  x: number;
  y: number;
}
