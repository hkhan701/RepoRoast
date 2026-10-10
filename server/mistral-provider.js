import { Mistral } from '@mistralai/mistralai';

import { LlmProvider } from './llm-provider.js';

export class MistralProvider extends LlmProvider {
  constructor({ redis, keys }) {
    super();
    this.redis = redis;
    this.keys = keys;

    if (this.keys.length === 0) {
      throw new Error('No Mistral API keys found');
    }
  }

  async *stream(options) {
    yield* this.withRetry(async (client) => {
      const stream = await client.chat.stream(options);
      return this.textChunks(stream);
    });
  }

  async complete(options) {
    for await (const result of this.withRetry((client) => client.chat.complete(options))) {
      return result;
    }

    throw new Error('LLM provider returned no completion');
  }

  async *textChunks(stream) {
    for await (const event of stream) {
      const text = extractTextFromStreamEvent(event);
      if (text) yield text;
    }
  }

  async *withRetry(fn) {
    const maxAttempts = this.keys.length * 2;
    let lastError;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const { client, keyLabel } = await this.getClient();
      console.log(`[Attempt ${attempt + 1}/${maxAttempts}] Trying key: ${keyLabel}`);

      try {
        const result = await fn(client);
        console.log(`[Attempt ${attempt + 1}/${maxAttempts}] Key ${keyLabel} succeeded`);

        if (isAsyncIterable(result)) {
          yield* result;
        } else {
          yield result;
        }
        return;
      } catch (error) {
        lastError = error;
        const status = error?.statusCode ?? error?.status ?? error?.response?.status;
        const message = error?.message ?? '';
        const retryable = status === 429 || status === 402 || /429|rate.?limit|402|payment/i.test(message);

        console.log(`[Attempt ${attempt + 1}/${maxAttempts}] Key ${keyLabel} failed (${status || message.slice(0, 60)})`);
        if (!retryable) throw error;

        console.log(`[Attempt ${attempt + 1}/${maxAttempts}] Rate limited, retrying next key in 3s...`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    console.log(`All ${maxAttempts} attempts exhausted, no keys available`);
    throw lastError;
  }

  async getClient() {
    let index = 0;
    try {
      index = await this.redis.incr('mistral:key_index');
    } catch { }

    const key = this.keys[index % this.keys.length];
    return {
      client: new Mistral({ apiKey: key }),
      keyLabel: `${key.slice(0, 4)}...${key.slice(-4)}`,
    };
  }
}

function isAsyncIterable(value) {
  return value != null && typeof value[Symbol.asyncIterator] === 'function';
}

function extractTextFromStreamEvent(event) {
  const payload = event?.data ?? event;
  const delta = payload?.choices?.[0]?.delta?.content;

  if (typeof delta === 'string') return delta;
  if (Array.isArray(delta)) return extractTextFromParts(delta);

  const messageContent = payload?.choices?.[0]?.message?.content;
  if (typeof messageContent === 'string') return messageContent;
  if (Array.isArray(messageContent)) return extractTextFromParts(messageContent);

  return '';
}

function extractTextFromParts(parts) {
  return parts
    .map((part) => {
      if (typeof part === 'string') return part;
      if (typeof part?.text === 'string') return part.text;
      return '';
    })
    .join('');
}