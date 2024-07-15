import { OpenAIModelAdapter } from "../src/adapters/openai.model.adapter";
import { EasyRAG } from "../src/easy-rag";
import { Model } from "../src/models/model";


(async function () {
  // 1. Initalize the adapters + default conversation for this client
  const modelAdapter = new OpenAIModelAdapter({
    apiKey: "",
    baseUrl: "http://localhost:1234"
  });

  // 2. Initialize the client
  const ragClient = new EasyRAG({ modelAdapter });

  // 3. Initialize the models
  ragClient.register(new Model("llama3", "chat"));

  // 4. Query the client
  await ragClient.query("Hello, my name is Alex and I love to read books.");
  await ragClient.query("Recommend a suspensful horror novel to me.");
  await ragClient.query("Ok, thanks! Do you remember what my name is?");

  // 5. Get the conversation history
  console.log(
    ragClient
      .conversation
      .getMessages()
      .map(m => `${m.role}: ${m.content}`)
      .join('\n')
  )
})();