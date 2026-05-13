export interface AiConfig {
  mode: 'local' | 'cloud' | 'custom';
  ollamaUrl: string;
  backendUrl: string;
  cloudApiKey: string;
  cloudProvider: string;
  customApiUrl: string;
  customApiKey: string;
  selectedModel: string;
}

export interface AnalyzeRequest {
  type: 'github' | 'summary' | 'search' | 'chat';
  data: Record<string, unknown>;
  stream?: boolean;
  provider?: string;
  model?: string;
  apiKey?: string;
  apiUrl?: string;
  messages?: ChatMessage[];
  prompt?: string;
}

export interface AnalyzeResponse {
  success: boolean;
  result?: string;
  error?: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const DEFAULT_CONFIG: AiConfig = {
  mode: 'local',
  ollamaUrl: 'http://localhost:11434',
  backendUrl: 'http://localhost:8080',
  cloudApiKey: '',
  cloudProvider: 'openai',
  customApiUrl: '',
  customApiKey: '',
  selectedModel: 'qwen3.5:2b',
};

export class AIService {
  private config: AiConfig = DEFAULT_CONFIG;

  async loadConfig(): Promise<AiConfig> {
    const stored = await chrome.storage.local.get([
      'modelMode', 'ollamaUrl', 'backendUrl',
      'cloudApiKey', 'cloudProvider',
      'customApiUrl', 'customApiKey', 'selectedModel',
    ]);
    this.config = {
      mode: stored.modelMode || DEFAULT_CONFIG.mode,
      ollamaUrl: stored.ollamaUrl || DEFAULT_CONFIG.ollamaUrl,
      backendUrl: stored.backendUrl || DEFAULT_CONFIG.backendUrl,
      cloudApiKey: stored.cloudApiKey || '',
      cloudProvider: stored.cloudProvider || 'openai',
      customApiUrl: stored.customApiUrl || '',
      customApiKey: stored.customApiKey || '',
      selectedModel: stored.selectedModel || '',
    };
    return this.config;
  }

  async analyzeGitHub(data: Record<string, unknown>): Promise<string> {
    await this.loadConfig();
    const prompt = this.buildGitHubPrompt(data);

    if (this.config.mode === 'local') {
      return this.callOllama(prompt);
    }
    return this.callBackend({ type: 'github', data: { prompt, ...data } });
  }

  async analyzeGitHubStream(
    data: Record<string, unknown>,
    onChunk: (text: string) => void,
  ): Promise<void> {
    await this.loadConfig();
    const prompt = this.buildGitHubPrompt(data);

    if (this.config.mode === 'local') {
      await this.callOllamaStream(prompt, onChunk);
    } else {
      await this.callBackendStream({ type: 'github', data: { prompt, ...data } }, onChunk);
    }
  }

  async summarize(content: { title: string; text: string }): Promise<string> {
    await this.loadConfig();
    const prompt = `/no_think 请对以下文章内容进行总结，提取核心要点：\n\n标题：${content.title}\n\n内容：${content.text}`;

    if (this.config.mode === 'local') {
      return this.callOllama(prompt);
    }
    return this.callBackend({ type: 'summary', data: { prompt, ...content } });
  }

  async summarizeStream(
    content: { title: string; text: string },
    onChunk: (text: string) => void,
  ): Promise<void> {
    await this.loadConfig();
    const prompt = `/no_think 请对以下文章内容进行总结，提取核心要点：\n\n标题：${content.title}\n\n内容：${content.text}`;

    if (this.config.mode === 'local') {
      await this.callOllamaStream(prompt, onChunk);
    } else {
      await this.callBackendStream({ type: 'summary', data: { prompt, ...content } }, onChunk);
    }
  }

  async chat(messages: ChatMessage[]): Promise<string> {
    await this.loadConfig();

    if (this.config.mode === 'local') {
      return this.callOllamaChat(messages);
    }
    return this.callBackend({ type: 'chat', data: { messages } });
  }

  async chatStream(
    messages: ChatMessage[],
    onChunk: (text: string) => void,
  ): Promise<void> {
    await this.loadConfig();

    if (this.config.mode === 'local') {
      await this.callOllamaChatStream(messages, onChunk);
    } else {
      await this.callBackendStream({ type: 'chat', data: { messages } }, onChunk);
    }
  }

private buildGitHubPrompt(data: Record<string, unknown>): string {
    return `/no_think 你是一个GitHub项目分析助手。请根据以下信息分析：
 1. 项目类型
 2. 技术栈
 3. 学习难度（Beginner/Intermediate/Advanced）
 4. 是否适合新手
 5. 项目主要用途
 6. 项目活跃度评估

 项目名称：${data.repoName || ''}
 Star数：${data.stars || 0}
 语言：${data.language || ''}
 Fork数：${data.forks || 0}
 Issue数：${data.issues || 0}

 README内容：
 ${(data.readme as string)?.slice(0, 8000) || '无README'}`;
 }

  private async callOllama(prompt: string): Promise<string> {
    const model = this.config.selectedModel || 'qwen3.5:2b';
    const response = await fetch(`${this.config.ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt, stream: false }),
    });

    if (!response.ok) {
      throw new Error(`Ollama request failed: ${response.status}`);
    }

    const data = await response.json();
    return data.response;
  }

  private async callOllamaStream(prompt: string, onChunk: (text: string) => void): Promise<void> {
    const model = this.config.selectedModel || 'qwen3.5:2b';
    const response = await fetch(`${this.config.ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt, stream: true }),
    });

    if (!response.ok) {
      throw new Error(`Ollama stream request failed: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const json = JSON.parse(line);
              if (json.response) {
                onChunk(json.response);
              }
              if (json.done) break;
            } catch {
              // skip malformed lines
            }
          }
    }
  }

  private async callOllamaChat(messages: ChatMessage[]): Promise<string> {
    const model = this.config.selectedModel || 'qwen3.5:2b';
    const messagesWithNoThink = [...messages, { role: 'user' as const, content: '/no_think' }];
    const response = await fetch(`${this.config.ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages: messagesWithNoThink, stream: false }),
    });

    if (!response.ok) {
      throw new Error(`Ollama chat request failed: ${response.status}`);
    }

    const data = await response.json();
    return data.message?.content || '';
  }

  private async callOllamaChatStream(
    messages: ChatMessage[],
    onChunk: (text: string) => void,
  ): Promise<void> {
    const model = this.config.selectedModel || 'qwen3.5:2b';
    const messagesWithNoThink = [...messages, { role: 'user' as const, content: '/no_think' }];
    const response = await fetch(`${this.config.ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages: messagesWithNoThink, stream: true }),
    });

    if (!response.ok) {
      throw new Error(`Ollama chat stream request failed: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const json = JSON.parse(line);
          if (json.message?.content && json.message?.role !== 'thinking') {
            onChunk(json.message.content);
          }
        } catch {
          // skip malformed lines
        }
      }
    }
  }

  private getAuthProvider(): { provider: string; model: string; apiKey: string; apiUrl: string } {
    if (this.config.mode === 'cloud') {
      return {
        provider: this.config.cloudProvider,
        model: '',
        apiKey: this.config.cloudApiKey,
        apiUrl: '',
      };
    }
    if (this.config.mode === 'custom') {
      return {
        provider: 'custom',
        model: '',
        apiKey: this.config.customApiKey,
        apiUrl: this.config.customApiUrl,
      };
    }
    return { provider: 'ollama', model: this.config.selectedModel, apiKey: '', apiUrl: '' };
  }

  private async callBackend(request: AnalyzeRequest): Promise<string> {
    const auth = this.getAuthProvider();
    const enriched = { ...request, provider: auth.provider, model: auth.model, apiKey: auth.apiKey, apiUrl: auth.apiUrl };
    const response = await fetch(`${this.config.backendUrl}/api/ai/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(enriched),
    });

    if (!response.ok) {
      throw new Error(`Backend request failed: ${response.status}`);
    }

    const data = await response.json();
    return data.result;
  }

  private async callBackendStream(
    request: AnalyzeRequest,
    onChunk: (text: string) => void,
  ): Promise<void> {
    const auth = this.getAuthProvider();
    const enriched = { ...request, stream: true, provider: auth.provider, model: auth.model, apiKey: auth.apiKey, apiUrl: auth.apiUrl };
    const response = await fetch(`${this.config.backendUrl}/api/ai/analyze/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(enriched),
    });

    if (!response.ok) {
      throw new Error(`Backend stream request failed: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') return;
          try {
            const json = JSON.parse(data);
            if (json.content) {
              onChunk(json.content);
            }
          } catch {
            onChunk(data);
          }
        }
      }
    }
  }

  async checkOllamaStatus(): Promise<{ available: boolean; models: string[] }> {
    try {
      const response = await fetch(`${this.config.ollamaUrl}/api/tags`);
      if (!response.ok) return { available: false, models: [] };
      const data = await response.json();
      return {
        available: true,
        models: data.models?.map((m: { name: string }) => m.name) || [],
      };
    } catch {
      return { available: false, models: [] };
    }
  }
}