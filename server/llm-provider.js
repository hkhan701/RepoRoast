export class LlmProvider {
  async *stream() {
    throw new Error('LlmProvider.stream() must be implemented');
  }

  async complete() {
    throw new Error('LlmProvider.complete() must be implemented');
  }
}