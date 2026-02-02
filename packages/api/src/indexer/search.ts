/**
 * OpenFactory - Semantic Code Search
 * SPDX-License-Identifier: AGPL-3.0
 *
 * Vector similarity search using pgvector's cosine distance.
 * Provides natural language search over indexed code chunks
 * with optional filters by file path pattern and symbol type.
 */

import { z } from 'zod';
import type { EmbeddingClient, SearchResult, IndexerRepository } from './index.js';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const SearchQuery = z.object({
  /** Natural language query describing what to find. */
  query: z.string().min(1),
  /** Maximum number of results to return. */
  limit: z.number().int().positive().default(10),
  /** Filter by file path glob pattern (e.g., "src/services/**"). */
  filePathPattern: z.string().optional(),
  /** Filter by programming language (e.g., "typescript"). */
  language: z.string().optional(),
  /** Filter by symbol type (e.g., "function", "class"). */
  symbolType: z.enum(['function', 'class', 'method', 'interface', 'type_alias', 'enum', 'import', 'block']).optional(),
  /** Minimum similarity score threshold (0-1). Results below this are excluded. */
  minScore: z.number().min(0).max(1).default(0.3),
});
export type SearchQuery = z.infer<typeof SearchQuery>;

export const SearchResultItem = z.object({
  filePath: z.string(),
  startLine: z.number().int().positive(),
  endLine: z.number().int().positive(),
  content: z.string(),
  symbolName: z.string().nullable(),
  symbolType: z.string(),
  language: z.string().nullable(),
  score: z.number().min(0).max(1),
});
export type SearchResultItem = z.infer<typeof SearchResultItem>;

export const SearchResponse = z.object({
  query: z.string(),
  totalResults: z.number().int().nonnegative(),
  results: z.array(SearchResultItem),
});
export type SearchResponse = z.infer<typeof SearchResponse>;

// ---------------------------------------------------------------------------
// Semantic Search Service
// ---------------------------------------------------------------------------

export class SemanticSearch {
  constructor(
    private readonly repo: IndexerRepository,
    private readonly embedder: EmbeddingClient,
  ) {}

  /**
   * Perform a semantic search over indexed code chunks.
   *
   * 1. Generate an embedding for the natural language query
   * 2. Use pgvector cosine similarity to find closest chunks
   * 3. Apply post-retrieval filters (file path, symbol type)
   * 4. Return ranked results above the minimum score threshold
   */
  async search(connectionId: string, query: SearchQuery): Promise<SearchResponse> {
    const parsed = SearchQuery.parse(query);

    // Generate query embedding
    const [queryEmbedding] = await this.embedder.embed([parsed.query]);

    // Retrieve candidates from vector store (fetch more than needed for filtering)
    const fetchLimit = parsed.limit * 3;
    const rawResults = await this.repo.searchByEmbedding(
      connectionId,
      queryEmbedding,
      fetchLimit,
      parsed.language,
    );

    // Apply post-retrieval filters
    let filtered = rawResults.filter((r) => r.score >= parsed.minScore);

    if (parsed.filePathPattern) {
      const pattern = globToRegex(parsed.filePathPattern);
      filtered = filtered.filter((r) => pattern.test(r.filePath));
    }

    if (parsed.symbolType) {
      filtered = filtered.filter((r) => r.chunk.chunkType === parsed.symbolType);
    }

    // Take top N results
    const topResults = filtered.slice(0, parsed.limit);

    return {
      query: parsed.query,
      totalResults: topResults.length,
      results: topResults.map((r) => ({
        filePath: r.filePath,
        startLine: r.chunk.startLine,
        endLine: r.chunk.endLine,
        content: r.chunk.content,
        symbolName: r.chunk.name,
        symbolType: r.chunk.chunkType,
        language: null,
        score: r.score,
      })),
    };
  }

  /**
   * Find code related to a specific file and line range.
   * Useful for finding similar implementations or related code.
   */
  async findRelated(
    connectionId: string,
    content: string,
    limit: number = 5,
  ): Promise<SearchResponse> {
    const [embedding] = await this.embedder.embed([content]);
    const results = await this.repo.searchByEmbedding(connectionId, embedding, limit);

    return {
      query: `[related code search]`,
      totalResults: results.length,
      results: results.map((r) => ({
        filePath: r.filePath,
        startLine: r.chunk.startLine,
        endLine: r.chunk.endLine,
        content: r.chunk.content,
        symbolName: r.chunk.name,
        symbolType: r.chunk.chunkType,
        language: null,
        score: r.score,
      })),
    };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Convert a simple glob pattern to a regex.
 * Supports * (any chars except /) and ** (any chars including /).
 */
function globToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '{{GLOBSTAR}}')
    .replace(/\*/g, '[^/]*')
    .replace(/{{GLOBSTAR}}/g, '.*');
  return new RegExp(`^${escaped}$`);
}
