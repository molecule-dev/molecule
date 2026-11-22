/**
 * `chat:skills` — the skill browser's state and actions, ported from React's two
 * `chat:skills` regions: the persisted per-project default-loaded set (unset
 * means every discovered skill is default), the set loaded this session, the
 * `/skills` browser's Load/Create actions, and the proactive "Relevant skill"
 * suggestion above the composer.
 *
 * The hardened seeding effect (`#effect chat:skills:1`, owned by unit P3) keeps
 * React's body unchanged: it must not latch its guard until a NON-EMPTY load
 * succeeds, because the skill file API can lag at mount (the sandbox isn't
 * serving `.agents` yet) — so on an empty or failed load it schedules a bounded
 * retry.
 *
 * @module
 */

import type { Accessor, Setter } from 'solid-js'
import { createEffect, createMemo, createSignal, on, onCleanup } from 'solid-js'

import type { SkillInfo } from '@molecule/app-ide-panel-logic/panels'
import {
  buildNewSkillTemplate,
  cardSegmentsAround,
  loadProjectSkills,
  newSkillPath,
  parseSkillMeta,
  pickRelevantSkill,
  recentUserText,
} from '@molecule/app-ide-panel-logic/panels'

import type { ChatInnerCtx, MutableRef, SliceEffects } from './context.js'

/** What other slices read from `chat:skills`. */
export interface ChatSkillsSlice {
  /** The project's default-loaded skill paths. */
  defaultSkillPaths: Accessor<ReadonlySet<string>>
  /** Sets the default-loaded skill paths. */
  setDefaultSkillPaths: Setter<ReadonlySet<string>>
  /** Whether the user saved an explicit default set (seeding is skipped then). */
  defaultSkillsExplicitRef: MutableRef<boolean>
  /** The same flag, for rendering. */
  defaultSkillsExplicit: Accessor<boolean>
  /** Sets the explicit-flag state. */
  setDefaultSkillsExplicit: Setter<boolean>
  /** The skills loaded this session. */
  loadedSkillPaths: Accessor<ReadonlySet<string>>
  /** Opens a skill and marks it loaded. */
  loadSkill: (skill: SkillInfo) => void
  /** Creates a skill and returns it, or null when the name is blank. */
  createSkill: (name: string) => Promise<SkillInfo | null>
  /** The top-matching skill to nudge the user to load, or null. */
  relevantSkill: Accessor<SkillInfo | null>
  /** Dismisses the relevant-skill suggestion. */
  dismissRelevantSkill: (skill: SkillInfo) => void
  /** Toggles a skill's membership in the persisted default set. */
  toggleDefaultSkill: (skill: SkillInfo, next: boolean) => void
  /** Resets the default set to every discovered skill. */
  resetDefaultSkills: () => void
  /** The slice's effects, by ledger position. */
  effects: SliceEffects
}

/**
 * Creates `chat:skills`.
 * @param ctx - The inner ctx (its project, HTTP client and logger; the
 *   transcript, attachments, system cards and editor the actions read).
 * @returns The skills slice.
 */
export function createChatSkills(ctx: ChatInnerCtx): ChatSkillsSlice {
  const { http, logger } = ctx.env
  const [defaultSkillPaths, setDefaultSkillPaths] = createSignal<ReadonlySet<string>>(new Set())
  const [defaultSkillsExplicit, setDefaultSkillsExplicit] = createSignal(false)
  const [loadedSkillPaths, setLoadedSkillPaths] = createSignal<ReadonlySet<string>>(new Set())
  // The skills discovered this session (read by the toggle math and the
  // suggestion pass) and the guard that latches once a non-empty load succeeded.
  const [projectSkills, setProjectSkills] = createSignal<SkillInfo[]>([])
  const skillsLoadedRef: MutableRef<boolean> = { current: false }
  const defaultSkillsExplicitRef: MutableRef<boolean> = { current: false }
  const [dismissedSkillPaths, setDismissedSkillPaths] = createSignal<readonly string[]>([])

  /**
   * Loads a skill from the `/skills` browser (or the proactive suggestion): opens
   * its `SKILL.md` in the editor and marks it loaded for this session, then
   * confirms with a system card.
   *
   * Loading does NOT attach the skill as message context: the agent already sees
   * every skill's name + description in its system prompt and reads bodies on
   * demand, and persistent "always-loaded" injection is configured separately via
   * the default-skills set (the "Default" toggle in the `/skills` browser).
   *
   * @param skill - The skill to load.
   */
  const loadSkill = (skill: SkillInfo): void => {
    // Record it as loaded-this-session (shared source of truth for the tip + the
    // /skills "Loaded" badge). Set is treated as immutable so consumers re-render.
    setLoadedSkillPaths((prev) => (prev.has(skill.path) ? prev : new Set(prev).add(skill.path)))
    // Open the skill in the editor (onFileOpen expects a project-relative path, no
    // leading slash). Loading a skill does NOT attach it as context — it just opens
    // it; the agent reads the skill file on demand, like every other harness.
    ctx.props.onFileOpen?.(skill.path, { focus: true })
    // Confirm with a compact card: "Loaded `<skill>` skill" — the name rendered as a
    // clickable monospace span that re-opens it in the editor. No attachment wording.
    // One translated sentence, split where its {{name}} lands, so each language
    // places the name itself.
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
      await http.put(`/projects/${ctx.props.projectId}/files/${path}`, { content })
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

  // The top-matching skill to nudge the user to load — null if it is already
  // loaded (this session OR default-loaded / always-on in the prompt) so we never
  // suggest context the agent already has.
  const relevantSkill = createMemo<SkillInfo | null>(() =>
    pickRelevantSkill(projectSkills(), recentUserText(ctx.chat.messages()), {
      dismissed: new Set(dismissedSkillPaths()),
      attachedPaths: new Set(
        ctx.popups
          .attachedFiles()
          .map((file) => file.path)
          .filter((path): path is string => path !== undefined),
      ),
      loaded: loadedSkillPaths(),
      defaultLoaded: defaultSkillPaths(),
    }),
  )

  /**
   * Dismisses the proactive suggestion for the rest of the conversation.
   * @param skill - The suggested skill.
   */
  const dismissRelevantSkill = (skill: SkillInfo): void => {
    setDismissedSkillPaths((prev) => (prev.includes(skill.path) ? prev : [...prev, skill.path]))
  }

  /**
   * Toggles a skill's membership in the persisted per-project default-loaded set
   * (`settings.defaultSkills`) and saves it. Optimistically updates local state,
   * then PATCHes the project (mirroring the other settings-patch paths); on failure
   * it rolls back so the badge/toggle reflect the server. The backend injects each
   * default skill's full body into the system prompt, so "default" means the skill
   * is always loaded for the agent (P2-06/P2-08).
   *
   * @param skill - The skill to toggle.
   * @param next - `true` to add it to the default set, `false` to remove it.
   */
  const toggleDefaultSkill = (skill: SkillInfo, next: boolean): void => {
    // Skills haven't loaded yet: the seeding effect fills `defaultSkillPaths`
    // (= every discovered skill) only AFTER `loadProjectSkills` resolves — a
    // sandbox exec that takes seconds. A toggle before that would read the
    // empty initial set as the base and persist a bogus 1-element explicit
    // array (and lock `defaultSkillsExplicitRef`), a one-way door out of the
    // unset→all default (P3-11). Ignore the click until skills exist.
    if (projectSkills().length === 0) return
    // While the set is still IMPLICIT (unset → ALL skills are default), the
    // effective current default set is EVERY loaded skill — so compute the base
    // from all skills, not the (possibly still-empty / not-yet-seeded) badge
    // set. That way toggling one OFF persists "all-minus-one", never the bogus
    // "[just-this-one]".
    const base = defaultSkillsExplicitRef.current
      ? defaultSkillPaths()
      : new Set(projectSkills().map((s) => s.path))
    if (next === base.has(skill.path)) return
    // Any explicit toggle locks in an explicit set (persisted below), so the
    // "all initial skills" default no longer re-seeds it (P3-11).
    const previous = defaultSkillPaths()
    const previousExplicit = defaultSkillsExplicitRef.current
    defaultSkillsExplicitRef.current = true
    setDefaultSkillsExplicit(true)
    const updated = new Set(base)
    if (next) updated.add(skill.path)
    else updated.delete(skill.path)
    setDefaultSkillPaths(updated)
    void http
      .patch(`/projects/${ctx.props.projectId}`, { settings: { defaultSkills: [...updated] } })
      .catch((error: unknown) => {
        // Roll back the optimistic toggle (set + explicit flag) so the
        // badge/toggle reflect the server.
        logger.warn('Failed to persist default skills to server', { error })
        defaultSkillsExplicitRef.current = previousExplicit
        setDefaultSkillsExplicit(previousExplicit)
        setDefaultSkillPaths(previous)
      })
  }

  /**
   * Resets the per-project default-loaded skill set back to the IMPLICIT
   * "ALL skills are default" state (P3-11), undoing any explicit set the user
   * built via the per-row toggles. Clears the explicit flag, re-seeds the badge
   * set to every loaded skill, and PATCHes `settings.defaultSkills: null` so the
   * backend likewise treats it as unset → injects every skill's body. On failure
   * it rolls back local state (mirroring {@link toggleDefaultSkill}). This is the
   * only way back through the otherwise one-way door of the first explicit toggle.
   */
  const resetDefaultSkills = (): void => {
    const previous = defaultSkillPaths()
    const previousExplicit = defaultSkillsExplicitRef.current
    defaultSkillsExplicitRef.current = false
    setDefaultSkillsExplicit(false)
    setDefaultSkillPaths(new Set(projectSkills().map((s) => s.path)))
    void http
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
    defaultSkillPaths,
    setDefaultSkillPaths,
    defaultSkillsExplicitRef,
    defaultSkillsExplicit,
    setDefaultSkillsExplicit,
    loadedSkillPaths,
    loadSkill,
    createSkill,
    relevantSkill,
    dismissRelevantSkill,
    toggleDefaultSkill,
    resetDefaultSkills,
    effects: {
      // #effect chat:skills:1
      1: () => {
        // React's dependency list is the HTTP client and the project: a changed
        // one cancels the running attempt chain (its cleanup) and starts over —
        // the load guard then makes the new run a no-op once seeding succeeded.
        createEffect(
          on(
            () => [ctx.env.http, ctx.props.projectId],
            () => {
              if (skillsLoadedRef.current) return
              let cancelled = false
              let attempts = 0
              let retryTimer: ReturnType<typeof setTimeout> | undefined
              // A handful of ~1.5s attempts outlasts the file-API warm-up without
              // nagging if the project genuinely has no skills.
              const SEED_RETRY_MS = 1500
              const SEED_MAX_ATTEMPTS = 5

              const scheduleRetry = (): void => {
                if (cancelled || attempts >= SEED_MAX_ATTEMPTS) return
                retryTimer = setTimeout(() => {
                  void attempt()
                }, SEED_RETRY_MS)
              }

              const attempt = async (): Promise<void> => {
                if (cancelled || skillsLoadedRef.current) return
                attempts++
                try {
                  const loaded = await loadProjectSkills(
                    async () =>
                      (
                        await http.get<{ files: string[] }>(
                          `/projects/${ctx.props.projectId}/files-list`,
                        )
                      ).data.files ?? [],
                    async (relativePath) =>
                      (
                        await http.get<{ content: string }>(
                          `/projects/${ctx.props.projectId}/files/${relativePath}`,
                        )
                      ).data.content,
                  )
                  // Don't setState after unmount — the fetch resolving post-teardown
                  // would otherwise schedule a commit with no DOM behind it.
                  if (cancelled) return
                  if (loaded.length === 0) {
                    // Empty: the file API likely isn't serving `.agents` yet. Retry
                    // without latching so a later attempt can still seed the
                    // scaffolded skills.
                    scheduleRetry()
                    return
                  }
                  // Latch ONLY on a successful, non-empty load — a retry can still run
                  // before this.
                  skillsLoadedRef.current = true
                  setProjectSkills(loaded)
                  // P3-11: with no explicit saved set, ALL initial/discovered skills
                  // are default — seed the badge set so the /skills browser reflects
                  // it (the backend likewise injects every initial skill when
                  // defaultSkills is unset).
                  if (!defaultSkillsExplicitRef.current) {
                    setDefaultSkillPaths(new Set(loaded.map((skill) => skill.path)))
                  }
                  // NB: the "Loaded {{count}} skills" card is emitted server-side (a
                  // `skills_loaded` custom event), so this effect only seeds the
                  // local /skills browser state.
                } catch (error) {
                  // Best-effort — a failed skills fetch must never disrupt the chat.
                  // Retry a few times (the file API may be warming up); after the
                  // cap, skip silently.
                  logger.debug('Skill seed load failed; will retry if attempts remain', { error })
                  if (!cancelled) scheduleRetry()
                }
              }

              void attempt()
              onCleanup(() => {
                cancelled = true
                if (retryTimer) clearTimeout(retryTimer)
              })
            },
          ),
        )
      },
    },
  }
}
