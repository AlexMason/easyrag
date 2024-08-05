import { OllamaModelAdapter } from "../src/models/ollama.model.adapter";
import { OpenAIModelAdapter } from "../src/models/openai.model.adapter";
import { EasyRAG } from "../src/easyrag";
import { Model } from "../src/models/model";
import { Tool } from "../src/tools/tools";

import "dotenv/config";

(async function () {
  // 1. Initalize the adapters, models, and tools for this client
  const openaiAdapter = new OpenAIModelAdapter({
    apiKey: process.env.OPENAI_API_KEY || "",
  });

  const ollamaAdapter = new OllamaModelAdapter({
    baseUrl: "http://localhost:11434",
  });

  // 2. Initialize the client
  const ragClient = new EasyRAG({
    defaultModelAdapter: openaiAdapter,
    conversation: {
      defaultMessages: [
        { role: 'system', content: 'You are an AI assistant.' }
      ]
    },
  });

  // 3. Initalize the models and register them
  openaiAdapter.registerModels([
    new Model('gpt-4o-mini', 'chat', ragClient),
    new Model('text-embedding-3-small', 'embedding', ragClient)
  ]);

  ollamaAdapter.registerModels([
    new Model('llama3.1', 'chat', ragClient),
    new Model('nomic-embed-text', 'embedding', ragClient)
  ])

  // 4. Initialize the tools


  const weatherTool = new Tool({
    "name": "weather",
    "description": "Looks up the weather by zip code",
    "parameters": {
      "zipCode": {
        "type": "string",
        "description": "Zip code that the user provided",
        "required": true
      }
    },
    "callback": async (params) => {
      return "It's a crisp 30f in " + params.zipCode;
    }
  });

  const scheduleTool = new Tool({
    "name": "schedule",
    "description": "Looks up the users schedule",
    "callback": async (params) => {
      return "It's time to paint the garage.";
    }
  });

  ragClient.register(weatherTool);
  ragClient.register(scheduleTool);

  // Only has access to the schedule tool
  let message = await ragClient.query("What is the weather in zip 92021 and what is on my schedule today?", {
    tools: [weatherTool]
  });

  console.log(
    ragClient
      .conversation
      .getMessages()
      .map(m => `${JSON.stringify(m, null, 2)}`)
      .join('\n')
  )

  // 5. Get the conversation history
  // console.log(
  //   ragClient
  //     .conversation
  //     .getMessages()
  //     .map(m => `${JSON.stringify(m, null, 2)}`)
  //     .join('\n')
  // )

  // let message2 = await ragClient.query("What is the weather in zip 92021 and what is on my schedule today?", {
  //   tools: [scheduleTool],
  //   modelAdapter: ollamaAdapter
  // });

  // // 5. Get the conversation history
  // console.log(
  //   ragClient
  //     .conversation
  //     .getMessages()
  //     .map(m => `${JSON.stringify(m, null, 2)}`)
  //     .join('\n')
  // )

  // console.log("message", message);
  // console.log("message2", message2);

})();