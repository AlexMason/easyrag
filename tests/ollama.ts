// No tools

import EasyRAG, { Model, Tool } from "../src";
import { OllamaModelAdapter } from "../src/models/ollama.model.adapter";

(async function () {

  /////////////////////////////////////////////////////
  // Minimum Required Setup
  ////
  const client = new EasyRAG({
    modelAdapter: new OllamaModelAdapter()
  });

  client.register(
    new Model('mistral', 'chat', {
      temperature: 0.2
    })
  );

  // await client.query('Hi, my name is alex!');
  // await client.query('What is my name?');

  /////////////////////////////////////////////////////
  // Tools
  ////
  const weatherTool = new Tool(
    "weather", "Looks up the weather by zip code",
    [{
      "name": "zipCode",
      "description": "Zip code",
      "type": "string",
      "required": true
    }],
    async (params) => {
      return "It's a crisp -21f in " + params.zipCode;
    }
  )

  client.register(weatherTool);

  await client.query("What is the weather in ZIP 12345?")

  console.log(client.conversation.getMessages())

})();