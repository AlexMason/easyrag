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

    // console.log(completion);

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
        if (tmpParse.response) completion.message.content = tmpParse.response
      } catch (e) { }

      return completion;
    }

    if (!completion.message.tool_calls) {
      throw new Error("No content and no tool calls... please open an issue and tell me how you triggered this error.")
    }

    let toolCalls: ToolCall[] = (completion.message.tool_calls as OllamaToolCall[]).map((tc: OllamaToolCall) => {
      return {
        ...tc,
        //TODO: replace tool id
        id: `tool_${this.generateToolID()}`
      }
    });

    toolCalls = toolCalls.map(tc => {
      tc.function.name = tc.function.name.replace(/[^a-zA-Z0-9_-]/g, '')
      return tc;
    });

    // console.log('toolCalls', toolCalls);


    let toolRunMessage: AssistantMessage = {
      role: 'assistant',
      tool_calls: toolCalls
    }

    options.history.conversation.addMessage(toolRunMessage);

    for (let toolCall of toolCalls) {
      if (toolCall.function.name === "respond_to_user") {
        options.tools = []

        return await this.chatCompletion(options);
      }

      const toolResultMessage = await this.getToolResult(toolCall, options.client);

      options.history.conversation.addMessage(toolResultMessage);
    }

    // console.log("conversation", JSON.stringify(options.history.conversation.getMessages()))

    return await this.chatCompletion(options);

    return {};
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

      // console.log("body_options", body_options)
      // TODO: Inject groq template into system.
      if (options.model.name.includes("llama3-groq-tool-use")) {
        // template

        let sysTemplate: SystemMessage = messages.find(v => v.role === "system") as SystemMessage;

        sysTemplate.content = sysTemplate.content + '\n' + this.getGroqPrompt(options.tools);

        // console.log("messages", messages)
      }
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

    console.log("fetch_body", fetch_body)

    let fetch_res = await fetch(fetch_url, fetch_options);
    let fetch_json = await fetch_res.json();

    // TODO: Handle errors

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

  private getGroqPrompt(tools: Tool[]) {
    return `You are provided with function signatures within <tools></tools> XML tags. You may call one or more functions to assist with the user query. Don't make assumptions about what values to plug into functions. For each function call return a json object with function name and arguments within <tool_call></tool_call> XML tags as follows:
<tool_call>
{"name": <function-name>,"arguments": <args-dict>}
</tool_call>

Here are the available tools:
<tools>
${JSON.stringify([...tools.map(t => this.getToolJSONSchema(t)), responseToolDef])}
</tools>

When you are finished use the "respond_to_user" tool. Only respond in JSON if you use a tool, otherwise respond normally.
`
  }
}


const responseToolDef = {
  "type": "function",
  "function": {
    "name": "respond_to_user",
    "description": "Finish using tools and respond to the user.",
    "parameters": {
      "type": "object",
      "properties": {
        "response": {
          "type": "string",
          "description": "The response to be provided."
        }
      },
      "required": ["response"]
    }
  }
};