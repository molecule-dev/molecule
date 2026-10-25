/**
 * A standalone Playwright probe that launches a browser and never closes it — the
 * resource-lifecycle hang `exec_command` did not yet classify.
 *
 * A real probe ran
 * `cd /workspace/my-app/app && node /workspace/.mol-scratch/fav-probe.mjs 2>&1 | tail -5`. The
 * 30-line script binds `const browser = await chromium.launch()`, walks a real page, reaches its
 * last `console.log`, and ends without `browser.close()`, `disconnect()`, a disposal scope or
 * `process.exit()`. Chromium is a live handle, so Node never exits: the tool waited its whole 290 s
 * budget, returned `status: cut_at_budget` with empty stdout (the `| tail` held it), and then
 * advised "run it in the background" — advice for a slow workload, not for a leaked handle.
 *
 * That is the same lifecycle class {@link foregroundServerCommand} already refuses: a foreground
 * process that never returns. So the same preflight seam reads it, with a deliberately narrow
 * closed-world proof:
 *
 * - the script is DIRECTLY executed (`node`/`tsx`/`bun`/`deno` naming a script file, never a
 *   test-runner invocation or a test/fixture file — those are the runner's business);
 * - the source, with comments and string/template/regex literals blanked, binds a browser by a
 *   TOP-LEVEL (brace depth 0) `const|let|var <x> = await chromium|firefox|webkit.launch(`
 *   assignment, where the engine (or its namespace) is imported/required from `playwright`,
 *   `playwright-core` or `@playwright/test` — a locally bound stub is not Playwright;
 * - every reference to `<x>` is a known browser method that does NOT close it (`newPage`,
 *   `newContext`, `on`, `version`, …), and the binding is never aliased, passed to a helper, or
 *   read as a property;
 * - nothing in the source is a cleanup path (any `.close(`/`.disconnect(`/`.dispose(`, a `using`
 *   scope, a cleanup-named import), an escape (`process.exit`, `eval`, `new Function`, dynamic
 *   `import`), or a persistent-process intent (`launchServer`, `connect`, a server `.listen`, a
 *   timer or signal handler).
 *
 * Anything ambiguous is left alone. A wrong refusal costs a valid probe — a raw substring match
 * would also refuse five harmless scripts (a local
 * engine stub, the launch text in a string, in a comment, in a template literal, and inside a
 * function that is never called) — and a missed leak costs the same budget the tool already had.
 * This is a lifecycle diagnostic, never an egress or security gate.
 *
 * @module
 */

/** A browser launch bound to a variable, proven to have no cleanup path. */
export interface BrowserProbeLeak {
  /** The variable the launched browser is bound to (`browser` in the probe above). */
  readonly variable: string
}

/** A foreground command that directly executes such a script. */
export interface ForegroundBrowserProbe extends BrowserProbeLeak {
  /** The script file as the command named it. */
  readonly script: string
}

/** A `const|let|var <name> = await [qualifier.]chromium|firefox|webkit.launch(` binding. */
const LAUNCH =
  /(?<![\w$.])(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=\n]+)?=\s*await\s+(?:([A-Za-z_$][\w$]*)\s*\.\s*)?(chromium|firefox|webkit)\s*\.\s*launch\s*\(/g

/** A browser method that does not close the browser, so calling it leaves the handle alive. */
const SAFE_BROWSER_METHOD =
  '(?:newPage|newContext|version|isConnected|contexts|browserType|on|once|off|addListener|' +
  'removeListener|removeAllListeners|eventNames|listenerCount|rawListeners|setMaxListeners|' +
  'getMaxListeners|prependListener|prependOnceListener|startTracing|stopTracing)'

/** An explicit process exit: Node ends even with a live browser handle, so this is not a leak. */
const EXPLICIT_EXIT = /\bprocess\s*\.\s*exit\s*\(/

/** A top-level `throw`: an uncaught exception ends Node even with a live browser handle. */
const THROW = /(?<![\w$.])throw\b/g

/** Code a source-level reading cannot follow, so the script is left alone. */
const INDIRECT_CODE = /\b(?:eval|new\s+Function)\s*\(|\bimport\s*\(/

/** A persistent process, not a probe that should have ended: a browser server or a listener. */
const PERSISTENT_INTENT =
  /\bsetInterval\s*\(|\bwhile\s*\(\s*true\s*\)|\bfor\s*\(\s*;\s*;\s*\)|\bprocess\s*\.\s*(?:on|once)\s*\(|\.\s*(?:connectOverCDP|launchServer|launchPersistentContext|connect)\s*\(|\.\s*listen\s*\(/

/** A disposal scope (`using browser = …`) or any resource close: an ambiguity by construction. */
const DISPOSAL_SCOPE = /\b(?:await\s+)?using\s+[A-Za-z_$][\w$]*\s*=/
const ANY_CLEANUP =
  /\.\s*(?:close|disconnect|dispose)\s*\(|[A-Za-z_$][\w$]*\s*\[\s*['"](?:close|disconnect|dispose)['"]\s*\]/

/** An import whose name or module path suggests cleanup the source reading cannot see. */
const CLEANUP_HINT = /cleanup|teardown|close|dispose|shutdown|quit/i

/** The packages whose `chromium`/`firefox`/`webkit` export really launches a browser. */
const PLAYWRIGHT_PACKAGE = '(?:playwright-core|playwright|@playwright/test)'

/** The characters after which a `/` starts a regex literal rather than a division. */
const REGEX_AFTER = new Set([
  '',
  '(',
  '[',
  '{',
  ',',
  ';',
  ':',
  '=',
  '!',
  '&',
  '|',
  '?',
  '+',
  '-',
  '*',
  '%',
  '^',
  '~',
  '<',
  '>',
  '}',
])

/**
 * A source with every comment and every string, template and regex literal blanked to spaces,
 * preserving offsets and newlines so a match's position still indexes the original source.
 *
 * A launch mentioned in prose is not a launch: a review proved scripts that only PRINT
 * `const browser = await chromium.launch()` — in a string, a comment and a template literal — and
 * a raw substring match refused all of them. Template `${…}` substitutions stay code (a `close()`
 * written there is a real cleanup path), nested braces are tracked so the substitution's end is
 * found, and regex literals are recognised by the token before them so a quote inside a character
 * class cannot blank the rest of the file.
 *
 * @param source - The script's source.
 * @returns The same text with literal/comment spans replaced by spaces.
 */
function codeOnly(source: string): string {
  const out = source.split('')
  const blank = (from: number, to: number): void => {
    for (let i = from; i < to; i++) if (out[i] !== '\n') out[i] = ' '
  }
  type Frame =
    | { mode: 'code'; braces: number }
    | { mode: 'line' }
    | { mode: 'block' }
    | { mode: 'template' }
    | { mode: 'string'; quote: string; keep: boolean }
    | { mode: 'regex'; inClass: boolean }
  const stack: Frame[] = [{ mode: 'code', braces: 0 }]
  const top = (): Frame => stack[stack.length - 1]!
  /** The last non-whitespace CODE character: decides whether a `/` opens a regex. */
  let lastCode = ''
  /** The last identifier word and the word being read — a module specifier follows `from`. */
  let lastWord = ''
  let word = ''
  /** A specifier (`from 'playwright'`, `require('playwright')`) stays readable to provenance. */
  const specifierAhead = (): boolean =>
    lastWord === 'from' || lastWord === 'require' || lastWord === 'import'
  let i = 0
  while (i < source.length) {
    const frame = top()
    const char = source[i] ?? ''
    const next = source[i + 1]
    if (frame.mode === 'code') {
      if (char === '/' && next === '/') {
        stack.push({ mode: 'line' })
        blank(i, i + 2)
        i += 2
        continue
      }
      if (char === '/' && next === '*') {
        stack.push({ mode: 'block' })
        blank(i, i + 2)
        i += 2
        continue
      }
      if (char === "'" || char === '"') {
        stack.push({ mode: 'string', quote: char, keep: specifierAhead() })
        if (!specifierAhead()) out[i] = ' '
        i += 1
        continue
      }
      if (char === '`') {
        stack.push({ mode: 'template' })
        out[i] = ' '
        i += 1
        continue
      }
      if (char === '/' && REGEX_AFTER.has(lastCode)) {
        stack.push({ mode: 'regex', inClass: false })
        out[i] = ' '
        i += 1
        continue
      }
      if (frame.braces > 0) {
        if (char === '{') frame.braces += 1
        else if (char === '}') {
          frame.braces -= 1
          if (frame.braces === 0) {
            stack.pop()
            out[i] = ' '
            i += 1
            continue
          }
        }
      }
      if (/[\w$]/.test(char)) word += char
      else if (word !== '') {
        lastWord = word
        word = ''
      }
      if (!/\s/.test(char)) lastCode = char
      i += 1
      continue
    }
    if (frame.mode === 'line') {
      if (char === '\n') {
        stack.pop()
        i += 1
        continue
      }
      out[i] = ' '
      i += 1
      continue
    }
    if (frame.mode === 'block') {
      if (char === '*' && next === '/') {
        blank(i, i + 2)
        stack.pop()
        i += 2
        continue
      }
      if (char !== '\n') out[i] = ' '
      i += 1
      continue
    }
    if (frame.mode === 'string') {
      if (char === '\\') {
        if (!frame.keep) blank(i, i + 2)
        i += 2
        continue
      }
      if (char === frame.quote) {
        if (!frame.keep) out[i] = ' '
        stack.pop()
        // A string is an operand: the next `/` is division, not a regex.
        lastCode = 'x'
        i += 1
        continue
      }
      if (!frame.keep && char !== '\n') out[i] = ' '
      i += 1
      continue
    }
    if (frame.mode === 'template') {
      if (char === '\\') {
        blank(i, i + 2)
        i += 2
        continue
      }
      if (char === '`') {
        out[i] = ' '
        stack.pop()
        lastCode = 'x'
        i += 1
        continue
      }
      if (char === '$' && next === '{') {
        // The substitution is code: keep it visible and track its closing brace.
        blank(i, i + 2)
        stack.push({ mode: 'code', braces: 1 })
        lastCode = '{'
        i += 2
        continue
      }
      if (char !== '\n') out[i] = ' '
      i += 1
      continue
    }
    // Regex literal: blank it, honour escapes and character classes, then its flags.
    if (char === '\\') {
      blank(i, i + 2)
      i += 2
      continue
    }
    if (char === '[') frame.inClass = true
    else if (char === ']') frame.inClass = false
    else if (char === '/' && !frame.inClass) {
      out[i] = ' '
      stack.pop()
      lastCode = 'x'
      i += 1
      while (i < source.length && /[a-z]/i.test(source[i] ?? '')) {
        out[i] = ' '
        i += 1
      }
      continue
    }
    if (char !== '\n') out[i] = ' '
    i += 1
  }
  return out.join('')
}

/**
 * How many `{ … }` blocks are open at one offset of the code-only text.
 *
 * @param code - The {@link codeOnly} text.
 * @param at - The offset to ask about.
 * @returns The open-block count (`0` at the module's top level).
 */
function braceDepthAt(code: string, at: number): number {
  let depth = 0
  for (let i = 0; i < at; i += 1) {
    const char = code[i] ?? ''
    if (char === '{') depth += 1
    else if (char === '}') depth = Math.max(0, depth - 1)
  }
  return depth
}

/**
 * Whether the script throws at its own top level — an uncaught exception that terminates Node
 * before the leaked handle can keep it alive. A `throw` inside a function or a `try` block is not
 * an exit path for every run, so it is left where it is.
 *
 * @param code - The {@link codeOnly} text.
 * @returns True when a `throw` statement sits at brace depth 0.
 */
function topLevelThrow(code: string): boolean {
  for (const match of code.matchAll(THROW)) {
    if (braceDepthAt(code, match.index ?? 0) === 0) return true
  }
  return false
}

/**
 * Whether a declaration is the first thing on its line — only whitespace between it and the
 * previous newline.
 *
 * This is the conservative guard for the one shape the lexer cannot read: a regex literal whose
 * opening `/` follows a `)` (`if (x) /…/.test(s)`) reads as division, so the launch text inside it
 * survives blanking. A mid-line top-level launch is a deliberate false negative; every positive
 * shape (the probe above, `import * as pw` + `pw.chromium.launch`, a destructured require) declares
 * at line start.
 *
 * @param code - The {@link codeOnly} text.
 * @param at - The offset of the declaration.
 * @returns True when the declaration starts its line.
 */
function startsLine(code: string, at: number): boolean {
  for (let i = at - 1; i >= 0; i -= 1) {
    const char = code[i] ?? ''
    if (char === '\n') return true
    if (!/\s/.test(char)) return false
  }
  return true
}

/**
 * Escape one text for a literal use inside a regular expression.
 *
 * @param text - The text to escape.
 * @returns The escaped text.
 */
function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Every reference to one variable, as a whole word not reached through another object. */
function occurrences(variable: string): RegExp {
  return new RegExp(`(?<![\\w$.])${escapeRegExp(variable)}(?![\\w$])`, 'g')
}

/** Every direct call of a non-closing browser method on one variable. */
function safeCalls(variable: string): RegExp {
  return new RegExp(
    `(?<![\\w$.])${escapeRegExp(variable)}\\s*\\.\\s*${SAFE_BROWSER_METHOD}\\s*\\(`,
    'g',
  )
}

/**
 * Whether a name is declared locally (`const chromium = { launch… }`) — a stub, not Playwright.
 *
 * A local declaration of the engine or of the namespace it is reached through makes the source
 * ambiguous, so it is left alone. The declaration in `const { chromium } = require(…)` is a
 * destructuring pattern, not this shape, and is handled by {@link namedRequireBinding}.
 *
 * @param code - The {@link codeOnly} text.
 * @param name - The binding to look for.
 * @returns True when the name is shadowed by a local declaration.
 */
function locallyDeclared(code: string, name: string): boolean {
  return new RegExp(`\\b(?:const|let|var|function|class)\\s+${escapeRegExp(name)}(?![\\w$])`).test(
    code,
  )
}

/**
 * Whether a name is bound by a named import or a destructured require from a Playwright package.
 *
 * @param code - The {@link codeOnly} text.
 * @param name - The binding to look for.
 * @returns True when the name comes from Playwright.
 */
function namedPlaywrightBinding(code: string, name: string): boolean {
  const importRe = new RegExp(
    `\\bimport\\s*\\{([^}]*)\\}\\s*from\\s*['"]${PLAYWRIGHT_PACKAGE}['"]`,
    'g',
  )
  for (const match of code.matchAll(importRe)) {
    if ((match[1] ?? '').split(',').some((part) => part.trim() === name)) return true
  }
  const requireRe = new RegExp(
    `\\b(?:const|let|var)\\s*\\{([^}]*)\\}\\s*=\\s*require\\s*\\(\\s*['"]${PLAYWRIGHT_PACKAGE}['"]\\s*\\)`,
    'g',
  )
  for (const match of code.matchAll(requireRe)) {
    if ((match[1] ?? '').split(',').some((part) => part.trim() === name)) return true
  }
  return false
}

/**
 * Whether a name is bound to a Playwright package as a namespace/default import or a whole
 * `require` (`import * as pw from 'playwright'`, `const pw = require('playwright')`).
 *
 * @param code - The {@link codeOnly} text.
 * @param name - The namespace binding to look for.
 * @returns True when the name is a Playwright namespace.
 */
function namespacePlaywrightBinding(code: string, name: string): boolean {
  const importRe = new RegExp(
    `\\bimport\\s+(?:\\*\\s+as\\s+)?([A-Za-z_$][\\w$]*)\\s+from\\s*['"]${PLAYWRIGHT_PACKAGE}['"]`,
    'g',
  )
  for (const match of code.matchAll(importRe)) {
    if (match[1] === name) return true
  }
  const requireRe = new RegExp(
    `\\b(?:const|let|var)\\s+([A-Za-z_$][\\w$]*)\\s*=\\s*require\\s*\\(\\s*['"]${PLAYWRIGHT_PACKAGE}['"]\\s*\\)`,
    'g',
  )
  for (const match of code.matchAll(requireRe)) {
    if (match[1] === name) return true
  }
  return false
}

/**
 * Whether the launched engine really is Playwright's: the bare `chromium`/`firefox`/`webkit` bound
 * by a named import/require, or a namespace bound to a Playwright package with the engine read off
 * it. A local stub with a `launch()` method is not a browser and is left alone.
 *
 * @param code - The {@link codeOnly} text.
 * @param qualifier - The namespace word before the engine (`pw` in `pw.chromium.launch`), or null.
 * @param engine - The engine word (`chromium`, `firefox`, `webkit`).
 * @returns True when the engine comes from a Playwright package.
 */
function playwrightEngine(code: string, qualifier: string | null, engine: string): boolean {
  if (qualifier === null) {
    if (locallyDeclared(code, engine)) return false
    return namedPlaywrightBinding(code, engine)
  }
  if (locallyDeclared(code, qualifier)) return false
  return namedPlaywrightBinding(code, qualifier) || namespacePlaywrightBinding(code, qualifier)
}

/**
 * Whether the source imports a helper whose job may be to close the browser — a cleanup path this
 * reading cannot follow, so the script must be left alone.
 *
 * The check covers both the imported names and the module path (`./helpers/cleanup`), because the
 * two ways a helper is named are both evidence. It is deliberately over-inclusive: a false
 * negative here keeps a valid probe running.
 *
 * @param code - The {@link codeOnly} text.
 * @returns True when an import names a cleanup helper.
 */
function importsCleanupHelper(code: string): boolean {
  for (const match of code.matchAll(/\bimport\s+([^;]*?)\s+from\s*['"]([^'"]+)['"]/g)) {
    if (CLEANUP_HINT.test(match[1] ?? '') || CLEANUP_HINT.test(match[2] ?? '')) return true
  }
  for (const match of code.matchAll(/\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g)) {
    if (CLEANUP_HINT.test(match[1] ?? '')) return true
  }
  return false
}

/**
 * The browser variable a standalone script launches and never closes, when that can be proven from
 * the source alone.
 *
 * The proof is a closed world: one plain TOP-LEVEL launch binding whose engine is genuinely
 * Playwright's, every reference to it a known non-closing method call, and no cleanup, escape or
 * persistent-process path anywhere in the source. A source with two launches is read one binding
 * at a time — a proven leak in either one is enough, because that handle alone keeps Node alive.
 *
 * @param source - The script's source, as read from disk.
 * @returns The leaking binding, or null when the script is clean or ambiguous.
 */
export function standaloneBrowserLeak(source: string): BrowserProbeLeak | null {
  if (typeof source !== 'string' || source.trim() === '') return null
  const code = codeOnly(source)
  if (EXPLICIT_EXIT.test(code) || topLevelThrow(code) || INDIRECT_CODE.test(code)) return null
  if (PERSISTENT_INTENT.test(code) || DISPOSAL_SCOPE.test(code)) return null
  if (ANY_CLEANUP.test(code) || importsCleanupHelper(code)) return null
  for (const match of code.matchAll(LAUNCH)) {
    const variable = match[1]
    const qualifier = match[2] ?? null
    const engine = match[3]
    if (variable === undefined || variable === '' || engine === undefined) continue
    // A launch inside a function/block is not proof it ever ran: leave it alone.
    if (braceDepthAt(code, match.index ?? 0) !== 0) continue
    // A top-level launch must start its line: a mid-line match can be text the lexer could not
    // classify (a regex literal after `)`), so it is not a closed world.
    if (!startsLine(code, match.index ?? 0)) continue
    if (!playwrightEngine(code, qualifier, engine)) continue
    // The declaration is the one reference the count below does not have to explain.
    const total = [...code.matchAll(occurrences(variable))].length
    const direct = [...code.matchAll(safeCalls(variable))].length
    // Anything besides the declaration and a direct non-closing call is an unknown escape: an
    // alias, a helper argument, a property read. Not a closed world.
    if (total === direct + 1) return { variable }
  }
  return null
}

/**
 * The refusal for a foreground command that would run a leaking browser probe: it never returns,
 * and the one move that makes it return is closing the browser (or letting the Playwright runner
 * own it), never moving the leak to the background.
 *
 * @param probe - The leaked probe, from `foregroundBrowserProbe`.
 * @param budgetSeconds - The tool's budget, which the probe would consume whole.
 * @param piped - Whether the command pipes through `tail`/`head`, which withholds the probe's output.
 * @returns The refusal sentence.
 */
export function browserProbeRefusal(
  probe: ForegroundBrowserProbe,
  budgetSeconds: number,
  piped = false,
): string {
  return (
    `\`${probe.script}\` binds the launched browser to \`${probe.variable}\`. ` +
    'This probe launches a browser and never closes it, so Node will stay alive after its last ' +
    'statement. Put the page work in try { … } finally { await ' +
    `${probe.variable}.close() }, or use a Playwright test whose browser fixture is cleaned up by ` +
    'the runner. ' +
    `Run in the foreground it would hold this tool for its whole ${budgetSeconds} s budget and ` +
    'return nothing.' +
    (piped
      ? ' Its `| tail` pipe would also withhold its output until it exits: run it without the pipe so its progress streams.'
      : '')
  )
}

/**
 * The over-budget advice for a leak discovered at cut time (the preflight could not read the script
 * before the run — e.g. the same command wrote it). It names the lifecycle fix and says explicitly
 * that the background is not one: a leaked handle hangs there too.
 *
 * @param probe - The leaked probe.
 * @returns The sentence the cut result carries.
 */
export function browserProbeOverBudgetAdvice(probe: ForegroundBrowserProbe): string {
  return (
    `\`${probe.script}\` binds the launched browser to \`${probe.variable}\`. ` +
    'This probe launches a browser and never closes it, so Node will stay alive after its last ' +
    'statement. It is not a bigger unit to split, and starting it in the background only moves the ' +
    'hang. Put the page work in try { … } finally { await ' +
    `${probe.variable}.close() }, or use a Playwright test whose browser fixture is cleaned up by ` +
    'the runner.'
  )
}
