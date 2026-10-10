import axios from 'axios';

import { LlmProvider } from './llm-provider.js';

const NVIDIA_CHAT_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';

export class NvidiaProvider extends LlmProvider {
  constructor({ keys }) {
    super();
    this.keys = keys;

    if (this.keys.length === 0) {
      throw new Error('No NVIDIA API keys found');
    }
  }

  async *stream(options) {
    const response = await this.request(options, true);
    yield* this.textChunks(response.data);
  }

  async complete(options) {
    const response = await this.request(options, false);
    return response.data;
  }

  async request(options, stream) {
    const key = this.keys[0];
    const responseFormat = options.responseFormat
      ? { response_format: options.responseFormat }
      : {};

    return axios.post(NVIDIA_CHAT_URL, {
      model: options.model,
      messages: options.messages,
      stream,
      max_tokens: options.maxTokens ?? 1024,
      temperature: options.temperature,
      top_p: options.topP ?? 0.95,
      ...responseFormat,
    }, {
      headers: {
        Authorization: `Bearer ${key}`,
        Accept: stream ? 'text/event-stream' : 'application/json',
        'Content-Type': 'application/json',
      },
      responseType: stream ? 'stream' : 'json',
    });
  }

  async *textChunks(stream) {
    let buffer = '';

    for await (const chunk of stream) {
      buffer += chunk.toString();
      const events = buffer.split(/\r?\n\r?\n/);
      buffer = events.pop() ?? '';

      for (const event of events) {
        const text = parseSseEvent(event);
        if (text === null) return;
        if (text) yield text;
      }
    }

    const text = parseSseEvent(buffer);
    if (text) yield text;
  }
}

function parseSseEvent(event) {
  const data = event
    .split(/\r?\n/)
    .find((line) => line.startsWith('data:'))
    ?.slice('data:'.length)
    .trim();

  if (!data) return '';
  if (data === '[DONE]') return null;

  try {
    const parsed = JSON.parse(data);
    const content = parsed.choices?.[0]?.delta?.content;
    return typeof content === 'string' ? content : '';
  } catch {
    return '';
  }
}