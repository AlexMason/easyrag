import { ChatMessage, Conversation } from "../conversation/conversation";
import { EasyRAG } from "../easyrag";
import { Tool } from "../tools/tools";
import { Model } from "./model";

export interface ModelAdapterOptions {
}

export interface ChatCompletetionInvocationOptions {
  history: {
    reset?: boolean,
    conversation: Conversation,
  },
  tools?: Tool[],
  stream?: boolean,
  model?: Model
}

export interface EmbeddingInvocationOptions {
}

export abstract class IModelAdapter {
  protected options;
  protected client: EasyRAG | undefined;

  constructor(options: ModelAdapterOptions) {
    this.options = options;
  };

  abstract chatCompletion(model: Model, options: ChatCompletetionInvocationOptions): Promise<Record<string, any>>;
  abstract embedding(model: Model, query: string, options: EmbeddingInvocationOptions): Promise<string>;
}