export type SystemMessage = {
  role: 'system';
  content: string;
};

export type ToolFunction = {
  name: string;
  arguments: string
}

export type ToolCall = {
  id: string;
  type: 'function';
  function: ToolFunction;
}

export type AssistantMessage = {
  role: 'assistant';
  content?: string;
  tool_calls?: ToolCall[];
  response_meta?: any;
};

export type UserMessage = {
  role: 'user';
  content: string;
};

export type ToolMessage = {
  role: 'tool';
  content: string;
  tool_call_id: string;
};

export type ChatMessage = SystemMessage | AssistantMessage | UserMessage | ToolMessage;

export type ConversationOptions = {
  defaultMessages?: ChatMessage[],
}

export class Conversation {
  private options?: ConversationOptions;

  messages: ChatMessage[] = [];

  constructor(options?: ConversationOptions) {
    this.options = options;

    if (options !== undefined && options.defaultMessages) {
      this.messages = options.defaultMessages;
    }

    let foundMessage = this.messages.find(m => m.role === 'system');

    if (foundMessage === undefined) {
      this.messages.splice(0, 0, { role: 'system', content: 'You are a helpful AI assistant.' })
    }
  }

  getMessages() {
    return this.messages;
  }

  addMessage(message: ChatMessage) {
    this.messages.push(message);
  }

  reset() {
    if (this.options !== undefined && this.options.defaultMessages) {
      this.messages = this.options.defaultMessages;
    } else {
      this.messages = [];
    }
  }
}