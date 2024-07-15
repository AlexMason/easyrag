import { AssistantMessage, ChatMessage, ToolMessage } from "../conversation/conversation";
import { MissingClientException } from "../lib/exceptions";
import { Model, ModelOptions } from "../models/model";
import { ChatCompletetionInvocationOptions, IModelAdapter, ModelAdapterOptions } from "../models/model-adapter";
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

  async chatCompletion(model: Model, messages: ChatMessage[], options: ChatCompletetionInvocationOptions): Promise<any> {
    if (model.client === undefined) {
      throw new MissingClientException(model);
    }

    const conversation = options.conversation || model.client.conversation

    let tools: Tool[] = []

    if (options && options.tools) {
      tools = options.tools
    } else {
      tools = model.client?.getTools() || [];
    }

    if (tools.length > 0) {
      // TODO: Inject tools into the system prompt, or create one if the system prompt doesn't exist in messages
      if (messages.filter(m => m.role === 'system')) {

      } else {

      }
    }

    let chatResult = await this._chatCompletion(model, messages, this.parseTools(tools));

    if (
      chatResult.choices[0].message.content === null
      && chatResult.choices[0].message.tool_calls.length > 0
    ) {
      // TODO: Search for and call tools, add to the history,
      let toolCalls: OpenAIToolCall[] = chatResult.choices[0].message.tool_calls;

      let toolRunMessage: AssistantMessage = {
        role: 'assistant',
        tool_calls: chatResult.choices[0].message.tool_calls,
      }

      conversation.addMessage(toolRunMessage);
      messages.push(toolRunMessage);

      for (let toolCall of toolCalls) {
        let toolCallArgs = JSON.parse(toolCall.function.arguments);
        let foundTool = tools.find(t => t.name === toolCall.function.name);

        // console.log(toolCallArgs, toolCall)

        let toolResultMessage: ToolMessage = {
          role: 'tool',
          tool_call_id: toolCall.id,
          content: '',
        }

        if (foundTool === undefined) {
          toolResultMessage.content = `Tool "${toolCall.function.name}" not found.`;
        } else {
          const toolResult = await foundTool.run(toolCallArgs);

          toolResultMessage.content = toolResult;
        }


        conversation.addMessage(toolResultMessage);
        messages.push(toolResultMessage);
      }

      return await this.chatCompletion(model, messages, options);
    }

    return chatResult;
  }

  async embedding(model: Model, query: string) {
    return "";
  }

  // Fetch OpenAI API
  private async _chatCompletion(model: Model, messages: ChatMessage[], tools: ReturnType<typeof this.parseTools> = []) {

    let fetchOptions: any = {};

    if (tools.length > 0) {
      fetchOptions.tools = tools;
    }

    let response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model.getModelName(),
        messages: messages,
        ...fetchOptions,
        ...this.parseAIOptions(model.options)
      })
    });

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