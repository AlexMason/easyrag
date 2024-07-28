let { parse } = require('@ctrl/golang-template');

const template = `{{ if .Messages }}
{{ if or .System .Tools }}<|start_header_id|>system<|end_header_id|>

{{ .System }}
{{ if .Tools }} You are provided with function signatures within <tools></tools> XML tags. You may call one or more functions to assist with the user query. Don't make assumptions about what values to plug into functions. For each function call return a json object with function name and arguments within <tool_call></tool_call> XML tags as follows:
<tool_call>
{"name": <function-name>,"arguments": <args-dict>}
</tool_call>

Here are the available tools:
<tools>
{{ range .Tools }} {{ .Function }}
{{ end }} </tools>
{{ end }}<|eot_id|>
{{ end }}
{{ range $i, $_ := .Messages }}
{{ $last := eq (len (slice $.Messages $i)) 1 }}
{{ if eq .Role "user" }}<|start_header_id|>user<|end_header_id|>

{{ .Content }}<|eot_id|>{{ if $last }}<|start_header_id|>assistant<|end_header_id|>

{{ end }}
{{ else if eq .Role "assistant" }}<|start_header_id|>assistant<|end_header_id|>
{{ if .ToolCalls }}

<tool_call>
{{ range .ToolCalls }}{"name": "{{ .Function.Name }}", "arguments": {{ .Function.Arguments }}}{{ end }}
</tool_call>
{{ else }}

{{ .Content }}
{{ end }}{{ if not $last }}<|eot_id|>{{ end }}
{{ else if eq .Role "tool" }}

<tool_response>
{"result": {{ .Content }}}
</tool_response>{{ if $last }}<|start_header_id|>assistant<|end_header_id|>

{{ end }}
{{ end }}
{{ end }}
{{ else }}
{{ if .System }}<|start_header_id|>system<|end_header_id|>

{{ .System }}<|eot_id|>{{ end }}{{ if .Prompt }}<|start_header_id|>user<|end_header_id|>

{{ .Prompt }}<|eot_id|>{{ end }}<|start_header_id|>assistant<|end_header_id|>

{{ end }}{{ .Response }}
{{ if .Response }}<|eot_id|>
{{ end }}`;


(async function () {
  const url = 'http://localhost:11434/api/chat'

  let tools = [
    {
      type: 'function',
      function: {
        name: 'get_flight_times',
        description: 'Get the flight times between two cities',
        parameters: {
          type: 'object',
          properties: {
            departure: {
              type: 'string',
              description: 'The departure city (airport code)',
            },
            arrival: {
              type: 'string',
              description: 'The arrival city (airport code)',
            },
          },
          required: ['departure', 'arrival'],
        },
      },
    }
  ];

  const options = {
    method: 'POST',
    body: JSON.stringify({
      "model": "llama3-groq-tool-use:latest",
      "messages": [
        { "role": "user", "content": "What is the How long will it take to fly from IND to LAX?" }
      ],
      tools,
      stream: false,
      format: 'json'
    })
  }

  let res = await fetch(url, options)
  let data = await res.json();

  console.log('data', data);
  console.log('data.message.tool_calls', data.message.tool_calls[0]);
})();