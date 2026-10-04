/**
 * Types for the Axiom logger provider.
 *
 * @module
 */

import type { AxiomIngesterOptions, AxiomShutdownOptions } from '@molecule/api-analytics-axiom'
import type { Logger, LogLevel } from '@molecule/api-logger'

/** How a log line's structured fields are stored in Axiom. */
export type AxiomLogFieldsMode = 'json' | 'object'

/** Options for {@link createLogger}. Ingest fields fall back to the `AXIOM_*` env vars. */
export interface AxiomLoggerOptions extends AxiomIngesterOptions {
  /** Where every line is ALSO written, unchanged. Defaults to the console. Pass `null` to send to Axiom only. */
  inner?: Logger | null
  /** Lowest level mirrored to Axiom (default `'info'`). Lines below it still reach `inner`. */
  level?: Exclude<LogLevel, 'silent'>
  /**
   * `'json'` (default) stores a line's fields as one JSON string field, `fields`, so arbitrary
   * keys never add dataset columns (query with `parse_json(fields)`); `'object'` stores them as a
   * nested object, one column per key.
   */
  fieldsMode?: AxiomLogFieldsMode
  /** Stamped as `service` on every line. */
  service?: string
  /** Stamped as `env`. Defaults to `$NODE_ENV`. */
  env?: string
  /** Stamped as `region`. */
  region?: string
  /** Stamped as `version`. */
  version?: string
}

/** A logger that mirrors into Axiom, with its ingester's lifecycle exposed. */
export interface AxiomLogger extends Logger {
  /** Whether a token and dataset are configured. When false lines only reach `inner`. */
  readonly enabled: boolean
  /** Send every queued line now. */
  flush(): Promise<void>
  /** Stop the flush timer and send what is left within `deadlineMs` (default 5000). */
  shutdown(options?: AxiomShutdownOptions): Promise<void>
}
