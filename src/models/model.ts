import { Conversation } from "../conversation/conversation";
import { EasyRAG } from "../easyrag";
import { MissingClientException } from "../util/exceptions";
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

export class Model {

  /** @internal */
  public type: 'model' = 'model';
  /** @internal */
  client: EasyRAG;
  /** @internal */
  options: ModelOptions;
  /** @internal */
  modelType: ModelType;

  name: string;
  description?: string | undefined;

  constructor(name: string, modelType: ModelType, client: EasyRAG, options: ModelOptions = {}) {
    this.name = name;
    this.modelType = modelType;
    this.client = client;

    this.options = options;
  }
}