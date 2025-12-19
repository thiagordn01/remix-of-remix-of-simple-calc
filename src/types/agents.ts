export interface Agent {
  id: string;
  name: string;
  description?: string;
  premisePrompt: string;
  scriptPrompt: string;
  language: string;
  location: string;
  channelName?: string;
  duration: number; // em minutos
  autoGenerateAudio?: boolean;
  voiceId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAgentRequest {
  name: string;
  description?: string;
  premisePrompt: string;
  scriptPrompt: string;
  language: string;
  location: string;
  channelName?: string;
  duration: number;
  autoGenerateAudio?: boolean;
  voiceId?: string;
}

export interface UpdateAgentRequest extends Partial<CreateAgentRequest> {
  id: string;
}
