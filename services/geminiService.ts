
import { GoogleGenAI, Type } from "@google/genai";
import { MindMapNode } from "../types";

// Fixed: Initializing GoogleGenAI strictly with process.env.API_KEY as per guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const mindMapSchema = {
  type: Type.OBJECT,
  properties: {
    text: {
      type: Type.STRING,
      description: "The central topic or parent node text.",
    },
    children: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          text: { type: Type.STRING },
          children: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING }
              },
              required: ["text"]
            }
          }
        },
        required: ["text"]
      },
      description: "Sub-topics or child nodes.",
    },
  },
  required: ["text", "children"],
};

export async function generateMindMap(topic: string): Promise<MindMapNode> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Create a comprehensive mind map for the topic: "${topic}". 
      Focus on key concepts, sub-topics, and interesting relations. 
      Provide a structure with at least 5 main branches and 2-3 sub-branches each.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: mindMapSchema,
        temperature: 0.7,
      },
    });

    const result = JSON.parse(response.text || '{}');
    
    // Recursive function to add IDs and initial state
    const processNodes = (node: any, depth: number = 0): MindMapNode => ({
      id: Math.random().toString(36).substr(2, 9),
      text: node.text,
      depth,
      isExpanded: true,
      children: node.children ? node.children.map((c: any) => processNodes(c, depth + 1)) : [],
    });

    return processNodes(result);
  } catch (error) {
    console.error("Error generating mind map:", error);
    throw error;
  }
}

export async function expandNode(parentText: string): Promise<MindMapNode[]> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Given the node "${parentText}", generate 4-5 relevant sub-topics to expand this mind map node.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING }
            },
            required: ["text"]
          }
        }
      },
    });

    const result = JSON.parse(response.text || '[]');
    return result.map((item: any) => ({
      id: Math.random().toString(36).substr(2, 9),
      text: item.text,
      isExpanded: false,
      children: [],
    }));
  } catch (error) {
    console.error("Error expanding node:", error);
    throw error;
  }
}