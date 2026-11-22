/**
 * Framework-neutral helpers of the IDE chat composer: the slash-command menu
 * filter, the read-only viewer gate, the keyboard index wrap, the @-mention
 * ranking and the `<file …>` block a mention inserts, the two persistence keys
 * (unsent draft, active conversation), the `/explain` and `/lint` prompt
 * builders with the limit-refusal parse the submit path reads, the pure
 * classifier that fixes the order of `handleSubmit`'s checks, and the pure
 * reducer behind the composer textarea's keydown handler (popup navigation,
 * picks, Escape and the IME guard). Shared verbatim by every framework's chat
 * panel, so the menu, the viewer rules, the mention picker, the typed commands
 * and the keyboard behave the same in each.
 *
 * @module
 */

import type { AppModelDefinition } from '@molecule/app-ai-models'

import type { CommandDef } from '../command-metadata.js'
import { COMMANDS, matchesSideChannelCommand } from '../command-metadata.js'
import { parseAutoCommitCommand } from './chat-autocommit-utilities.js'
import type {
  CommandMenu,
  EffortPicker,
  FileEntry,
  FilePicker,
  ModelPicker,
} from './chat-card-event-utilities.js'
import type {
  EffortCommand,
  EffortLevel,
  EffortMode,
  EffortOption,
} from './chat-effort-utilities.js'
import { parseEffortCommand } from './chat-effort-utilities.js'
import type { ModelMode, ServerModeDefaults } from './chat-model-mode-utilities.js'
import { isModeModelLocked, parseModelModeCommand } from './chat-model-mode-utilities.js'
import { parseReportCommand } from './chat-report-utilities.js'
import { parseRunCommand, parseScriptsCommand } from './chat-scripts-utilities.js'
import type { SoundEventType } from './chat-settings-utilities.js'
import { SOUND_EVENTS } from './chat-settings-utilities.js'
import type { ShareCommand } from './chat-share-utilities.js'
import { parseShareCommand } from './chat-share-utilities.js'
import type { TimestampsCommand } from './chat-timestamps-utilities.js'
import { parseTimestampsCommand } from './chat-timestamps-utilities.js'
import { parseTestsBarArg } from './tests-bar-utilities.js'
import { parseTestCommand } from './tests-card-utilities.js'

/**
 * The `sessionStorage` key the composer persists an unsent draft under, per
 * project.
 * @param projectId - The project the chat panel belongs to.
 * @returns The draft storage key (`mol-chat-draft:<projectId>`).
 */
export function chatDraftStorageKey(projectId: string): string {
  return `mol-chat-draft:${projectId}`
}

/**
 * The `localStorage` key the outer panel remembers the active conversation
 * under, per project.
 * @param projectId - The project the chat panel belongs to.
 * @returns The conversation storage key (`mol-chat-conv:<projectId>`).
 */
export function chatConversationStorageKey(projectId: string): string {
  return `mol-chat-conv:${projectId}`
}

/**
 * Whether a read-only project VIEWER may run `command` — true only for a
 * command flagged {@link CommandDef.viewerSafe} (a read, a view-only surface or
 * a per-user preference). Everything else is default-DENIED: an unflagged or
 * missing command is unavailable to viewers. Host side-channel commands are
 * gated separately by `matchesSideChannelCommand`, which the callers OR in
 * where a viewer may also message the team.
 * @param command - The command definition, or `undefined` when the text named
 *   no registered command.
 * @returns `true` when the command is viewer-safe, `false` otherwise.
 */
export function viewerCommandAllowed(command: CommandDef | undefined): boolean {
  return command?.viewerSafe === true
}

/**
 * The commands an open command menu lists: every command for a `showAll` menu
 * (the slash-button toggle over existing text) or the ones whose label starts
 * with the typed text; viewers see only the commands they can run (viewer-safe
 * reads plus the team side channel); `/share` is listed only when the host
 * allows sharing.
 * @param commands - The command registry unioned with any host-provided commands.
 * @param menu - The open command menu, or `null` when it is closed.
 * @param canEdit - Whether the member may edit the project (`false` for a
 *   read-only viewer; `undefined` counts as an editor).
 * @param shareAllowed - Whether the host allows managing share links.
 * @returns The commands the menu shows, in registry order (`[]` when closed).
 */
export function filterCommandMenu(
  commands: readonly CommandDef[],
  menu: CommandMenu | null,
  canEdit: boolean | undefined,
  shareAllowed: boolean,
): CommandDef[] {
  if (!menu) return []
  return commands.filter(
    (c) =>
      // A showAll menu (slash-button toggle over existing text) lists every
      // command; a typed menu filters by the composer's text.
      (menu.showAll === true || c.label.startsWith(menu.text)) &&
      // Viewers see only commands they can actually run (viewer-safe reads +
      // the /teamsay side channel) — no dead entries in the menu.
      (canEdit !== false || viewerCommandAllowed(c) || c.sideChannel === true) &&
      // /share is gated separately: hosts commonly mint at admin+, so an
      // editor without the capability gets no dead menu entry either.
      (c.id !== 'share' || shareAllowed),
  )
}

/**
 * Wrap-around index: Down from -1 → 0, Up from -1 → last, wraps at both ends.
 * @param cur - The current index (-1 means no selection).
 * @param delta - The direction to move (+1 down, -1 up).
 * @param len - The total number of items.
 * @returns The new wrapped index.
 */
export function wrapIdx(cur: number, delta: number, len: number): number {
  if (cur === -1) return delta > 0 ? 0 : len - 1
  return (((cur + delta) % len) + len) % len
}

/**
 * Normalize an active-file/tab path to the relative form entry names use (no
 * leading `/`, no `/workspace/` prefix).
 * @param p - The absolute or workspace-relative path.
 * @returns The path relative to the workspace root.
 */
function normalizeTabPath(p: string): string {
  return p.startsWith('/workspace/')
    ? p.slice('/workspace/'.length)
    : p.startsWith('/')
      ? p.slice(1)
      : p
}

/**
 * Rank the @-mention picker's entries by the composer query: entries whose name
 * contains the query (case-insensitive), with the active file first, then open
 * tabs, then prefix matches, then the rest alphabetically — capped at the first
 * fifteen rows.
 * @param entries - The picker's file entries.
 * @param query - The text typed after the `@`.
 * @param activeFile - The editor's active file, if any (`null` when none).
 * @param openTabs - The editor's open tab paths, if any.
 * @returns The ranked, capped entries to show.
 */
export function rankFileMentionEntries(
  entries: readonly FileEntry[],
  query: string,
  activeFile: string | null | undefined,
  openTabs: readonly string[] | undefined,
): FileEntry[] {
  const q = query.toLowerCase()

  // Normalize active file and open tabs to match entry names (relative paths without leading /)
  const activeNorm = activeFile ? normalizeTabPath(activeFile) : null
  const openTabSet = new Set((openTabs ?? []).map(normalizeTabPath))

  // Filter by query
  const matches = q ? entries.filter((e) => e.name.toLowerCase().includes(q)) : entries

  // Rank: active file first, then open tabs, then rest (by match position)
  const scored = matches.map((e) => {
    const name = e.name
    const nameLower = name.toLowerCase()
    let score = 0
    if (activeNorm && name === activeNorm) score = 3
    else if (openTabSet.has(name)) score = 2
    // Boost prefix matches (query matches start of filename)
    else if (q && nameLower.split('/').pop()?.startsWith(q)) score = 1
    return { entry: e, score }
  })

  scored.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score
    return a.entry.name.localeCompare(b.entry.name)
  })

  return scored.map((s) => s.entry).slice(0, 15)
}

/**
 * Build the `<file …>` block a chosen @-mention inserts into the outgoing
 * message: the file's content in a language-tagged fence, or a placeholder when
 * the sandbox could not read it. The caller joins it to any text already in the
 * message with a blank line.
 * @param displayPath - The path to annotate the block with (no leading `/`).
 * @param extension - The file's extension, used as the fence language tag.
 * @param content - The file's text, or `null` when it could not be read.
 * @returns The message block.
 */
export function buildFileMentionBlock(
  displayPath: string,
  extension: string,
  content: string | null,
): string {
  if (content === null) {
    return `<file path="${displayPath}">[Could not read file]</file>`
  }
  return `<file path="${displayPath}">\n\`\`\`${extension}\n${content}\n\`\`\`\n</file>`
}

/**
 * The prompt a `/explain` submit sends: the named target, or a default that
 * asks about what the user just shared.
 * @param target - The text after `/explain`, when any.
 * @param hasAttachments - Whether @-mentioned files ride along with the send.
 * @returns The message text to send.
 */
export function buildExplainPrompt(target: string | undefined, hasAttachments: boolean): string {
  if (target) return `Explain this in detail: ${target}`
  return hasAttachments
    ? 'Explain the attached file(s) in detail. Be thorough but concise.'
    : 'Explain the code I just shared or the most recently discussed code. Be thorough but concise.'
}

/**
 * The prompt a `/lint` submit sends: lint the named path with `npm run lint --
 * <args>`, or the whole project.
 * @param args - The text after `/lint`, when any.
 * @returns The message text to send.
 */
export function buildLintPrompt(args: string | undefined): string {
  return args
    ? `Run the linter on ${args} and fix any issues found: npm run lint -- ${args}`
    : 'Run the project linter (npm run lint) and fix any issues found. Show what you fixed.'
}

/** The backend's description of a usage-limit refusal, as a failed request carries it. */
export interface LimitRefusal {
  /** The backend's human-readable refusal message, when it sent one. */
  error?: string
  /** Which limit fired (`max_tool_loops`, `daily`, …). */
  limitType: string
  /** True when the refusal is really "sign up" (e.g. an anonymous visitor). */
  requiresSignup?: boolean
  /** The remedy the backend resolved (e.g. a billing action). */
  billingAction?: string
  /** The higher plan that lifts the limit, or `null` when none does. */
  upgradeTier?: string | null
}

/**
 * Parse a failed request's usage-limit refusal out of its response body. The
 * backend describes a refusal as `{ error, limitType, requiresSignup?,
 * billingAction?, upgradeTier? }`; anything else (a network failure, a plain
 * message error) is not a limit refusal.
 * @param error - The caught error value.
 * @returns The refusal, or `null` when the error carries none.
 */
export function limitRefusalFromError(error: unknown): LimitRefusal | null {
  const data = (
    error as {
      response?: {
        data?: {
          error?: string
          limitType?: string
          requiresSignup?: boolean
          billingAction?: string
          upgradeTier?: string | null
        }
      }
    }
  )?.response?.data
  if (typeof data?.limitType !== 'string') return null
  return {
    error: data.error,
    limitType: data.limitType,
    requiresSignup: data.requiresSignup,
    billingAction: data.billingAction,
    upgradeTier: data.upgradeTier,
  }
}

/** What `handleSubmit` knows before it decides which path a submit takes. */
export interface ComposerSubmitState {
  /** True when the member may only read the transcript (no edit, no team chat). */
  transcriptOnly: boolean
  /** How many files are attached in the composer right now. */
  attachedCount: number
  /** Whether the member may edit the project (`undefined` takes the viewer path). */
  canEdit: boolean | undefined
  /** Whether team side-channel messages are allowed in this workspace. */
  canSendTeamMessages: boolean
  /** The command registry unioned with host commands, as the menu sees it. */
  allCommands: readonly CommandDef[]
  /** The host's extra commands (the team-message gate reads them with the registry). */
  extraCommands: readonly CommandDef[] | undefined
  /**
   * Reads whether the tests status bar is currently visible — the `/test
   * on|off` base. Called only when the submit is the tests-bar command, so a
   * plain submit never touches the preference storage.
   */
  readTestsBarVisible: () => boolean
}

/** The path a composer submit takes, as `routeComposerSubmit` classifies it. */
export type ComposerSubmitRoute =
  /** The submit is ignored: a transcript-only member, or nothing to send. */
  | { kind: 'ignored' }
  /** A team side-channel message while team messaging is unavailable. */
  | { kind: 'team-blocked' }
  /** A read-only viewer tried to run the assistant or a mutating command. */
  | { kind: 'viewer-blocked' }
  /** `/autofix` — toggles auto-fix through the command dispatcher. */
  | { kind: 'autofix' }
  /** `/autoapprove` — toggles auto-approve through the command dispatcher. */
  | { kind: 'autoapprove' }
  /** `/sounds` — opens the sounds picker. */
  | { kind: 'sounds' }
  /** `/test on|off|toggle` — sets the tests bar visibility. */
  | { kind: 'tests-bar'; visible: boolean }
  /** `/timestamps` — a per-device timestamp display preference. */
  | { kind: 'timestamps'; command: TimestampsCommand }
  /** `/settings` — opens the settings view through the command dispatcher. */
  | { kind: 'settings' }
  /** `/skills [query]` — opens the skills overlay, seeded with the query. */
  | { kind: 'skills'; query: string }
  /** `/scripts [query]` — opens the scripts overlay, seeded with the query. */
  | { kind: 'scripts'; query: string }
  /** `/test [query | all]` — opens the tests browser, or runs everything. */
  | { kind: 'tests'; query: string; runAll: boolean }
  /** `/run <name>` — runs a saved script (an empty name means usage). */
  | { kind: 'run-script'; name: string; params: Record<string, string> }
  /** `/report [title]` and `/bug [title]` — opens the bug-report modal. */
  | { kind: 'report'; title: string }
  /** `/share [role]` — opens the share-link modal at the requested role. */
  | { kind: 'share'; command: ShareCommand }
  /** `/autocommit <seconds>` — arms or cancels the auto-commit countdown. */
  | { kind: 'autocommit'; seconds: number | null }
  /** `/model --plan|--execute|--commit|--compact` — opens the scoped picker. */
  | { kind: 'model-mode'; mode: ModelMode }
  /** `/mic` and `/dictate` — opens the dictation engine picker. */
  | { kind: 'mic' }
  /** `/model [name]` — opens the picker, or resolves and selects a model. */
  | { kind: 'model'; query: string | undefined }
  /** `/effort …` — opens the level picker, shows status, or sets a level. */
  | { kind: 'effort'; command: EffortCommand }
  /** `/maxloops <N>` — persists the max tool iterations setting. */
  | { kind: 'max-loops'; loops: number }
  /** `/explain` with no attachments — sends the built explain prompt. */
  | { kind: 'explain'; prompt: string }
  /** `/lint` — sends the built lint prompt. */
  | { kind: 'lint'; prompt: string }
  /** A host side-channel command — sends the raw text without a user bubble. */
  | { kind: 'side-channel'; message: string }
  /** A plain message (an `/explain` with attachments is rewritten into one). */
  | { kind: 'send'; message: string }

/**
 * Classify a composer submit into the one path it takes, fixing the order of
 * `handleSubmit`'s checks: transcript-only and empty submits, the team-message
 * gate, the read-only viewer gate, every locally-handled slash command, the
 * side-channel send, and finally a plain message. Deterministic and
 * side-effect free — the caller performs every side effect (`setInputValue`,
 * `addSystemCard`, `sendMessage`, …) for the returned route — so the check
 * order is identical in every framework's chat panel.
 * @param input - The composer's raw text.
 * @param state - The props and derived values the checks read.
 * @returns The {@link ComposerSubmitRoute} the submit takes.
 */
export function routeComposerSubmit(
  input: string,
  state: ComposerSubmitState,
): ComposerSubmitRoute {
  if (state.transcriptOnly) return { kind: 'ignored' }
  const trimmed = input.trim()
  if (!trimmed && state.attachedCount === 0) return { kind: 'ignored' }

  // A team side-channel message is unavailable here when the workspace forbids
  // team messaging. The gate reads the registry plus the host's commands, not
  // the member-filtered menu list.
  const teamCommands = state.extraCommands?.length
    ? [...COMMANDS, ...state.extraCommands]
    : COMMANDS
  if (state.canSendTeamMessages === false && matchesSideChannelCommand(teamCommands, trimmed)) {
    return { kind: 'team-blocked' }
  }

  // Read-only VIEWER guard. A viewer cannot run the assistant (the server 403s
  // the chat route) or any project-mutating command, so block a plain message
  // or a write-command here with a read-only note instead of a silent 403 —
  // but let team side-channel messages (/teamsay) and viewerSafe commands
  // through so viewers can still talk to the team and read. (Menu-dispatched
  // commands are gated in executeCommand; this covers composer typing.)
  if (!state.canEdit) {
    const token = trimmed.match(/^\/(\S+)/)?.[1]?.toLowerCase()
    const def = token
      ? state.allCommands.find((c) => c.id.toLowerCase() === token || c.aliases?.includes(token))
      : undefined
    const allowed =
      matchesSideChannelCommand(state.allCommands, trimmed) || viewerCommandAllowed(def)
    if (!allowed) return { kind: 'viewer-blocked' }
  }

  // Handle /autofix toggle locally
  if (/^\/autofix$/i.test(trimmed)) return { kind: 'autofix' }

  // Handle /autoapprove toggle locally
  if (/^\/autoapprove$/i.test(trimmed)) return { kind: 'autoapprove' }

  // Handle /sounds command locally
  if (/^\/sounds$/i.test(trimmed)) return { kind: 'sounds' }

  // `/test on | off | toggle` sets whether the TESTS STRIP is shown — a
  // per-device display preference, the same shape as /timestamps. Bare
  // `/test` is left alone: it opens the tests browser, which is a different
  // thing and is what the command menu offers.
  const testsBarMatch = /^\/test(?:s)?\s+(.+)$/i.exec(trimmed)
  if (testsBarMatch) {
    const next = parseTestsBarArg(testsBarMatch[1] ?? '', state.readTestsBarVisible())
    if (next !== null) return { kind: 'tests-bar', visible: next }
  }
  // Handle /timestamps [on | off] locally — a per-device display preference.
  const timestampsCommand = parseTimestampsCommand(trimmed)
  if (timestampsCommand) return { kind: 'timestamps', command: timestampsCommand }

  // Handle /settings command locally
  if (/^\/settings$/i.test(trimmed)) return { kind: 'settings' }

  // Handle /skills [query] command locally — opens the skills browser overlay,
  // seeded with the query (if any) so it opens pre-filtered.
  const skillsMatch = trimmed.match(/^\/skills(?:\s+(.*))?$/i)
  if (skillsMatch) return { kind: 'skills', query: skillsMatch[1]?.trim() ?? '' }

  // Handle /scripts [query] command locally — opens the scripts browser overlay,
  // seeded with the query (if any) so it opens pre-filtered.
  const scriptsMatch = parseScriptsCommand(trimmed)
  if (scriptsMatch) return { kind: 'scripts', query: scriptsMatch.query }

  // Handle /test [query | all] locally — opens the tests browser overlay,
  // seeded with the query (if any); `all` runs everything straight away.
  const testMatch = parseTestCommand(trimmed)
  if (testMatch) return { kind: 'tests', query: testMatch.query, runAll: testMatch.runAll }

  // Handle /run <name> command locally — resolves + runs a saved script.
  const runMatch = parseRunCommand(trimmed)
  if (runMatch) return { kind: 'run-script', name: runMatch.name, params: runMatch.params }

  // Handle /report [title] and /bug [title] commands locally — opens the
  // bug-report modal, seeding the title from any trailing text.
  const reportMatch = parseReportCommand(trimmed)
  if (reportMatch) return { kind: 'report', title: reportMatch.title }

  // Handle /share [role] locally — opens the share-link modal at the requested
  // role (default viewer). An unrecognized role shows usage instead. Below the
  // host's share capability (e.g. an editor where minting is admin+), say so
  // plainly instead of opening a modal whose every request 403s.
  const shareMatch = parseShareCommand(trimmed)
  if (shareMatch) return { kind: 'share', command: shareMatch }

  // Handle /autocommit <seconds> locally — arms/cancels the countdown that
  // auto-fires the existing /commit path N seconds after the last file change.
  const autoCommitMatch = parseAutoCommitCommand(trimmed)
  if (autoCommitMatch) return { kind: 'autocommit', seconds: autoCommitMatch.seconds }

  // Handle /model --plan / --execute / --commit / --compact locally — opens
  // the picker scoped to that mode so a selection persists to planModel /
  // executeModel / commitModel / compactModel. Must run BEFORE the generic
  // /model handler so the flag isn't treated as a model name.
  const modelModeMatch = parseModelModeCommand(trimmed)
  if (modelModeMatch) return { kind: 'model-mode', mode: modelModeMatch.mode }

  // Handle /mic (alias /dictate) locally — opens the dictation engine picker
  if (/^\/(mic|dictate)$/i.test(trimmed)) return { kind: 'mic' }

  // Handle /model <name> command locally
  const modelCmdMatch = trimmed.match(/^\/model(?:\s+(.+))?$/i)
  if (modelCmdMatch) return { kind: 'model', query: modelCmdMatch[1]?.trim() }

  // Handle /effort locally — effort is PER-MODE (settings.effortByMode; the
  // legacy single effortLevel is the fallback) and is shown/typed in the
  // target mode's MODEL-NATIVE values (e.g. xhigh on Claude, 16K thinking
  // tokens on budget-scaled models) — never the internal S/M/L/XL letters.
  // The backend applies it to the provider reasoning param (and the
  // agent-loop budget) at chat-call time.
  const effortCmd = parseEffortCommand(trimmed)
  if (effortCmd) return { kind: 'effort', command: effortCmd }

  // Handle /maxloops <N> command locally — server enforces tier cap
  const maxLoopsMatch = trimmed.match(/^\/maxloops\s+(\d+)$/i)
  if (maxLoopsMatch) return { kind: 'max-loops', loops: Math.max(1, Number(maxLoopsMatch[1])) }

  // Handle /explain [target] — inject prompt for AI to explain code
  // NOTE: does NOT return early when files are attached — falls through to
  // attachment processing below so that @-attached files are included in the
  // message sent to the AI.
  const explainMatch = trimmed.match(/^\/explain(?:\s+(.*))?$/i)
  if (explainMatch && state.attachedCount === 0) {
    const target = explainMatch[1]?.trim()
    return { kind: 'explain', prompt: buildExplainPrompt(target, false) }
  }

  // Handle /lint [args] — inject prompt for AI to run linter
  const lintMatch = trimmed.match(/^\/lint(?:\s+(.*))?$/i)
  if (lintMatch) return { kind: 'lint', prompt: buildLintPrompt(lintMatch[1]?.trim()) }

  // A host side-channel command (CommandDef.sideChannel, matched by id or alias — e.g.
  // molecule.dev's /teamsay + /t): send the raw text to the host's server intercept but
  // suppress the optimistic user bubble. The server emits the canonical `message` stream
  // event (persisted + broadcast to every member), which IS the visible message — so the
  // transcript never shows the literal "/command" text, and never shows it twice.
  if (matchesSideChannelCommand(state.allCommands, trimmed)) {
    return { kind: 'side-channel', message: trimmed }
  }

  // Rewrite /explain with attachments into a proper prompt (attachments
  // processed by the caller).
  const message = explainMatch ? buildExplainPrompt(explainMatch[1]?.trim(), true) : trimmed
  return { kind: 'send', message }
}

/**
 * One keydown event's fields, as the composer's native keydown handler reads
 * them — a structural subset of the DOM `KeyboardEvent`, so a test can pass a
 * plain object.
 */
export interface ComposerKeyEvent {
  /** The named key (`'Enter'`, `'Escape'`, `'ArrowDown'`, …). */
  key: string
  /** True when Shift is held — Shift+Enter inserts a newline instead of submitting. */
  shiftKey: boolean
  /** True while an IME composition is in progress. */
  isComposing?: boolean
  /** The legacy key code — `229` marks an IME composition on some engines. */
  keyCode?: number
}

/**
 * Everything the composer's keydown reducer reads: the open popups with the
 * row lists they navigate, and the panel values the Enter branches decide with.
 */
export interface ComposerKeyState {
  /** The composer textarea's current text (the effort Enter fallback parses it). */
  input: string
  /** The open sounds picker, or `null`. */
  soundsPicker: { selectedIdx: number } | null
  /** Whether the dictation-engine picker is open. */
  micOpen: boolean
  /** The open effort picker, or `null`. */
  effortPicker: EffortPicker | null
  /** The effort picker's rows after the typed filter, in display order. */
  effortPickerVisible: readonly EffortOption[]
  /** The open model picker, or `null`. */
  modelPicker: ModelPicker | null
  /** The model rows the picker lists, in display order. */
  visibleModels: readonly AppModelDefinition[]
  /** Whether the host offers the model picker's "manage your own models" row. */
  hasManageCustomModels: boolean
  /** The live conversation mode (`'plan'` or `'execute'`). */
  liveMode: EffortMode
  /** Whether a panel overlay (`/skills`, `/scripts`, `/settings`, `/tests`) is open. */
  overlayOpen: boolean
  /** The open `@`-file picker, or `null`. */
  filePicker: FilePicker | null
  /** The file picker's entries after the query filter, in display order. */
  filteredEntries: readonly FileEntry[]
  /** The open slash-command menu, or `null`. */
  commandMenu: CommandMenu | null
  /** The command menu's entries after its filter, in display order. */
  filteredCmds: readonly CommandDef[]
  /** Whether a reply is streaming right now (Escape aborts it). */
  abortable: boolean
  /** Whether the member is on the free tier (the model Enter lock reads it). */
  isFreeTier: boolean
  /** The free-tier model's id, or `''` when the catalog did not name one. */
  freeTierModelId: string
  /** The project's model catalog, custom (bring-your-own AI) models included. */
  models: readonly AppModelDefinition[]
  /** The server's per-mode default models, when it sent them. */
  serverModelDefaults: ServerModeDefaults
}

/**
 * The effect the composer's keydown handler performs for one key. The reducer
 * returns it and the caller applies it, so the reducer itself touches no state.
 */
export type ComposerKeyEffect =
  /** Nothing to do (a pick with no row, or a locked model). */
  | { kind: 'none' }
  /** Escape: close the sounds picker. */
  | { kind: 'close-sounds' }
  /** Escape: close the dictation-engine picker. */
  | { kind: 'close-mic' }
  /** Escape: close the effort picker. */
  | { kind: 'close-effort' }
  /** Escape: close the model picker. */
  | { kind: 'close-model' }
  /** Escape: close the panel overlay. */
  | { kind: 'close-overlay' }
  /** Escape: close the `@`-file picker. */
  | { kind: 'close-file' }
  /** Escape: close the slash-command menu. */
  | { kind: 'close-command' }
  /** Escape: abort the streaming reply (same path as the Stop button). */
  | { kind: 'abort' }
  /** Move the sounds picker's highlight by one row (the caller wraps it). */
  | { kind: 'sounds-move'; delta: 1 | -1 }
  /** Apply the sounds picker's highlighted mode to one event (or all of them). */
  | { kind: 'sounds-pick'; event: SoundEventType | 'all' }
  /** Move the effort picker's highlight by one row (the caller wraps it). */
  | { kind: 'effort-move'; delta: 1 | -1 }
  /** Set the effort level for the picker's mode. */
  | { kind: 'effort-pick'; mode: EffortMode; level: EffortLevel }
  /** Move the model picker's highlight by one row (the caller wraps it). */
  | { kind: 'model-move'; delta: 1 | -1 }
  /** Open the host's custom-model manager for the picker's mode. */
  | { kind: 'model-manage'; mode: EffortMode }
  /** Select the model row; `locked` means the free-tier clamp refuses it. */
  | { kind: 'model-pick'; model: AppModelDefinition; mode?: ModelMode; locked: boolean }
  /** Move the `@`-file picker's highlight by one row (the caller wraps it). */
  | { kind: 'file-move'; delta: 1 | -1 }
  /** Attach the highlighted file entry. */
  | { kind: 'file-pick'; entry: FileEntry }
  /** Move the command menu's highlight by one row (the caller wraps it). */
  | { kind: 'command-move'; delta: 1 | -1 }
  /** Close the command menu and submit the composer text as typed. */
  | { kind: 'command-dismiss-submit' }
  /** Run the command with this id. */
  | { kind: 'command-run'; id: string }
  /** Submit the composer (a bare Enter). */
  | { kind: 'submit' }

/** What `composerKeyAction` decides for one keydown. */
export interface ComposerKeyAction {
  /** Whether the handler calls `event.preventDefault()` before applying the effect. */
  preventDefault: boolean
  /** The effect the caller applies. */
  effect: ComposerKeyEffect
}

/**
 * Decide what the composer's keydown handler does for one key: the IME guard,
 * Escape's close order (sounds, mic, effort, model, overlay, file, command,
 * abort), the open picker's arrow/Enter/Tab navigation, and the bare Enter that
 * submits. Pure and side-effect free — the caller performs every effect — so
 * the key behavior is identical in every framework's chat panel.
 * @param event - The keydown event's fields.
 * @param state - The open popups and the panel values the decisions read.
 * @returns The {@link ComposerKeyAction} to apply.
 */
export function composerKeyAction(
  event: ComposerKeyEvent,
  state: ComposerKeyState,
): ComposerKeyAction {
  // A key that is part of an IME composition (Enter accepting a Japanese, Chinese
  // or Korean candidate) must reach the input method, not send the message.
  if (event.isComposing || event.keyCode === 229) return ignoreKey()

  if (event.key === 'Escape') {
    // Close the topmost popup only, so one Escape never dismisses two surfaces.
    if (state.soundsPicker) return act(false, { kind: 'close-sounds' })
    if (state.micOpen) return act(false, { kind: 'close-mic' })
    if (state.effortPicker) return act(false, { kind: 'close-effort' })
    if (state.modelPicker) return act(false, { kind: 'close-model' })
    if (state.overlayOpen) return act(false, { kind: 'close-overlay' })
    if (state.filePicker) return act(false, { kind: 'close-file' })
    if (state.commandMenu) return act(false, { kind: 'close-command' })
    if (state.abortable) {
      // Same path as the Stop button: kill the stream AND drop the pending
      // automatic follow-ups (deferred auto-fix, verification countdown).
      return act(false, { kind: 'abort' })
    }
  }

  // Sounds picker: "All" row at index 0, then one row per event.
  if (state.soundsPicker) {
    if (event.key === 'ArrowDown') return act(true, { kind: 'sounds-move', delta: 1 })
    if (event.key === 'ArrowUp') return act(true, { kind: 'sounds-move', delta: -1 })
    if (event.key === 'Enter' || event.key === 'Tab') {
      const idx = state.soundsPicker.selectedIdx >= 0 ? state.soundsPicker.selectedIdx : 0
      const target = idx === 0 ? 'all' : SOUND_EVENTS[idx - 1]
      return act(true, { kind: 'sounds-pick', event: target })
    }
  }

  // Effort picker: one row per (typed-filter-matching) level of the selected
  // mode's model. A fixed-reasoning model or an unmatched filter lists
  // nothing — arrows/Enter fall through (Escape closes; Enter submits the
  // typed text, so an unknown level still gets the "isn't available" card).
  if (state.effortPicker && state.effortPickerVisible.length > 0) {
    if (event.key === 'ArrowDown') return act(true, { kind: 'effort-move', delta: 1 })
    if (event.key === 'ArrowUp') return act(true, { kind: 'effort-move', delta: -1 })
    if (event.key === 'Enter' || event.key === 'Tab') {
      // Highlighted row wins; otherwise an exactly-typed level beats the
      // first substring match ("/effort high" must never apply xhigh's
      // neighbor), then default to the first visible row (mirrors /model).
      let option: EffortOption | undefined =
        state.effortPickerVisible[state.effortPicker.selectedIdx]
      if (!option) {
        const typed = parseEffortCommand(state.input)
        const q = typed?.kind === 'set' ? typed.arg.toLowerCase() : ''
        option =
          (q ? state.effortPickerVisible.find((o) => o.value.toLowerCase() === q) : undefined) ??
          state.effortPickerVisible[0]
      }
      return act(
        true,
        option
          ? { kind: 'effort-pick', mode: state.effortPicker.mode, level: option.value }
          : { kind: 'none' },
      )
    }
  }

  // The optional "manage your own models" row sits after the model rows and
  // participates in arrow/Enter navigation as the last index.
  const modelRowCount = state.visibleModels.length + (state.hasManageCustomModels ? 1 : 0)
  if (state.modelPicker && modelRowCount > 0) {
    if (event.key === 'ArrowDown') return act(true, { kind: 'model-move', delta: 1 })
    if (event.key === 'ArrowUp') return act(true, { kind: 'model-move', delta: -1 })
    if (event.key === 'Enter' || event.key === 'Tab') {
      const picker = state.modelPicker
      const idx = picker.selectedIdx >= 0 ? picker.selectedIdx : 0
      if (state.hasManageCustomModels && idx === state.visibleModels.length) {
        const manageMode =
          picker.mode === 'plan' || picker.mode === 'execute' ? picker.mode : state.liveMode
        return act(true, { kind: 'model-manage', mode: manageMode })
      }
      const model = state.visibleModels[idx]
      if (!model) return act(true, { kind: 'none' })
      // Honor the free-tier clamp for the active mode; ignore Enter on a
      // locked model (the click path shows the upgrade card). Custom
      // (bring-your-own AI) models are never locked — the user pays their
      // own provider directly.
      const locked = picker.mode
        ? isModeModelLocked(
            model.id,
            picker.mode,
            state.isFreeTier,
            state.models,
            state.serverModelDefaults,
          )
        : state.isFreeTier && model.id !== state.freeTierModelId && model.provider !== 'custom'
      return act(true, { kind: 'model-pick', model, mode: picker.mode, locked })
    }
  }

  if (state.filePicker) {
    if (event.key === 'ArrowDown') return act(true, { kind: 'file-move', delta: 1 })
    if (event.key === 'ArrowUp') return act(true, { kind: 'file-move', delta: -1 })
    if (event.key === 'Enter' || event.key === 'Tab') {
      const entry = state.filteredEntries[state.filePicker.selectedIdx]
      return act(true, entry ? { kind: 'file-pick', entry } : { kind: 'none' })
    }
  }

  if (state.commandMenu && state.filteredCmds.length > 0) {
    if (event.key === 'ArrowDown') return act(true, { kind: 'command-move', delta: 1 })
    if (event.key === 'ArrowUp') return act(true, { kind: 'command-move', delta: -1 })
    if (event.key === 'Enter' || event.key === 'Tab') {
      // A showAll menu (opened by the slash BUTTON over existing text) only
      // executes an explicitly highlighted command — a bare Enter closes it
      // and falls through to submit the composer text as typed (Shift+Enter
      // only closes it: the submit below requires no Shift).
      if (state.commandMenu.showAll && state.commandMenu.selectedIdx < 0 && event.key === 'Enter') {
        return event.shiftKey
          ? act(false, { kind: 'close-command' })
          : act(true, { kind: 'command-dismiss-submit' })
      }
      const cmd =
        state.filteredCmds[state.commandMenu.selectedIdx >= 0 ? state.commandMenu.selectedIdx : 0]
      return act(true, cmd ? { kind: 'command-run', id: cmd.id } : { kind: 'none' })
    }
  }

  if (event.key === 'Enter' && !event.shiftKey) return act(true, { kind: 'submit' })

  return ignoreKey()
}

/**
 * The action for a key that does nothing at all.
 * @returns The ignore action.
 */
function ignoreKey(): ComposerKeyAction {
  return { preventDefault: false, effect: { kind: 'none' } }
}

/**
 * The action for a handled key: suppress the browser default and apply `effect`.
 * @param preventDefault - Whether the handler calls `event.preventDefault()`.
 * @param effect - The effect the handler applies.
 * @returns The action.
 */
function act(preventDefault: boolean, effect: ComposerKeyEffect): ComposerKeyAction {
  return { preventDefault, effect }
}
