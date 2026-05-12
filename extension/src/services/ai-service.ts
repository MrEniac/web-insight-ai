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
}

export interface AnalyzeResponse {
  success: boolean;
  result?: string;
  error?: string;
}

const DEFAULT_CONFIG: AiConfig = {
  mode: 'local',
  ollamaUrl: 'http://localhost:11434',
  backendUrl: 'http://localhost:8080',
  cloudApiKey: '',
  cloudProvider: 'openai',
  customApiUrl: '',
  customApiKey: '',
  selectedModel: '',
};

export class AIService {
  private config: AiConfig = DEFAULT_CONFIG;

  async loadConfig(): Promise<AiConfig> {
    const stored = await chrome.storage.local.get([
      'modelMode',
      'ollamaUrl',
      'backendUrl',
      'cloudApiKey',
      'cloudProvider',
      'customApiUrl',
      'customApiKey',
      'selectedModel',
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

  async summarize(content: { title: string; text: string }): Promise<string> {
    await this.loadConfig();
    const prompt = `请对以下文章内容进行总结，提取核心要点：\n\n标题：${content.title}\n\n内容：${content.text}`;

    if (this.config.mode === 'local') {
      return this.callOllama(prompt);
    }
    return this.callBackend({ type: 'summary', data: { prompt, ...content } });
  }

  async chat(messages: { role: string; content: string }[]): Promise<string> {
    await this.loadConfig();

    if (this.config.mode === 'local') {
      return this.callOllamaChat(messages);
    }
    return this.callBackend({ type: 'chat', data: { messages } });
  }

  private buildGitHubPrompt(data: Record<string, unknown>): string {
    return `你是一个GitHub项目分析助手。请根据以下信息分析：
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
    const model = this.config.selectedModel || 'qwen2.5:7b';
    const response = await fetch(`${this.config.ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama request failed: ${response.status}`);
    }

    const data = await response.json();
    return data.response;
  }

  private async callOllamaChat(messages: { role: string; content: string }[]): Promise<string> {
    const model = this.config.selectedModel || 'qwen2.5:7b';
    const response = await fetch(`${this.config.ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama chat request failed: ${response.status}`);
    }

    const data = await response.json();
    return data.message?.content || '';
  }

  private async callBackend(request: AnalyzeRequest): Promise<string> {
    const response = await fetch(`${this.config.backendUrl}/api/ai/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Backend request failed: ${response.status}`);
    }

    const data = await response.json();
    return data.result;
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