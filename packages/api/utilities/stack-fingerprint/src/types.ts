/**
 * One parsed frame from a stack trace. Whatever the source format
 * (V8 or SpiderMonkey), parsing produces this shape.
 */
export interface StackFrame {
  /**
   * Function name (or `<anonymous>` if the frame has no name —
   * e.g. arrow callbacks at top level).
   */
  function: string

  /**
   * The script / module path. May be `file://`, `node:`, a bare module
   * specifier, an HTTP(S) URL, or `<eval>` / `<anonymous>` for synthetic
   * frames. Empty string when the source format omits a file.
   */
  file: string

  /**
   * 1-based line number, or `undefined` if not present in the source.
   */
  line?: number

  /**
   * 1-based column number, or `undefined` if not present in the source.
   */
  column?: number

  /**
   * Whether the frame originated inside an `eval(...)` call. V8 marks
   * these with `at eval (eval at ...)` and SpiderMonkey with `> eval` /
   * `> Function`. Eval frames are collapsed to a single canonical token
   * during normalization so that two evals at different call sites still
   * group together.
   */
  isEval: boolean

  /**
   * Whether the frame represents a Node native / `node:` builtin module.
   */
  isNative: boolean

  /**
   * The original raw line from the stack string (whitespace-trimmed).
   * Preserved so callers can show un-normalized output to humans.
   */
  raw: string
}

/**
 * A frame that has been normalized for fingerprinting. Line / column
 * numbers and version-specific path noise have been stripped.
 */
export interface NormalizedFrame {
  /**
   * Normalized function name. `<anonymous>` for nameless frames; eval
   * frames are flattened to `<eval>`.
   */
  function: string

  /**
   * Normalized file. Tmp dirs, absolute build paths, hash suffixes and
   * version segments have been stripped. Empty string when the original
   * frame had no file.
   */
  file: string
}

/**
 * Input to {@link fingerprintError}. Mirrors the surface of a thrown
 * `Error` but allows passing the bits manually (e.g. when the error
 * arrived via JSON over the wire).
 */
export interface FingerprintInput {
  /**
   * Error message. Not included in the fingerprint by default — two
   * errors at the same call-site often differ only in interpolated
   * values (`User 17 not found` vs `User 42 not found`) and we want
   * those to group together.
   */
  message?: string

  /**
   * Multi-line stack trace as produced by `Error#stack`. The first
   * line (the message) is tolerated and stripped.
   */
  stack?: string

  /**
   * Error class name (e.g. `TypeError`, `RangeError`). Included in the
   * fingerprint by default so `TypeError` and `RangeError` at the same
   * call-site produce different groups.
   */
  type?: string
}

/**
 * Options controlling stack-frame normalization and fingerprinting.
 */
export interface FingerprintOptions {
  /**
   * Number of top frames to include in the fingerprint. Defaults to
   * `5`. Frames below this depth are ignored; this is what makes the
   * fingerprint stable across unrelated bottom-of-stack noise (e.g.
   * test runners, Node internals).
   */
  topFrames?: number

  /**
   * Custom path normalizers, applied in order after the built-ins.
   * Use these to strip project-specific noise (e.g. monorepo absolute
   * paths, content-hashed bundles) from frame `file` strings.
   *
   * Each function receives the partially-normalized path and returns
   * a further-normalized one. Returning the same string is fine.
   */
  pathNormalizers?: ((path: string) => string)[]

  /**
   * When `true` (the default), the error `type` (e.g. `TypeError`) is
   * mixed into the fingerprint. Set to `false` to group purely by stack
   * shape regardless of class.
   */
  includeType?: boolean

  /**
   * When `true`, the error `message` is mixed into the fingerprint.
   * Defaults to `false` so dynamic messages don't fragment groups.
   */
  includeMessage?: boolean
}

/**
 * Result of {@link groupErrors} — one entry per fingerprint, with the
 * count and a representative sample preserved.
 */
export interface ErrorGroup<T extends FingerprintInput = FingerprintInput> {
  /**
   * SHA-1 hex fingerprint shared by every error in this group.
   */
  fingerprint: string

  /**
   * Number of errors in the group.
   */
  count: number

  /**
   * The first error encountered for this fingerprint — useful as a
   * UI-facing exemplar.
   */
  sampleError: T
}
