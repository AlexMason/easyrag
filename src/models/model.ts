import { ChatMessage } from "../conversation/conversation";
import { EasyRAG } from "../easyrag";
import { MissingClientException } from "../lib/exceptions";
import { Registerable } from "../registerable/registerable.interface";
import { Tool } from "../tools/tools";

export type ModelOptions = {
  temperature?: number;
  frequencyPenalty?: number;
  maxTokens?: number;
  topP?: number;
  seed?: number;
}

export type ModelType = 'chat' | 'embedding';

export type ModelInvokeOptions = {
  tools?: Tool[];
}

export class Model extends Registerable {
  name: string;
  client: EasyRAG | undefined;
  description?: string | undefined;

  public type: 'model' = 'model';
  private modelName: string;
  options: ModelOptions;

  modelType: ModelType;


  constructor(modelName: string, modelType: ModelType, options: ModelOptions = {}) {
    super();

    this.name = modelName;

    this.modelName = modelName;
    this.modelType = modelType;

    this.options = options;
  }

  async invoke(query: string, options?: ModelInvokeOptions) {
    if (this.client === undefined) {
      throw new MissingClientException(this);
    }

    // get conversation history, tools, docstores, etc...
    let messages: ChatMessage[] = [
      ...this.client.conversation.getMessages(),
      { role: 'user', content: query }
    ];

    let tools: Tool[] = [];

    if (options && options.tools && options.tools.length > 0) {
      tools = options.tools;
    } else {
      tools = this.client.getTools();
    }

    // invoke model and store response
    this.client.conversation.addMessage({
      role: 'user',
      content: query
    });

    let response = await this.client.getAdapter().modelAdapter.chatCompletion(this, messages, tools.length > 0 ? { tools } : {});

    this.client.conversation.addMessage({
      ...response.choices[0].message
    })

    return response.choices[0].message.content;
  }

  getModelName() {
    return this.modelName;
  }

  register(client: EasyRAG): void {
    this.client = client;
  }

  unregister(): void {
    this.client = undefined;
  }
}