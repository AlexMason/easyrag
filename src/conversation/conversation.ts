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
  metadata?: Record<string, any>;
};

export type ChatMessage = SystemMessage | AssistantMessage | UserMessage | ToolMessage;

export type ConversationOptions = {
  defaultMessages?: ChatMessage[],
  chatHistoryLimit?: number
}

export class Conversation {
  private options?: ConversationOptions;
  toolNotepad: string = '';

  messages: ChatMessage[] = [];

  constructor(options?: ConversationOptions) {
    this.options = options;

    if (options !== undefined && options.defaultMessages) {
      this.messages = options.defaultMessages;
    }

    if (this.getMessages(['system']).length === 0) {
      this.messages.splice(0, 0, { role: 'system', content: 'You are a helpful AI assistant.' })
    }
  }

  getMessages(filter?: ChatMessage["role"][]) {
    let tmpMessages = this.messages.filter(m =>
      filter !== undefined
        ? filter.includes(m.role)
        : true
    );

    if (this.options && this.options.chatHistoryLimit && this.options.chatHistoryLimit > 0) {
      let historyCount = 0;
      tmpMessages.filter(m => {
        if (m.role === 'user' || (m.role === 'assistant' && typeof m.content === "string")) {
          historyCount++;
        } else {
          return true;
        }
        return historyCount < (this.options!.chatHistoryLimit!);
      })
    }

    return tmpMessages;
  }

  addMessage(message: ChatMessage) {
    this.messages.push(message);
    return message;
  }

  reset() {
    if (this.options !== undefined && this.options.defaultMessages) {
      this.messages = this.options.defaultMessages;
    } else {
      this.messages = [];
    }
  }
}