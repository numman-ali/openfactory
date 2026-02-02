/**
 * OpenFactory - Tree-sitter Code Parser
 * SPDX-License-Identifier: AGPL-3.0
 *
 * Parses source code into semantic chunks (functions, classes, methods)
 * using tree-sitter for AST analysis. Chunks are sized for embedding quality.
 */

import type { CodeChunk, CodeParser } from './index.js';

// ---------------------------------------------------------------------------
// tree-sitter imports (dynamic to avoid bundling native bindings)
// ---------------------------------------------------------------------------

type SitterParser = {
  setLanguage(lang: unknown): void;
  parse(input: string): { rootNode: SitterNode };
};

type SitterNode = {
  type: string;
  text: string;
  startPosition: { row: number; column: number };
  endPosition: { row: number; column: number };
  children: SitterNode[];
  childForFieldName(name: string): SitterNode | null;
  namedChildren: SitterNode[];
};

// ---------------------------------------------------------------------------
// Language Configuration
// ---------------------------------------------------------------------------

interface LanguageConfig {
  /** tree-sitter grammar package name */
  grammar: string;
  /** AST node types that represent top-level declarations */
  topLevelTypes: string[];
  /** AST node types for class members / methods */
  memberTypes: string[];
  /** How to extract the name from a node */
  nameField: string;
}

const LANGUAGE_CONFIGS: Record<string, LanguageConfig> = {
  typescript: {
    grammar: 'tree-sitter-typescript/typescript',
    topLevelTypes: ['function_declaration', 'lexical_declaration', 'export_statement', 'class_declaration', 'interface_declaration', 'type_alias_declaration', 'enum_declaration'],
    memberTypes: ['method_definition', 'public_field_definition'],
    nameField: 'name',
  },
  tsx: {
    grammar: 'tree-sitter-typescript/tsx',
    topLevelTypes: ['function_declaration', 'lexical_declaration', 'export_statement', 'class_declaration', 'interface_declaration', 'type_alias_declaration', 'enum_declaration'],
    memberTypes: ['method_definition', 'public_field_definition'],
    nameField: 'name',
  },
  javascript: {
    grammar: 'tree-sitter-javascript',
    topLevelTypes: ['function_declaration', 'lexical_declaration', 'export_statement', 'class_declaration'],
    memberTypes: ['method_definition', 'field_definition'],
    nameField: 'name',
  },
  python: {
    grammar: 'tree-sitter-python',
    topLevelTypes: ['function_definition', 'class_definition', 'decorated_definition'],
    memberTypes: ['function_definition'],
    nameField: 'name',
  },
};

// Max chunk size in characters — keeps embeddings focused
const MAX_CHUNK_SIZE = 4000;
// Minimum chunk size — skip trivial declarations
const MIN_CHUNK_SIZE = 50;

// ---------------------------------------------------------------------------
// Parser Factory
// ---------------------------------------------------------------------------

/**
 * Creates a CodeParser backed by tree-sitter.
 * Lazily loads grammars on first use per language.
 */
export function createTreeSitterParser(): CodeParser {
  const parserCache = new Map<string, SitterParser>();
  const grammarCache = new Map<string, unknown>();

  async function getParser(language: string): Promise<SitterParser | null> {
    if (parserCache.has(language)) return parserCache.get(language)!;

    const config = LANGUAGE_CONFIGS[language];
    if (!config) return null;

    try {
      const TreeSitter = await import('tree-sitter');
      const Parser = TreeSitter.default ?? TreeSitter;

      let grammar = grammarCache.get(language);
      if (!grammar) {
        const mod = await import(config.grammar);
        grammar = mod.default ?? mod;
        grammarCache.set(language, grammar);
      }

      const parser = new Parser() as SitterParser;
      parser.setLanguage(grammar);
      parserCache.set(language, parser);
      return parser;
    } catch {
      // Grammar not installed — fall back to line-based chunking
      return null;
    }
  }

  return {
    parse(content: string, language: string): CodeChunk[] {
      const config = LANGUAGE_CONFIGS[language];
      if (!config) return fallbackChunk(content);

      // tree-sitter parse is synchronous once the grammar is loaded
      const cached = parserCache.get(language);
      if (!cached) {
        // Trigger async load for next call, return fallback for now
        void getParser(language);
        return fallbackChunk(content);
      }

      const tree = cached.parse(content);
      const chunks: CodeChunk[] = [];

      extractChunks(tree.rootNode, config, chunks, '');

      // If tree-sitter found nothing meaningful, fall back to line-based
      if (chunks.length === 0) return fallbackChunk(content);

      return chunks;
    },

    detectLanguage(filePath: string): string | null {
      const ext = filePath.substring(filePath.lastIndexOf('.'));
      const LANG_MAP: Record<string, string> = {
        '.ts': 'typescript', '.tsx': 'tsx', '.js': 'javascript', '.jsx': 'javascript',
        '.mjs': 'javascript', '.cjs': 'javascript',
        '.py': 'python',
      };
      return LANG_MAP[ext] ?? null;
    },
  };
}

// ---------------------------------------------------------------------------
// AST Extraction
// ---------------------------------------------------------------------------

function extractChunks(
  node: SitterNode,
  config: LanguageConfig,
  chunks: CodeChunk[],
  fileId: string
): void {
  for (const child of node.children) {
    // Handle export wrappers: extract the declaration inside
    if (child.type === 'export_statement') {
      const declaration = child.namedChildren.find((n) =>
        config.topLevelTypes.includes(n.type) || n.type === 'class_declaration'
      );
      if (declaration) {
        addChunk(declaration, config, chunks, fileId);
        continue;
      }
    }

    if (config.topLevelTypes.includes(child.type)) {
      addChunk(child, config, chunks, fileId);
    } else if (child.type === 'class_declaration' || child.type === 'class_definition') {
      // Add the class as a whole chunk if small enough; otherwise chunk its members
      addClassChunks(child, config, chunks, fileId);
    }
  }
}

function addChunk(
  node: SitterNode,
  config: LanguageConfig,
  chunks: CodeChunk[],
  fileId: string
): void {
  const text = node.text;
  if (text.length < MIN_CHUNK_SIZE) return;

  const name = extractName(node, config.nameField);
  const chunkType = resolveChunkType(node.type);

  if (text.length <= MAX_CHUNK_SIZE) {
    chunks.push({
      fileId,
      filePath: '',
      chunkType,
      name,
      startLine: node.startPosition.row + 1,
      endLine: node.endPosition.row + 1,
      content: text,
    });
  } else {
    // Split oversized nodes into sub-chunks by their children
    for (const child of node.namedChildren) {
      if (child.text.length >= MIN_CHUNK_SIZE) {
        addChunk(child, config, chunks, fileId);
      }
    }
  }
}

function addClassChunks(
  node: SitterNode,
  config: LanguageConfig,
  chunks: CodeChunk[],
  fileId: string
): void {
  const className = extractName(node, config.nameField);

  if (node.text.length <= MAX_CHUNK_SIZE) {
    chunks.push({
      fileId,
      filePath: '',
      chunkType: 'class',
      name: className,
      startLine: node.startPosition.row + 1,
      endLine: node.endPosition.row + 1,
      content: node.text,
    });
    return;
  }

  // Class is too large — chunk each member
  for (const child of node.namedChildren) {
    if (config.memberTypes.includes(child.type)) {
      const memberName = extractName(child, config.nameField);
      const qualifiedName = className ? `${className}.${memberName ?? ''}` : memberName;
      if (child.text.length < MIN_CHUNK_SIZE) continue;

      chunks.push({
        fileId,
        filePath: '',
        chunkType: 'method',
        name: qualifiedName,
        startLine: child.startPosition.row + 1,
        endLine: child.endPosition.row + 1,
        content: child.text,
      });
    }
  }
}

function extractName(node: SitterNode, nameField: string): string | null {
  const nameNode = node.childForFieldName(nameField);
  return nameNode?.text ?? null;
}

function resolveChunkType(nodeType: string): CodeChunk['chunkType'] {
  if (nodeType.includes('function') || nodeType === 'lexical_declaration') return 'function';
  if (nodeType.includes('class')) return 'class';
  if (nodeType.includes('method')) return 'method';
  if (nodeType.includes('import') || nodeType.includes('export')) return 'import';
  return 'block';
}

// ---------------------------------------------------------------------------
// Fallback Chunking (line-based)
// ---------------------------------------------------------------------------

/**
 * When tree-sitter grammars are unavailable, chunk by line groups.
 * Groups ~80 lines per chunk with overlap.
 */
function fallbackChunk(content: string): CodeChunk[] {
  const lines = content.split('\n');
  const chunks: CodeChunk[] = [];
  const chunkLines = 80;
  const overlap = 10;

  for (let start = 0; start < lines.length; start += chunkLines - overlap) {
    const end = Math.min(start + chunkLines, lines.length);
    const chunkContent = lines.slice(start, end).join('\n');
    if (chunkContent.trim().length < MIN_CHUNK_SIZE) continue;

    chunks.push({
      fileId: '',
      filePath: '',
      chunkType: 'block',
      name: null,
      startLine: start + 1,
      endLine: end,
      content: chunkContent,
    });
  }

  return chunks;
}
