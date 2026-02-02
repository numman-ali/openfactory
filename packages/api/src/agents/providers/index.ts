/**
 * OpenFactory - LLM Provider Abstraction
 * SPDX-License-Identifier: AGPL-3.0
 *
 * Pluggable LLM provider system built on Vercel AI SDK v6.
 * Supports OpenAI, Anthropic, Ollama (local), and OpenRouter.
 */

import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOllama } from 'ollama-ai-provider';
import type { LanguageModelV1 } from 'ai';
import type { LLMConfig, LLMProvider } from '@repo/shared/types';

type ProviderFactory = (config: LLMConfig) => LanguageModelV1;

const providerFactories: Record<LLMProvider, ProviderFactory> = {
  openai: (config) => {
    const provider = createOpenAI({
      apiKey: config.apiKey ?? process.env.OPENAI_API_KEY,
      baseURL: config.baseUrl,
    });
    return provider(config.model);
  },
  anthropic: (config) => {
    const provider = createAnthropic({
      apiKey: config.apiKey ?? process.env.ANTHROPIC_API_KEY,
      baseURL: config.baseUrl,
    });
    return provider(config.model);
  },
  ollama: (config) => {
    const provider = createOllama({
      baseURL: config.baseUrl ?? process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434/api',
    });
    return provider(config.model);
  },
  openrouter: (config) => {
    const provider = createOpenAI({
      apiKey: config.apiKey ?? process.env.OPENROUTER_API_KEY,
      baseURL: config.baseUrl ?? 'https://openrouter.ai/api/v1',
    });
    return provider(config.model);
  },
};

export function createModel(config: LLMConfig): LanguageModelV1 {
  const factory = providerFactories[config.provider];
  return factory(config);
}

export function getDefaultConfig(): LLMConfig {
  const provider = (process.env.LLM_PROVIDER ?? 'openai') as LLMProvider;
  const model = process.env.LLM_MODEL ?? getDefaultModel(provider);
  return {
    provider,
    model,
    temperature: parseFloat(process.env.LLM_TEMPERATURE ?? '0.7'),
    maxTokens: parseInt(process.env.LLM_MAX_TOKENS ?? '4096', 10),
  };
}

export function getEmbeddingConfig(): { provider: LLMProvider; model: string } {
  return {
    provider: (process.env.EMBEDDING_PROVIDER ?? process.env.LLM_PROVIDER ?? 'openai') as LLMProvider,
    model: process.env.EMBEDDING_MODEL ?? 'text-embedding-3-small',
  };
}

function getDefaultModel(provider: LLMProvider): string {
  switch (provider) {
    case 'openai': return 'gpt-4o';
    case 'anthropic': return 'claude-sonnet-4-20250514';
    case 'ollama': return 'llama3.1';
    case 'openrouter': return 'anthropic/claude-sonnet-4';
    default: throw new Error(`Unknown LLM provider: ${String(provider)}`);
  }
}
