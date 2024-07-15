import { EasyRAG } from "../easy-rag";


// When register is called in easy rag,
// we will call the register method on 
// the tool itself to store the Client
export abstract class Registerable {
  abstract name: string;
  abstract description?: string;
  abstract type: 'tool' | 'model' | 'docstore';
  client: EasyRAG | undefined;
  abstract register(client: EasyRAG): void;
  abstract unregister(): void;
}