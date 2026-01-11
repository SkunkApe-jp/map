
import { GoogleGenAI, Type } from "@google/genai";
import { MindMapNode, AISettings } from "../types";

// Removed global client initialization to follow guidelines for creating instances per-call

const mindMapSchema = {
  type: Type.OBJECT,
  properties: {
    text: { type: Type.STRING },
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
              properties: { text: { type: Type.STRING } },
              required: ["text"]
            }
          }
        },
        required: ["text"]
      }
    },
  },
  required: ["text", "children"],
};

async function callOpenAI(settings: AISettings, prompt: string): Promise<any> {
  const response = await fetch(`${settings.openaiEndpoint.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.openaiApiKey}`
    },
    body: JSON.stringify({
      model: settings.openaiModel,
      messages: [{ role: 'user', content: prompt + "\nReturn ONLY valid JSON." }],
      response_format: { type: "json_object" },
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  return JSON.parse(content);
}

export async function generateMindMap(topic: string, settings: AISettings): Promise<MindMapNode> {
  const prompt = `Create a comprehensive mind map for the topic: "${topic}". 
  Focus on key concepts, sub-topics, and interesting relations. 
  Provide a structure with at least 5 main branches and 2-3 sub-branches each.
  Format as JSON matching this schema: { text: string, children: [ { text: string, children: [ { text: string } ] } ] }`;

  let result;
  if (settings.provider === 'gemini') {
    // Fix: Creating a new GoogleGenAI instance right before the API call as per guidelines
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: mindMapSchema,
      },
    });
    result = JSON.parse(response.text || '{}');
  } else {
    result = await callOpenAI(settings, prompt);
  }

  const processNodes = (node: any, depth: number = 0): MindMapNode => ({
    id: Math.random().toString(36).substr(2, 9),
    text: node.text || "Untitled",
    depth,
    isExpanded: true,
    children: node.children ? node.children.map((c: any) => processNodes(c, depth + 1)) : [],
  });

  return processNodes(result);
}

export async function expandNode(parentText: string, settings: AISettings): Promise<MindMapNode[]> {
  const prompt = `Given the node "${parentText}", generate 4-5 relevant sub-topics to expand this mind map node.
  Format as JSON array of objects: [ { "text": "string" } ]`;

  let result;
  if (settings.provider === 'gemini') {
    // Fix: Creating a new GoogleGenAI instance right before the API call as per guidelines
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: { text: { type: Type.STRING } },
            required: ["text"]
          }
        }
      },
    });
    result = JSON.parse(response.text || '[]');
  } else {
    result = await callOpenAI(settings, prompt);
    // Handle potential object wrapper if model returns { topics: [...] }
    if (!Array.isArray(result) && result.topics) result = result.topics;
    if (!Array.isArray(result)) result = [];
  }

  return result.map((item: any) => ({
    id: Math.random().toString(36).substr(2, 9),
    text: item.text || "Untitled",
    isExpanded: false,
    children: [],
  }));
}
