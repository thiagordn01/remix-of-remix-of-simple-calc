import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { X, Search, Upload } from 'lucide-react';
import { Agent } from '../types/agents';
import { LANGUAGES, searchLanguages, getPopularLanguages } from '../data/languages';
import { useToast } from '@/hooks/use-toast';
import { GEMINI_VOICES } from '../utils/geminiTtsConfig';

interface AgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (agent: Omit<Agent, 'id' | 'createdAt'>) => void;
  agent?: Agent;
  title: string;
}

export const AgentModal: React.FC<AgentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  agent,
  title
}) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    channelName: '',
    description: '',
    language: 'pt-BR',
    location: 'Brasil',
    duration: 10,
    premisePrompt: '',
    scriptPrompt: ''
  });

  const [languageSearch, setLanguageSearch] = useState('');
  const [debouncedLanguageSearch, setDebouncedLanguageSearch] = useState('');
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [languageTab, setLanguageTab] = useState<'popular' | 'all'>('popular');
  const [isPremiseFileLoading, setIsPremiseFileLoading] = useState(false);
  const [isScriptFileLoading, setIsScriptFileLoading] = useState(false);
  const premiseTextareaRef = useRef<HTMLTextAreaElement>(null);
  const scriptTextareaRef = useRef<HTMLTextAreaElement>(null);

  // ✅ OTIMIZAÇÃO: Debounce para busca de idiomas (reduz re-renders)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedLanguageSearch(languageSearch);
    }, 150); // 150ms de delay

    return () => clearTimeout(timer);
  }, [languageSearch]);

  useEffect(() => {
    if (agent) {
      setFormData({
        name: agent.name,
        channelName: agent.channelName,
        description: agent.description || '',
        language: agent.language,
        location: agent.location,
        duration: agent.duration,
        premisePrompt: agent.premisePrompt,
        scriptPrompt: agent.scriptPrompt
      });
    } else {
      setFormData({
        name: '',
        channelName: '',
        description: '',
        language: 'pt-BR',
        location: 'Brasil',
        duration: 10,
        premisePrompt: '',
        scriptPrompt: ''
      });
    }
  }, [agent, isOpen]);

  // ✅ OTIMIZAÇÃO: useCallback para evitar recriação de funções em cada render
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      updatedAt: new Date()
    });
    onClose();
  }, [formData, onSave, onClose]);

  const handleInputChange = useCallback((field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const handlePremiseFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    if (!file.name.endsWith('.txt')) {
      toast({
        title: "Formato inválido",
        description: "Por favor, selecione um arquivo .txt",
        variant: "destructive"
      });
      return;
    }
    
    setIsPremiseFileLoading(true);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const content = e.target?.result as string;
      handleInputChange('premisePrompt', content);
      setIsPremiseFileLoading(false);
    };
    
    reader.onerror = () => {
      toast({
        title: "Erro ao ler arquivo",
        description: "Não foi possível ler o arquivo selecionado",
        variant: "destructive"
      });
      setIsPremiseFileLoading(false);
    };
    
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleScriptFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    if (!file.name.endsWith('.txt')) {
      toast({
        title: "Formato inválido",
        description: "Por favor, selecione um arquivo .txt",
        variant: "destructive"
      });
      return;
    }
    
    setIsScriptFileLoading(true);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const content = e.target?.result as string;
      handleInputChange('scriptPrompt', content);
      setIsScriptFileLoading(false);
    };
    
    reader.onerror = () => {
      toast({
        title: "Erro ao ler arquivo",
        description: "Não foi possível ler o arquivo selecionado",
        variant: "destructive"
      });
      setIsScriptFileLoading(false);
    };
    
    reader.readAsText(file);
    event.target.value = '';
  };

  const getPreviewText = (prompt: string, isPremise: boolean = false) => {
    const context = {
      channelName: formData.channelName,
      duration: formData.duration || 10,
      language: LANGUAGES.find(l => l.code === formData.language)?.name || formData.language,
      location: formData.location || 'Brasil'
    };

    let preview = `📋 CONTEXTO AUTOMÁTICO:\n`;
    preview += `• Título: [será informado na geração]\n`;
    if (context.channelName) {
      preview += `• Canal: ${context.channelName}\n`;
    }
    preview += `• Duração: ${context.duration} minutos\n`;
    preview += `• Idioma: ${context.language}\n`;
    preview += `• Público: ${context.location}\n`;

    if (!isPremise) {
      preview += `• Premissa: [gerada automaticamente]\n`;
    }

    preview += `\n✨ SEU PROMPT:\n${prompt || 'Digite suas instruções aqui...'}`;

    return preview;
  };

  // ✅ OTIMIZAÇÃO: useMemo para evitar recalcular agrupamento em cada render
  const groupedLanguages = useMemo(() => {
    const groups: Record<string, typeof LANGUAGES> = {};
    LANGUAGES.forEach(lang => {
      if (!groups[lang.region]) {
        groups[lang.region] = [];
      }
      groups[lang.region].push(lang);
    });
    return groups;
  }, []); // Vazio porque LANGUAGES é constante

  // ✅ OTIMIZAÇÃO: useMemo para listas filtradas
  const filteredLanguages = useMemo(() => {
    return debouncedLanguageSearch ? searchLanguages(debouncedLanguageSearch) : [];
  }, [debouncedLanguageSearch]);

  const popularLanguages = useMemo(() => {
    return getPopularLanguages();
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-black/70 via-golden-950/20 to-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-gradient-to-br from-gray-900 via-golden-950/40 to-amber-950/30 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-[0_8px_32px_rgba(251,191,36,0.25)] border-2 border-golden-500/40 animate-scale-in">
        <div className="flex items-center justify-between p-6 border-b-2 border-golden-500/40 bg-gradient-to-r from-golden-500/20 via-amber-500/15 to-golden-500/20 shadow-[0_4px_20px_rgba(251,191,36,0.15)]">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-golden-400 to-amber-400 bg-clip-text text-transparent">{title}</h2>
          <button
            onClick={onClose}
            className="text-golden-400/70 hover:text-golden-400 transition-colors p-1 rounded-lg hover:bg-golden-500/10"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-golden-400 font-semibold text-sm mb-2">
                Nome do Agente *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full px-4 py-2.5 bg-gradient-to-br from-gray-800/90 to-gray-900/95 border-2 border-golden-500/60 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-golden-300 focus:ring-2 focus:ring-golden-400/70 shadow-[inset_0_2px_8px_rgba(0,0,0,0.3)] backdrop-blur-sm transition-all duration-300 hover:border-golden-400/80"
                placeholder="Ex: Canal do Charles - YouTube"
                required
              />
            </div>

            <div>
              <label className="block text-golden-400 font-semibold text-sm mb-2">
                Nome do Canal (opcional)
              </label>
              <input
                type="text"
                value={formData.channelName}
                onChange={(e) => handleInputChange('channelName', e.target.value)}
                className="w-full px-4 py-2.5 bg-gradient-to-br from-gray-800/90 to-gray-900/95 border-2 border-golden-500/60 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-golden-300 focus:ring-2 focus:ring-golden-400/70 shadow-[inset_0_2px_8px_rgba(0,0,0,0.3)] backdrop-blur-sm transition-all duration-300 hover:border-golden-400/80"
                placeholder="Ex: Canal do Charles"
              />
            </div>
          </div>

          <div>
            <label className="block text-golden-400 font-semibold text-sm mb-2">
              Descrição (opcional)
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="w-full px-4 py-2.5 bg-gradient-to-br from-gray-800/90 to-gray-900/95 border-2 border-golden-500/60 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-golden-300 focus:ring-2 focus:ring-golden-400/70 shadow-[inset_0_2px_8px_rgba(0,0,0,0.3)] backdrop-blur-sm transition-all duration-300 hover:border-golden-400/80"
              placeholder="Descrição do agente"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <label className="block text-golden-400 font-semibold text-sm mb-2">
                Idioma *
              </label>
              <div className="relative">
                <div
                  className="w-full px-4 py-2.5 bg-gradient-to-br from-gray-800/95 to-gray-900/95 border-2 border-golden-500/60 rounded-lg text-white focus:outline-none focus:border-golden-300 focus:ring-2 focus:ring-golden-400/70 shadow-[inset_0_2px_8px_rgba(0,0,0,0.3)] backdrop-blur-sm transition-all duration-300 hover:border-golden-400/80 cursor-pointer flex items-center justify-between"
                  onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                >
                  <span className="flex items-center gap-2">
                    {LANGUAGES.find(lang => lang.code === formData.language)?.flag}
                    {LANGUAGES.find(lang => lang.code === formData.language)?.name || 'Selecione um idioma'}
                  </span>
                  <Search className="w-4 h-4 text-golden-400/70" />
                </div>
                
                {showLanguageDropdown && (
                  <div className="absolute z-[100] left-0 min-w-[300px] w-max mt-1 bg-gradient-to-br from-gray-900 to-gray-800 backdrop-blur-xl border-2 border-golden-500/70 rounded-lg shadow-[0_8px_32px_rgba(251,191,36,0.4)] overflow-hidden">
                    {/* Campo de busca - fixo no topo */}
                    <div className="sticky top-0 z-10 p-3 border-b-2 border-golden-500/50 bg-gray-800/50">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-golden-400" />
                        <input
                          type="text"
                          placeholder="Digite para buscar idioma..."
                          value={languageSearch}
                          onChange={(e) => setLanguageSearch(e.target.value)}
                          className="w-full pl-10 pr-3 py-2 bg-gray-800 border-2 border-golden-500/70 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-golden-400 focus:border-golden-300 placeholder-gray-400 shadow-[inset_0_2px_6px_rgba(0,0,0,0.4)] transition-all"
                          autoFocus
                        />
                      </div>
                    </div>

                    {/* Tabs - apenas quando não está buscando */}
                    {!languageSearch && (
                      <div className="sticky top-[69px] z-20 flex border-b border-golden-500/30 bg-gray-900/95 shadow-md backdrop-blur-sm">
                        <button
                          type="button"
                          onClick={() => setLanguageTab('popular')}
                          className={`relative flex-1 px-3 py-2.5 text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                            languageTab === 'popular'
                              ? 'bg-gradient-to-r from-golden-600/80 to-amber-600/70 text-white shadow-[0_2px_6px_rgba(251,191,36,0.25)] border-b-3 border-golden-400/80'
                              : 'text-gray-200 bg-gray-800/80 hover:text-white hover:bg-golden-800/60 hover:border-b-3 hover:border-golden-500/40 border-b-3 border-transparent'
                          }`}
                        >
                          <span className="text-base">✨</span> Populares
                        </button>
                        <button
                          type="button"
                          onClick={() => setLanguageTab('all')}
                          className={`relative flex-1 px-3 py-2.5 text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                            languageTab === 'all'
                              ? 'bg-gradient-to-r from-golden-600/80 to-amber-600/70 text-white shadow-[0_2px_6px_rgba(251,191,36,0.25)] border-b-3 border-golden-400/80'
                              : 'text-gray-200 bg-gray-800/80 hover:text-white hover:bg-golden-800/60 hover:border-b-3 hover:border-golden-500/40 border-b-3 border-transparent'
                          }`}
                        >
                          <span className="text-base">🌐</span> Todos
                        </button>
                      </div>
                    )}

                    {/* Lista de idiomas - scroll único e limpo */}
                    <div className="max-h-80 overflow-y-auto custom-scrollbar">
                      {debouncedLanguageSearch ? (
                        // ========== MODO BUSCA ==========
                        <>
                          {filteredLanguages.length > 0 ? (
                            <div className="p-1">
                              {filteredLanguages.map((language) => (
                                <div
                                  key={language.code}
                                  className={`px-3 py-2.5 mb-1 cursor-pointer rounded-md hover:bg-golden-700/30 flex items-center gap-3 transition-all duration-200 ${
                                    formData.language === language.code ? 'bg-gradient-to-r from-golden-600/90 to-amber-600/90 border-l-4 border-golden-300' : ''
                                  }`}
                                  onClick={() => {
                                    handleInputChange('language', language.code);
                                    handleInputChange('location', language.region);
                                    setShowLanguageDropdown(false);
                                    setLanguageSearch('');
                                  }}
                                >
                                  <span className="text-2xl">{language.flag}</span>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-white font-medium text-sm truncate">{language.name}</div>
                                    <div className="text-golden-300/90 text-xs truncate">{language.nativeName}</div>
                                  </div>
                                  {formData.language === language.code && (
                                    <div className="w-2 h-2 rounded-full bg-white"></div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="px-4 py-8 text-center">
                              <div className="text-golden-400/50 text-sm">Nenhum idioma encontrado</div>
                              <div className="text-golden-400/30 text-xs mt-1">Tente buscar em português ou inglês</div>
                            </div>
                          )}
                        </>
                      ) : languageTab === 'popular' ? (
                        // ========== TAB POPULARES ==========
                        <div className="p-1">
                          {popularLanguages.map((language) => (
                            <div
                              key={language.code}
                              className={`px-3 py-2.5 mb-1 cursor-pointer rounded-md hover:bg-golden-700/30 flex items-center gap-3 transition-all duration-200 ${
                                formData.language === language.code ? 'bg-gradient-to-r from-golden-500/80 to-amber-500/80 border-l-4 border-golden-400' : ''
                              }`}
                              onClick={() => {
                                handleInputChange('language', language.code);
                                handleInputChange('location', language.region);
                                setShowLanguageDropdown(false);
                              }}
                            >
                              <span className="text-2xl">{language.flag}</span>
                              <div className="flex-1 min-w-0">
                                <div className="text-white font-medium text-sm truncate">{language.name}</div>
                                <div className="text-golden-300/90 text-xs truncate">{language.nativeName} • {language.region}</div>
                              </div>
                              {formData.language === language.code && (
                                <div className="w-2 h-2 rounded-full bg-white"></div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        // ========== TAB TODOS (agrupado por região - REDESENHADO) ==========
                        <div>
                          {Object.entries(groupedLanguages).map(([region, languages]) => (
                            <div key={region} className="mb-1">
                              {/* Header da região - mais compacto */}
                              <div className="sticky top-0 z-[5] px-3 py-1.5 bg-gray-800/95 backdrop-blur-sm border-b border-golden-500/40">
                                <div className="flex items-center gap-2">
                                  <div className="h-px flex-1 bg-golden-500/20"></div>
                                  <span className="text-golden-300 text-xs font-semibold uppercase tracking-wider">
                                    {region}
                                  </span>
                                  <div className="h-px flex-1 bg-golden-500/20"></div>
                                </div>
                              </div>

                              {/* Idiomas da região */}
                              <div className="p-1">
                                {languages.map((language) => (
                                  <div
                                    key={language.code}
                                    className={`px-3 py-2.5 mb-1 cursor-pointer rounded-md hover:bg-golden-700/30 flex items-center gap-3 transition-all duration-200 ${
                                      formData.language === language.code ? 'bg-gradient-to-r from-golden-500/80 to-amber-500/80 border-l-4 border-golden-400' : ''
                                    }`}
                                    onClick={() => {
                                      handleInputChange('language', language.code);
                                      handleInputChange('location', language.region);
                                      setShowLanguageDropdown(false);
                                    }}
                                  >
                                    <span className="text-2xl">{language.flag}</span>
                                    <div className="flex-1 min-w-0">
                                      <div className="text-white font-medium text-sm truncate">{language.name}</div>
                                      <div className="text-golden-300/90 text-xs truncate">{language.nativeName}</div>
                                    </div>
                                    {formData.language === language.code && (
                                      <div className="w-2 h-2 rounded-full bg-white"></div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-golden-400 font-semibold text-sm mb-2">
                Localização
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                className="w-full px-4 py-2.5 bg-gradient-to-br from-gray-800/90 to-gray-900/95 border-2 border-golden-500/60 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-golden-300 focus:ring-2 focus:ring-golden-400/70 shadow-[inset_0_2px_8px_rgba(0,0,0,0.3)] backdrop-blur-sm transition-all duration-300 hover:border-golden-400/80"
                placeholder="Brasil"
              />
            </div>

            <div>
              <label className="block text-golden-400 font-semibold text-sm mb-2">
                Duração (min)
              </label>
              <input
                type="number"
                value={formData.duration}
                onChange={(e) => handleInputChange('duration', parseInt(e.target.value))}
                className="w-full px-4 py-2.5 bg-gradient-to-br from-gray-800/90 to-gray-900/95 border-2 border-golden-500/60 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-golden-300 focus:ring-2 focus:ring-golden-400/70 shadow-[inset_0_2px_8px_rgba(0,0,0,0.3)] backdrop-blur-sm transition-all duration-300 hover:border-golden-400/80"
                placeholder="10"
                min="1"
                max="60"
              />
            </div>

            <div />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-golden-400 font-semibold text-sm">
                Prompt para Premissa
              </label>
              <label className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-golden-900/40 to-amber-900/30 hover:from-golden-800/60 hover:to-amber-800/50 border border-golden-600/40 rounded-lg cursor-pointer text-sm text-golden-200 transition-all duration-300 shadow-[0_2px_8px_rgba(0,0,0,0.2)]">
                <Upload className="w-4 h-4" />
                {isPremiseFileLoading ? 'Carregando...' : 'Upload .txt'}
                <input
                  type="file"
                  accept=".txt"
                  onChange={handlePremiseFileUpload}
                  className="hidden"
                  disabled={isPremiseFileLoading}
                />
              </label>
            </div>
            
            <p className="text-xs text-golden-400/70 mb-2">
              💡 Escreva suas instruções livremente ou faça upload de um arquivo .txt. O sistema incluirá automaticamente todas as informações.
            </p>
            
            <textarea
              ref={premiseTextareaRef}
              value={formData.premisePrompt}
              onChange={(e) => handleInputChange('premisePrompt', e.target.value)}
              className="w-full px-4 py-3 bg-gradient-to-br from-gray-800/90 to-gray-900/95 border-2 border-golden-500/60 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-golden-300 focus:ring-2 focus:ring-golden-400/70 shadow-[inset_0_2px_8px_rgba(0,0,0,0.3)] backdrop-blur-sm transition-all duration-300 hover:border-golden-400/80 h-24 resize-none"
              placeholder="Ex: Crie uma premissa criativa e envolvente para um vídeo educativo..."
              required
            />
            
            {formData.premisePrompt && (
              <div className="mt-2 p-3 bg-gradient-to-br from-golden-950/20 to-amber-950/10 border-2 border-golden-600/30 rounded-lg text-xs text-golden-300/80 max-h-48 overflow-y-auto shadow-[0_0_15px_rgba(251,191,36,0.08)]">
                <div className="font-medium text-golden-200 dark:text-golden-300 mb-1">📋 Preview do que será enviado:</div>
                <div className="whitespace-pre-wrap">{getPreviewText(formData.premisePrompt, true)}</div>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-golden-400 font-semibold text-sm">
                Prompt para Roteiro
              </label>
              <label className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-golden-900/40 to-amber-900/30 hover:from-golden-800/60 hover:to-amber-800/50 border border-golden-600/40 rounded-lg cursor-pointer text-sm text-golden-200 transition-all duration-300 shadow-[0_2px_8px_rgba(0,0,0,0.2)]">
                <Upload className="w-4 h-4" />
                {isScriptFileLoading ? 'Carregando...' : 'Upload .txt'}
                <input
                  type="file"
                  accept=".txt"
                  onChange={handleScriptFileUpload}
                  className="hidden"
                  disabled={isScriptFileLoading}
                />
              </label>
            </div>
            
            <p className="text-xs text-golden-400/70 mb-2">
              💡 Escreva suas instruções livremente ou faça upload de um arquivo .txt. O sistema incluirá automaticamente todas as informações incluindo a premissa gerada.
            </p>
            
            <textarea
              ref={scriptTextareaRef}
              value={formData.scriptPrompt}
              onChange={(e) => handleInputChange('scriptPrompt', e.target.value)}
              className="w-full px-4 py-3 bg-gradient-to-br from-gray-800/90 to-gray-900/95 border-2 border-golden-500/60 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-golden-300 focus:ring-2 focus:ring-golden-400/70 shadow-[inset_0_2px_8px_rgba(0,0,0,0.3)] backdrop-blur-sm transition-all duration-300 hover:border-golden-400/80 h-24 resize-none"
              placeholder="Ex: Desenvolva um roteiro completo e detalhado seguindo a premissa..."
              required
            />
            
            {formData.scriptPrompt && (
              <div className="mt-2 p-3 bg-gradient-to-br from-golden-950/20 to-amber-950/10 border-2 border-golden-600/30 rounded-lg text-xs text-golden-300/80 max-h-48 overflow-y-auto shadow-[0_0_15px_rgba(251,191,36,0.08)]">
                <div className="font-medium text-golden-200 dark:text-golden-300 mb-1">📋 Preview do que será enviado:</div>
                <div className="whitespace-pre-wrap">{getPreviewText(formData.scriptPrompt, false)}</div>
              </div>
            )}
          </div>


          <div className="flex justify-end space-x-3 pt-6 border-t-2 border-golden-600/30">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-golden-300 hover:text-golden-100 hover:bg-golden-900/30 rounded-lg transition-all duration-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-gradient-to-r from-golden-500 to-amber-500 text-white font-semibold rounded-lg hover:from-golden-600 hover:to-amber-600 hover:shadow-[0_8px_24px_rgba(251,191,36,0.4)] hover:scale-105 active:scale-95 transition-all duration-300"
            >
              {agent ? 'Salvar Alterações' : 'Criar Agente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
