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

  // 2. Initialize the client
  const ragClient = new EasyRAG({ modelAdapter }, {
    conversation: {
      defaultMessages: [
        { role: 'system', content: 'You are an AI assistant.' }
      ]
    }
  });

  const altConversation = new Conversation({
    defaultMessages: [
      { role: 'system', content: 'You are an AI assistant.' },
      { role: 'user', content: 'My name is bob.' }
    ]
  })

  // 3. Initialize the models
  ragClient.register(myModel);

  // 4. Query the client
  await ragClient.query("Hi. My name is alex");

  console.log(await ragClient.query("What is my name?", {
    history: {
      conversation: altConversation
    }
  }));

  await ragClient.query("What is my name?");
})();