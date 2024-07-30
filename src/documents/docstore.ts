import { EasyRAG } from "../easyrag";
import { ClientRegisterable } from "../registerable/registerable.interface";

type DocStoreOptions = {
  description: ''
}

class DocStore extends ClientRegisterable {
  client: EasyRAG | undefined;

  name: string;
  description?: string | undefined;
  type: "docstore" = "docstore";

  constructor(name: string, options?: DocStoreOptions) {
    super();
    this.name = name;
  }

  register(client: EasyRAG): void {
    this.client = client;
  }

  unregister(): void {
    this.client = undefined;
  }
}