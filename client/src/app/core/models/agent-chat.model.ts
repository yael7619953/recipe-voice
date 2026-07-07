export interface ChatMessage {
    role: 'user' | 'assistant';
    text: string;
  }
  
  export interface AgentChatResponse {
    reply: string;
    toolCalled?: string;
    data?: unknown;
  }