import { Conversation } from "../src";
import { OpenAIModelAdapter } from "../src/adapters/openai.model.adapter";
import { EasyRAG } from "../src/easyrag";
import { Model } from "../src/models/model";
import { Tool } from "../src/tools/tools";

import "dotenv/config";

(async function () {
  // 1. Initalize the adapters, models, and tools for this client
  const modelAdapter = new OpenAIModelAdapter({
    apiKey: process.env.OPENAI_API_KEY || "",
  });

  const embeddingModel = new Model("text-embedding-3-small", "embedding");

  // 2. Initialize the client
  const ragClient = new EasyRAG({ modelAdapter });

  // 3. Initialize the models
  ragClient.register(embeddingModel);

  // 4. Query the client
  let res = await ragClient.embedding('Hello world!');

  console.log(res)
})();