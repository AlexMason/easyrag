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