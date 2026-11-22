/**
 * `chat:skills` — discovered skills, the default-loaded set and its hardened
 * seed, the session's loaded set, the `/skills` browser's actions and the
 * proactive suggestion, ported from React's two `chat:skills` regions.
 *
 * The persisted per-project default set (`settings.defaultSkills`) starts
 * IMPLICIT — while it is unset, every discovered skill is a default — and the
 * first explicit toggle locks in an explicit set, which only the reset control
 * undoes. The hardened seed (`#effect chat:skills:1`, owned by P3) discovers the
 * project's skills once and retries a bounded number of times without latching,
 * so the scaffolded skills still become the default set after a slow sandbox
 * boot.
 *
 * @module
 */

import { computed, type ComputedRef, onMounted, onUnmounted, type Ref, ref, watch } from 'vue'

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

import type { ChatCtx, ChatEffect, MutableRef, SetState } from './context.js'

const logger = getLogger('chat-panel')

/**
 * Wraps a ref in React's `setState` shape: a value, or an updater of the
 * previous value.
 *
 * @param target - The ref the state lives in.
 * @returns The setter.
 */
function makeSetter<T>(target: Ref<T>): SetState<T> {
  return (value) => {
    target.value = typeof value === 'function' ? (value as (previous: T) => T)(target.value) : value
  }
}

/** What the `chat:skills` slice exposes. */
export interface ChatSkillsSlice {
  /** The skills every new conversation loads by default. */
  readonly defaultSkillPaths: Ref<ReadonlySet<string>>
  /** Sets the default-loaded skill paths. */
  readonly setDefaultSkillPaths: SetState<ReadonlySet<string>>
  /** Whether the user (or the project) chose the default set explicitly. */
  readonly defaultSkillsExplicit: Ref<boolean>
  /** Sets the explicit flag. */
  readonly setDefaultSkillsExplicit: SetState<boolean>
  /** The explicit flag, readable outside a render. */
  readonly defaultSkillsExplicitRef: MutableRef<boolean>
  /** The project's discovered skills, as the seed found them. */
  readonly projectSkills: Ref<SkillInfo[]>
  /** Whether the seed's non-empty discovery has latched (so it never re-loads). */
  readonly skillsLoadedRef: MutableRef<boolean>
  /** The skill the proactive tip suggests, or `null`. */
  readonly relevantSkill: ComputedRef<SkillInfo | null>
  /** Opens a skill and marks it loaded for this session. */
  readonly loadSkill: (skill: SkillInfo) => void
  /** Dismisses the proactive suggestion. */
  readonly dismissRelevantSkill: (skill: SkillInfo) => void
  /** Creates a skill file; returns the created skill, or `null` on failure. */
  readonly createSkill: (name: string) => Promise<SkillInfo | null>
  /** The skills loaded this session. */
  readonly loadedSkillPaths: Ref<ReadonlySet<string>>
  /** Adds / removes a skill from the default set. */
  readonly toggleDefaultSkill: (skill: SkillInfo, next: boolean) => void
  /** Resets the default set to every discovered skill. */
  readonly resetDefaultSkills: () => void
  /** The region's effects, in React's order. */
  readonly effects: {
    /** `#effect chat:skills:1` — the default-loaded set's hardened seed. */
    readonly 1: ChatEffect
  }
}

/**
 * Builds the `chat:skills` slice.
 *
 * @param ctx - The panel context (HTTP, the project the skills belong to, the
 *   transcript, the attachments, the cards and the editor).
 * @returns The skills slice.
 */
export function createChatSkills(ctx: ChatCtx): ChatSkillsSlice {
  const defaultSkillPaths = ref<ReadonlySet<string>>(new Set<string>())
  const setDefaultSkillPaths = makeSetter(defaultSkillPaths)
  const defaultSkillsExplicit = ref(false)
  const setDefaultSkillsExplicit = makeSetter(defaultSkillsExplicit)
  const defaultSkillsExplicitRef: MutableRef<boolean> = { current: false }
  const projectSkills = ref<SkillInfo[]>([])
  const skillsLoadedRef: MutableRef<boolean> = { current: false }
  const loadedSkillPaths = ref<ReadonlySet<string>>(new Set<string>())
  const dismissedSkillPaths = ref<readonly string[]>([])

  const setLoadedSkillPaths = makeSetter(loadedSkillPaths)
  const setDismissedSkillPaths = makeSetter(dismissedSkillPaths)

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
    // Record it as loaded-this-session (shared source of truth for the tip and
    // the /skills "Loaded" badge). The set is treated as immutable so consumers
    // re-render.
    setLoadedSkillPaths((prev) => (prev.has(skill.path) ? prev : new Set(prev).add(skill.path)))
    // Open the skill in the editor (onFileOpen expects a project-relative path,
    // no leading slash).
    ctx.props.onFileOpen?.(skill.path, { focus: true })
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
  const relevantSkill = computed<SkillInfo | null>(() =>
    pickRelevantSkill(projectSkills.value, recentUserText(ctx.chat.messages.value), {
      dismissed: new Set(dismissedSkillPaths.value),
      attachedPaths: new Set(
        ctx.popups.attachedFiles.value
          .map((file) => file.path)
          .filter((path): path is string => path !== undefined),
      ),
      loaded: loadedSkillPaths.value,
      defaultLoaded: defaultSkillPaths.value,
    }),
  )

  /**
   * Dismisses the proactive suggestion for the rest of the conversation.
   *
   * @param skill - The suggested skill.
   */
  const dismissRelevantSkill = (skill: SkillInfo): void => {
    setDismissedSkillPaths((prev) => (prev.includes(skill.path) ? prev : [...prev, skill.path]))
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
    if (projectSkills.value.length === 0) return
    // While the set is still IMPLICIT (unset → ALL skills are default), the
    // effective current default set is EVERY loaded skill — so compute the base
    // from all skills, not the (possibly still-empty) badge set.
    const base = defaultSkillsExplicitRef.current
      ? defaultSkillPaths.value
      : new Set(projectSkills.value.map((s) => s.path))
    if (next === base.has(skill.path)) return
    // Any explicit toggle locks in an explicit set (persisted below), so the
    // "all initial skills" default no longer re-seeds it.
    const previous = defaultSkillPaths.value
    const previousExplicit = defaultSkillsExplicitRef.current
    defaultSkillsExplicitRef.current = true
    setDefaultSkillsExplicit(true)
    const updated = new Set(base)
    if (next) updated.add(skill.path)
    else updated.delete(skill.path)
    setDefaultSkillPaths(updated)
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
    const previous = defaultSkillPaths.value
    const previousExplicit = defaultSkillsExplicitRef.current
    defaultSkillsExplicitRef.current = false
    setDefaultSkillsExplicit(false)
    setDefaultSkillPaths(new Set(projectSkills.value.map((s) => s.path)))
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

  /**
   * One run of React's hardened seed: discovers the project's skills once,
   * retrying a bounded number of times while the file API warms up, and latching
   * only on a non-empty success.
   *
   * @returns The cleanup that cancels the run (React's effect cleanup).
   */
  const seed = (): (() => void) => {
    // Hardened seed: the skill file API can lag at mount (the sandbox isn't
    // serving `.agents` yet), so the first load often resolves EMPTY or throws.
    // We must NOT latch the guard until a NON-EMPTY load succeeds.
    if (skillsLoadedRef.current) return () => {}
    let cancelled = false
    let attempts = 0
    let retryTimer: ReturnType<typeof setTimeout> | undefined
    // A handful of ~1.5s attempts outlasts the file-API warm-up without nagging
    // if the project genuinely has no skills.
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
              await ctx.env.http.get<{ files: string[] }>(
                `/projects/${ctx.props.projectId}/files-list`,
              )
            ).data.files ?? [],
          async (relativePath) =>
            (
              await ctx.env.http.get<{ content: string }>(
                `/projects/${ctx.props.projectId}/files/${relativePath}`,
              )
            ).data.content,
        )
        // Don't setState after unmount — the fetch resolving post-teardown would
        // otherwise schedule a commit with no DOM behind it (leaked async).
        if (cancelled) return
        if (loaded.length === 0) {
          // Empty: the file API likely isn't serving `.agents` yet. Retry without
          // latching so a later attempt can still seed the scaffolded skills.
          scheduleRetry()
          return
        }
        // Latch ONLY on a successful, non-empty load — a retry can still run before this.
        skillsLoadedRef.current = true
        projectSkills.value = loaded
        // With no explicit saved set, ALL initial/discovered skills are default —
        // seed the badge set so the /skills browser reflects it.
        if (!defaultSkillsExplicitRef.current) {
          setDefaultSkillPaths(new Set(loaded.map((s) => s.path)))
        }
      } catch (error) {
        // Best-effort — a failed skills fetch must never disrupt the chat.
        logger.debug('Skill seed load failed; will retry if attempts remain', { error })
        if (!cancelled) scheduleRetry()
      }
    }

    void attempt()
    return () => {
      cancelled = true
      if (retryTimer) clearTimeout(retryTimer)
    }
  }

  return {
    defaultSkillPaths,
    setDefaultSkillPaths,
    defaultSkillsExplicit,
    setDefaultSkillsExplicit,
    defaultSkillsExplicitRef,
    projectSkills,
    skillsLoadedRef,
    relevantSkill,
    loadSkill,
    dismissRelevantSkill,
    createSkill,
    loadedSkillPaths,
    toggleDefaultSkill,
    resetDefaultSkills,
    effects: {
      1: () => {
        let cancel = (): void => {}
        onMounted(() => {
          cancel = seed()
        })
        watch(
          [() => ctx.props.projectId, () => ctx.env.http],
          () => {
            cancel()
            cancel = seed()
          },
          { flush: 'post' },
        )
        onUnmounted(() => {
          cancel()
        })
      },
    },
  }
}
