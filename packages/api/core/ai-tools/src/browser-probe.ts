/**
 * A standalone Playwright probe that launches a browser and never closes it — the
 * resource-lifecycle hang `exec_command` did not yet classify.
 *
 * X1 xr-molecule-flash-m257 (+10:44 → +15:34) ran
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
 * - the source binds a browser by a plain `const|let|var <x> = await chromium|firefox|webkit
 *   .launch(` assignment;
 * - every reference to `<x>` is a known browser method that does NOT close it (`newPage`,
 *   `newContext`, `on`, `version`, …), and the binding is never aliased, passed to a helper, or
 *   read as a property;
 * - nothing in the source is a cleanup path (any `.close(`/`.disconnect(`/`.dispose(`, a `using`
 *   scope, a cleanup-named import), an escape (`process.exit`, `eval`, `new Function`, dynamic
 *   `import`), or a persistent-process intent (`launchServer`, `connect`, a server `.listen`, a
 *   timer or signal handler).
 *
 * Anything ambiguous is left alone. A wrong refusal costs a valid probe; a missed leak costs the
 * same budget the tool already had. This is a lifecycle diagnostic, never an egress or security
 * gate.
 *
 * @module
 */

/** A browser launch bound to a variable, proven to have no cleanup path. */
export interface BrowserProbeLeak {
  /** The variable the launched browser is bound to (`browser` in the m257 probe). */
  readonly variable: string
}

/** A foreground command that directly executes such a script. */
export interface ForegroundBrowserProbe extends BrowserProbeLeak {
  /** The script file as the command named it. */
  readonly script: string
}

/** A `const|let|var <name> = await [qualifier.]chromium|firefox|webkit.launch(` binding. */
const LAUNCH =
  /(?<![\w$.])(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=\n]+)?=\s*await\s+(?:[A-Za-z_$][\w$]*\s*\.\s*)?(?:chromium|firefox|webkit)\s*\.\s*launch\s*\(/g

/** A browser method that does not close the browser, so calling it leaves the handle alive. */
const SAFE_BROWSER_METHOD =
  '(?:newPage|newContext|version|isConnected|contexts|browserType|on|once|off|addListener|' +
  'removeListener|removeAllListeners|eventNames|listenerCount|rawListeners|setMaxListeners|' +
  'getMaxListeners|prependListener|prependOnceListener|startTracing|stopTracing)'

/** An explicit process exit: Node ends even with a live browser handle, so this is not a leak. */
const EXPLICIT_EXIT = /\bprocess\s*\.\s*exit\s*\(/

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
 * Whether the source imports a helper whose job may be to close the browser — a cleanup path this
 * reading cannot follow, so the script must be left alone.
 *
 * The check covers both the imported names and the module path (`./helpers/cleanup`), because the
 * two ways a helper is named are both evidence. It is deliberately over-inclusive: a false
 * negative here keeps a valid probe running.
 *
 * @param source - The script's source.
 * @returns True when an import names a cleanup helper.
 */
function importsCleanupHelper(source: string): boolean {
  for (const match of source.matchAll(/\bimport\s+([^;]*?)\s+from\s*['"]([^'"]+)['"]/g)) {
    if (CLEANUP_HINT.test(match[1] ?? '') || CLEANUP_HINT.test(match[2] ?? '')) return true
  }
  for (const match of source.matchAll(/\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g)) {
    if (CLEANUP_HINT.test(match[1] ?? '')) return true
  }
  return false
}

/**
 * The browser variable a standalone script launches and never closes, when that can be proven from
 * the source alone.
 *
 * The proof is a closed world: one plain launch binding, every reference to it a known non-closing
 * method call, and no cleanup, escape or persistent-process path anywhere in the source. A source
 * with two launches is read one binding at a time — a proven leak in either one is enough, because
 * that handle alone keeps Node alive.
 *
 * @param source - The script's source, as read from disk.
 * @returns The leaking binding, or null when the script is clean or ambiguous.
 */
export function standaloneBrowserLeak(source: string): BrowserProbeLeak | null {
  if (typeof source !== 'string' || source.trim() === '') return null
  if (EXPLICIT_EXIT.test(source) || INDIRECT_CODE.test(source)) return null
  if (PERSISTENT_INTENT.test(source) || DISPOSAL_SCOPE.test(source)) return null
  if (ANY_CLEANUP.test(source) || importsCleanupHelper(source)) return null
  for (const match of source.matchAll(LAUNCH)) {
    const variable = match[1]
    if (variable === undefined || variable === '') continue
    // The declaration is the one reference the count below does not have to explain.
    const total = [...source.matchAll(occurrences(variable))].length
    const direct = [...source.matchAll(safeCalls(variable))].length
    // Anything besides the declaration and a direct non-closing call is an unknown escape: an
    // alias, a helper argument, a property read, a string, a comment. Not a closed world.
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
