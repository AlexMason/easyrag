# EasyRAG.js

EasyRAG is the AI TypeScript library you wish you had when you got started.

## Getting Started

```sh
npm install --save easyrag
```


```js
import EasyRAG, { OpenAIModelAdapter } from 'easyrag';

// 1. Setup the model adapter, model, and any tools.

const modelAdapter = new OpenAIModelAdapter({
  apiKey: process.env.OPENAI_API_KEY
});

const chatGpt35Turbo = new Model("gpt-3.5-turbo", "chat");

const weatherToolParams = [
  {
    "name": "zipCode",
    "description": "Zip code",
    "type": "string",
    "required": true
  }
];

const weatherTool = new Tool(
  "weather",
  "Looks up the weather by zip code",
  weatherToolParams,
  async (params) => {
    return "It's a crisp 30f in " + params.zipCode;
  }
);

// 2. Initalize the EasyRAG client.

const ragClient = new EasyRAG({ modelAdapter });

// 3. Register your models and tools

ragClient.register(chatGpt35Turbo);
ragClient.register(weatherTool);

// 4. Query the client
await ragClient.query("What is the weather in zip 92021?");

// 5. Get the built-in conversation history
console.log(
  ragClient
    .conversation
    .getMessages()
    .map(m => `${JSON.stringify(m, null, 2)}`)
    .join('\n')
);
```

## Documentation

Documentation is currently under development. Check back soon for updates.

## Why & Ethos

I created this library as an alternative to existing tools due to increasing frustration with them. EasyRAG aims to:

- Provide a minimal API abstraction to easily build a variety of AI-powered applications.
- Be extendable out-of-the-box. Create your own adapters and integrate with any inference engine (Ollama, LlamaIndex, etc.)
- Throw errors instead of falling back to defaults.

## Feature Roadmap

I am committed to releasing the following features:

- [x] Model Adapter
  - [x] Chat completion
  - [x] Hot swap tools
  - [x] Support for parameters (temperature, top_p, etc.)
  - [x] Hot swap conversation
  - [ ] Embedding 
  - [ ] Streaming
- [x] Conversations
  - [x] System prompt
  - [x] History limit for generation context
- [x] Tool Support
  - [ ] Type support for parameters
- [ ] Document Storage
- [ ] Out-of-the-box Adapters
  - [x] OpenAI Model Adapter
  - [ ] Ollama Model Adapter

## Contributing

Contributions are welcome! Feel free to open an issue or pull request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
