import { Conversation } from "../conversation/conversation";
import { EasyRAG } from "../easyrag";
import { MissingClientException } from "../lib/exceptions";
import { Registerable } from "../registerable/registerable.interface";
import { ChatCompletetionInvocationOptions } from "./model-adapter";

export type ModelOptions = {
  temperature?: number;
  frequencyPenalty?: number;
  maxTokens?: number;
  topP?: number;
  seed?: number;
}

export type ModelType = 'chat' | 'embedding' | 'tool';

export class Model extends Registerable {

  /** @internal */
  public type: 'model' = 'model';
  /** @internal */
  client: EasyRAG | undefined;
  /** @internal */
  options: ModelOptions;
  /** @internal */
  modelType: ModelType;

  name: string;
  description?: string | undefined;

  constructor(name: string, modelType: ModelType, options: ModelOptions = {}) {
    super();

    this.name = name;
    this.modelType = modelType;

    this.options = options;
  }

  getName() {
    return this.name;
  }

  /** @internal */
  register(client: EasyRAG): void {
    this.client = client;
  }

  /** @internal */
  unregister(): void {
    this.client = undefined;
  }
}