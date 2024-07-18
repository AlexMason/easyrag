import { MissingClientException } from "../lib/exceptions";
import { Model, ModelOptions } from "../models/model";
import { ChatCompletetionInvocationOptions, IModelAdapter, ModelAdapterOptions } from "../models/model-adapter"

export type OllamaModelAdapterOptions = {
  baseUrl?: string;
} & ModelAdapterOptions;

export class OllamaModelAdapter extends IModelAdapter {
  baseUrl: string;

  constructor(options?: OllamaModelAdapterOptions) {
    super(options || {});

    this.baseUrl = (options && options.baseUrl) || "http://localhost:11434";
  }

  async embedding(model: Model, input: string | Array<string | number>): Promise<number[]> {
    return [];
  }

  async chatCompletion(options: ChatCompletetionInvocationOptions): Promise<Record<string, any>> {
    if (options.model.client === undefined) {
      throw new MissingClientException(options.model);
    }

    let result = await this._chatCompletion(options);

    return result;
  }

  async _chatCompletion(options: ChatCompletetionInvocationOptions): Promise<any> {
    let fetchOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: options.model.getModelName(),
        messages: options.model.client!.conversation.getMessages(),
        ...this.parseAIOptions(options.model.options),
        stream: false
      })
    }

    let result = await fetch(`${this.baseUrl}/api/chat`, fetchOptions);
    let data = await result.json();

    console.log(data)

    return data;

  }

  private parseAIOptions(options: ModelOptions) {
    let ollamaOptions: any = {};

    if (options.frequencyPenalty !== undefined) { ollamaOptions.frequency_penalty = options.frequencyPenalty; }
    if (options.maxTokens !== undefined) { ollamaOptions.num_ctx = options.maxTokens; }
    if (options.seed !== undefined) { ollamaOptions.seed = options.seed; }
    if (options.topP !== undefined) { ollamaOptions.top_p = options.topP; }
    if (options.temperature !== undefined) { ollamaOptions.temperature = options.temperature; }

    return ollamaOptions;
  }
}