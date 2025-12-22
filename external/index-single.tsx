import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import JSZip from "jszip";

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Types ---
interface Agent {
  id: string;
  name: string;
  language: string;
  location: string;
  durationMinutes: number;
  premisePrompt: string;
  scriptPrompt: string;
}

interface HistoryItem {
  id: string;
  title: string;
  agentName: string;
  content: string;
  timestamp: number;
}

interface BatchItem {
  id: string;
  order: number;
  title: string;
  content: string | null;
  status: 'pending' | 'generating' | 'completed' | 'error';
  errorMsg?: string;
}

const LANGUAGES = [
  "Português Brasileiro",
  "English (USA)",
  "English (UK)",
  "Español (España)",
  "Español (Latinoamérica)",
  "Français",
  "Deutsch",
  "Italiano",
  "Polonês",
  "日本語",
  "한국어"
];

const DEFAULT_AGENTS: Agent[] = [
  {
    id: "1",
    name: "Contador de Histórias (Simples & Direto)",
    language: "Português Brasileiro",
    location: "Brasil",
    durationMinutes: 10,
    premisePrompt: "Crie uma premissa cinematográfica baseada neste título. Defina o protagonista, o cenário único (world-building), o incidente incitante e os riscos emocionais. Faça parecer a sinopse de um filme premiado.",
    scriptPrompt: "Apenas conte a história. Use linguagem simples, direta e emocionante. Sem enrolação."
  },
  {
    id: "2",
    name: "Viral Shorts (EUA)",
    language: "English (USA)",
    location: "USA (Gen Z Culture)",
    durationMinutes: 1,
    premisePrompt: "Create a fast-paced premise for a viral short. Focus on a visual hook and an immediate conflict.",
    scriptPrompt: "Write a high-retention script text ONLY. No visual cues, no [brackets]. Use slang, keep sentences short. Direct address to camera. The text must be ready to read out loud immediately."
  }
];

// --- Icons ---
const YoutubeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
    <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
    <path d="m10 15 5-3-5-3z" />
  </svg>
);

const WandIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 4V2" />
    <path d="M15 16v-2" />
    <path d="M8 9h2" />
    <path d="M20 9h2" />
    <path d="M17.8 11.8 19 13" />
    <path d="M15 9h0" />
    <path d="M17.8 6.2 19 5" />
    <path d="m3 21 9-9" />
    <path d="M12.2 6.2 11 5" />
  </svg>
);

const CopyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
  </svg>
);

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const LoaderIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

const MovieIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="18" x="3" y="3" rx="2" />
    <path d="M7 3v18" />
    <path d="M3 7.5h4" />
    <path d="M3 12h18" />
    <path d="M3 16.5h4" />
    <path d="M17 3v18" />
    <path d="M17 7.5h4" />
    <path d="M17 16.5h4" />
  </svg>
);

const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

const SettingsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18"/>
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
  </svg>
);

const ClockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
);

const MicrophoneIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
    <line x1="12" y1="19" x2="12" y2="23"/>
    <line x1="8" y1="23" x2="16" y2="23"/>
  </svg>
);

const SaveDiskIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
    <polyline points="17 21 17 13 7 13 7 21"/>
    <polyline points="7 3 7 8 15 8"/>
  </svg>
);

const HistoryIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3v5h5"/>
    <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/>
    <path d="M12 6v6l4 2"/>
  </svg>
);

const DownloadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const UploadCloudIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 16 12 12 8 16" />
    <line x1="12" y1="12" x2="12" y2="21" />
    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
    <polyline points="16 16 12 12 8 16" />
  </svg>
);

const DownloadCloudIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
    <path d="M12 12v9" />
    <path d="m8 17 4 4 4-4" />
  </svg>
);

const ZipIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 2v20" />
    <path d="M14 2v20" />
    <path d="M4 2v20" />
    <path d="M20 2v20" />
    <path d="M4 10h16" />
  </svg>
);

const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const ListIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);

// --- App Component ---

function App() {
  // State for Agents
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // State for History
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // State for Generation
  const [formData, setFormData] = useState({
    title: "", // This will now serve as "Titles input" (textarea content)
    premisePrompt: "",
    scriptPrompt: "",
  });
  
  const [output, setOutput] = useState("");
  // Used to track which title corresponds to the current output
  const [currentDisplayTitle, setCurrentDisplayTitle] = useState(""); 

  const [stepStatus, setStepStatus] = useState<"idle" | "generating-premise" | "generating-script">("idle");
  const [generationProgress, setGenerationProgress] = useState<{ current: number; total: number } | null>(null);
  
  // Batch State
  const [batchStatus, setBatchStatus] = useState<{ current: number; total: number } | null>(null);
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);

  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // New State for View Mode
  const [viewMode, setViewMode] = useState<"full" | "clean">("full");

  // File Input Ref for Import
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load Agents and History from LocalStorage on mount
  useEffect(() => {
    try {
        // Load Agents
        const savedAgents = localStorage.getItem("scriptGenAgents");
        if (savedAgents) {
            const parsed = JSON.parse(savedAgents);
            if (Array.isArray(parsed) && parsed.length > 0) {
                setAgents(parsed);
                // Set default agent immediately
                const firstAgent = parsed[0];
                setSelectedAgentId(firstAgent.id);
                setFormData(prev => ({
                    ...prev,
                    premisePrompt: firstAgent.premisePrompt,
                    scriptPrompt: firstAgent.scriptPrompt
                }));
            } else {
                setAgents(DEFAULT_AGENTS);
                localStorage.setItem("scriptGenAgents", JSON.stringify(DEFAULT_AGENTS));
                selectAgent(DEFAULT_AGENTS[0]);
            }
        } else {
            setAgents(DEFAULT_AGENTS);
            localStorage.setItem("scriptGenAgents", JSON.stringify(DEFAULT_AGENTS));
            selectAgent(DEFAULT_AGENTS[0]);
        }

        // Load History
        const savedHistory = localStorage.getItem("scriptGenHistory");
        if (savedHistory) {
            const parsed = JSON.parse(savedHistory);
            if (Array.isArray(parsed)) {
                setHistory(parsed);
            }
        }
    } catch (e) {
        console.error("Erro ao carregar dados do LocalStorage:", e);
        // Fallback para evitar tela branca
        setAgents(DEFAULT_AGENTS);
        selectAgent(DEFAULT_AGENTS[0]);
    }
  }, []);

  const selectAgent = (agent: Agent) => {
    setSelectedAgentId(agent.id);
    setFormData(prev => ({
      ...prev,
      premisePrompt: agent.premisePrompt,
      scriptPrompt: agent.scriptPrompt
    }));
  };

  const addToHistory = (title: string, content: string, agentName: string) => {
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      title,
      content,
      agentName,
      timestamp: Date.now(),
    };

    const updatedHistory = [newItem, ...history];
    // Limit to 50 items
    if (updatedHistory.length > 50) {
      updatedHistory.pop();
    }
    
    setHistory(updatedHistory);
    localStorage.setItem("scriptGenHistory", JSON.stringify(updatedHistory));
  };

  const deleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedHistory = history.filter(item => item.id !== id);
    setHistory(updatedHistory);
    localStorage.setItem("scriptGenHistory", JSON.stringify(updatedHistory));
  };

  const loadHistoryItem = (item: HistoryItem) => {
    setCurrentDisplayTitle(item.title);
    setOutput(item.content);
    setShowHistoryModal(false);
    setViewMode("full");
  };

  const loadBatchItem = (item: BatchItem) => {
    if (!item.content) return;
    setCurrentDisplayTitle(item.title);
    setOutput(item.content);
  };

  const clearBatch = () => {
      setBatchItems([]);
      setBatchStatus(null);
      setOutput("");
      setCurrentDisplayTitle("");
  };

  const handleAgentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const agentId = e.target.value;
    if (agentId === "new") {
      setEditingAgent({
        id: Date.now().toString(),
        name: "Novo Agente",
        language: "Português Brasileiro",
        location: "Brasil",
        durationMinutes: 8, // Default duration
        premisePrompt: DEFAULT_AGENTS[0].premisePrompt,
        scriptPrompt: DEFAULT_AGENTS[0].scriptPrompt
      });
      setShowAgentModal(true);
    } else {
      const agent = agents.find(a => a.id === agentId);
      if (agent) selectAgent(agent);
    }
  };

  const saveAgent = (agent: Agent) => {
    let newAgents;
    const exists = agents.find(a => a.id === agent.id);
    
    if (exists) {
      newAgents = agents.map(a => a.id === agent.id ? agent : a);
    } else {
      newAgents = [...agents, agent];
    }
    
    setAgents(newAgents);
    localStorage.setItem("scriptGenAgents", JSON.stringify(newAgents));
    
    if (selectedAgentId === agent.id || !selectedAgentId) {
       selectAgent(agent);
    }

    setShowAgentModal(false);
    setEditingAgent(null);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const updateCurrentAgent = () => {
    const current = agents.find(a => a.id === selectedAgentId);
    if (!current) return;
    
    const updatedAgent = {
        ...current,
        premisePrompt: formData.premisePrompt,
        scriptPrompt: formData.scriptPrompt
    };
    saveAgent(updatedAgent);
  };

  const deleteAgent = (id: string) => {
    const newAgents = agents.filter(a => a.id !== id);
    setAgents(newAgents);
    localStorage.setItem("scriptGenAgents", JSON.stringify(newAgents));
    if (newAgents.length > 0) {
      selectAgent(newAgents[0]);
    } else {
      setSelectedAgentId("");
      setFormData(prev => ({ ...prev, premisePrompt: "", scriptPrompt: "" }));
    }
  };

  // --- Import / Export Agents Logic ---
  
  const exportAgents = () => {
    const jsonString = JSON.stringify(agents, null, 2);
    const element = document.createElement("a");
    const file = new Blob([jsonString], {type: 'application/json'});
    element.href = URL.createObjectURL(file);
    element.download = `agents_backup_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const importAgents = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const importedAgents = JSON.parse(content);
        
        if (!Array.isArray(importedAgents)) {
          alert("O arquivo selecionado não é uma lista válida de agentes.");
          return;
        }

        const mergedAgents = [...agents];
        importedAgents.forEach(imp => {
           const idx = mergedAgents.findIndex(a => a.id === imp.id);
           if (idx >= 0) {
             mergedAgents[idx] = imp; 
           } else {
             mergedAgents.push(imp);
           }
        });

        setAgents(mergedAgents);
        localStorage.setItem("scriptGenAgents", JSON.stringify(mergedAgents));
        
        if (mergedAgents.length > 0 && !selectedAgentId) {
            selectAgent(mergedAgents[0]);
        }

        alert("Agentes importados com sucesso!");
        
      } catch (err) {
        console.error(err);
        alert("Erro ao ler o arquivo JSON. Verifique o formato.");
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Helper to remove artifacts like "**[FIM DA PARTE X]**" or "**DURAÇÃO:**"
  // NOW ENHANCED TO STRIP [IMAGES] AND (DIRECTIONS)
  const cleanArtifacts = (text: string) => {
    // 1. Filter out unwanted metadata lines
    let cleaned = text.split('\n').filter(line => {
      const lower = line.toLowerCase();
      const trimmed = line.trim();
      
      // Existing filters for bold metadata
      if (trimmed.startsWith('**') && (lower.includes('fim da parte') || lower.includes('parte') || lower.includes('duração') || lower.includes('status') || lower.includes('roteiro:') || lower.includes('cena'))) {
        return false;
      }

      // 2. New Filters for AI "Thinking" Artifacts (User Feedback)
      
      // Filter: "PAUSA PARA O CHAMADO:" type headers
      if (trimmed.toUpperCase().includes('PAUSA PARA') || trimmed.toUpperCase().includes('BLOCO NARRATIVO') || trimmed.toUpperCase().includes('ESTRUTURA:')) {
          return false;
      }

      // Filter: "*TRAIÇÃO.* *CRIME.*" type keywords
      // Detect lines that are just capitalized keywords wrapped in asterisks
      if (/^(\*[A-ZÃÁÀÂÉÊÍÓÔÚÇ\s\.]+\*\s*)+$/.test(trimmed)) {
          return false;
      }
      
      // Filter: Short headers ending in colon, often uppercase
      // e.g. "INTRODUÇÃO:" or "MOMENTO 1:"
      if (trimmed.endsWith(':') && trimmed.length < 40 && trimmed.toUpperCase() === trimmed) {
          return false;
      }

      // Filter: Numbered structural items that slipped into text
      // e.g. "1. Gancho e Introdução"
      if (/^\d+\.\s+[A-Z]/.test(trimmed) && trimmed.length < 60) {
          // Heuristic: Short numbered lines starting with capital letters are likely structural headers
          return false;
      }

      return true;
    }).join('\n');

    // 3. Strict Regex Cleaning for content inside brackets [] and remaining bold artifacts
    cleaned = cleaned.replace(/\[.*?\]/g, ''); // Remove [Images]
    cleaned = cleaned.replace(/\*\*[0-9].*?\*\*/g, ''); // Remove **1. Header** artifacts
    
    return cleaned;
  };

  // Helper to extract only narration text
  const getCleanNarration = (rawOutput: string) => {
    const cleanedRaw = cleanArtifacts(rawOutput);
    const scriptHeaderIndex = cleanedRaw.indexOf('## 📝 ROTEIRO');
    if (scriptHeaderIndex !== -1) {
        const scriptPart = cleanedRaw.substring(scriptHeaderIndex);
        return scriptPart.replace(/## 📝 ROTEIRO.*(\n|$)/, '').trim();
    }
    return cleanedRaw;
  };

  // The Core Worker Function
  const generateSingleScript = async (title: string, currentAgent: Agent) => {
      // 1. Reset Output for this run
      setOutput("");
      setStepStatus("generating-premise");
      setCurrentDisplayTitle(title);
      setGenerationProgress(null);

      // --- PASSO 1: GERAR A PREMISSA ---
      const premiseSystemInstruction = `
        Atue como um Roteirista de Cinema Expert localizado em: ${currentAgent.location}.
        Idioma de saída: ${currentAgent.language}.
        OBJETIVO: Criar a 'Bíblia' da história (Premissa) antes do roteiro.
        REGRAS DE FORMATAÇÃO:
        - NÃO use Markdown de negrito (**) em excesso.
        - NÃO inclua metadados como "Data", "Autor" ou "Versão".
        - Apenas entregue o texto da premissa.
      `;

      const premiseResponse = await ai.models.generateContent({
        model: "gemini-3-pro-preview",
        contents: `Título do Vídeo: ${title}\n\nInstruções para a Premissa: ${formData.premisePrompt}`,
        config: { 
            systemInstruction: premiseSystemInstruction,
            maxOutputTokens: 8192
        }
      });
      
      const premiseText = premiseResponse.text || "";
      const formattedPremise = `## 🎬 PREMISSA (A Alma da História)\n\n${premiseText}\n\n---\n\n## 📝 ROTEIRO (O Corpo)\n\n`;
      setOutput(formattedPremise);

      // --- PASSO 2: GERAR O ROTEIRO ---
      setStepStatus("generating-script");

      // Calculate Dynamic Word Counts for YouTube Retention
      // INCREASED WPM to 170 to fix low character count issues
      const wpm = 170; 
      const totalWordsTarget = currentAgent.durationMinutes * wpm;
      
      // We keep 10-minute chunks for context management, but calculate strict word targets per chunk
      const minutesPerChunk = 10;
      const totalParts = Math.max(1, Math.ceil(currentAgent.durationMinutes / minutesPerChunk));
      const wordsPerPart = Math.round(totalWordsTarget / totalParts);
      
      setGenerationProgress({ current: 1, total: totalParts });

      // SYSTEM INSTRUCTION: "The Constitution of Style"
      const scriptSystemInstruction = `
        VOCÊ É UM CONTADOR DE HISTÓRIAS PROFISSIONAL.

        === A CONSTITUIÇÃO DO ESTILO (REGRAS SUPREMAS E IMUTÁVEIS) ===
        Estas regras devem ser seguidas em 100% do texto:
        1. DENSIDADE MÁXIMA: Escreva muito. Descreva cada segundo. Evite resumos.
        2. CAMERA LENTA: A narrativa deve ser lenta e detalhada, não apressada.
        3. "SHOW, DON'T TELL": Se alguém está com medo, descreva o suor, a respiração, o tremor, não diga apenas "ele teve medo".

        === REGRA DE OURO (FORMATO) ===
        - Entregue APENAS o texto da história (Narração).
        - NÃO coloque títulos, capítulos, asteriscos (**), nem introduções do tipo 'Claro, aqui vai'.
        - PROIBIDO: Palavras-chave soltas (ex: *TENSÃO*), ou instruções de pausa (ex: PAUSA PARA...).
        - O TEXTO DEVE SER FLUÍDO E PRONTO PARA LEITURA EM VOZ ALTA.

        === CONTEXTO TÉCNICO ===
        - Localização do público: ${currentAgent.location}.
        - Idioma: ${currentAgent.language}.
        - Meta de Duração Total: ${currentAgent.durationMinutes} minutos.
        
        === CONTROLE DE TAMANHO (MECÂNICA) ===
        - Você está escrevendo a parte atual de um total de ${totalParts} partes.
        - META DE PALAVRAS POR PARTE: MÁXIMO DE ${wordsPerPart} palavras.
        - NÃO ULTRAPASSE, MAS TENTE ATINGIR ESSA META.
      `;

      const chat = ai.chats.create({
        model: "gemini-3-pro-preview",
        config: { 
            systemInstruction: scriptSystemInstruction,
            maxOutputTokens: 8192
        }
      });

      let fullScriptAccumulator = "";
      
      for (let part = 1; part <= totalParts; part++) {
        setGenerationProgress({ current: part, total: totalParts });
        
        // MICRO-CHAPTER STRATEGY: 
        // Force the model to generate 3 internal blocks within one request to maximize tokens.
        let structureInstruction = "";
        if (part === 1) {
            structureInstruction = `
            ESTRUTURA INTERNA MENTAL (GUIE-SE POR AQUI, MAS NÃO IMPRIMA OS TÍTULOS):
            Divida o fluxo em 3 momentos, mas escreva como um texto único e corrido, sem headers visíveis:
            1. (Mentalmente) Gancho e Introdução Imersiva (0-3 min) - Descreva o ambiente e o "status quo".
            2. (Mentalmente) Desenvolvimento do Contexto (3-6 min) - Explique os antecedentes sem pressa.
            3. (Mentalmente) O Incidente Incitante (6-10 min) - O momento da mudança, narrado em câmera lenta.
            `;
        } else if (part === totalParts) {
            structureInstruction = `
            ESTRUTURA INTERNA MENTAL (GUIE-SE POR AQUI, MAS NÃO IMPRIMA OS TÍTULOS):
            Divida o fluxo em 3 momentos, mas escreva como um texto único e corrido:
            1. (Mentalmente) O Grande Clímax (Parte Inicial) - A tensão sobe ao máximo.
            2. (Mentalmente) O Ápice e a Queda - O ponto de não retorno.
            3. (Mentalmente) Resolução e Reflexão (Fim) - As consequências e a mensagem final duradoura.
            `;
        } else {
             structureInstruction = `
            ESTRUTURA INTERNA MENTAL (GUIE-SE POR AQUI, MAS NÃO IMPRIMA OS TÍTULOS):
            Divida o fluxo em 3 momentos, mas escreva como um texto único e corrido:
            1. (Mentalmente) Novos Obstáculos - A situação piora. Detalhe as dificuldades.
            2. (Mentalmente) Aprofundamento Emocional - O que os personagens sentem? Use monólogos internos.
            3. (Mentalmente) A Virada - Uma nova informação ou evento muda tudo.
            `;
        }

        let partPrompt = `
            ESCREVA A PARTE ${part} DE ${totalParts}. IDIOMA: ${currentAgent.language}.
            
            META DE VOLUME: ~${wordsPerPart} palavras. Tente preencher ao máximo.
            
            ${structureInstruction}
            
            INSTRUÇÕES DO USUÁRIO: ${formData.scriptPrompt}
            
            LEMBRE-SE: Descreva o invisível. Use metáforas. Encha o tempo.
            IMPORTANTE: NÃO ESCREVA OS NOMES DOS TÓPICOS ACIMA. APENAS A NARRAÇÃO.
        `;

        if (part === 1) {
             partPrompt = `
            CONTEXTO (PREMISSA APROVADA):
            ${premiseText}
            
            TÍTULO: ${title}
            ` + partPrompt;
        }

        const partStream = await chat.sendMessageStream({ message: partPrompt });
        
        for await (const chunk of partStream) {
            const c = chunk as GenerateContentResponse;
            if (c.text) {
                fullScriptAccumulator += c.text;
                setOutput(formattedPremise + fullScriptAccumulator);
            }
        }
      }
      
      return formattedPremise + fullScriptAccumulator;
  };

  // The Orchestrator Function (Batch Handler)
  const generateStory = async () => {
    // 1. Get titles from textarea
    const titles = formData.title.split('\n').map(t => t.trim()).filter(t => t !== "");

    if (titles.length === 0) {
      setError("Por favor, insira pelo menos um título para começar.");
      return;
    }

    const currentAgent = agents.find(a => a.id === selectedAgentId);
    if (!currentAgent) {
      setError("Selecione um agente para continuar.");
      return;
    }

    setError("");
    setViewMode("full");
    
    // Initialize Batch Items
    const newBatchItems: BatchItem[] = titles.map((t, i) => ({
      id: Date.now().toString() + i,
      order: i + 1,
      title: t,
      content: null,
      status: 'pending'
    }));
    setBatchItems(newBatchItems);
    
    // Setup Batch State
    setBatchStatus({ current: 0, total: titles.length });

    try {
        for (let i = 0; i < titles.length; i++) {
            const titleToProcess = titles[i];
            const batchId = newBatchItems[i].id;
            
            // Update Batch Status
            setBatchStatus({ current: i + 1, total: titles.length });
            
            // Update Item Status to Generating
            setBatchItems(prev => prev.map(item => item.id === batchId ? { ...item, status: 'generating' } : item));
            
            try {
                // Run Single Generation
                const finalContent = await generateSingleScript(titleToProcess, currentAgent);
                
                // Save to history
                addToHistory(titleToProcess, finalContent, currentAgent.name);

                // Update Item Status to Completed
                setBatchItems(prev => prev.map(item => item.id === batchId ? { ...item, status: 'completed', content: finalContent } : item));
            } catch (singleErr: any) {
                console.error(singleErr);
                setBatchItems(prev => prev.map(item => item.id === batchId ? { ...item, status: 'error', errorMsg: singleErr.message } : item));
            }
            
            // Small delay
            if (i < titles.length - 1) {
                await new Promise(r => setTimeout(r, 1000));
            }
        }
    } catch (err: any) {
      console.error(err);
      let msg = "Ocorreu um erro desconhecido durante a geração.";
      setError(msg);
    } finally {
      setStepStatus("idle");
      setGenerationProgress(null);
      setBatchStatus(null);
    }
  };

  const copyToClipboard = (text: string, id?: string) => {
    const clean = getCleanNarration(text);
    navigator.clipboard.writeText(clean);
    if (id) {
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    } else {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }
  };

  const downloadSingleTxt = (filename: string, content: string) => {
    const cleanContent = getCleanNarration(content);
    const element = document.createElement("a");
    const file = new Blob([cleanContent], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    const safeTitle = filename.replace(/[^a-z0-9]/gi, '_').toLowerCase().substring(0, 50);
    element.download = `${safeTitle}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const downloadAllZip = async () => {
      const zip = new JSZip();
      
      const completedItems = batchItems.filter(item => item.status === 'completed' && item.content);
      
      if (completedItems.length === 0) return;

      completedItems.forEach(item => {
          if (item.content) {
              const safeTitle = item.title.replace(/[^a-z0-9]/gi, '_').toLowerCase().substring(0, 50);
              const filename = `Roteiro ${item.order} - ${safeTitle}.txt`;
              const cleanContent = getCleanNarration(item.content);
              zip.file(filename, cleanContent);
          }
      });

      const content = await zip.generateAsync({ type: "blob" });
      const element = document.createElement("a");
      element.href = URL.createObjectURL(content);
      element.download = `roteiros_lote_${new Date().toISOString().slice(0,10)}.zip`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
  };

  return (
    <div className="min-h-screen flex flex-col items-center py-10 px-4 md:px-8 max-w-7xl mx-auto relative">
      
      {/* Toast de Sucesso */}
      {saveSuccess && (
        <div className="fixed top-5 right-5 z-[60] bg-green-500 text-white px-4 py-3 rounded-lg shadow-2xl flex items-center gap-2 animate-bounce">
            <CheckIcon /> Agente salvo com sucesso!
        </div>
      )}

      {/* Hidden Input for File Upload */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={importAgents} 
        accept=".json" 
        className="hidden" 
      />

      {/* Modal de Histórico */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#1a1a1a] border border-gray-700 rounded-2xl w-full max-w-3xl p-6 shadow-2xl relative flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-4">
               <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                 <HistoryIcon /> Histórico de Roteiros
               </h3>
               <button 
                 onClick={() => setShowHistoryModal(false)}
                 className="text-gray-400 hover:text-white"
               >
                 ✕
               </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
               {history.length === 0 ? (
                 <div className="text-center text-gray-500 py-10">
                   Nenhum roteiro salvo ainda.
                 </div>
               ) : (
                 history.map((item) => (
                   <div key={item.id} className="bg-gray-800/50 hover:bg-gray-800 border border-gray-700 rounded-xl p-4 transition-all group flex justify-between items-center">
                      <div className="cursor-pointer flex-1" onClick={() => loadHistoryItem(item)}>
                        <h4 className="font-bold text-white text-lg">{item.title}</h4>
                        <div className="flex gap-3 text-xs text-gray-400 mt-1">
                           <span className="bg-gray-900 px-2 py-0.5 rounded text-blue-300">{item.agentName}</span>
                           <span>{new Date(item.timestamp).toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => loadHistoryItem(item)}
                          className="px-3 py-1.5 bg-blue-600/20 text-blue-300 hover:bg-blue-600 hover:text-white rounded-lg text-xs font-bold transition"
                        >
                          Carregar
                        </button>
                        <button 
                          onClick={(e) => deleteHistoryItem(item.id, e)}
                          className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition"
                          title="Excluir"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                   </div>
                 ))
               )}
            </div>
            
            <div className="mt-4 text-xs text-gray-500 text-center">
              Armazena os últimos 50 roteiros gerados localmente.
            </div>
          </div>
        </div>
      )}

      {/* Modal de Agente */}
      {showAgentModal && editingAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#1a1a1a] border border-gray-700 rounded-2xl w-full max-w-2xl p-6 shadow-2xl relative overflow-y-auto max-h-[90vh]">
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <UserIcon /> {agents.find(a => a.id === editingAgent.id) ? "Editar Agente" : "Novo Agente"}
            </h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-400 uppercase font-bold">Nome do Agente</label>
                  <input 
                    className="w-full bg-gray-900 border border-gray-700 rounded p-3 text-white mt-1 focus:border-red-500 outline-none"
                    value={editingAgent.name}
                    onChange={e => setEditingAgent({...editingAgent, name: e.target.value})}
                    placeholder="Ex: Roteirista de Comédia"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 uppercase font-bold">Idioma</label>
                  <select 
                    className="w-full bg-gray-900 border border-gray-700 rounded p-3 text-white mt-1 focus:border-blue-500 outline-none"
                    value={editingAgent.language}
                    onChange={e => setEditingAgent({...editingAgent, language: e.target.value})}
                  >
                    {LANGUAGES.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-400 uppercase font-bold">Localização (Cultura)</label>
                  <input 
                    className="w-full bg-gray-900 border border-gray-700 rounded p-3 text-white mt-1 focus:border-red-500 outline-none"
                    value={editingAgent.location}
                    onChange={e => setEditingAgent({...editingAgent, location: e.target.value})}
                    placeholder="Ex: São Paulo"
                  />
                </div>
                <div>
                  <label className="text-xs text-yellow-400 uppercase font-bold">Duração (Minutos)</label>
                  <input 
                    type="number"
                    min="1"
                    className="w-full bg-gray-900 border border-gray-700 rounded p-3 text-white mt-1 focus:border-yellow-500 outline-none"
                    value={editingAgent.durationMinutes}
                    onChange={e => setEditingAgent({...editingAgent, durationMinutes: parseInt(e.target.value) || 1})}
                  />
                  <p className="text-[10px] text-gray-500 mt-1 flex items-center gap-1">
                     <ClockIcon /> Aprox. {((editingAgent.durationMinutes || 0) * 170).toLocaleString()} palavras
                  </p>
                </div>
              </div>

              <div>
                <label className="text-xs text-blue-400 uppercase font-bold">Prompt Padrão de Premissa</label>
                <textarea 
                  className="w-full bg-gray-900 border border-gray-700 rounded p-3 text-white mt-1 focus:border-blue-500 outline-none text-sm h-24"
                  value={editingAgent.premisePrompt}
                  onChange={e => setEditingAgent({...editingAgent, premisePrompt: e.target.value})}
                />
              </div>

              <div>
                <label className="text-xs text-green-400 uppercase font-bold">Prompt Padrão de Roteiro</label>
                <textarea 
                  className="w-full bg-gray-900 border border-gray-700 rounded p-3 text-white mt-1 focus:border-green-500 outline-none text-sm h-24"
                  value={editingAgent.scriptPrompt}
                  onChange={e => setEditingAgent({...editingAgent, scriptPrompt: e.target.value})}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button 
                onClick={() => setShowAgentModal(false)}
                className="flex-1 py-3 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition"
              >
                Cancelar
              </button>
              <button 
                onClick={() => saveAgent(editingAgent)}
                className="flex-1 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-500 transition shadow-lg shadow-red-900/40"
              >
                Salvar Agente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="mb-8 w-full flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-red-500/10 rounded-full border border-red-500/20">
            <YoutubeIcon />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Cine<span className="gradient-text">Script</span> AI
            </h1>
            <p className="text-gray-400 text-xs">Sistema de Roteirização Profissional</p>
          </div>
        </div>

        {/* Agent Selector & History */}
        <div className="flex items-center gap-3 bg-gray-900/80 p-2 pr-4 rounded-xl border border-gray-800">
           {/* History Button */}
           <button 
            onClick={() => setShowHistoryModal(true)}
            className="p-2 hover:bg-gray-800 rounded-full text-blue-400 hover:text-white transition relative group"
            title="Histórico de Roteiros"
          >
            <HistoryIcon />
            {history.length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full"></span>
            )}
          </button>
          
          <div className="w-px h-8 bg-gray-700 mx-1"></div>

          {/* Import/Export Buttons */}
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-green-400 transition"
            title="Importar Agentes (JSON)"
          >
            <UploadCloudIcon />
          </button>
          <button 
            onClick={exportAgents}
            className="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-green-400 transition"
            title="Exportar Agentes (JSON)"
          >
            <DownloadCloudIcon />
          </button>

          <div className="w-px h-8 bg-gray-700 mx-1"></div>

          <div className="bg-gray-800 p-2 rounded-lg text-gray-400">
            <UserIcon />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Agente Ativo</span>
            <select 
              value={selectedAgentId}
              onChange={handleAgentChange}
              className="bg-transparent text-white text-sm font-medium outline-none cursor-pointer min-w-[150px]"
            >
              {agents.map(agent => (
                <option key={agent.id} value={agent.id} className="bg-gray-900 text-white">
                  {agent.name}
                </option>
              ))}
              <option disabled>──────────</option>
              <option value="new" className="bg-gray-900 text-red-400 font-bold">+ Criar Novo Agente</option>
            </select>
          </div>
          <button 
            onClick={() => {
              const current = agents.find(a => a.id === selectedAgentId);
              if (current) {
                setEditingAgent({...current}); 
                setShowAgentModal(true);
              }
            }}
            className="p-2 hover:bg-gray-800 rounded-full text-gray-400 transition"
            title="Editar Agente Atual"
          >
            <SettingsIcon />
          </button>
           <button 
            onClick={() => {
               if (agents.length <= 1) {
                   alert("Você precisa ter pelo menos um agente.");
                   return;
               }
               if (confirm("Tem certeza que deseja excluir este agente?")) {
                   deleteAgent(selectedAgentId);
               }
            }}
            className="p-2 hover:bg-red-900/30 rounded-full text-red-900 hover:text-red-500 transition"
            title="Excluir Agente Atual"
          >
            <TrashIcon />
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
        
        {/* Left Column: Inputs */}
        <div className="lg:col-span-5 space-y-6">
          <div className="glass-panel p-6 rounded-2xl space-y-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
               <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  <MovieIcon /> Configuração
              </h2>
              <div className="flex items-center gap-3">
                  {/* SAVE BUTTON FOR QUICK UPDATES */}
                  {agents.find(a => a.id === selectedAgentId) && (
                     <button 
                        onClick={updateCurrentAgent}
                        className="group flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-200 hover:text-white border border-blue-500/30 rounded-lg transition-all text-xs font-bold uppercase tracking-wide"
                        title="Salvar alterações de prompt neste agente permanentemente"
                     >
                        <SaveDiskIcon />
                        <span className="hidden sm:inline">Salvar Ajustes</span>
                     </button>
                  )}
                  {agents.find(a => a.id === selectedAgentId) && (
                     <div className="flex gap-2 text-gray-400">
                       <span className="text-xs bg-gray-800 px-2 py-1 rounded border border-gray-700 flex items-center gap-1">
                         <ClockIcon /> {agents.find(a => a.id === selectedAgentId)?.durationMinutes} min
                       </span>
                     </div>
                  )}
              </div>
            </div>
           
            
            {/* Título - CHANGED TO TEXTAREA FOR BATCHING */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-red-400 uppercase tracking-wider flex justify-between">
                <span>1. Títulos / Conceitos</span>
                <span className="text-[10px] text-gray-500 normal-case font-normal">(Um por linha para gerar em lote)</span>
              </label>
              <textarea
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                rows={3}
                placeholder={"Digite um título por linha para gerar vários roteiros de uma vez...\nEx: A História do Café\nO Mistério do Oceano"}
                className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-red-500/50 focus:border-red-500 outline-none transition-all placeholder:text-gray-600 resize-y"
              />
            </div>

            {/* Prompt Premissa */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                 <label className="text-sm font-bold text-blue-400 uppercase tracking-wider">2. Prompt da Premissa</label>
                 <span className="text-[10px] text-gray-500 uppercase">Salvo no Agente</span>
              </div>
              <textarea
                name="premisePrompt"
                value={formData.premisePrompt}
                onChange={handleInputChange}
                rows={5}
                className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all resize-none text-sm leading-relaxed"
              />
            </div>

            {/* Prompt Roteiro */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                 <label className="text-sm font-bold text-green-400 uppercase tracking-wider">3. Prompt do Roteiro</label>
                 <span className="text-[10px] text-gray-500 uppercase">Salvo no Agente</span>
              </div>
              <textarea
                name="scriptPrompt"
                value={formData.scriptPrompt}
                onChange={handleInputChange}
                rows={5}
                className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-green-500/50 outline-none transition-all resize-none text-sm leading-relaxed"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-200 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={generateStory}
              disabled={stepStatus !== "idle"}
              className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] ${
                stepStatus !== "idle"
                  ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white shadow-lg shadow-red-900/50"
              }`}
            >
              {batchStatus ? (
                 <>
                   <LoaderIcon /> 
                   <div className="flex flex-col items-start leading-tight">
                      <span>Gerando Lote ({batchStatus.current}/{batchStatus.total})</span>
                      <span className="text-xs font-normal opacity-80">
                         {stepStatus === "generating-premise" ? "Criando Premissa..." : `Escrevendo Parte ${generationProgress?.current || 1}/${generationProgress?.total || '?'}`}
                      </span>
                   </div>
                 </>
              ) : stepStatus === "generating-premise" ? (
                <>
                  <LoaderIcon /> Criando Premissa...
                </>
              ) : stepStatus === "generating-script" ? (
                <>
                  <LoaderIcon /> Escrevendo Roteiro {generationProgress ? `(Parte ${generationProgress.current}/${generationProgress.total})` : ""}...
                </>
              ) : (
                <>
                  <WandIcon /> Gerar Obra de Arte
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Output & Batch Queue */}
        <div className="lg:col-span-7 h-full flex flex-col gap-4">
          
          {/* Batch Queue List (Only visible if there are items) */}
          {batchItems.length > 0 && (
             <div className="glass-panel p-4 rounded-2xl shadow-xl max-h-[300px] overflow-y-auto custom-scrollbar">
                <div className="flex justify-between items-center mb-3 sticky top-0 bg-[#1e1e1ec0] backdrop-blur-md pb-2 z-10 border-b border-gray-700">
                    <h3 className="text-white font-bold flex items-center gap-2">
                        <ListIcon /> Sessão Atual ({batchItems.filter(i => i.status === 'completed').length}/{batchItems.length})
                    </h3>
                    
                    <div className="flex items-center gap-2">
                        {stepStatus === 'idle' && batchItems.length > 0 && (
                            <button
                                onClick={clearBatch}
                                className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 px-3 py-1.5 rounded-lg font-medium transition-colors"
                            >
                                Limpar Lista
                            </button>
                        )}
                        {batchItems.some(i => i.status === 'completed') && (
                            <button 
                                onClick={downloadAllZip}
                                className="text-xs bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 font-bold transition-colors"
                            >
                                <ZipIcon /> Baixar Todos (.zip)
                            </button>
                        )}
                    </div>
                </div>
                
                <div className="space-y-2">
                    {batchItems.map((item) => (
                        <div key={item.id} className={`p-3 rounded-lg border flex items-center justify-between gap-3 ${item.status === 'generating' ? 'bg-red-900/10 border-red-500/30' : 'bg-gray-800/50 border-gray-700'}`}>
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                <span className="text-xs font-mono text-gray-500 w-5">#{item.order}</span>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-white truncate">{item.title}</p>
                                    <p className="text-[10px] text-gray-400 flex items-center gap-1">
                                        {item.status === 'pending' && <span className="text-gray-500">Aguardando...</span>}
                                        {item.status === 'generating' && <span className="text-red-400 flex items-center gap-1"><LoaderIcon /> Gerando...</span>}
                                        {item.status === 'completed' && <span className="text-green-400 flex items-center gap-1"><CheckIcon /> Concluído</span>}
                                        {item.status === 'error' && <span className="text-red-500">Erro</span>}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-1">
                                {item.status === 'completed' && (
                                    <>
                                        <button 
                                            onClick={() => loadBatchItem(item)}
                                            className="p-1.5 text-gray-400 hover:text-white bg-gray-700/50 hover:bg-gray-700 rounded transition"
                                            title="Visualizar no Editor"
                                        >
                                            <EyeIcon />
                                        </button>
                                        <button 
                                            onClick={() => item.content && copyToClipboard(item.content, item.id)}
                                            className="p-1.5 text-gray-400 hover:text-white bg-gray-700/50 hover:bg-gray-700 rounded transition"
                                            title="Copiar Narração"
                                        >
                                           {copiedId === item.id ? <CheckIcon /> : <CopyIcon />}
                                        </button>
                                        <button 
                                            onClick={() => item.content && downloadSingleTxt(item.title, item.content)}
                                            className="p-1.5 text-gray-400 hover:text-white bg-gray-700/50 hover:bg-gray-700 rounded transition"
                                            title="Baixar .txt"
                                        >
                                            <DownloadIcon />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
             </div>
          )}

          {/* Main Output Editor */}
          <div className="glass-panel p-6 rounded-2xl flex-1 min-h-[500px] flex flex-col shadow-xl relative overflow-hidden">
            {/* Output Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 border-b border-gray-800 pb-3 gap-3">
              <div className="flex items-center gap-2">
                 {/* Toggle Buttons */}
                 <div className="bg-gray-900 p-1 rounded-lg flex border border-gray-700">
                    <button 
                      onClick={() => setViewMode("full")}
                      className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${viewMode === "full" ? "bg-gray-700 text-white shadow" : "text-gray-500 hover:text-gray-300"}`}
                    >
                      <MovieIcon /> Roteiro Completo
                    </button>
                    <button 
                      onClick={() => setViewMode("clean")}
                      className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${viewMode === "clean" ? "bg-green-600 text-white shadow" : "text-gray-500 hover:text-gray-300"}`}
                    >
                      <MicrophoneIcon /> Apenas Narração (TTS)
                    </button>
                 </div>
              </div>
              
              <div className="flex gap-2">
                 <span className="text-xs bg-red-900/30 border border-red-500/30 text-red-200 px-2 py-1.5 rounded-md flex items-center gap-1 hidden md:flex">
                    Gemini 3 Pro
                  </span>
                <button 
                    onClick={() => output && downloadSingleTxt(currentDisplayTitle || "roteiro", output)}
                    disabled={!output}
                    className={`p-2 rounded-lg text-xs font-bold transition-colors ${!output ? "text-gray-600 cursor-not-allowed" : "bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white"}`}
                    title="Baixar .txt"
                >
                    <DownloadIcon />
                </button>
                <button
                    onClick={() => output && copyToClipboard(output)}
                    disabled={!output}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-colors ${
                    !output ? "text-gray-600 cursor-not-allowed" : "bg-white text-black hover:bg-gray-200"
                    }`}
                >
                    {copied ? <CheckIcon /> : <CopyIcon />}
                    {copied ? "Copiado!" : viewMode === "clean" ? "Copiar Narração" : "Copiar Roteiro"}
                </button>
              </div>
            </div>

            <div className="flex-1 relative">
              {!output && stepStatus === "idle" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600 space-y-4">
                  <div className="p-4 bg-gray-800/50 rounded-full">
                    <MovieIcon />
                  </div>
                  <p className="text-center text-gray-500 max-w-sm">
                    Selecione seu agente, insira um ou mais títulos e deixe a IA criar a magia do cinema para você.
                  </p>
                </div>
              )}
              
              <div className="h-[500px] lg:h-full overflow-y-auto pr-4 pb-10 whitespace-pre-wrap font-mono text-sm leading-relaxed text-gray-300 custom-scrollbar">
                {output ? (
                    cleanArtifacts(output).split('\n').map((line, i) => {
                        const trimmed = line.trim();
                        if (!trimmed) return null; // Spacer removed to fix double spacing
                        
                        // Handle View Modes
                        if (viewMode === "clean") {
                           const scriptStart = output.indexOf('## 📝 ROTEIRO');
                           const currentPos = output.indexOf(line); 
                           
                           if (line.startsWith('## 🎬 PREMISSA') || (scriptStart > -1 && output.indexOf(line) < scriptStart)) {
                               return null; 
                           }
                           if (line.startsWith('## 📝 ROTEIRO')) return null;
                           if (line.startsWith('---')) return null;
                        }

                        // Render Headers
                        if (trimmed.startsWith('## ')) {
                             return <h3 key={i} className="text-2xl font-bold text-white mt-10 mb-6 border-b border-gray-700 pb-2">{trimmed.replace('## ', '')}</h3>
                        }
                        
                        // Render standard paragraph
                        return <p key={i} className="text-gray-200 mb-4 leading-7">{trimmed}</p>
                    })
                ) : null}
                 {stepStatus !== "idle" && (
                   <div className="flex items-center gap-2 mt-4 text-gray-500 text-xs animate-pulse">
                      <span className="w-2 h-2 bg-red-500 rounded-full"/> 
                      {batchStatus ? `Processando ${currentDisplayTitle}...` : "Escrevendo..."}
                   </div>
                 )}
              </div>
            </div>
            
            {/* Decorative blurred gradient */}
            <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-red-600/10 blur-[80px] rounded-full pointer-events-none" />
            <div className="absolute -top-20 -left-20 w-64 h-64 bg-blue-600/10 blur-[80px] rounded-full pointer-events-none" />
          </div>
        </div>
      </div>
    </div>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<App />);