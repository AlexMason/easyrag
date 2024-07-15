


// export options for controlling easy rag.

import { IInferenceAdapter } from "./adapters/inference-adapter";
import { Conversation, ConversationOptions, SystemMessage } from "./conversation/conversation";
import { MissingModelException } from "./lib/exceptions";
import { Model, ModelType } from "./models/model";
import { ChatCompletetionInvocationOptions } from "./models/model-adapter";
import { Registerable } from "./registerable/registerable.interface";
import { Tool } from "./tools/tools";

// default models, tools,
export type EasyRAGOptions = {
  models?: any[];
  tools?: any[];
  docStores?: any[];
  conversation?: ConversationOptions;
}

export class EasyRAG {

  private adapter: IInferenceAdapter;

  // TODO: Replace any with the appropriate class
  private models: Model[] = [];
  private tools: Tool[] = [];
  private docStores: any[] = [];

  // Should I create a custom context class? 
  // Would it just be better to serialize with JSON/deserialize
  private context: any;

  conversation: Conversation;

  constructor(adapter: IInferenceAdapter, options?: EasyRAGOptions) {
    this.adapter = adapter;
    this.conversation = new Conversation(options?.conversation);
  }

  public async query(prompt: string, options?: ChatCompletetionInvocationOptions) {
    return await this.getModel('chat').invoke(prompt, options);
  }

  getTools() {
    return this.tools;
  }

  getAdapter() {
    return this.adapter;
  }

  getModel(type: ModelType, name?: string) {
    const model = this.models.find(m => (name === undefined) ? m.modelType === type : m.name === name);

    if (model === undefined) {
      throw new MissingModelException(type);
    }

    return model;
  }

  public register(resource: Registerable): void {
    resource.register(this);

    if (resource.type === 'tool') {
      this.tools.push(resource as Tool);
    } else if (resource.type === 'docstore') {
      this.docStores.push(resource)
    } else if (resource.type === 'model') {
      this.models.push(resource as Model);
    }
  }

  public unregister(resource: Registerable): void {
    // Call unregister to clean up / close the resource
    resource.unregister();

    if (resource.type === 'tool') {
      this.tools.splice(this.tools.indexOf(resource as Tool), 1);
    } else if (resource.type === 'docstore') {
      this.docStores.splice(this.docStores.indexOf(resource), 1);
    } else if (resource.type === 'model') {
      this.models.splice(this.models.indexOf(resource as Model), 1);
    }
  }

  // Think about the best way to handle docs
  // How does the end user need to access the underlying API (tools, docstore, model)
  // registering, using tools, search databases, adding documents
}

