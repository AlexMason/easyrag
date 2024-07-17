import { EasyRAG } from "../easyrag";
import { MissingClientException } from "../lib/exceptions";
import { Registerable } from "../registerable/registerable.interface";

export type ToolParameter = {
  name: string;
  description: string;
  type: "string" | "integer" | "boolean";
  enum?: string[];
  required?: boolean;
};


export class Tool extends Registerable {
  name: string;
  description: string;
  client: EasyRAG | undefined;
  type: "tool" = "tool";

  constructor(
    name: string,
    description: string,
    private parameters: ToolParameter[],
    private cb: (
      parameters: Record<string, any>,
      client: EasyRAG
    ) => Promise<string>
  ) {
    super();
    this.name = name;
    this.description = description;
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
