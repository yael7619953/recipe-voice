export interface ChatMessage {
    role: 'user' | 'assistant';
    text: string;
    /** Name of a file the user attached to this message, if any (display only). */
    attachmentName?: string;
  }
  
  export interface AgentChatResponse {
    reply: string;
    toolCalled?: string;
    toolsCalled?: string[];
    data?: unknown;
  }