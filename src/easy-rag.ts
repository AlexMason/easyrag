


// export options for controlling easy rag.

import { IInferenceAdapter } from "./adapters/inference-adapter";
import { Conversation, ConversationOptions, SystemMessage } from "./conversation/conversation";
import { Model } from "./models/model";
import { Registerable } from "./registerable/registerable.interface";

// default models, tools,
export type EasyRAGOptions = {
  models?: any[];
  tools?: any[];
  docStores?: any[];
  conversation?: ConversationOptions;
}

// options for tailoring how the prompt behaves
export type EasyRAGQueryOptions = {
  docstores?: any[],
  tools?: [],

  // Query context is provided by the user and
  // should be inferred from a generic class type
  context?: any;
}

export class EasyRAG {

  private adapter: IInferenceAdapter;

  // TODO: Replace any with the appropriate class
  private models: Model[] = [];
  private tools: any[] = [];
  private docStores: any[] = [];

  // Should I create a custom context class? 
  // Would it just be better to serialize with JSON/deserialize
  private context: any;

  conversation: Conversation;

  constructor(adapter: IInferenceAdapter, options?: EasyRAGOptions) {
    this.adapter = adapter;
    this.conversation = new Conversation(options?.conversation);
  }

  public async query(prompt: string, options?: EasyRAGQueryOptions) {
    // if tools are passed to the options, only those tools should be used for DAG 

    let chatModel = this.models.find(m => m.modelType === 'chat');

    if (chatModel === undefined) {
      throw new Error('No chat model found');
    }

    return await chatModel.invoke(prompt);
  }

  getTools() {
    return this.tools;
  }

  getAdapter() {
    return this.adapter;
  }

  public register(resource: Registerable): void {
    resource.register(this);

    if (resource.type === 'tool') {
      this.tools.push(resource);
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
      this.tools.splice(this.tools.indexOf(resource), 1);
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

