import { AssistantMessage, ToolMessage } from "../conversation/conversation";
import { EasyRAG } from "../easyrag";
import { MissingClientException } from "../lib/exceptions";
import { Model, ModelOptions } from "../models/model";
import { ChatCompletetionInvocationOptions, EmbeddingInvocationOptions, IModelAdapter, ModelAdapterOptions } from "../models/model-adapter";
import { Tool } from "../tools/tools";

export type OpenAIModelAdapterOptions = {
  apiKey: string;
  baseUrl?: string;
} & ModelAdapterOptions;

type OpenAIToolCall = {
  id: string;
  type: 'function',
  function: {
    name: string;
    arguments: string
  }
}

export class OpenAIModelAdapter extends IModelAdapter {
  apiKey: string;
  baseUrl: string;

  constructor(options: OpenAIModelAdapterOptions) {
    super(options);

    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl || "https://api.openai.com";
  }

  async chatCompletion(model: Model, options: ChatCompletetionInvocationOptions): Promise<any> {
    if (model.client === undefined) {
      throw new MissingClientException(model);
    }

    let chatResult = await this._chatCompletion(model, options);

    if (typeof chatResult.choices[0].message.content === "string") {
      return chatResult;
    }

    if (!chatResult.choices[0].message.tool_calls) {
      throw new Error("No content and no tool calls... please open an issue and tell me how you triggered this error.")
    }

    let toolCalls: OpenAIToolCall[] = chatResult.choices[0].message.tool_calls;

    toolCalls = toolCalls.map(tc => {
      tc.function.name = tc.function.name.replace(/[^a-zA-Z0-9_-]/g, '')
      return tc;
    })

    let toolRunMessage: AssistantMessage = {
      role: 'assistant',
      tool_calls: toolCalls
    }

    options.history.conversation.addMessage(toolRunMessage);

    for (let toolCall of toolCalls) {
      const toolResultMessage = await this.getToolResult(toolCall, model.client);

      options.history.conversation.addMessage(toolResultMessage);
    }

    return await this.chatCompletion(model, options);

  }

  async embedding(model: Model, query: string, options: EmbeddingInvocationOptions) {
    return "";
  }

  private async getToolResult(toolCall: OpenAIToolCall, client: EasyRAG) {
    let toolCallArgs = JSON.parse(toolCall.function.arguments);

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

  // Fetch OpenAI API
  private async _chatCompletion(model: Model, options: ChatCompletetionInvocationOptions) {
    if (!model.client) {
      throw new MissingClientException(model);
    }

    let fetchOptions: any = {};

    if (options.tools && options.tools.length > 0) {
      fetchOptions.tools = this.parseTools(options.tools);
    } else if (model.client.getTools().length > 0) {
      fetchOptions.tools = this.parseTools(model.client.getTools());
    }

    let reqOptions = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model.getModelName(),
        messages: options.history.conversation.getMessages(),
        ...fetchOptions,
        ...this.parseAIOptions(model.options)
      })
    }

    let response = await fetch(`${this.baseUrl}/v1/chat/completions`, reqOptions);
    let result = await response.json();

    // TODO: Handle errors (40X, 50X, rate-limit, etc.)
    // TODO: Handle expotional backoffs for retryable errors (429, 503, etc.)

    return result;
  }

  private parseTools(tools: Tool[]) {
    let formattedTools = tools.map(tool => {
      let toolProps = tool.getParameters().reduce((a: any, param) => {
        a[param.name] = {
          "type": param.type,
          "description": param.description,
        }

        if (param.enum) {
          a[param.name]["enum"] = param.enum;
        }

        return a;
      }, {})

      let requiredTools = tool.getParameters().reduce((a: any, param) => {
        if (param.required) {
          a.push(param.name);
        }

        return a;
      }, [])

      return {
        "type": "function",
        "function": {
          "name": tool.name,
          "description": tool.description,
          "parameters": {
            "type": "object",
            "properties": toolProps
          }
        },
        "required": requiredTools
      }
    })

    return formattedTools;
  }

  private parseAIOptions(options: ModelOptions) {
    let openAiOptions: any = {};

    if (options.frequencyPenalty !== undefined) { openAiOptions.frequency_penalty = options.frequencyPenalty; }
    if (options.maxTokens !== undefined) { openAiOptions.max_tokens = options.maxTokens; }
    if (options.seed !== undefined) { openAiOptions.seed = options.seed; }
    if (options.topP !== undefined) { openAiOptions.top_p = options.topP; }
    if (options.temperature !== undefined) { openAiOptions.temperature = options.temperature; }

    return openAiOptions;
  }
}