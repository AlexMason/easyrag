import { OllamaModelAdapter } from "../src/adapters/ollama.model.adapter";
import { OpenAIModelAdapter } from "../src/adapters/openai.model.adapter";
import { EasyRAG } from "../src/easyrag";
import { Model } from "../src/models/model";
import { Tool } from "../src/tools/tools";

import "dotenv/config";

(async function () {
  // 1. Initalize the adapters, models, and tools for this client
  const modelAdapter = new OllamaModelAdapter({
    // apiKey: process.env.OPENAI_API_KEY || "",
  });
  // const modelAdapter = new OpenAIModelAdapter({
  //   apiKey: process.env.OPENAI_API_KEY || "",
  // });

  const myModel = new Model("llama3-groq-tool-use", "chat", {
    temperature: 0.2,
    // topP: 0.65
  });
  // const myModel = new Model("gpt-3.5-turbo", "chat");

  const weatherTool = new Tool(
    "weather", "Looks up the weather by zip code", [
    {
      "name": "zipCode",
      "description": "Zip code",
      "type": "string",
      "required": true
    }
  ],
    (params) => {
      return Promise.resolve("It's a crisp 30f in " + params.zipCode);
    }
  )

  const scheduleTool = new Tool(
    "schedule", "Looks up items on my daily planner", [],
    async () => {
      return "Bird watching, take out trash, paint the garage";
    }
  )

  // 2. Initialize the client
  const ragClient = new EasyRAG({ modelAdapter }, {
    conversation: {
      defaultMessages: [
        { role: 'system', content: 'You are an AI assistant.' }
      ]
    },
  });

  // 3. Initialize the models
  ragClient.register(myModel);
  ragClient.register(weatherTool);
  ragClient.register(scheduleTool);

  // 4. Query the client
  // await ragClient.query("What is the weather in zip 92021 and what is on my schedule today?");

  // Only has access to the weather tool
  // await ragClient.query("What is the weather in zip 92021 and what is on my schedule today?", {
  //   tools: [weatherTool]
  // });

  // Only has access to the schedule tool
  let message = await ragClient.query("What is the weather in zip 92021 and what is on my schedule today?", {
    // tools: [scheduleTool]
  });

  // 5. Get the conversation history
  console.log(
    ragClient
      .conversation
      .getMessages()
      .map(m => `${JSON.stringify(m, null, 2)}`)
      .join('\n')
  )

  console.log("message", message);

})();