/**
 * OpenFactory - Embedding Client
 * SPDX-License-Identifier: AGPL-3.0
 *
 * Generates vector embeddings for code chunks using the LLM provider abstraction.
 * Batches requests to stay within rate limits.
 */

import { embedMany } from 'ai';
import { getEmbeddingConfig, createModel } from '../agents/providers/index.js';
import type { EmbeddingClient } from './index.js';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Max texts per embedding API call */
const BATCH_SIZE = 96;

// ---------------------------------------------------------------------------
// Embedding Client Factory
// ---------------------------------------------------------------------------

/**
 * Creates an EmbeddingClient that uses the configured LLM provider for embeddings.
 * Uses the Vercel AI SDK `embedMany` for batch embedding generation.
 */
export function createEmbeddingClient(): EmbeddingClient {
  const config = getEmbeddingConfig();
  const model = createModel(config);

  return {
    async embed(texts: string[]): Promise<number[][]> {
      if (texts.length === 0) return [];

      const allEmbeddings: number[][] = [];

      for (let i = 0; i < texts.length; i += BATCH_SIZE) {
        const batch = texts.slice(i, i + BATCH_SIZE);
        const { embeddings } = await embedMany({
          model,
          values: batch,
        });
        allEmbeddings.push(...embeddings);
      }

      return allEmbeddings;
    },
  };
}
