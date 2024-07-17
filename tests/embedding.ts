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

  const myModel = new Model("gpt-3.5-turbo", "chat");
  const embeddingModel = new Model("text-embedding-3-small", "embedding");

  // 2. Initialize the client
  const ragClient = new EasyRAG({ modelAdapter }, {
    conversation: {
      defaultMessages: [
        { role: 'system', content: 'You are an AI assistant.' }
      ]
    }
  });


  // 3. Initialize the models
  ragClient.register(myModel);
  ragClient.register(embeddingModel);

  // 4. Query the client
  await ragClient.embedding('Hello world!');

})();