/**
 * Serializes GitHub Actions workflow configurations to YAML strings.
 *
 * @module
 */

import type { WorkflowConfig } from './workflows/index.js'

/**
 * Serializes a workflow configuration object to a YAML string suitable
 * for writing to `.github/workflows/*.yml`.
 *
 * @param config - The workflow configuration to serialize.
 * @returns The YAML string representation of the workflow.
 */
export const toYAML = (config: WorkflowConfig): string => {
  return stringify(config, 0)
}

/**
 * Determines whether a single-line string must be quoted so a YAML 1.2 parser
 * reads it back as the SAME string. Beyond obviously-special characters, this
 * covers the classes that silently change type or break parsing when left
 * plain: leading indicator characters (`*` aliases — think cron `* * * * *`
 * or branch glob `**`), numeric-looking strings (`'20.10'` would parse as the
 * float `20.1` and install the wrong Node version), boolean/null words in any
 * YAML-recognized casing, and leading/trailing whitespace (silently trimmed).
 *
 * @param value - The single-line string to test.
 * @returns `true` if the string must be single-quoted.
 */
const needsQuote = (value: string): boolean => {
  if (value === '') return true
  // Leading/trailing whitespace would be silently trimmed by the parser.
  if (value !== value.trim()) return true
  if (value.includes(':') || value.includes('#') || value.includes("'") || value.includes('"')) {
    return true
  }
  // Leading YAML indicator characters (alias/anchor/tag/flow/comment/block/
  // directive/reserved) make a plain scalar invalid or change its meaning.
  if (/^[$[\]{},&*!|>%@`]/.test(value)) return true
  // A leading `- ` / `? ` (or a lone `-`/`?`) reads as a block indicator.
  if (/^[-?]( |$)/.test(value)) return true
  // Boolean/null words in any YAML-recognized casing would change type.
  if (/^(true|false|null|yes|no|on|off)$/i.test(value) || value === '~') return true
  // Numeric-looking strings would change type ('20.10' → 20.1, '20' → 20).
  if (/^[-+]?([0-9][0-9_]*(\.[0-9_]*)?|\.[0-9_]+)([eE][-+]?[0-9]+)?$/.test(value)) return true
  // Hex/octal/binary literal forms ('0x1A', '0o17', '0b101') also type-flip.
  if (/^[-+]?0[xXoObB][0-9a-fA-F_]+$/.test(value)) return true
  if (/^[-+]?\.(inf|Inf|INF)$/.test(value) || /^\.(nan|NaN|NAN)$/.test(value)) return true
  return false
}

/**
 * Serializes a string value. Multi-line strings (e.g. multi-line `run`
 * scripts) become literal block scalars (`|` / `|-`) so newlines survive the
 * round-trip — a single-quoted scalar with raw newlines is either invalid
 * YAML or folds the lines into spaces, silently joining shell commands.
 * Strings a block scalar cannot represent faithfully (trailing blank lines,
 * lines with trailing whitespace, a leading-indented first line, control
 * characters) fall back to double-quoted flow style via JSON escaping, which
 * is valid YAML.
 *
 * @param value - The string to serialize.
 * @param indent - Indentation depth (2-space levels) for block scalar content.
 * @returns The YAML scalar fragment.
 */
const stringifyString = (value: string, indent: number): string => {
  if (value.includes('\n')) {
    if (
      /^[ \t]/.test(value) || // leading-indented first line breaks indent detection
      /[ \t](\n|$)/.test(value) || // trailing whitespace on any line
      /\n{2,}$/.test(value) || // multiple trailing newlines need keep-chomping
      // eslint-disable-next-line no-control-regex -- control chars are the condition being tested
      /[\u0000-\u0008\u000B-\u001F\u007F]/.test(value) // control chars are invalid in block scalars
    ) {
      return JSON.stringify(value)
    }
    const spaces = '  '.repeat(indent)
    const header = value.endsWith('\n') ? '|' : '|-'
    const body = (value.endsWith('\n') ? value.slice(0, -1) : value)
      .split('\n')
      .map((line) => (line === '' ? '' : spaces + line))
      .join('\n')
    return `${header}\n${body}`
  }
  if (needsQuote(value)) {
    // Use single quotes and escape internal single quotes
    return `'${value.replace(/'/g, "''")}'`
  }
  return value
}

/**
 * Recursively serializes a JavaScript value to YAML format with proper
 * indentation, quoting, and array/object formatting. `undefined` object
 * values are omitted (JSON semantics); empty objects render inline as `{}`;
 * nested indentation inside array items is preserved (a step's `with:` keys
 * stay children of `with:`, never siblings of the step).
 *
 * @param value - The value to serialize (string, number, boolean, array, or object).
 * @param indent - The current indentation depth (number of 2-space levels).
 * @returns The YAML string fragment for this value.
 */
const stringify = (value: unknown, indent: number): string => {
  const spaces = '  '.repeat(indent)

  if (value === null || value === undefined) {
    return 'null'
  }

  if (typeof value === 'boolean') {
    return value.toString()
  }

  if (typeof value === 'number') {
    return value.toString()
  }

  if (typeof value === 'string') {
    return stringifyString(value, indent)
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return '[]'

    // Check if it's a simple array (all primitives, none multi-line)
    const isSimple = value.every(
      (v) => typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean',
    )
    const hasMultiline = value.some((v) => typeof v === 'string' && v.includes('\n'))

    if (isSimple && value.length <= 3 && !hasMultiline) {
      return `[${value.map((v) => stringify(v, 0)).join(', ')}]`
    }

    // Items are rendered at indent + 1; when re-anchoring an object item's
    // first key onto the dash line, subsequent lines must keep their depth
    // RELATIVE to the item (trimming them flattens nested blocks like a
    // step's `with:` mapping into siblings of the step).
    const itemBase = '  '.repeat(indent + 1)
    return value
      .map((v) => {
        const str = stringify(v, indent + 1)
        if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
          // Object in array - first key on same line as dash
          const lines = str.split('\n')
          const rest = lines
            .slice(1)
            .map((l) =>
              l.trim() === ''
                ? ''
                : spaces + '  ' + (l.startsWith(itemBase) ? l.slice(itemBase.length) : l.trim()),
            )
            .join('\n')
          return rest === ''
            ? `${spaces}- ${lines[0].trim()}`
            : `${spaces}- ${lines[0].trim()}\n${rest}`
        }
        return `${spaces}- ${str}`
      })
      .join('\n')
  }

  if (typeof value === 'object') {
    // Omit undefined values (JSON semantics) — `with: undefined` must not
    // serialize as `with: null`.
    const entries = Object.entries(value as Record<string, unknown>).filter(
      ([, val]) => val !== undefined,
    )
    if (entries.length === 0) return '{}'

    return entries
      .map(([key, val]) => {
        // Handle keys with special characters
        const safeKey = key.includes('-') || key.includes(' ') ? `'${key}'` : key
        const valStr = stringify(val, indent + 1)

        if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
          // Empty objects render inline (`key: {}`) — placing `{}` on the
          // next line at parent indentation is invalid YAML.
          if (valStr === '{}') {
            return `${spaces}${safeKey}: {}`
          }
          return `${spaces}${safeKey}:\n${valStr}`
        }
        if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'object') {
          return `${spaces}${safeKey}:\n${valStr}`
        }

        return `${spaces}${safeKey}: ${valStr}`
      })
      .join('\n')
  }

  return String(value)
}

/**
 * Generates a complete workflow file with a header comment indicating it was
 * auto-generated. The output is ready to write to `.github/workflows/`.
 *
 * @param config - The workflow configuration to generate.
 * @returns The complete YAML file content including the auto-generated header.
 */
export const generateWorkflow = (config: WorkflowConfig): string => {
  // NOTE: keep this header truthful — there is no CLI command that regenerates
  // workflow files (a previous header taught a nonexistent `npx molecule ci
  // generate`). The regeneration path is programmatic: generateWorkflow().
  const header = `# Generated by @molecule/api-ci-github-actions
# Do not edit manually - regenerate with generateWorkflow() from @molecule/api-ci-github-actions

`
  return header + toYAML(config)
}

/**
 * Returns the conventional file path for a GitHub Actions workflow file.
 *
 * @param name - The workflow name (e.g. `'ci'`, `'release'`).
 * @returns The path relative to the repo root (e.g. `.github/workflows/ci.yml`).
 */
export const workflowPath = (name: string): string => `.github/workflows/${name}.yml`
