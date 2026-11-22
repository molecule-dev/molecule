/**
 * React's two `chat:skills` regions of ChatPanel.tsx (lines 1906–1920 and
 * 2829–3105): the per-project default-loaded skill set and its "explicit" flag,
 * the `#effect chat:skills:1` seed that discovers the project's skills once and
 * marks them all default when no explicit set was saved, the skills loaded this
 * session, the proactive "Relevant skill" suggestion, and the load / create /
 * toggle / reset actions.
 *
 * The hardened seed runs on the first run of the registered effect (where
 * React's mount effect performs it): it tolerates the sandbox file API lagging
 * behind mount by retrying a bounded number of times, and latches its guard only
 * on a non-empty success so a later attempt can still capture the scaffolded
 * skills.
 *
 * @module
 */

import { computed, DestroyRef, inject, Injectable, Injector, signal } from '@angular/core'

import type { ChatEventCardSegment } from '@molecule/app-ide-panel-logic'
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

import { ChatChat } from './chat-chat.slice.js'
import { ChatInnerState, registerChatEffect } from './chat-inner-state.js'
import { ChatPopups, type ChatSetState } from './chat-popups.slice.js'
import { ChatSystemCards } from './chat-system-cards.slice.js'

/** The package logger (React's module-level logger). */
const logger = getLogger('chat-panel')

/** The identifiers other slices and sections read from the `chat:skills` slice. */
export interface ChatSkillsSlice {
  /** React's mount I/O for the region (its request runs on the first effect run). */
  mount(): void

  /** React's `#effect chat:skills:<n>` entry points, at React's positions. */
  readonly effects: { 1: () => void }

  /** The skills every new conversation loads by default. */
  readonly defaultSkillPaths: () => ReadonlySet<string>
  /** Sets the default-loaded skill paths. */
  readonly setDefaultSkillPaths: ChatSetState<ReadonlySet<string>>
  /** Whether the user (or the project) chose the default set explicitly. */
  readonly defaultSkillsExplicit: () => boolean
  /** Sets the explicit flag. */
  readonly setDefaultSkillsExplicit: ChatSetState<boolean>
  /** The explicit flag, readable outside a render. */
  readonly defaultSkillsExplicitRef: { current: boolean }
  /** The project's discovered skills, as the seed loaded them. */
  readonly projectSkills: () => SkillInfo[]
  /** Whether the seed latched a successful, non-empty load. */
  readonly skillsLoadedRef: { current: boolean }
  /** The skills loaded this session. */
  readonly loadedSkillPaths: () => ReadonlySet<string>
  /** The skill the proactive tip suggests, or `null`. */
  readonly relevantSkill: () => SkillInfo | null
  /** Opens a skill and marks it loaded for this session. */
  readonly loadSkill: (skill: SkillInfo) => void
  /** Dismisses the proactive suggestion. */
  readonly dismissRelevantSkill: (skill: SkillInfo) => void
  /** Creates a skill file; returns the created skill, or `null` on failure. */
  readonly createSkill: (name: string) => Promise<SkillInfo | null>
  /** Adds / removes a skill from the default set. */
  readonly toggleDefaultSkill: (skill: SkillInfo, next: boolean) => void
  /** Resets the default set to every discovered skill. */
  readonly resetDefaultSkills: () => void
}

/** React's `chat:skills` slice: the default-set seed plus the region's actions. */
@Injectable()
export class ChatSkills implements ChatSkillsSlice {
  /** The shared state, read for the project and the HTTP client. */
  private readonly state = inject(ChatInnerState)

  /** The element injector `registerChatEffect` registers the seed in. */
  private readonly injector = inject(Injector)

  /** Cancels a seed still running when the panel unmounts. */
  private readonly destroyRef = inject(DestroyRef)

  /** The skills every new conversation loads by default. */
  readonly defaultSkillPaths = signal<ReadonlySet<string>>(new Set<string>())

  /** Whether the user (or the project) chose the default set explicitly. */
  readonly defaultSkillsExplicit = signal(false)

  /** The explicit flag, readable outside a render (React's ref, initial `false`). */
  readonly defaultSkillsExplicitRef: { current: boolean } = { current: false }

  /** The project's discovered skills, as the seed loaded them. */
  readonly projectSkills = signal<SkillInfo[]>([])

  /** Whether the seed latched a successful, non-empty load (React's ref). */
  readonly skillsLoadedRef: { current: boolean } = { current: false }

  /** The skills loaded this session. */
  readonly loadedSkillPaths = signal<ReadonlySet<string>>(new Set<string>())

  /** The skills the person dismissed from the proactive suggestion. */
  readonly dismissedSkillPaths = signal<readonly string[]>([])

  /**
   * The top-matching skill to nudge the user to load — null when it is already
   * loaded (@-loaded this session OR default-loaded), attached, or dismissed.
   */
  readonly relevantSkill = computed<SkillInfo | null>(() => {
    const attachedPaths = this.state
      .slice(ChatPopups)
      .attachedFiles()
      .map((file) => file.path)
      .filter((path): path is string => path !== undefined)
    return pickRelevantSkill(
      this.projectSkills(),
      recentUserText(this.state.slice(ChatChat).messages()),
      {
        dismissed: new Set(this.dismissedSkillPaths()),
        attachedPaths: new Set(attachedPaths),
        loaded: this.loadedSkillPaths(),
        defaultLoaded: this.defaultSkillPaths(),
      },
    )
  })

  /** The project whose skills the seed discovers (React's effect dependency). */
  private readonly projectId = computed(() => this.state.props().projectId)

  /** Cancels the seed run in flight, the way React's effect cleanup does. */
  private cancelSeed: () => void = () => {}

  /** React's mount I/O for the region: its request runs on the first effect run. */
  mount(): void {
    // `chat:skills` has no mount I/O outside its effect: the seed is the
    // effect's first run, which keeps React's request position.
  }

  /** Sets the default-loaded skill paths (value or updater). */
  readonly setDefaultSkillPaths: ChatSetState<ReadonlySet<string>> = (next) => {
    this.defaultSkillPaths.update((prev) => (typeof next === 'function' ? next(prev) : next))
  }

  /** Sets the explicit flag (value or updater). */
  readonly setDefaultSkillsExplicit: ChatSetState<boolean> = (next) => {
    this.defaultSkillsExplicit.update((prev) => (typeof next === 'function' ? next(prev) : next))
  }

  /** Registers React's hardened seed effect (its first run is the mount request). */
  readonly effects = {
    1: (): void => {
      registerChatEffect(this.injector, () => {
        // Read the dependency before the run, so a project change re-seeds.
        const projectId = this.projectId()
        this.cancelSeed()
        this.cancelSeed = this.seed(projectId)
      })
    },
  }

  /** Wires the unmount cleanup once, after the effect ledger is registered. */
  constructor() {
    this.destroyRef.onDestroy(() => this.cancelSeed())
  }

  /**
   * One run of React's hardened seed: discovers the project's skills once,
   * retrying a bounded number of times while the file API warms up, and
   * latching only on a non-empty success.
   *
   * @param projectId - The project whose skills are discovered.
   * @returns The cleanup that cancels the run (React's effect cleanup).
   */
  private seed(projectId: string): () => void {
    if (this.skillsLoadedRef.current) return () => {}
    let cancelled = false
    let attempts = 0
    let retryTimer: ReturnType<typeof setTimeout> | undefined
    // A handful of ~1.5s attempts outlasts the file-API warm-up without nagging
    // if the project genuinely has no skills.
    const SEED_RETRY_MS = 1500
    const SEED_MAX_ATTEMPTS = 5

    /**
     * Schedules the next attempt while the budget lasts.
     */
    const scheduleRetry = (): void => {
      if (cancelled || attempts >= SEED_MAX_ATTEMPTS) return
      retryTimer = setTimeout(() => {
        void attempt()
      }, SEED_RETRY_MS)
    }

    /**
     * Runs one discovery attempt.
     */
    const attempt = async (): Promise<void> => {
      if (cancelled || this.skillsLoadedRef.current) return
      attempts++
      try {
        const loaded = await loadProjectSkills(
          async () =>
            (
              await this.state.env.http.get<{ files: string[] }>(
                `/projects/${projectId}/files-list`,
              )
            ).data.files ?? [],
          async (relativePath) =>
            (
              await this.state.env.http.get<{ content: string }>(
                `/projects/${projectId}/files/${relativePath}`,
              )
            ).data.content,
        )
        // Don't set state after unmount — the fetch resolving post-teardown would
        // otherwise update a panel with no DOM behind it (leaked async).
        if (cancelled) return
        if (loaded.length === 0) {
          // Empty: the file API likely isn't serving `.agents` yet. Retry without
          // latching so a later attempt can still seed the scaffolded skills.
          scheduleRetry()
          return
        }
        // Latch ONLY on a successful, non-empty load — a retry can still run before this.
        this.skillsLoadedRef.current = true
        this.projectSkills.set(loaded)
        // With no explicit saved set, ALL initial/discovered skills are default —
        // seed the badge set so the /skills browser reflects it.
        if (!this.defaultSkillsExplicitRef.current) {
          this.setDefaultSkillPaths(new Set(loaded.map((skill) => skill.path)))
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

  /** Opens a skill and marks it loaded for this session, confirming with a card. */
  readonly loadSkill = (skill: SkillInfo): void => {
    // Record it as loaded-this-session (shared source of truth for the tip + the
    // /skills "Loaded" badge). Set is treated as immutable so consumers re-render.
    this.loadedSkillPaths.update((prev) =>
      prev.has(skill.path) ? prev : new Set(prev).add(skill.path),
    )
    const onFileOpen = this.state.props().onFileOpen
    // Opening a skill does NOT attach it as context — it just opens it.
    onFileOpen?.(skill.path, { focus: true })
    const t = this.state.env.t
    const loaded = (name: string): string =>
      t('ide.chat.skills.loaded', { name }, { defaultValue: 'Loaded {{name}} skill' })
    const content: ChatEventCardSegment[] | null = cardSegmentsAround(loaded, {
      label: skill.name,
      code: true,
      onClick: () => onFileOpen?.(skill.path, { focus: true }),
    })
    this.state.slice(ChatSystemCards).addSystemCard(loaded(skill.name), content ? { content } : {})
  }

  /** Dismisses the proactive suggestion for later messages. */
  readonly dismissRelevantSkill = (skill: SkillInfo): void => {
    this.dismissedSkillPaths.update((prev) =>
      prev.includes(skill.path) ? prev : [...prev, skill.path],
    )
  }

  /**
   * Creates a new project skill: writes a starter `.agents/skills/<slug>/SKILL.md`,
   * opens it in the editor for authoring, and confirms with a system card.
   */
  readonly createSkill = async (name: string): Promise<SkillInfo | null> => {
    const display = name.trim()
    if (!display) return null
    const path = newSkillPath(display)
    const content = buildNewSkillTemplate(display)
    const t = this.state.env.t
    try {
      await this.state.env.http.put(`/projects/${this.projectId()}/files/${path}`, { content })
    } catch (error) {
      logger.warn('Failed to create skill', { error })
      this.state.slice(ChatSystemCards).addSystemCard(
        t('ide.chat.skills.createError', undefined, {
          defaultValue: 'Could not create the skill — please try again.',
        }),
      )
      return null
    }
    // Open the new SKILL.md so the user can author it right away.
    this.state.props().onFileOpen?.(path, { focus: true })
    this.state.slice(ChatSystemCards).addSystemCard(
      t(
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
   * Toggles a skill's membership in the persisted default-loaded set, updating
   * optimistically and rolling back on a failed save.
   *
   * @param skill - The skill to toggle.
   * @param next - `true` to add it to the default set, `false` to remove it.
   */
  readonly toggleDefaultSkill = (skill: SkillInfo, next: boolean): void => {
    const skills = this.projectSkills()
    // Skills haven't loaded yet: ignore the click until the seed fills them, so
    // a toggle never persists a bogus one-element set.
    if (skills.length === 0) return
    // While the set is still IMPLICIT, the effective default set is EVERY
    // discovered skill — compute the base from all skills, not the empty badge
    // set, so toggling one OFF persists "all-minus-one".
    const base = this.defaultSkillsExplicitRef.current
      ? this.defaultSkillPaths()
      : new Set(skills.map((s) => s.path))
    if (next === base.has(skill.path)) return
    // Any explicit toggle locks in an explicit set (persisted below).
    const previous = this.defaultSkillPaths()
    const previousExplicit = this.defaultSkillsExplicitRef.current
    this.defaultSkillsExplicitRef.current = true
    this.setDefaultSkillsExplicit(true)
    const updated = new Set(base)
    if (next) updated.add(skill.path)
    else updated.delete(skill.path)
    this.setDefaultSkillPaths(updated)
    this.state.env.http
      .patch(`/projects/${this.projectId()}`, { settings: { defaultSkills: [...updated] } })
      .catch((error: unknown) => {
        // Roll back the optimistic toggle (set + explicit flag) so the
        // badge/toggle reflect the server.
        logger.warn('Failed to persist default skills to server', { error })
        this.defaultSkillsExplicitRef.current = previousExplicit
        this.setDefaultSkillsExplicit(previousExplicit)
        this.setDefaultSkillPaths(previous)
      })
  }

  /**
   * Resets the per-project default-loaded skill set back to the IMPLICIT "ALL
   * skills are default" state, undoing any explicit set, and PATCHes
   * `settings.defaultSkills: null`. On failure it rolls the local state back.
   */
  readonly resetDefaultSkills = (): void => {
    const previous = this.defaultSkillPaths()
    const previousExplicit = this.defaultSkillsExplicitRef.current
    this.defaultSkillsExplicitRef.current = false
    this.setDefaultSkillsExplicit(false)
    this.setDefaultSkillPaths(new Set(this.projectSkills().map((s) => s.path)))
    this.state.env.http
      .patch(`/projects/${this.projectId()}`, { settings: { defaultSkills: null } })
      .catch((error: unknown) => {
        // Roll back so the badge/toggle reflect the server.
        logger.warn('Failed to reset default skills on server', { error })
        this.defaultSkillsExplicitRef.current = previousExplicit
        this.setDefaultSkillsExplicit(previousExplicit)
        this.setDefaultSkillPaths(previous)
      })
  }
}
