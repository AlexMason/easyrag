// No tools

import EasyRAG, { Model } from "../src";
import { OllamaModelAdapter } from "../src/adapters/ollama.model.adapter";
(async function () {

  const notools_client = new EasyRAG({
    modelAdapter: new OllamaModelAdapter()
  });


  notools_client.register(new Model('llama3', 'chat'));

  await notools_client.query('Hi, my name is alex!');
  await notools_client.query('What is my name?');

  
})();