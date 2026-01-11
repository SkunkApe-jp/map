
import React, { useState, useCallback, useEffect } from 'react';
import { Search, Sparkles, RotateCcw, MousePointer2, Settings as SettingsIcon, X, Globe, Zap, ArrowRight, Ship as MapIcon } from 'lucide-react';
import { MindMapNode, AISettings } from './types';
import { generateMindMap, expandNode } from './services/aiService';
import MindMapViz from './components/MindMapViz';
import { useTranslation, Trans } from 'react-i18next';

const DEFAULT_SETTINGS: AISettings = {
  provider: 'gemini',
  openaiEndpoint: 'https://api.openai.com/v1',
  openaiModel: 'gpt-4o-mini',
  openaiApiKey: ''
};

const App: React.FC = () => {
  const { t } = useTranslation();
  const [topic, setTopic] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mindMapData, setMindMapData] = useState<MindMapNode | null>(() => {
    const saved = localStorage.getItem('mindspark_active_map');
    return saved ? JSON.parse(saved) : null;
  });
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<AISettings>(() => {
    const saved = localStorage.getItem('mindspark_settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  useEffect(() => {
    localStorage.setItem('mindspark_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    if (mindMapData) {
      localStorage.setItem('mindspark_active_map', JSON.stringify(mindMapData));
    } else {
      localStorage.removeItem('mindspark_active_map');
    }
  }, [mindMapData]);

  const handleGenerate = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!topic.trim()) return;

    setIsLoading(true);
    setError(null);
    try {
      const data = await generateMindMap(topic, settings);
      setMindMapData(data);
    } catch (err: any) {
      setError(err.message || t('generateMapFailed'));
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
      setError(err.message || t('expandNodeFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, settings]);

  const reset = () => {
    if(confirm(t('clearMapConfirmation'))) {
      setMindMapData(null);
      setTopic('');
      setError(null);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-50 relative selection:bg-blue-100">
      <header className="z-20 bg-white/90 backdrop-blur-xl border-b border-slate-200/60 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-white border border-slate-200 p-2 rounded-xl shadow-sm">
            <MapIcon className="w-5 h-5 text-slate-300" strokeWidth={1.5} />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">{t('map')}</h1>
        </div>

        <form onSubmit={handleGenerate} className="flex-1 max-w-2xl mx-12 hidden md:flex items-center gap-3">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder={t('enterTopicPlaceholder')}
              className="w-full bg-slate-100 border-none rounded-2xl py-2.5 pl-11 pr-4 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all text-sm font-medium outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !topic.trim()}
            className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white px-8 py-2.5 rounded-2xl text-sm font-bold flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-slate-200"
          >
            {isLoading ? t('thinking') : t('generate')}
          </button>
        </form>

        <div className="flex items-center gap-1">
          {mindMapData && (
            <button onClick={reset} className="p-2.5 hover:bg-slate-100 rounded-xl text-slate-500 transition-all" title={t('clearMap')}>
              <RotateCcw className="w-5 h-5" />
            </button>
          )}
          <button onClick={() => setShowSettings(true)} className="p-2.5 hover:bg-slate-100 rounded-xl text-slate-500 transition-all" title={t('settings')}>
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
          <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px]">
            <div className="max-w-2xl w-full text-center space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
              <div className="inline-flex px-4 py-2 bg-slate-100 border border-slate-200 rounded-full text-slate-500 text-xs font-bold uppercase tracking-widest mb-4">
                {t('nextGenVisualization')}
              </div>
              <h2 className="text-6xl font-black text-slate-900 tracking-tighter leading-[1.1]">
                <Trans i18nKey="visualizeComplexThoughts">
                  Visualize your <span className="text-slate-400 bg-clip-text">complex thoughts</span> effortlessly.
                </Trans>
              </h2>
              <p className="text-slate-500 text-xl font-medium max-w-xl mx-auto leading-relaxed">
                {t('harnessAi')}
              </p>
              
              <form onSubmit={handleGenerate} className="md:hidden w-full max-w-md mx-auto space-y-3">
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder={t('enterTopic')}
                  className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 shadow-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <button
                  type="submit"
                  disabled={isLoading || !topic.trim()}
                  className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold shadow-lg"
                >
                  {isLoading ? t('thinking') : t('startBuilding')}
                </button>
              </form>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[3px] z-50 flex flex-col items-center justify-center animate-in fade-in duration-300">
            <div className="relative">
              <div className="loading-pulse" style={{ width: '80px', height: '80px', top: '-20px', left: '-20px' }}></div>
              <MapIcon className="w-12 h-12 text-slate-300 relative z-10 animate-bounce" />
            </div>
            <p className="mt-8 text-slate-900 font-bold text-lg tracking-tight">
              {t('generatingVision')}
            </p>
            <p className="text-slate-400 text-sm font-medium mt-1">{t('usingModel', { model: settings.provider === 'gemini' ? 'Google Gemini 3' : settings.openaiModel })}</p>
          </div>
        )}

        {error && (
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-red-600 text-white px-8 py-4 rounded-2xl shadow-2xl shadow-red-200 flex items-center gap-4 z-[60] animate-in slide-in-from-bottom-4">
            <span className="text-sm font-bold">{error}</span>
            <button onClick={() => setError(null)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">&times;</button>
          </div>
        )}
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity" onClick={() => setShowSettings(false)}></div>
          <div className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 fade-in duration-300">
            <div className="px-10 py-8 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">{t('aiSettings')}</h3>
                <p className="text-slate-500 text-sm font-medium">{t('configureCore')}</p>
              </div>
              <button onClick={() => setShowSettings(false)} className="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-2xl text-slate-400 transition-all">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="px-10 pb-10 space-y-8">
              <div className="space-y-3">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">{t('modelProvider')}</label>
                <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl">
                  {['gemini', 'openai'].map((p) => (
                    <button
                      key={p}
                      onClick={() => setSettings(s => ({ ...s, provider: p as any }))}
                      className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all capitalize ${settings.provider === p ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                {settings.provider === 'openai' ? (
                  <div className="space-y-5 animate-in slide-in-from-top-4 duration-300">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">{t('baseEndpoint')}</label>
                      <input
                        type="text"
                        value={settings.openaiEndpoint}
                        onChange={e => setSettings(s => ({ ...s, openaiEndpoint: e.target.value }))}
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 text-sm font-medium focus:border-blue-500 outline-none transition-all"
                        placeholder="https://api.openai.com/v1"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">{t('modelId')}</label>
                        <input
                          type="text"
                          value={settings.openaiModel}
                          onChange={e => setSettings(s => ({ ...s, openaiModel: e.target.value }))}
                          className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 text-sm font-medium focus:border-blue-500 outline-none transition-all"
                          placeholder="gpt-4o"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">{t('apiKey')}</label>
                        <input
                          type="password"
                          value={settings.openaiApiKey}
                          onChange={e => setSettings(s => ({ ...s, openaiApiKey: e.target.value }))}
                          className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 text-sm font-medium focus:border-blue-500 outline-none transition-all"
                          placeholder="sk-..."
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-blue-50 border border-blue-100 rounded-3xl p-6 flex gap-4 animate-in slide-in-from-bottom-4 duration-300">
                    <div className="bg-blue-600 p-2.5 rounded-xl h-fit shadow-lg shadow-blue-200"><Zap className="w-5 h-5 text-white" /></div>
                    <div>
                      <h4 className="font-bold text-blue-900 mb-1">{t('standardGeminiAccess')}</h4>
                      <p className="text-blue-600/70 text-sm font-medium leading-snug">{t('geminiAccessInfo')}</p>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => setShowSettings(false)}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-lg shadow-2xl shadow-slate-200 hover:bg-slate-800 active:scale-95 transition-all mt-4"
              >
                {t('applyChanges')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
