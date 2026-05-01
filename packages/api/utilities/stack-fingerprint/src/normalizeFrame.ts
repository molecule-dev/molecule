import type { FingerprintOptions, NormalizedFrame, StackFrame } from './types.js'

/**
 * Default path normalizers — applied in order to a frame's `file`
 * string. Each turns one variety of build / version / OS-specific
 * noise into a canonical shape so the same logical call-site produces
 * the same fingerprint across machines.
 */
const BUILT_IN_NORMALIZERS: ((path: string) => string)[] = [
  // Strip `file://` URL scheme (V8 emits these for ESM).
  (p) => p.replace(/^file:\/\//, ''),

  // Normalize Windows path separators to `/`.
  (p) => p.replace(/\\/g, '/'),

  // Strip Windows drive letters (`C:/Users/...` → `/Users/...`).
  (p) => p.replace(/^[A-Za-z]:\//, '/'),

  // Strip macOS / Linux tmp directories that change every run:
  //   /tmp/xxxxx/, /var/folders/.../T/xxxxx/, /private/var/...
  (p) => p.replace(/^\/private\/var\/folders\/[^/]+\/[^/]+\/T\//, '/tmp/'),
  (p) => p.replace(/^\/var\/folders\/[^/]+\/[^/]+\/T\//, '/tmp/'),

  // Strip absolute prefixes up to a recognizable project marker so the
  // same repo at /Users/alice/proj and /home/bob/proj fingerprints the
  // same. node_modules takes priority — within a node_modules tree we
  // want the package name + internal path, NOT a /lib/ collapse that
  // would erase the package identity.
  (p) => {
    const nm = p.lastIndexOf('/node_modules/')
    if (nm !== -1) {
      return p.slice(nm + 1) // keep `node_modules/...`
    }
    const markers = ['/src/', '/dist/', '/lib/', '/build/', '/app/']
    for (const marker of markers) {
      const idx = p.lastIndexOf(marker)
      if (idx !== -1) {
        return p.slice(idx + 1) // keep `src/...`
      }
    }
    return p
  },

  // Strip content hashes embedded by bundlers:
  //   foo.abc123def.js → foo.js
  //   foo-abc123def4567890.js → foo.js
  //   foo.chunk.abcdef.js → foo.chunk.js
  (p) => p.replace(/\.[a-f0-9]{6,32}(\.[a-z]+)$/i, '$1'),
  (p) => p.replace(/-[a-f0-9]{6,32}(\.[a-z]+)$/i, '$1'),

  // Strip query strings (Vite dev: `?t=12345`, `?import`, etc.)
  (p) => p.replace(/\?.*$/, ''),

  // Strip trailing version/timestamp segments on `node_modules/foo@1.2.3/...`
  (p) => p.replace(/(@[a-z0-9-]+\/[a-z0-9-]+|[a-z0-9-]+)@[\w.+-]+\//gi, '$1/'),
]

/**
 * Normalize a single parsed frame for fingerprinting. Strips line and
 * column numbers, applies built-in path normalizers, then any custom
 * normalizers from {@link FingerprintOptions.pathNormalizers}.
 *
 * Eval frames collapse to `function='<eval>'`, `file='<eval>'` so two
 * evals at different positions still group together. Unknown frames
 * (parser fall-through) keep their raw text so they still contribute
 * deterministically.
 *
 * @param frame - Parsed frame from {@link parseStackFrames}.
 * @param options - Fingerprint options. Only
 *   {@link FingerprintOptions.pathNormalizers} is read here.
 * @returns Frame with `function` + normalized `file` only — line and
 *   column are intentionally omitted.
 */
export const normalizeFrame = (
  frame: StackFrame,
  options: FingerprintOptions = {},
): NormalizedFrame => {
  if (frame.isEval) {
    return { function: '<eval>', file: '<eval>' }
  }

  if (frame.function === '<unknown>') {
    // Unparseable — fingerprint the raw text minus volatile bits.
    return { function: '<unknown>', file: applyAllNormalizers(frame.raw, options) }
  }

  return {
    function: normalizeFunctionName(frame.function),
    file: applyAllNormalizers(frame.file, options),
  }
}

/**
 * Apply built-in normalizers, then custom normalizers from options.
 */
const applyAllNormalizers = (path: string, options: FingerprintOptions): string => {
  let current = path
  for (const fn of BUILT_IN_NORMALIZERS) {
    current = fn(current)
  }
  for (const fn of options.pathNormalizers ?? []) {
    current = fn(current)
  }
  return current
}

/**
 * Strip noise from function names that doesn't affect identity:
 *   - `Object.fn` / `Module.fn` prefixes (Node wraps top-level fns).
 *   - Trailing `[as foo]` aliases (already stripped in parser, defensive).
 *   - V8's `new Foo` constructor marker stays — it's semantically
 *     different from a plain call and should fingerprint distinctly.
 */
const normalizeFunctionName = (fn: string): string => {
  let name = fn.trim()

  // Drop trailing `[as foo]` if it sneaked through.
  name = name.replace(/\s+\[as\s+[^\]]+\]\s*$/, '')

  // Drop `Object.` / `Module.` prefixes — these are Node wrapping
  // artifacts, not part of user code identity.
  name = name.replace(/^(?:Object|Module)\.(?=\S)/, '')

  if (name === '') {
    return '<anonymous>'
  }

  return name
}
