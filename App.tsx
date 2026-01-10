
import React, { useState, useCallback, useEffect } from 'react';
import { Search, Sparkles, Download, RotateCcw, Plus, MousePointer2, Settings as SettingsIcon, X } from 'lucide-react';
import { MindMapNode, AISettings } from './types';
import { generateMindMap, expandNode } from './services/aiService';
import MindMapViz from './components/MindMapViz';

const DEFAULT_SETTINGS: AISettings = {
  provider: 'gemini',
  openaiEndpoint: 'https://api.openai.com/v1',
  openaiModel: 'gpt-4o-mini',
  openaiApiKey: ''
};

const App: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mindMapData, setMindMapData] = useState<MindMapNode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<AISettings>(() => {
    const saved = localStorage.getItem('mindspark_settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  useEffect(() => {
    localStorage.setItem('mindspark_settings', JSON.stringify(settings));
  }, [settings]);

  const handleGenerate = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!topic.trim()) return;

    setIsLoading(true);
    setError(null);
    try {
      const data = await generateMindMap(topic, settings);
      setMindMapData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to generate mind map.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNodeDoubleClick = useCallback(async (node: MindMapNode) => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const newChildren = await expandNode(node.text, settings);
      const updateTree = (current: MindMapNode): MindMapNode => {
        if (current.id === node.id) {
          const existingIds = new Set(current.children?.map(c => c.text) || []);
          const uniqueNewChildren = newChildren.filter(c => !existingIds.has(c.text));
          return {
            ...current,
            children: [...(current.children || []), ...uniqueNewChildren]
          };
        }
        if (current.children) {
          return { ...current, children: current.children.map(updateTree) };
        }
        return current;
      };
      setMindMapData(prev => prev ? updateTree(prev) : null);
    } catch (err: any) {
      setError(err.message || 'Failed to expand node.');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, settings]);

  const reset = () => {
    setMindMapData(null);
    setTopic('');
    setError(null);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-50 relative">
      <header className="z-20 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800">MindSpark <span className="text-blue-600">AI</span></h1>
        </div>

        <form onSubmit={handleGenerate} className="flex-1 max-w-2xl mx-12 hidden md:flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="What topic do you want to map out?"
              className="w-full bg-slate-100 border-none rounded-full py-2 pl-10 pr-4 focus:ring-2 focus:ring-blue-500 transition-all text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !topic.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition-colors shadow-lg shadow-blue-500/20"
          >
            {isLoading ? 'Generating...' : 'Generate'}
          </button>
        </form>

        <div className="flex items-center gap-2">
          {mindMapData && (
            <button onClick={reset} className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors" title="Reset">
              <RotateCcw className="w-5 h-5" />
            </button>
          )}
          <button onClick={() => setShowSettings(true)} className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors" title="Settings">
            <SettingsIcon className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 relative overflow-hidden">
        {mindMapData ? (
          <MindMapViz 
            data={mindMapData} 
            onNodeClick={() => {}} 
            onNodeDoubleClick={handleNodeDoubleClick}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
            <div className="max-w-md space-y-6">
              <div className="inline-flex p-4 bg-blue-50 rounded-3xl mb-4">
                <Sparkles className="w-12 h-12 text-blue-500" />
              </div>
              <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">
                AI Powered <span className="text-blue-600">Mind Mapping</span>
              </h2>
              <p className="text-slate-500 text-lg">
                Enter a topic to generate an interactive hierarchy. Now supports Gemini and OpenAI compatible endpoints.
              </p>
              
              <form onSubmit={handleGenerate} className="md:hidden space-y-3">
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Enter topic..."
                  className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 shadow-sm"
                />
                <button
                  type="submit"
                  disabled={isLoading || !topic.trim()}
                  className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg"
                >
                  {isLoading ? 'Thinking...' : 'Start Building'}
                </button>
              </form>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] z-50 flex flex-col items-center justify-center">
            <div className="loading-pulse"></div>
            <Sparkles className="w-10 h-10 text-blue-600 relative z-10 animate-bounce" />
            <p className="mt-8 text-slate-800 font-medium animate-pulse">
              AI is structuring your ideas using {settings.provider}...
            </p>
          </div>
        )}

        {error && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-red-50 text-red-600 border border-red-200 px-6 py-3 rounded-full shadow-lg flex items-center gap-3 z-50">
            <span className="text-sm font-medium">{error}</span>
            <button onClick={() => setError(null)} className="hover:text-red-800 font-bold text-lg">&times;</button>
          </div>
        )}
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowSettings(false)}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-800">AI Configuration</h3>
              <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Provider</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSettings(s => ({ ...s, provider: 'gemini' }))}
                    className={`py-2 px-4 rounded-lg border text-sm font-medium transition-all ${settings.provider === 'gemini' ? 'bg-blue-50 border-blue-500 text-blue-600' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}
                  >
                    Gemini
                  </button>
                  <button
                    onClick={() => setSettings(s => ({ ...s, provider: 'openai' }))}
                    className={`py-2 px-4 rounded-lg border text-sm font-medium transition-all ${settings.provider === 'openai' ? 'bg-blue-50 border-blue-500 text-blue-600' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}
                  >
                    OpenAI Compatible
                  </button>
                </div>
              </div>

              {settings.provider === 'openai' && (
                <div className="space-y-3 animate-in slide-in-from-top-2 duration-200">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Base Endpoint</label>
                    <input
                      type="text"
                      value={settings.openaiEndpoint}
                      onChange={e => setSettings(s => ({ ...s, openaiEndpoint: e.target.value }))}
                      placeholder="https://api.openai.com/v1"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Model Name</label>
                    <input
                      type="text"
                      value={settings.openaiModel}
                      onChange={e => setSettings(s => ({ ...s, openaiModel: e.target.value }))}
                      placeholder="gpt-4o-mini"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">API Key</label>
                    <input
                      type="password"
                      value={settings.openaiApiKey}
                      onChange={e => setSettings(s => ({ ...s, openaiApiKey: e.target.value }))}
                      placeholder="sk-..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
              )}

              {settings.provider === 'gemini' && (
                <p className="text-sm text-slate-500 italic bg-blue-50 p-3 rounded-lg border border-blue-100">
                  Using system-configured Gemini API Key. No additional setup required.
                </p>
              )}
            </div>
            <div className="px-6 py-4 bg-slate-50 text-right">
              <button
                onClick={() => setShowSettings(false)}
                className="bg-slate-800 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-slate-700 transition-colors shadow-lg shadow-slate-200"
              >
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
