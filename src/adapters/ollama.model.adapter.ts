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
    let result = await this._chatCompletion(options);

    let toolCalls = this.getToolCalls(result.message.content, options.client)

    if (toolCalls.length > 0) {
      for (let toolCall of toolCalls) {
        if (toolCall.function.name === "respond") {
          console.log("respond", toolCall.function)
          return JSON.parse(toolCall.function.arguments).response;
        }

        let params = JSON.parse(toolCall.function.arguments);
        let tool = options.client.getTool(toolCall.function.name);

        let toolResult = await tool.run(params);
        console.log("toolResult", toolResult)

        options.history.conversation.toolNotepad += `\n${JSON.stringify({
          name: toolCall.function.name,
          arguments: toolCall.function.arguments,
          output: toolResult
        })}`;
      }

      return this.chatCompletion(options);
    }

    let finalResult = await this._chatCompletion(options);
    console.log(finalResult)

    options.history.conversation.toolNotepad = '';

    // try {
    //   let toolCallJSON = JSON.parse(result.message.content);
    //   console.log("toolCallJSON", toolCallJSON);

    //   if (toolCallJSON.tool_name) {
    //     let { tool_name, parameters } = toolCallJSON;
    //     let params = JSON.parse(parameters)

    //     if (tool_name === 'respond') {
    //       return { message: { role: 'assistant', content: params.response } }
    //     }

    //     let toolResult = await options.client.getTool(tool_name).run(params);

    //     console.log('toolResult', toolResult)

    //     options.history.conversation.addMessage({
    //       role: 'tool',
    //       content: toolResult,
    //       tool_call_id: '',
    //       metadata: toolCallJSON
    //     });

    //     return await this.chatCompletion(options);
    //   }
    // } catch (error) {
    //   console.log(error)
    // }

    return finalResult;
  }

  async _chatCompletion(options: ChatCompletetionInvocationOptions): Promise<any> {

    let messages = options.history.conversation.getMessages().map(m => {
      if (m.role === 'system') {
        let content = m.content + this.getToolPrompt(options)

        return {
          ...m,
          content
        }
      }

      // TODO: Convert tool to system message with correspond toolCallId
      // if (m.role === 'tool')
      return m;
    }).filter(m => m.role !== 'tool');

    // console.log("_chatCompletion options", options)
    // console.log("_chatCompletion messages", messages)

    let fetchOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: options.model.getName(),
        messages,
        ...this.parseAIOptions(options.model.options),
        stream: false,
        format: 'json'
      })
    }

    let result = await fetch(`${this.baseUrl}/api/chat`, fetchOptions);
    let data = await result.json();

    return data;

  }

  /**
   * 
   * @param prompt Prompt returned by the chat call
   */
  private getToolCalls(prompt: string, client: EasyRAG): OllamaToolCall[] {
    try {
      let parsed = JSON.parse(prompt);
      // console.log("parsed", parsed)
      if (parsed.tool_calls.length > 0) {
        console.log("parsed.tool_calls", parsed.tool_calls)

        let toolCalls = [];

        for (let tool_call of parsed.tool_calls) {
          let toolCall = this.validateToolCall(tool_call)

          if (!toolCall.valid) continue;

          //TODO: Check if tool exists
          let tool = this.validateTool(toolCall.instance.function.name, client);

          if (tool === undefined) continue;

          //TODO: Validate params/arguments

          let validParams = this.validateToolCallParams(toolCall.instance, tool);

          if (!validParams.valid) continue;

          toolCalls.push(toolCall.instance);
        }

        return toolCalls;
      }
    } catch (e) {
    }
    return [];
  }

  private validateToolCall(toolCall: unknown) {
    let result = validate(toolCall, { "type": "object", "properties": { "type": { "type": "string" }, "function": { "type": "object", "properties": { "name": { "type": "string", "description": "Name of tool to run." }, "arguments": { "type": "string", "description": "Valid JSON string of arguments for the selected tool." } }, "required": ["name", "arguments"] } }, "required": ["type", "function"] })

    return result;
  }

  private validateToolCallParams(toolCall: OllamaToolCall, tool: Tool) {
    let result = validate(JSON.parse(toolCall.function.arguments), this.getToolJSONSchema(tool).function.parameters);

    return result;
  }

  private validateTool(toolName: string, client: EasyRAG) {
    try {
      return client.getTool(toolName);
    } catch (e) {
    }
  }


  private getToolPrompt(options: ChatCompletetionInvocationOptions) {
    let toolDescriptions: OllamaToolJSONSchema[] = [
      ...options.tools.map(t => this.getToolJSONSchema(t)),
      {
        type: 'function' as 'function',
        function: {
          name: "respond",
          description: "Finish using tools and respond to the user prompt.",
          parameters: {
            type: "object" as "object",
            properties: {
              "response": {
                type: "string"
              }
            },
            required: ["response"]
          }
        }
      }
    ]

    //V1
    let prompt = `\n=== Tool Mode: Activated ===
You are an interactive agent that is able to use tools to help you answer user prompts. You are able to use multiple tools at once by adding more than one tool to your \`tool_calls\` array output. Not every user prompt will require use of a tool. If that is the case, use the \`respond\` tool.

Use the ReAct (reasoning and acting) technique to aid your process in determining which tool to run. The ReAct technique is summarized below:
1. Think: Reason about which tool(s) would be most appropriate to use and why.  
2. Act: Run a tool to get a result
3. Observe: Determine if the thought and result from the action.
4. Respond: Using the observations from your thoughts and actions to answer the user's prompt.

You have access to the following tools in the JSON "tools" below. When you are finished using tools to retrieve information, use the "respond" tool.
[AVAILABLE_TOOLS]${JSON.stringify(toolDescriptions)}[/AVAILABLE_TOOLS]

As you're using tools, your actions will be recorded below for your reference when using the "respond" tool. If you have already used a tool use the notepad below as a reference for your response instead of running the same tool/inputs more than once.
Conversation Tool Notepad:${options.history.conversation.toolNotepad}

Your output should be JSON only, and validate the following JSON Schema:
{
  "type": "object",
  "properties": {
    "tool_calls": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "type": {
            "type": "string"
          },
          "function": {
            "type": "object",
            "properties": {
              "name": {
                "type": "string",
                "description": "Name of tool to run.",
                "enum": ["respond", "weather"]
              },
              "arguments": {
                "type": "string",
                "description": "Valid JSON string of arguments for the selected tool."
              }
            },
            "required": [
              "name",
              "arguments"
            ]
          }
        },
        "required": [
          "type",
          "function"
        ]
      }
    }
  },
  "required": [
    "tool_calls"
  ]
}`;

    return prompt;
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

  private getToolJSONSchema(t: Tool) {
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
}