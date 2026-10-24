/**
 * The TYPE contract for SQL-feature compatibility between PostgreSQL-dialect
 * migrations and a database provider.
 *
 * Resource and template setup migrations are authored in PostgreSQL dialect and
 * every database bond applies them after its own translation. Some constructs do
 * not merely need different syntax — they carry behaviour a provider cannot
 * reproduce at all: an `ON DELETE`/`ON UPDATE` referential action (`CASCADE`,
 * `SET NULL`, `SET DEFAULT`) and a UNIQUE partial index. Silently dropping either
 * changes what the database enforces (a cascade becomes a refusing delete; a
 * partial uniqueness rule becomes global).
 *
 * The contract is two-sided and typed:
 *
 * - A provider declares what it can do in a {@link SqlCapabilities} map exported
 *   from its own source (and mirrored into its `mlcl/registry.json` entry, so the
 *   compiler can read it without installing the provider).
 * - A producer that needs to decide whether a selection can run its SQL reports
 *   the constructs it finds as {@link SqlRequirement}s and the ones the provider
 *   cannot honour as {@link SqlCompatibilityIssue}s.
 *
 * This module is the VOCABULARY only: interfaces and types describing the
 * declaration, the requirement and the diagnostic. The SQL lexing and analysis
 * that produce them is compilation work, and it lives in the compiler that does
 * the generating (`mlcl/src/lib/sql-requirements.ts`) and in the bond that
 * translates or refuses at runtime — never here. A core package contains
 * contracts and accessors only (molecule AGENTS.md Rule 4).
 *
 * @module
 */

/**
 * A PostgreSQL-dialect SQL construct whose SEMANTICS a database engine may not
 * be able to reproduce.
 *
 * Syntax-only differences (type names, cast syntax, index access methods) are
 * not in this union: every bond translates those without changing behaviour.
 */
export type SqlFeature =
  /** `ON DELETE`/`ON UPDATE` `CASCADE`, `SET NULL` or `SET DEFAULT` on a foreign key. */
  | 'fk-referential-action'
  /** `CREATE INDEX ... WHERE <predicate>` — a non-unique partial index. */
  | 'partial-index'
  /** `CREATE UNIQUE INDEX ... WHERE <predicate>` — a UNIQUE partial index. */
  | 'unique-partial-index'

/**
 * How a provider handles a {@link SqlFeature}:
 *
 * - `native` — the engine accepts the construct and enforces it as written.
 * - `translated` — the bond rewrites the construct into an equivalent one that
 *   preserves the observable behaviour (query results, constraint enforcement).
 * - `unsupported` — the bond cannot preserve the behaviour; an app that needs
 *   this construct must select a different database provider.
 */
export type SqlSupport = 'native' | 'translated' | 'unsupported'

/**
 * One provider's declaration for one feature.
 */
export interface SqlCapability {
  /** How the provider handles the construct. */
  support: SqlSupport
  /**
   * One short sentence, in the provider's own words, describing what happens to
   * the construct. A `translated` note says what the equivalent is; an
   * `unsupported` note says what cannot be reproduced and what to use instead.
   */
  note?: string
}

/**
 * A database provider's SQL capability map.
 *
 * Partial on purpose: a provider that predates a feature leaves the key out and
 * a consumer must treat that as missing metadata rather than as support.
 */
export type SqlCapabilities = Partial<Record<SqlFeature, SqlCapability>>

/**
 * One construct a migration requires.
 */
export interface SqlRequirement {
  /** The construct's feature. */
  feature: SqlFeature
  /** The exact construct, e.g. `ON DELETE CASCADE` or `WHERE "isDefault" = true`. */
  detail: string
  /** The statement that carries it, trimmed, for diagnostics. */
  statement: string
  /** Where the statement came from (a file name or `<package>:<file>`), when known. */
  source?: string
}

/**
 * The kind of problem a compatibility check found.
 */
export type SqlCompatibilityIssueKind =
  /** The provider marks the feature `unsupported`. */
  | 'unsupported'
  /** The provider's capability map has no entry for the feature. */
  | 'missing-capability'

/**
 * One reason a requirement cannot be honoured.
 *
 * A plain, discriminated diagnostic: producers build it, and a bond wraps it in
 * its own error class rather than importing error construction from this core.
 */
export interface SqlCompatibilityIssue {
  /** Why it cannot be honoured. */
  kind: SqlCompatibilityIssueKind
  /** The construct's feature. */
  feature: SqlFeature
  /** The exact construct found in the migration. */
  detail: string
  /** The statement that carries it. */
  statement: string
  /** Where the statement came from, when known. */
  source?: string
  /** A ready-to-show sentence naming the provider, the construct and the reason. */
  message: string
}

/**
 * Options for a compatibility check.
 */
export interface SqlCompatibilityOptions {
  /** Display name of the database provider, e.g. `DuckDB`. */
  provider?: string
  /** Where the SQL came from, e.g. `api-resource-comment:src/__setup__/comments.sql`. */
  source?: string
}
