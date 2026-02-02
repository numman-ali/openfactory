/**
 * OpenFactory - Embedding Client
 * SPDX-License-Identifier: AGPL-3.0
 *
 * Generates vector embeddings for code chunks using the LLM provider abstraction.
 * Batches requests to stay within rate limits with exponential backoff retry.
 */

import { embedMany } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { getEmbeddingConfig } from '../agents/providers/index.js';
import type { EmbeddingClient } from './index.js';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Max texts per embedding API call */
const DEFAULT_BATCH_SIZE = 96;
/** Delay between batches to respect rate limits (ms) */
const INTER_BATCH_DELAY_MS = 200;
/** Max retries per batch */
const MAX_RETRIES = 3;
/** Base delay for exponential backoff (ms) */
const BASE_RETRY_DELAY_MS = 1000;

// ---------------------------------------------------------------------------
// Embedding Client Factory
// ---------------------------------------------------------------------------

export interface EmbeddingClientConfig {
  batchSize?: number;
  interBatchDelayMs?: number;
  maxRetries?: number;
}

/**
 * Creates an EmbeddingClient that uses the configured LLM provider for embeddings.
 * Uses the Vercel AI SDK `embedMany` for batch embedding generation.
 * Includes rate limiting via inter-batch delays and exponential backoff retry.
 */
export function createEmbeddingClient(config?: EmbeddingClientConfig): EmbeddingClient {
  const embeddingConfig = getEmbeddingConfig();
  const model = createEmbeddingModel(embeddingConfig);
  const batchSize = config?.batchSize ?? DEFAULT_BATCH_SIZE;
  const interBatchDelay = config?.interBatchDelayMs ?? INTER_BATCH_DELAY_MS;
  const maxRetries = config?.maxRetries ?? MAX_RETRIES;

  return {
    async embed(texts: string[]): Promise<number[][]> {
      if (texts.length === 0) return [];

      const allEmbeddings: number[][] = [];

      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);

        const embeddings = await embedBatchWithRetry(model, batch, maxRetries);
        allEmbeddings.push(...embeddings);

        // Rate limit: delay between batches (skip after last batch)
        if (i + batchSize < texts.length) {
          await sleep(interBatchDelay);
        }
      }

      return allEmbeddings;
    },
  };
}

// ---------------------------------------------------------------------------
// Retry Logic
// ---------------------------------------------------------------------------

async function embedBatchWithRetry(
  model: ReturnType<typeof createEmbeddingModel>,
  batch: string[],
  maxRetries: number,
): Promise<number[][]> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const { embeddings } = await embedMany({
        model: model as Parameters<typeof embedMany>[0]['model'],
        values: batch,
      });
      return embeddings;
    } catch (err) {
      lastError = err;

      if (attempt < maxRetries) {
        const delay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt);
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create an embedding model from the embedding config.
 * Supports OpenAI and Google (Gemini) embedding providers.
 */
function createEmbeddingModel(config: { provider: string; model: string }) {
  switch (config.provider) {
    case 'google': {
      const provider = createGoogleGenerativeAI({
        apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      });
      return provider.textEmbeddingModel(config.model);
    }
    case 'openai':
    default: {
      const provider = createOpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      return provider.embedding(config.model);
    }
  }
}
