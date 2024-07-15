import { EasyRAG } from "../easy-rag";
import { MissingClientException, MissingToolAdapterException } from "../lib/exceptions";
import { Registerable } from "../registerable/registerable.interface";

export type ToolParamater = {
  "name": string,
  "description": string,
  "type": "string" | "integer" | "boolean",
  "enum"?: string[],
  "required"?: boolean
};

export class Tool extends Registerable {
  name: string;
  description: string;
  client: EasyRAG | undefined;
  type: "tool" = "tool";

  constructor(
    name: string,
    description: string,
    private parameters: ToolParamater[],
    private cb: (
      parameters: Record<string, string | number | boolean>,
      client: EasyRAG
    ) => Promise<string>
  ) {
    super();
    this.name = name;
    this.description = description;
  }

  getParameters(): ToolParamater[] {
    return this.parameters;
  }

  async run(parameters: Record<string, string | number | boolean>): Promise<string> {
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