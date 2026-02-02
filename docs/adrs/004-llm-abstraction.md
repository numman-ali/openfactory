# ADR-004: LLM Abstraction Layer

**Status:** Proposed
**Date:** 2026-02-02

## Context

OpenFactory uses AI agents across all modules (Refinery, Foundry, Planner, Validator). The platform must support multiple LLM providers (OpenAI, Anthropic, Google, local models via Ollama) and provide streaming responses, structured output, and tool calling.

Options considered:
1. **Vercel AI SDK** - TypeScript-native, unified API, streaming, structured output, tool calling, agent framework
2. **LiteLLM** - Python-based proxy with OpenAI-compatible API, 100+ model support
3. **Bifrost** - Go-based proxy, 54x faster than LiteLLM
4. **Custom adapter layer** - Build our own abstraction
5. **Direct provider SDKs** - Use OpenAI SDK, Anthropic SDK, etc. directly

## Decision

Use the **Vercel AI SDK (v6)** as the LLM abstraction layer.

## Consequences

**Positive:**
- TypeScript-native (matches our entire stack; no separate Python/Go service)
- Unified API across all major providers: OpenAI, Anthropic, Google, Mistral, Ollama, and more
- Built-in streaming with React integration (SSE from API to frontend)
- Structured output generation using Zod schemas (type-safe agent responses)
- `ToolLoopAgent` for production-ready agent orchestration with tool calling
- Human-in-the-loop tool approval (matches our agent-suggests-human-approves pattern)
- DevTools for debugging agent interactions
- Free and open source (MIT license)
- 50-70% faster development vs. custom implementations
- Massive adoption in the Next.js/React ecosystem
- Provider-specific features (vision, embeddings) available through the unified API

**Negative:**
- Tight coupling to the Vercel ecosystem (though the SDK is MIT-licensed and framework-agnostic)
- Less control over low-level provider interactions compared to direct SDK usage
- Provider support depends on community/Vercel maintaining provider packages
- No built-in rate limiting or cost tracking (unlike LiteLLM proxy)

**Why not LiteLLM?**
LiteLLM is Python-based, requiring a separate service in our all-TypeScript stack. It adds deployment complexity and a network hop. The Vercel AI SDK provides the same provider abstraction natively in TypeScript with superior streaming and structured output support.

**Why not Bifrost?**
Bifrost is a Go-based proxy optimized for raw throughput. Our bottleneck is LLM response latency (seconds), not proxy overhead (microseconds). The additional infrastructure component is not justified.

**Architecture:**

```
Frontend (React) <-- SSE stream --> API (Fastify)
                                      |
                                      v
                                AI SDK (unified API)
                                      |
                          +-----------+-----------+
                          |           |           |
                        OpenAI   Anthropic    Ollama
```

**Rate Limiting & Cost Tracking:**
Since the AI SDK doesn't include a proxy-level rate limiter, implement:
- BullMQ rate-limited queues for LLM calls
- Token usage tracking in the `agent_messages` table (input_tokens, output_tokens, model)
- Per-organization usage limits configurable in org settings

**Self-Hosted LLM Support:**
Users running Ollama or other local models configure the provider in environment variables. The AI SDK's Ollama provider handles this transparently.
