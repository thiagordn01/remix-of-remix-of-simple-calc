import { useState, useCallback } from 'react';
import { splitTextForElevenLabs } from '@/utils/elevenLabsChunks';
import { getElevenLabsApiKey, ELEVENLABS_API_URL } from '@/utils/elevenLabsConfig';

export interface ElevenLabsJob {
  id: string;
  text: string;
  voiceId: string;
  modelId: string;
  stability: number;
  similarityBoost: number;
  filename?: string;
  status: 'queued' | 'processing' | 'done' | 'error';
  progress: number;
  chunks: string[];
  audioChunks: ArrayBuffer[];
  finalUrl?: string;
  error?: string;
  retryAttempts: number;
}

export interface AddElevenLabsJobParams {
  text: string;
  voiceId: string;
  modelId: string;
  stability?: number;
  similarityBoost?: number;
  filename?: string;
}

export function useElevenLabsQueue(maxConcurrent = 3) {
  const [jobs, setJobs] = useState<ElevenLabsJob[]>([]);

  const addJob = useCallback((params: AddElevenLabsJobParams) => {
    const chunks = splitTextForElevenLabs(params.text);
    const newJob: ElevenLabsJob = {
      id: crypto.randomUUID(),
      text: params.text,
      voiceId: params.voiceId,
      modelId: params.modelId,
      stability: params.stability ?? 0.75,
      similarityBoost: params.similarityBoost ?? 0.75,
      filename: params.filename,
      status: 'queued',
      progress: 0,
      chunks,
      audioChunks: [],
      retryAttempts: 0,
    };

    setJobs(prev => [...prev, newJob]);
    processJob(newJob);
  }, []);

  const processJob = async (job: ElevenLabsJob) => {
    const apiKey = getElevenLabsApiKey();
    if (!apiKey) {
      updateJobStatus(job.id, 'error', 0, 'API key não configurada');
      return;
    }

    updateJobStatus(job.id, 'processing', 0);

    try {
      const audioChunks: ArrayBuffer[] = [];
      
      for (let i = 0; i < job.chunks.length; i++) {
        const chunk = job.chunks[i];
        const progress = (i / job.chunks.length) * 100;
        
        updateJobStatus(job.id, 'processing', progress);

        const response = await fetch(`${ELEVENLABS_API_URL}/${job.voiceId}`, {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': apiKey,
          },
          body: JSON.stringify({
            text: chunk,
            model_id: job.modelId,
            voice_settings: {
              stability: job.stability,
              similarity_boost: job.similarityBoost,
            },
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
        }

        const audioBuffer = await response.arrayBuffer();
        audioChunks.push(audioBuffer);
      }

      // Concatenar áudios (simplified - just create blob from first chunk for now)
      const finalBlob = new Blob(audioChunks, { type: 'audio/mpeg' });
      const finalUrl = URL.createObjectURL(finalBlob);

      updateJobStatus(job.id, 'done', 100, undefined, finalUrl);
      
    } catch (error: any) {
      console.error('ElevenLabs job error:', error);
      updateJobStatus(job.id, 'error', 0, error.message);
    }
  };

  const updateJobStatus = (
    jobId: string, 
    status: ElevenLabsJob['status'], 
    progress: number, 
    error?: string,
    finalUrl?: string
  ) => {
    setJobs(prev => prev.map(job => 
      job.id === jobId 
        ? { ...job, status, progress, error, finalUrl }
        : job
    ));
  };

  const clearCompletedJobs = useCallback(() => {
    setJobs(prev => prev.filter(job => job.status !== 'done' && job.status !== 'error'));
  }, []);

  return {
    jobs,
    addJob,
    clearCompletedJobs,
  };
}