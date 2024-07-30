


// export options for controlling easy rag.
import { Conversation, ConversationOptions, SystemMessage } from "./conversation/conversation";
import { MissingModelException } from "./util/exceptions";
import { Model, ModelType } from "./models/model";
import { ChatCompletetionInvocationOptions, EmbeddingInvocationOptions, IModelAdapter } from "./models/model-adapter";
import { Registerable } from "./registerable/registerable.interface";
import { Tool } from "./tools/tools";

// default models, tools,
export type EasyRAGOptions = {
  tools?: any[];
  docStores?: any[];
  conversation?: ConversationOptions;
  defaultModelAdapter: IModelAdapter
  context?: EasyRAGContext
}

export type EasyRAGContext = Record<string, string | number | boolean>;

export class EasyRAG {
  private options: EasyRAGOptions;

  // TODO: Replace any with the appropriate class
  private tools: Tool[] = [];
  private docStores: any[] = [];

  conversation: Conversation;

  constructor(options: EasyRAGOptions) {
    this.options = options;
    this.conversation = new Conversation(options?.conversation);
  }

  public async query(prompt: string, options?: Partial<ChatCompletetionInvocationOptions & { modelAdapter: IModelAdapter }>): Promise<string> {
    const modelAdapter = options?.modelAdapter || this.options.defaultModelAdapter;

    const invokeOptions = {
      ...options,
      model: modelAdapter.getModel('chat'),
      history: {
        ...options?.history,
        conversation: options?.history?.conversation || this.conversation
      },
      tools: options?.tools || this.tools,
      client: this,
    };

    invokeOptions.history.conversation.addMessage({
      role: 'user',
      content: prompt
    });

    let response = await modelAdapter.chatCompletion(invokeOptions);

    let message = ((response.choices && response.choices[0].message) || response.message);

    invokeOptions.history.conversation.addMessage({
      ...message
    })

    return message.content;
  }

  public async embedding(input: string | Array<string>, options?: Partial<EmbeddingInvocationOptions>) {
    const modelAdapter = options?.modelAdapter || this.options.defaultModelAdapter;

    return await this.options.defaultModelAdapter.embedding(input, modelAdapter.getModel('embedding'), { ...options });
  }

  getTools() {
    return this.tools;
  }

  getTool(toolName: string) {
    let foundTool = this.tools.find(t => t.name === toolName);

    if (foundTool === undefined) {
      throw new Error(`Unable to find tool "${toolName}"`)
    }

    return foundTool;
  }

  getAdapter() {
    return this.options;
  }

  public register(resource: Registerable): void {
    resource.register(this);

    if (resource.type === 'tool') {
      this.tools.push(resource as Tool);
    } else if (resource.type === 'docstore') {
      this.docStores.push(resource)
    }
  }

  public unregister(resource: Registerable): void {
    // Call unregister to clean up / close the resource
    resource.unregister();

    if (resource.type === 'tool') {
      this.tools.splice(this.tools.indexOf(resource as Tool), 1);
    } else if (resource.type === 'docstore') {
      this.docStores.splice(this.docStores.indexOf(resource), 1);
    }
  }

  // Think about the best way to handle docs
  // How does the end user need to access the underlying API (tools, docstore, model)
  // registering, using tools, search databases, adding documents
}

