import { ChatMessage } from "../conversation/conversation";
import { EasyRAG } from "../easy-rag";
import { Tool } from "../tools/tools";
import { Model } from "./model";

export interface ModelAdapterOptions {
}

export interface ChatCompletetionInvocationOptions {
  tools?: Tool[],
  stream?: boolean,
}

export interface EmbeddingInvocationOptions {
}

export abstract class IModelAdapter {
  protected options;
  protected client: EasyRAG | undefined;

  constructor(options: ModelAdapterOptions) {
    this.options = options;
  };

  abstract chatCompletion(model: Model, messages: ChatMessage[], options?: ChatCompletetionInvocationOptions): Promise<Record<string, any>>;
  abstract embedding(model: Model, query: string, options?: EmbeddingInvocationOptions): Promise<string>;
}