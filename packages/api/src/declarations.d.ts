/**
 * OpenFactory - Ambient Module Declarations
 * SPDX-License-Identifier: AGPL-3.0
 *
 * Type declarations for modules that lack TypeScript definitions.
 */

declare module 'tree-sitter' {
  class Parser {
    setLanguage(language: unknown): void;
    parse(input: string): { rootNode: unknown };
  }
  export default Parser;
}
