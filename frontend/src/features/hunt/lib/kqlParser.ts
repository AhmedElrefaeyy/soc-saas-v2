// Recursive-descent KQL (Kusto Query Language subset) parser
// Supports: field:value, field>value, field<value, AND/OR, NOT, parentheses, *wildcards*

export type KQLNode =
  | { type: "field_match";  field: string; op: ":" | ">" | "<" | ">=" | "<=" | "="; value: string }
  | { type: "and";          left: KQLNode; right: KQLNode }
  | { type: "or";           left: KQLNode; right: KQLNode }
  | { type: "not";          operand: KQLNode }
  | { type: "free_text";    value: string }
  | { type: "error";        message: string; position: number };

export interface KQLParseResult {
  ast: KQLNode | null;
  errors: Array<{ message: string; position: number }>;
  tokens: Token[];
}

// ─── Tokenizer ────────────────────────────────────────────────────────────────

type TokenType =
  | "WORD" | "QUOTED" | "FIELD_OP" | "AND" | "OR" | "NOT"
  | "LPAREN" | "RPAREN" | "EOF" | "ERROR";

interface Token {
  type: TokenType;
  value: string;
  position: number;
}

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    // Skip whitespace
    if (/\s/.test(input[i])) { i++; continue; }

    // Quoted string
    if (input[i] === '"' || input[i] === "'") {
      const q = input[i];
      const start = i++;
      while (i < input.length && input[i] !== q) {
        if (input[i] === "\\") i++;
        i++;
      }
      tokens.push({ type: "QUOTED", value: input.slice(start + 1, i), position: start });
      if (i < input.length) i++; // closing quote
      continue;
    }

    // Parens
    if (input[i] === "(") { tokens.push({ type: "LPAREN",  value: "(", position: i++ }); continue; }
    if (input[i] === ")") { tokens.push({ type: "RPAREN",  value: ")", position: i++ }); continue; }

    // Multi-char operators
    if (input[i] === ">" && input[i + 1] === "=") { tokens.push({ type: "FIELD_OP", value: ">=", position: i }); i += 2; continue; }
    if (input[i] === "<" && input[i + 1] === "=") { tokens.push({ type: "FIELD_OP", value: "<=", position: i }); i += 2; continue; }
    if (input[i] === ">") { tokens.push({ type: "FIELD_OP", value: ">", position: i++ }); continue; }
    if (input[i] === "<") { tokens.push({ type: "FIELD_OP", value: "<", position: i++ }); continue; }

    // Word — could be AND/OR/NOT or field:value
    if (/[A-Za-z0-9_.*\-/]/.test(input[i])) {
      const start = i;
      while (i < input.length && /[A-Za-z0-9_.*\-/:=@![\]{}]/.test(input[i])) i++;
      const word = input.slice(start, i);

      // Detect field:value in a single token like "host:foo"
      const colonIdx = word.indexOf(":");
      if (colonIdx > 0 && colonIdx < word.length - 1) {
        tokens.push({ type: "WORD",     value: word.slice(0, colonIdx), position: start });
        tokens.push({ type: "FIELD_OP", value: ":",                     position: start + colonIdx });
        tokens.push({ type: "WORD",     value: word.slice(colonIdx + 1), position: start + colonIdx + 1 });
        continue;
      }

      if (word === ":") { tokens.push({ type: "FIELD_OP", value: ":", position: start }); continue; }
      if (word === "=") { tokens.push({ type: "FIELD_OP", value: "=", position: start }); continue; }

      const upper = word.toUpperCase();
      if (upper === "AND") { tokens.push({ type: "AND", value: word, position: start }); continue; }
      if (upper === "OR")  { tokens.push({ type: "OR",  value: word, position: start }); continue; }
      if (upper === "NOT") { tokens.push({ type: "NOT", value: word, position: start }); continue; }

      tokens.push({ type: "WORD", value: word, position: start });
      continue;
    }

    tokens.push({ type: "ERROR", value: input[i], position: i++ });
  }

  tokens.push({ type: "EOF", value: "", position: i });
  return tokens;
}

// ─── Parser ───────────────────────────────────────────────────────────────────

class Parser {
  private pos = 0;
  readonly errors: Array<{ message: string; position: number }> = [];

  constructor(private tokens: Token[]) {}

  private peek(): Token { return this.tokens[this.pos] ?? { type: "EOF", value: "", position: 0 }; }
  private advance(): Token { return this.tokens[this.pos++] ?? { type: "EOF", value: "", position: 0 }; }

  parse(): KQLNode | null {
    if (this.peek().type === "EOF") return null;
    const node = this.parseOr();
    return node;
  }

  private parseOr(): KQLNode {
    let left = this.parseAnd();
    while (this.peek().type === "OR") {
      this.advance();
      const right = this.parseAnd();
      left = { type: "or", left, right };
    }
    return left;
  }

  private parseAnd(): KQLNode {
    let left = this.parseUnary();
    while (this.peek().type === "AND" || (this.peek().type === "WORD" || this.peek().type === "NOT" || this.peek().type === "LPAREN" || this.peek().type === "QUOTED")) {
      if (this.peek().type !== "AND" && this.peek().type !== "WORD" && this.peek().type !== "NOT" && this.peek().type !== "LPAREN" && this.peek().type !== "QUOTED") break;
      if (this.peek().type === "AND") this.advance();
      const right = this.parseUnary();
      left = { type: "and", left, right };
    }
    return left;
  }

  private parseUnary(): KQLNode {
    if (this.peek().type === "NOT") {
      this.advance();
      const operand = this.parsePrimary();
      return { type: "not", operand };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): KQLNode {
    const tok = this.peek();

    if (tok.type === "LPAREN") {
      this.advance();
      const inner = this.parseOr();
      if (this.peek().type === "RPAREN") this.advance();
      else this.errors.push({ message: "Expected closing parenthesis", position: this.peek().position });
      return inner;
    }

    if (tok.type === "QUOTED") {
      this.advance();
      return { type: "free_text", value: tok.value };
    }

    if (tok.type === "WORD") {
      const fieldTok = this.advance();
      const opTok = this.peek();

      if (opTok.type === "FIELD_OP") {
        this.advance();
        const valTok = this.peek();
        let value = "";
        if (valTok.type === "WORD" || valTok.type === "QUOTED") {
          value = this.advance().value;
        } else {
          this.errors.push({ message: `Expected value after '${opTok.value}'`, position: opTok.position });
        }
        return {
          type: "field_match",
          field: fieldTok.value,
          op: opTok.value as KQLNode & { type: "field_match" } extends { op: infer O } ? O : never,
          value,
        };
      }

      return { type: "free_text", value: fieldTok.value };
    }

    if (tok.type === "EOF") {
      return { type: "free_text", value: "" };
    }

    this.advance();
    this.errors.push({ message: `Unexpected token '${tok.value}'`, position: tok.position });
    return { type: "error", message: `Unexpected token '${tok.value}'`, position: tok.position };
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function parseKQL(input: string): KQLParseResult {
  const tokens  = tokenize(input);
  const parser  = new Parser(tokens);
  const ast     = parser.parse();
  return { ast, errors: parser.errors, tokens };
}

// Convert AST to simple filter object for the backend
export function kqlToFilters(ast: KQLNode | null): Array<{ field: string; op: string; value: string }> {
  if (!ast) return [];

  const filters: Array<{ field: string; op: string; value: string }> = [];

  function walk(node: KQLNode) {
    if (node.type === "field_match") {
      filters.push({ field: node.field, op: node.op, value: node.value });
    } else if (node.type === "and" || node.type === "or") {
      walk(node.left);
      walk(node.right);
    } else if (node.type === "not") {
      walk(node.operand);
    }
  }

  walk(ast);
  return filters;
}
