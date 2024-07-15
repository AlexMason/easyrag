import { ChatMessage } from "../conversation/conversation";
import { EasyRAG } from "../easyrag";
import { MissingClientException } from "../lib/exceptions";
import { Registerable } from "../registerable/registerable.interface";
import { Tool } from "../tools/tools";
import { ChatCompletetionInvocationOptions } from "./model-adapter";

export type ModelOptions = {
  temperature?: number;
  frequencyPenalty?: number;
  maxTokens?: number;
  topP?: number;
  seed?: number;
}

export type ModelType = 'chat' | 'embedding';

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

  async invoke(query: string, options?: ChatCompletetionInvocationOptions) {
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

    if (tools.length > 0) {
      options = {
        ...options
      };
      options.tools = tools;
    }

    // invoke model and store response
    this.client.conversation.addMessage({
      role: 'user',
      content: query
    });

    let response = await this.client.getAdapter().modelAdapter.chatCompletion(this, messages, options);

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