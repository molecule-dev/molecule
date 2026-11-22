/**
 * React's two `chat:skills` regions of ChatPanel.tsx: the persisted per-project
 * default-loaded skill set (declared above `chat:models`, filled by its settings
 * hydration), the session's loaded set, the `/skills` browser's actions and the
 * proactive "Relevant skill" suggestion, plus the hardened mount seed
 * (`#effect chat:skills:1`, ported by unit P3).
 *
 * The default set starts IMPLICIT — while it is unset, every discovered skill
 * is a default — and the first explicit toggle locks in an explicit set, which
 * only the reset control undoes. The seed loads the project's skills once, and
 * only latches on a NON-EMPTY result: the skill file API can lag at mount, so an
 * empty or failed first load retries a bounded number of times instead of
 * leaving the default set empty forever.
 *
 * @module
 */

import { SvelteSet } from 'svelte/reactivity'

import {
  buildNewSkillTemplate,
  cardSegmentsAround,
  loadProjectSkills,
  newSkillPath,
  parseSkillMeta,
  pickRelevantSkill,
  recentUserText,
  type SkillInfo,
} from '@molecule/app-ide-panel-logic/panels'
import { getLogger } from '@molecule/app-logger'

import type { ChatSetState } from './chat-popups.svelte.js'
import type { ChatContext, MutableRef } from './context.svelte.js'

/** The package logger (the same channel the rest of the panel logs on). */
const logger = getLogger('chat-panel')

/** The identifiers other slices and sections read from the `chat:skills` slice. */
export interface ChatSkillsSlice {
  /** The project's default-loaded skill paths. */
  readonly defaultSkillPaths: ReadonlySet<string>
  /** Sets the default-loaded skill paths. */
  readonly setDefaultSkillPaths: ChatSetState<ReadonlySet<string>>
  /** Whether the user saved an explicit default set (seeding is skipped then). */
  readonly defaultSkillsExplicitRef: MutableRef<boolean>
  /** The same flag, for rendering. */
  readonly defaultSkillsExplicit: boolean
  /** Sets the explicit-flag state. */
  readonly setDefaultSkillsExplicit: ChatSetState<boolean>
  /** The skills the seed discovered in the project. */
  readonly projectSkills: SkillInfo[]
  /** Whether the seed has latched on a non-empty load (a retry is done then). */
  readonly skillsLoadedRef: MutableRef<boolean>
  /** The skills loaded this session. */
  readonly loadedSkillPaths: ReadonlySet<string>
  /** Opens a skill and marks it loaded. */
  readonly loadSkill: (skill: SkillInfo) => void
  /** Creates a skill and returns it, or null when the name is blank. */
  readonly createSkill: (name: string) => Promise<SkillInfo | null>
  /** The top-matching skill to nudge the user to load, or null. */
  readonly relevantSkill: SkillInfo | null
  /** Dismisses the relevant-skill suggestion. */
  readonly dismissRelevantSkill: (skill: SkillInfo) => void
  /** Toggles a skill's membership in the persisted default set. */
  readonly toggleDefaultSkill: (skill: SkillInfo, next: boolean) => void
  /** Resets the default set to every discovered skill. */
  readonly resetDefaultSkills: () => void

  /** React's mount I/O for the region: none — the seed is an effect. */
  mount(): void

  /** React's `#effect chat:skills:<n>` entry points, at React's positions. */
  readonly effects: { 1: () => void }
}

/**
 * Resolves React's `SetStateAction<T>` argument against the latest value.
 *
 * @param previous - The latest value.
 * @param value - The React setter argument: a value or an updater.
 * @returns The next value.
 */
function resolveState<T>(previous: T, value: T | ((previous: T) => T)): T {
  return typeof value === 'function' ? (value as (previous: T) => T)(previous) : value
}

/**
 * Creates the `chat:skills` slice.
 *
 * @param ctx - The shared chat context (the HTTP client, the project, the
 *   transcript, the attachments, the cards and the editor).
 * @returns The default/loaded sets, the seed's state, the browser's actions and
 *   effect 1.
 */
export function createChatSkills(ctx: ChatContext): ChatSkillsSlice {
  /** React's `defaultSkillPaths` state — the project's persisted defaults. */
  let defaultSkillPaths = $state.raw<ReadonlySet<string>>(new SvelteSet<string>())
  /** React's `loadedSkillPaths` state — the skills loaded this session. */
  const loadedSkillPaths = new SvelteSet<string>()
  /** React's `defaultSkillsExplicitRef` — a saved set wins over seeding. */
  const defaultSkillsExplicitRef: MutableRef<boolean> = { current: false }
  /** React's `defaultSkillsExplicit` state — the same flag, for rendering. */
  let defaultSkillsExplicit = $state(false)
  /** React's `projectSkills` — what the seed discovered (the browser lists them). */
  let projectSkills = $state.raw<SkillInfo[]>([])
  /** React's `skillsLoadedRef` — latched only by a successful, non-empty load. */
  const skillsLoadedRef: MutableRef<boolean> = { current: false }
  /** React's `dismissedSkillPaths` state — suggestions dismissed this session. */
  let dismissedSkillPaths = $state.raw<readonly string[]>([])
  // The prop this slice's effect depends on, through a derived cell: the props
  // object invalidates as a whole when the host changes any prop, and a derived
  // re-notifies only when ITS value changed (React's `[http, projectId]`).
  const liveProjectId = $derived(ctx.props.projectId)

  /**
   * React's `setDefaultSkillPaths`.
   *
   * @param value - The next set, or an updater of the latest one.
   */
  const setDefaultSkillPaths = (
    value: ReadonlySet<string> | ((previous: ReadonlySet<string>) => ReadonlySet<string>),
  ): void => {
    defaultSkillPaths = resolveState(defaultSkillPaths, value)
  }

  /**
   * React's `setDefaultSkillsExplicit`.
   *
   * @param value - The next flag, or an updater of the latest one.
   */
  const setDefaultSkillsExplicit = (value: boolean | ((previous: boolean) => boolean)): void => {
    defaultSkillsExplicit = resolveState(defaultSkillsExplicit, value)
  }

  /**
   * Loads a skill from the `/skills` browser (or the proactive suggestion):
   * opens its `SKILL.md` in the editor and marks it loaded for this session,
   * then confirms with a system card.
   *
   * Loading does NOT attach the skill as message context: the agent already sees
   * every skill's name + description in its system prompt and reads bodies on
   * demand, and persistent "always-loaded" injection is configured separately
   * through the default-skills set.
   *
   * @param skill - The skill to load.
   */
  const loadSkill = (skill: SkillInfo): void => {
    // Record it as loaded-this-session (the shared source of truth for the tip
    // and the /skills "Loaded" badge).
    loadedSkillPaths.add(skill.path)
    // Open the skill in the editor (onFileOpen expects a project-relative path,
    // no leading slash). Loading a skill does NOT attach it as context.
    ctx.props.onFileOpen?.(skill.path, { focus: true })
    // Confirm with a compact card whose skill name re-opens it in the editor.
    const loaded = (name: string): string =>
      ctx.env.t('ide.chat.skills.loaded', { name }, { defaultValue: 'Loaded {{name}} skill' })
    const content = cardSegmentsAround(loaded, {
      label: skill.name,
      code: true,
      onClick: () => ctx.props.onFileOpen?.(skill.path, { focus: true }),
    })
    ctx.systemCards.addSystemCard(loaded(skill.name), content ? { content } : {})
  }

  /**
   * Creates a new project skill (the `/skills` browser's "New skill" form):
   * writes a starter `.agents/skills/<slug>/SKILL.md` (name + description
   * frontmatter), opens it in the editor for authoring, and confirms with a
   * system card.
   *
   * @param name - The skill's display name.
   * @returns The created skill (so the browser can list it without a re-fetch),
   *   or `null` when the name is blank or the write failed.
   */
  const createSkill = async (name: string): Promise<SkillInfo | null> => {
    const display = name.trim()
    if (!display) return null
    const path = newSkillPath(display)
    const content = buildNewSkillTemplate(display)
    try {
      await ctx.env.http.put(`/projects/${ctx.props.projectId}/files/${path}`, { content })
    } catch (error) {
      logger.warn('Failed to create skill', { error })
      ctx.systemCards.addSystemCard(
        ctx.env.t('ide.chat.skills.createError', undefined, {
          defaultValue: 'Could not create the skill — please try again.',
        }),
      )
      return null
    }
    // Open the new SKILL.md so the user can author it right away.
    ctx.props.onFileOpen?.(path, { focus: true })
    ctx.systemCards.addSystemCard(
      ctx.env.t(
        'ide.chat.skills.created',
        { name: display },
        {
          defaultValue:
            'Created skill “{{name}}” — opened in the editor. Fill in its description and steps.',
        },
      ),
    )
    const meta = parseSkillMeta(path, content)
    return { path, name: meta.name, description: meta.description }
  }

  /**
   * The top-matching skill to nudge the user to load — `null` when it is already
   * loaded (@-loaded this session, default-loaded in the prompt, dismissed or
   * attached), so the tip never suggests context the agent already has.
   */
  const relevantSkill = $derived(
    pickRelevantSkill(projectSkills, recentUserText(ctx.chat.messages), {
      dismissed: new SvelteSet(dismissedSkillPaths),
      attachedPaths: new SvelteSet(
        ctx.popups.attachedFiles
          .map((file) => file.path)
          .filter((path): path is string => path !== undefined),
      ),
      loaded: loadedSkillPaths,
      defaultLoaded: defaultSkillPaths,
    }),
  )

  /**
   * Dismisses the proactive suggestion for the rest of the session.
   *
   * @param skill - The suggested skill.
   */
  const dismissRelevantSkill = (skill: SkillInfo): void => {
    if (dismissedSkillPaths.includes(skill.path)) return
    dismissedSkillPaths = [...dismissedSkillPaths, skill.path]
  }

  /**
   * Toggles a skill's membership in the persisted per-project default-loaded
   * set (`settings.defaultSkills`) and saves it. Optimistically updates local
   * state, then PATCHes the project; on failure it rolls back so the badge and
   * toggle reflect the server.
   *
   * @param skill - The skill to toggle.
   * @param next - `true` to add it to the default set, `false` to remove it.
   */
  const toggleDefaultSkill = (skill: SkillInfo, next: boolean): void => {
    // Skills haven't loaded yet: the seeding effect fills `defaultSkillPaths`
    // (= every discovered skill) only AFTER `loadProjectSkills` resolves. A
    // toggle before that would read the empty initial set as the base and
    // persist a bogus one-element explicit array (and lock the explicit flag),
    // a one-way door out of the unset→all default. Ignore the click until
    // skills exist.
    if (projectSkills.length === 0) return
    // While the set is still IMPLICIT (unset → ALL skills are default), the
    // effective current default set is EVERY loaded skill — so compute the base
    // from all skills, not the (possibly still-empty) badge set.
    const base = defaultSkillsExplicitRef.current
      ? defaultSkillPaths
      : new SvelteSet(projectSkills.map((s) => s.path))
    if (next === base.has(skill.path)) return
    // Any explicit toggle locks in an explicit set (persisted below), so the
    // "all initial skills" default no longer re-seeds it.
    const previous = defaultSkillPaths
    const previousExplicit = defaultSkillsExplicitRef.current
    defaultSkillsExplicitRef.current = true
    setDefaultSkillsExplicit(true)
    const updated = new SvelteSet(base)
    if (next) updated.add(skill.path)
    else updated.delete(skill.path)
    setDefaultSkillPaths(new SvelteSet(updated))
    void ctx.env.http
      .patch(`/projects/${ctx.props.projectId}`, { settings: { defaultSkills: [...updated] } })
      .catch((error: unknown) => {
        // Roll back the optimistic toggle so the badge/toggle reflect the server.
        logger.warn('Failed to persist default skills to server', { error })
        defaultSkillsExplicitRef.current = previousExplicit
        setDefaultSkillsExplicit(previousExplicit)
        setDefaultSkillPaths(previous)
      })
  }

  /**
   * Resets the per-project default-loaded skill set back to the IMPLICIT "ALL
   * skills are default" state, undoing any explicit set the user built via the
   * per-row toggles. PATCHes `settings.defaultSkills: null` so the backend
   * likewise treats it as unset; on failure it rolls back local state.
   */
  const resetDefaultSkills = (): void => {
    const previous = defaultSkillPaths
    const previousExplicit = defaultSkillsExplicitRef.current
    defaultSkillsExplicitRef.current = false
    setDefaultSkillsExplicit(false)
    setDefaultSkillPaths(new SvelteSet(projectSkills.map((s) => s.path)))
    void ctx.env.http
      .patch(`/projects/${ctx.props.projectId}`, { settings: { defaultSkills: null } })
      .catch((error: unknown) => {
        // Roll back so the badge/toggle reflect the server.
        logger.warn('Failed to reset default skills on server', { error })
        defaultSkillsExplicitRef.current = previousExplicit
        setDefaultSkillsExplicit(previousExplicit)
        setDefaultSkillPaths(previous)
      })
  }

  return {
    get defaultSkillPaths(): ReadonlySet<string> {
      return defaultSkillPaths
    },
    setDefaultSkillPaths,
    defaultSkillsExplicitRef,
    get defaultSkillsExplicit(): boolean {
      return defaultSkillsExplicit
    },
    setDefaultSkillsExplicit,
    get projectSkills(): SkillInfo[] {
      return projectSkills
    },
    skillsLoadedRef,
    get loadedSkillPaths(): ReadonlySet<string> {
      return loadedSkillPaths
    },
    loadSkill,
    createSkill,
    get relevantSkill(): SkillInfo | null {
      return relevantSkill
    },
    dismissRelevantSkill,
    toggleDefaultSkill,
    resetDefaultSkills,
    mount(): void {
      // React's region declares state and the seed effect; the seed itself is
      // registered below at React's effect position.
    },
    effects: {
      1: (): void => {
        $effect(() => {
          const http = ctx.env.http
          const projectId = liveProjectId
          if (skillsLoadedRef.current) return
          let cancelled = false
          let attempts = 0
          let retryTimer: ReturnType<typeof setTimeout> | undefined
          // A handful of ~1.5 s attempts outlasts the file-API warm-up without
          // nagging if the project genuinely has no skills.
          const SEED_RETRY_MS = 1500
          const SEED_MAX_ATTEMPTS = 5

          /** Schedules the next bounded attempt, unless one cannot help. */
          const scheduleRetry = (): void => {
            if (cancelled || attempts >= SEED_MAX_ATTEMPTS) return
            retryTimer = setTimeout(() => {
              void attempt()
            }, SEED_RETRY_MS)
          }

          /** Loads the project's skills once and seeds the default set. */
          const attempt = async (): Promise<void> => {
            if (cancelled || skillsLoadedRef.current) return
            attempts++
            try {
              const loaded = await loadProjectSkills(
                async () =>
                  (await http.get<{ files: string[] }>(`/projects/${projectId}/files-list`)).data
                    .files ?? [],
                async (relativePath) =>
                  (
                    await http.get<{ content: string }>(
                      `/projects/${projectId}/files/${relativePath}`,
                    )
                  ).data.content,
              )
              // Don't write state after unmount — the fetch resolving
              // post-teardown would otherwise update a dead panel.
              if (cancelled) return
              if (loaded.length === 0) {
                // Empty: the file API likely isn't serving `.agents` yet.
                // Retry without latching so a later attempt can still seed.
                scheduleRetry()
                return
              }
              // Latch ONLY on a successful, non-empty load — a retry can still
              // run before this.
              skillsLoadedRef.current = true
              projectSkills = loaded
              // With no explicit saved set, ALL initial/discovered skills are
              // default — seed the badge set so the /skills browser reflects it.
              if (!defaultSkillsExplicitRef.current) {
                setDefaultSkillPaths(new SvelteSet(loaded.map((s) => s.path)))
              }
            } catch (error) {
              // Best-effort — a failed skills fetch must never disrupt the
              // chat. Retry a few times (the file API may be warming up);
              // after the cap, skip silently.
              logger.debug('Skill seed load failed; will retry if attempts remain', { error })
              if (!cancelled) scheduleRetry()
            }
          }

          void attempt()
          return () => {
            cancelled = true
            if (retryTimer) clearTimeout(retryTimer)
          }
        })
      },
    },
  }
}
