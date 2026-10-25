/**
 * Core types for the shared AI agent tool system.
 *
 * @module
 */

/**
 * Abstraction over the execution environment.
 * Implemented by SandboxBackend (Docker) and LocalBackend (host filesystem).
 */
export interface ExecutionBackend {
  /** The root directory for all operations (e.g. '/workspace' or '/Users/.../project'). */
  readonly projectRoot: string

  /**
   * Marks backends that operate DIRECTLY on the host filesystem (the local
   * backend), as opposed to a contained sandbox. Consumers use it to judge
   * how loud to be about disabled safety guards — a `..` path or symlink
   * escape on a host backend reaches the operator's real files, while the
   * same escape in a sandbox stays contained.
   */
  readonly hostFs?: boolean

  /** Read a file's content as UTF-8 string. */
  readFile(path: string): Promise<string>

  /** Write content to a file. Creates parent directories as needed. */
  writeFile(path: string, content: string): Promise<void>

  /** Delete a file. */
  deleteFile(path: string): Promise<void>

  /** List entries in a directory. */
  readDir(path: string): Promise<Array<{ name: string; type: 'file' | 'directory' }>>

  /**
   * Run a shell command. Returns stdout, stderr, and exit code.
   * Backends implement this safely (sandbox.exec for Docker, execFile for local).
   */
  run(
    command: string,
    opts?: {
      cwd?: string
      timeout?: number
      /**
       * A budget (ms) the backend enforces INSIDE its own shell, after any
       * environment sourcing a consumer wraps around the command — so an
       * overrun is stopped where it runs and the output so far still comes
       * back, with exit code 124. A backend that cannot enforce it ignores it.
       */
      budgetMs?: number
    },
  ): Promise<{ stdout: string; stderr: string; exitCode: number }>
}

/**
 * The supplied suite's own settings, put back on a run whose runner config changes them.
 *
 * A graded suite is walked by the grader under its own per-test budget, worker count and
 * timeouts. An executor's run that reads a config setting different numbers measures a run the
 * grader never sees: a shorter budget fails tests the graded walk passes, a longer one passes
 * tests the graded walk times out on. The platform that knows the suite supplies these values
 * before the run ({@link ToolBuildConfig.suiteBudget}); the shared tool puts the flags on the
 * runner's own command line, where Playwright lets them win over every config file.
 */
export interface SuiteBudgetPin {
  /**
   * The Playwright flags that carry the suite's own settings onto the command
   * (`--timeout=15000`, `--workers=1`), as the consumer's own scan reads them. Empty when the
   * difference is in settings no flag carries.
   */
  flags: string[]
  /** One sentence for the run's result: which of the suite's own settings this run uses. */
  note: string
  /**
   * A config file the consumer wrote OUTSIDE the supplied suite, which re-imports the config the
   * run selected and pins the settings no Playwright flag can carry (`expect.timeout`,
   * `use.actionTimeout`, `use.navigationTimeout`). When present, the run is launched with
   * `--config <this path>` in place of the config it named, so those settings are the suite's own
   * rather than the executor's. Absent when the consumer could not write one.
   */
  config?: string
  /**
   * Every setting the derived config ({@link config}) pins at the suite's own value, by the scan's
   * key (`timeout`, `expect.timeout`, `actionTimeout`, `navigationTimeout`), in milliseconds as
   * digits. Empty when no derived config was placed.
   */
  values?: Record<string, string>
  /**
   * Every setting the run's own config makes different from the suite's, as the consumer's scan
   * read them: the value this run's config writes and the suite's own. The tool reports the ones
   * its placement did NOT put back, so a result never claims a drift it carried.
   */
  drift?: Record<string, { used: string; suite: string }>
}

/**
 * Configuration for building the tool set.
 * Allows consumers to customize security, callbacks, and tool selection.
 */
export interface ToolBuildConfig {
  /** Which tools to include. Defaults to all. */
  include?: string[]

  /** Which tools to exclude. Applied after include. */
  exclude?: string[]

  /** Whether to validate paths stay within projectRoot. Default: true. */
  pathGuards?: boolean

  /** Whether to check symlinks resolve within projectRoot. Default: false (sandbox-only). */
  symlinkGuards?: boolean

  /** Whether to redact secrets in file reads and command output. Default: true. */
  redactSecrets?: boolean

  /** Whether to block dangerous shell commands (env dumps, /proc access). Default: false. */
  blockDangerousCommands?: boolean

  /**
   * Consumer-specific command guard for `exec_command`, checked BEFORE execution (after
   * the built-in dangerous-command check). Return an error string to block the command —
   * it is returned to the model verbatim, so make it actionable (say what to do instead) —
   * or `null`/`undefined` to allow it. Keeps environment-specific rules (e.g. an IDE
   * sandbox forbidding installs that would break its preinstalled library) out of this
   * shared package.
   *
   * @param command - The shell command the model asked to run.
   * @param cwd - The resolved working directory it would run in.
   * @returns An error string to block, or null/undefined to allow.
   */
  blockCommand?: (command: string, cwd: string) => string | null | undefined

  /**
   * Timeout (ms) for a single `exec_command` run. `exec_command` legitimately
   * runs LONG — `npm install`, a production build, a test suite — so the default
   * is generous (2 min); the old 30 s hardcap killed those spuriously. A consumer
   * that wraps tool calls in its own outer timeout should set this to match (or
   * slightly exceed) that budget so its own timeout is the effective bound and
   * produces the nicer "tool timed out" message. Quick commands are unaffected —
   * this is only the ceiling before a wedged command is killed.
   */
  execTimeoutMs?: number

  /**
   * Budget (ms) for a single `exec_command`, passed to `backend.run` as
   * `budgetMs`: the backend runs the command under `timeout` in its own shell,
   * so when it overruns it is stopped there and the tool still returns
   * everything it printed until then (exit code 124 plus an `error` naming
   * the limit). Without this, an outer per-tool timeout races the run and
   * discards minutes of build or test output along with the result. Set it a
   * little under that outer timeout. Unset = no budget.
   */
  commandBudgetMs?: number

  /**
   * Opt in to one partial diagnostic return for a task driving this known deployed URL.
   * Return null when the task already returned a wait result or its history is unknown.
   * Only a real suite command with a complete inline failure report can yield; it remains
   * running, with no exit code or completed proof. Absent leaves ordinary waits unchanged.
   */
  yieldOnFirstFailureFor?: (taskId: string) => string | null

  /**
   * How long (ms) exec_command waits for a command it backgrounded only because the
   * command asked for more than {@link commandBudgetMs}, before handing back a task
   * id; one that finishes inside it returns like a foreground run. Default 45000.
   */
  overCeilingGraceMs?: number

  /**
   * Directory names `search_files` and `find_files` skip (VS Code
   * `search.exclude` semantics). Defaults to `DEFAULT_SEARCH_EXCLUDED_DIRS`
   * (node_modules, VCS dirs, build output). Pass the consumer's per-project
   * setting so every search surface shares ONE synchronized set.
   */
  searchExcludedDirs?: string[]

  /**
   * Whether a LARGE HTML document should come back as its OUTLINE — the head's
   * tags and the tags that open each body section, one line each, plus a note
   * naming the offset/limit that returns the whole document — instead of its
   * whole text. Over {@link MAX_HTML_INLINE_CHARS}, and only when the read named
   * no line window.
   *
   * A getter, not a boolean, because the answer belongs to the TURN, not to the
   * tool set: a host that plans first and builds after wants an outline while the
   * executor is researching (where a read it cannot act on is pure context cost)
   * and the document itself while it is writing the page. Unset means every big
   * HTML read returns its text, which is what a host with no such phases wants.
   *
   * @returns True when a large HTML read should be outlined rather than returned.
   */
  outlineLargeHtml?: () => boolean

  /**
   * The test titles the person's request EXCLUDES by name (molecule-dev's `excludedTestTitles`),
   * asked when a finished suite run's cause note is built. Their failures are not causes to fix:
   * the note drops them, says so at the end, and inverts them out of the narrowed re-run it hands
   * over — a result must never name a test beside "it does not count" (an executor once spent a
   * turn and an edit on the excluded test).
   *
   * A getter, not an array, because the request is read per turn while the tool set is built
   * once. Unset means no test is excluded.
   *
   * @returns The quoted titles the request carves out.
   */
  excludedTestTitles?: () => readonly string[]

  /**
   * The `NAME=value` settings the person's request REQUIRES of a suite run (molecule-dev's
   * `requiredRunSettings` — its mode, say), asked when the cause note composes a narrowed re-run
   * of a finished run's failures. A re-run composed from the executor's own command inherits what
   * that command set — and nothing it left out, so a run that measured the suite in `spa` handed
   * back a re-run that would measure `spa` again (the request names `TEST_MODE=fullstack`, and
   * both the run and its re-run omitted it).
   *
   * A getter, not an array: the request is read per turn while the tool set is built once, and
   * what the suite's own files read is the consumer's reading. Unset answers "nothing required".
   *
   * @param command - The command the finished run was started with.
   * @param cwd - The resolved working directory it ran in.
   * @returns The settings to put on a re-run of that command.
   */
  requiredSuiteEnv?: (
    command: string,
    cwd: string,
  ) => Promise<readonly { name: string; value: string }[] | null | undefined>

  /**
   * The supplied suite's own budget, when the Playwright config a command would load sets
   * different settings, asked BEFORE the run executes. The consumer knows where the suite and its
   * base config live; this shared package does not, so the reading is the consumer's and the
   * mechanics — putting the flags on the runner's own arguments, before the pipeline and outside
   * any redirect or group closer, and pointing `--config` at the derived config that carries the
   * settings no flag can — are this tool's.
   *
   * Called for a Playwright suite command only, and only the LAST suite step is touched. A run
   * that already keeps the suite's settings, or a sandbox with no supplied suite, answers `null`.
   * Unset (or a hook that throws) changes nothing: the command runs as the model wrote it.
   *
   * @param command - The shell command, as the model sent it.
   * @param cwd - The resolved working directory it will run in.
   * @returns The flags, the derived config and the sentence, or null when nothing is put back.
   */
  suiteBudget?: (command: string, cwd: string) => Promise<SuiteBudgetPin | null | undefined>

  /**
   * A whole walk's duration in ms, as the consumer measured it. A suite run the executor detached
   * whose own `timeout` is shorter than this is lifted; unset lifts only a bound no longer
   * than this tool's ceiling.
   *
   * @param command - The suite command.
   * @param cwd - The run's working directory.
   * @returns The duration in ms, or null.
   */
  suiteRunMs?: (command: string, cwd: string) => Promise<number | null | undefined>

  /** Post-write hook (e.g. auto-format via Prettier/ESLint). Called after every write_file/edit_file. */
  onAfterWrite?: (path: string) => Promise<void>

  /** Diff tracking callback. Called before writes with old/new content. */
  onFileDiff?: (event: FileDiffEvent) => void

  /** Structural change callback. Called on create_directory, delete_file, rename_file. */
  onFileChange?: (event: FileChangeEvent) => void
}

/**
 * Payload emitted when a tracked file changes contents.
 */
export interface FileDiffEvent {
  path: string
  oldContent: string | null
  newContent: string
}

/**
 * Payload emitted when a file is created, modified, or deleted structurally.
 */
export interface FileChangeEvent {
  type: 'created' | 'modified' | 'deleted'
  path: string
}

/** Metadata for a discovered skill (used in PromptContext). */
export interface SkillEntry {
  /** Skill name. */
  name: string
  /** Short description. */
  description: string
  /** Relative path to the SKILL.md file. */
  path: string
}

/**
 * Context for building a composable system prompt.
 */
export interface PromptContext {
  /** Agent identity (e.g. 'Synthase', 'Polish Agent'). */
  agentName: string

  /** Project root path. */
  projectRoot: string

  /** Names of available tools (for the tool listing section). */
  tools: string[]

  /** Project-specific rules (AGENTS.md or CLAUDE.md content). */
  projectDocs?: string

  /** Additional skill/reference content to inject. */
  skills?: string[]

  /** Discovered skills to list in the prompt (use load_skill to read on demand). */
  discoveredSkills?: SkillEntry[]

  /** Custom sections to append to the prompt. */
  customSections?: string[]
}
