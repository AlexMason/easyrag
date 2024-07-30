import { Conversation } from "../conversation/conversation";
import { EasyRAG } from "../easyrag";
import { Tool } from "../tools/tools";
import { Model, ModelType } from "./model";

export type ModelAdapterOptions = {
};

export type ChatCompletetionInvocationOptions = {
  history: {
    conversation: Conversation,
  },
  tools: Tool[],
  stream?: boolean,
  model: Model,
  client: EasyRAG
  modelAdapter?: IModelAdapter
}

export type EmbeddingInvocationOptions = {
  modelAdapter?: IModelAdapter
}

export abstract class IModelAdapter {
  protected options;
  protected models: Model[] = [];

  constructor(options: ModelAdapterOptions) {
    this.options = options;
  };

  abstract chatCompletion(options: ChatCompletetionInvocationOptions): Promise<Record<string, any>>;
  abstract embedding(input: string | string[], model: Model, options: EmbeddingInvocationOptions): Promise<number[] | number[][]>;

  registerModels(models: Model[]) {
    this.models = [
      ...this.models,
      ...models
    ];
  };

  getModel(type: ModelType) {
    const model = this.models.find(model => model.modelType === type);

    if (!model) throw new Error(`Unable to find a "${type}" model that is registered to the current model adapter.`)

    return model;
  }
}