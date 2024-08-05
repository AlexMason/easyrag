import { EasyRAG } from "../easyrag";
import { MissingClientException } from "../util/exceptions";
import { ClientRegisterable } from "../registerable/registerable.interface";

export type ToolParameter = {
  name: string;
  description: string;
  type: "string" | "integer" | "boolean";
  enum?: string[];
  required?: boolean;
};

export type ToolCallbackFunction = (
  parameters: Record<string, any>,
  client: EasyRAG
) => Promise<string>

export type ToolOptions = {
  name: string,
  description: string,
  parameters?: Record<string, {
    description: string;
    type: "string" | "integer" | "boolean";
    enum?: string[];
    required?: boolean;
  }>
  callback: ToolCallbackFunction
}


export class Tool extends ClientRegisterable {
  name: string;
  description: string;
  client: EasyRAG | undefined;
  type: "tool" = "tool";
  parameters: ToolParameter[] = [];
  cb: ToolCallbackFunction;

  constructor(
    options: ToolOptions
  ) {
    super();

    this.name = options.name;
    this.description = options.description;
    this.cb = options.callback;

    if (options.parameters) {
      this.parameters = Object.entries(options.parameters).map(([keyName, value]) => {
        return {
          name: keyName,
          ...value
        }
      });
    }
  }

  getParameters(): ToolParameter[] {
    return this.parameters;
  }

  async run(parameters: ToolParameter[]): Promise<string> {
    if (this.client === undefined) {
      throw new MissingClientException(this);
    }

    return await this.cb(parameters, this.client);
  }

  register(client: EasyRAG): void {
    this.client = client;
  }

  unregister(): void {
    this.client = undefined;
  }
}
