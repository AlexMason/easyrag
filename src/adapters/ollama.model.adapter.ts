import { AssistantMessage, SystemMessage, ToolCall, ToolMessage } from "../conversation/conversation";
import { EasyRAG } from "../easyrag";
import { Model, ModelOptions } from "../models/model";
import { ChatCompletetionInvocationOptions, IModelAdapter, ModelAdapterOptions } from "../models/model-adapter"
import { Tool, ToolParameter } from "../tools/tools";
import { validate } from 'jsonschema';

export type OllamaModelAdapterOptions = {
  baseUrl?: string;
  // template: 
} & ModelAdapterOptions;


interface OllamaToolJSONSchema {
  type: 'function',
  function: {
    name: string,
    description: string,
    parameters: {
      type: "object",
      properties: Record<string, any>,
      required: string[]
    }
  }
}

interface OllamaToolCall {
  type: 'function',
  function: {
    name: string,
    arguments: string,
  }
};

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
    let completion = await this._fetchOllamaChatAPI(options);

    if (completion.message === undefined) {
      throw new Error('This shouldn\'t happen, probably need to setup error handling logic in the API call');
    }

    if (
      completion.message.content
      && typeof completion.message.content === "string"
      && completion.message.content.length > 0
    ) {

      try {
        let tmpParse = JSON.parse(completion.message.content);
        if (tmpParse.response) {
          completion.message.content = tmpParse.response
        } else {
          return this.chatCompletion(options);
        }
      } catch (e) { }

      return completion;
    }

    if (!completion.message.tool_calls) {
      return await this.chatCompletion(options);
    }

    let toolCalls: ToolCall[] = (completion.message.tool_calls as OllamaToolCall[]).map((tc: OllamaToolCall) => {
      return {
        ...tc,
        id: `tool_${this.generateToolID()}`
      }
    });

    toolCalls = toolCalls.map(tc => {
      tc.function.name = tc.function.name.replace(/[^a-zA-Z0-9_-]/g, '')
      return tc;
    });

    let toolRunMessage: AssistantMessage = {
      role: 'assistant',
      tool_calls: toolCalls
    }

    options.history.conversation.addMessage(toolRunMessage);

    for (let toolCall of toolCalls) {
      if (toolCall.function.name === "respond_to_user") {
        options.tools = []

        return {
          message: {
            role: 'assitant',
            content: (toolCall.function.arguments as any).response
          }
        };
      }

      const toolResultMessage = await this.getToolResult(toolCall, options.client);

      options.history.conversation.addMessage(toolResultMessage);
    }

    return await this.chatCompletion(options);
  }

  async _fetchOllamaChatAPI(options: ChatCompletetionInvocationOptions) {
    const fetch_url = `${this.baseUrl}/api/chat`;
    let body_options: any = {};

    let messages = structuredClone(options.history.conversation.getMessages());

    if (options.tools.length > 0) {
      body_options['format'] = "json";
      body_options['tools'] = [
        ...options.tools.map(t => this.getToolJSONSchema(t)),
        responseToolDef
      ];

      let sysTemplate: SystemMessage = messages.find(v => v.role === "system") as SystemMessage;
      sysTemplate.content = sysTemplate.content + '\n' + this.getToolPrompt(options.tools);
    }

    const fetch_body = {
      stream: false,
      messages,
      model: options.model.name,
      ...body_options
    }

    const fetch_options = {
      method: "POST",
      body: JSON.stringify(fetch_body)
    }

    let fetch_res = await fetch(fetch_url, fetch_options);
    let fetch_json = await fetch_res.json();

    return fetch_json
  }

  private async getToolResult(toolCall: ToolCall, client: EasyRAG) {
    // cast to tool parameter
    let toolCallArgs = toolCall.function.arguments as unknown as ToolParameter[];

    let toolResultMessage: ToolMessage = {
      role: 'tool',
      tool_call_id: toolCall.id,
      content: '',
    }

    try {
      let foundTool = client.getTool(toolCall.function.name);
      const toolResult = await foundTool.run(toolCallArgs);
      toolResultMessage.content = toolResult;
    } catch (error) {
      toolResultMessage.content = `Tool "${toolCall.function.name}" not found.`;
    }

    return toolResultMessage;
  }

  private getToolJSONSchema(t: Tool): OllamaToolJSONSchema {
    let paramsObj = t.getParameters().reduce((a: any, c: ToolParameter) => {
      let paramObj: any = {
        type: c.type,
        description: c.description
      }
      if (c.enum) paramObj.enum = c.enum;
      a[c.name] = paramObj;
      return a;
    }, {})

    return {
      type: "function" as "function",
      function: {
        name: t.name,
        description: t.description,
        parameters: {
          type: "object" as "object",
          properties: paramsObj,
          required: t.getParameters().filter(t => t.required).map(t => t.name)
        }
      }
    };
  }

  private generateToolID() {
    return Array.from({ length: 15 }, () => Math.floor(Math.random() * 36).toString(36)).join('');
  }

  private getToolPrompt(tools: Tool[]) {
    return `You are a helpful assistant with tool calling capabilities. When you receive a tool call response, use the output to format an answer to the orginal use question. You may use tools multiple times to recieve a correct response.

Available tools:
<tools>
  ${JSON.stringify([...tools.map(t => this.getToolJSONSchema(t)), responseToolDef])}
</tools>

When you are finished, use the "respond_to_user" tool.`;
  }
}


const responseToolDef = {
  "type": "function",
  "function": {
    "name": "respond_to_user",
    "description": "Finish using tools and respond to the users prompt using the previous tool runs as context to help you answer.",
    "parameters": {
      "type": "object",
      "properties": {
        "response": {
          "type": "string",
          "description": "The plain text response that will be displayed to the user."
        }
      },
      "required": ["response"]
    }
  }
};