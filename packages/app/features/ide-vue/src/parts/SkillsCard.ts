/**
 * `/skills` browser + skill authoring — the Vue counterpart of
 * `@molecule/app-ide-react`'s `SkillsCard` (see that file for the design
 * notes): the same props (React names), the same DOM for the same input, the
 * same callbacks and service calls. An in-timeline card listing the project's
 * skills (Markdown files under `.agents/skills/` with `name`/`description`
 * frontmatter), discovered via the SAME file-list / file-content API the chat
 * uses for `@`-mentions, with a bounded retry that keeps the honest
 * "waiting for the sandbox" state while `.agents/skills/` has not
 * materialized yet. A search box filters by name/description/path; the skill
 * NAME itself opens the skill; a not-yet-loaded skill carries a blue "Load"
 * button while a loaded one shows the blue "Loaded" pill by its name; a
 * green "Default" badge and a star toggle manage the persisted per-project
 * default-loaded set, whose explicit subsets the header's "Load all by
 * default" control resets. The "New skill" affordance opens a create form
 * below the header (the name field on its own row, then `[Cancel] [Create]`),
 * and `onCreate`'s fresh skill joins the list without a re-fetch.
 *
 * React keeps the text fields' `value` ATTRIBUTE in step with the controlled
 * value (the DOM snapshot carries the attribute as well as the live
 * property), so the attribute is mirrored on mount and update. React's
 * `autoFocus` focuses the new name field when the form opens — the same
 * behavior through a stable function ref, which writes no DOM.
 *
 * Styling uses `getClassMap()` (`cm.*`); the only inline styles are layout
 * the ClassMap can't express. All user-facing text goes through `t()`.
 *
 * @module
 */

import {
  computed,
  defineComponent,
  h,
  nextTick,
  type PropType,
  ref,
  type VNode,
  type VNodeChild,
  watch,
} from 'vue'

import { chatCardStyle } from '@molecule/app-ide-panel-logic'
import type { SkillInfo } from '@molecule/app-ide-panel-logic/panels'
import { filterSkills, loadProjectSkillsResilient } from '@molecule/app-ide-panel-logic/panels'
import { getLogger } from '@molecule/app-logger'
import { getClassMap } from '@molecule/app-ui'
import { Tooltip } from '@molecule/app-ui-vue'
import { useHttpClient, useTranslation } from '@molecule/app-vue'

import { Icon } from '../components/Icon.js'

const logger = getLogger('skills-card')

/**
 * Discovery status for the skills list. `'waiting'` is the boot-window state:
 * the file-list call answered but the sandbox hasn't materialized
 * `.agents/skills/` yet, so we keep retrying rather than showing a false
 * "No skills found".
 */
export type SkillsStatus = 'loading' | 'waiting' | 'ready' | 'error'

/** Props for {@link SkillsCard} — the React prop names, React's own contract. */
export interface SkillsCardProps {
  /** The project whose skills are listed (the routes' id). */
  projectId: string
  /** Seeds the search box from `/skills <query>`. */
  initialQuery: string
  /** Opens a skill in the editor (it does NOT attach it as message context). */
  onLoad: (skill: SkillInfo) => void
  /**
   * Creates a skill named `name`, returning the fresh skill (or `null` on
   * failure, which keeps the form open). When omitted, the "New skill"
   * affordance is hidden.
   */
  onCreate?: (name: string) => Promise<SkillInfo | null>
  /** Mounts with the create form already open (the bare `/newskill` path). */
  startCreating?: boolean
  /** Paths opened this session — each hides its Load button for a Loaded pill. */
  loadedSkillPaths?: ReadonlySet<string>
  /** Paths in the persisted default-loaded set — badge, filled star, Loaded. */
  defaultSkillPaths?: ReadonlySet<string>
  /** Adds/removes a skill from the default-loaded set. Omit to hide the toggle. */
  onToggleDefault?: (skill: SkillInfo, next: boolean) => void
  /** Resets the default set to the implicit all-skills state. Omit to hide. */
  onResetDefault?: () => void
  /** The default set is an explicit user-built one (vs the implicit unset→all). */
  defaultsExplicit?: boolean
  /** Light theme (drives the row border + field inset). */
  isLight: boolean
  /** Chrome-less inside the command overlay; full card chrome in the timeline. */
  embedded?: boolean
}

/**
 * Inline pill style for the row badges, tinted with the given theme color var
 * via `color-mix` (the hex in the var is only the CSS-var fallback, the
 * established TipCard convention) — never a hardcoded color. It's an inline
 * style because a tinted pill is layout/tint ClassMap can't express. The blue
 * "Loaded" pill passes `var(--mol-color-primary, …)` and the green "Default"
 * pill passes `var(--mol-color-success, …)`, so the two badges read as
 * distinct at a glance.
 *
 * @param baseColor - The CSS color (a theme var with hex fallback) to tint
 *   the pill text, border, and background with.
 * @returns The badge's inline style.
 */
function skillBadgeStyle(baseColor: string): Record<string, string> {
  return {
    flexShrink: '0',
    padding: '0px 6px',
    borderRadius: '999px',
    fontSize: '10px',
    lineHeight: '15px',
    fontWeight: '600',
    color: baseColor,
    border: `1px solid color-mix(in srgb, ${baseColor} 45%, transparent)`,
    background: `color-mix(in srgb, ${baseColor} 16%, transparent)`,
  }
}

/**
 * Keeps a controlled input's `value` ATTRIBUTE in step (React's attribute
 * semantics).
 *
 * @param vnode - The input's vnode.
 */
function syncValueAttr(vnode: VNode): void {
  const el = vnode.el as HTMLInputElement | null
  if (el) el.setAttribute('value', el.value)
}

/**
 * The container chrome shared by the chat timeline's boxed cards, with the
 * radius written as `px` the way the DOM takes it here (the neutral helper
 * returns a unitless number for React).
 *
 * @returns The card container's inline style.
 */
function cardStyle(): Record<string, string> {
  const { padding, border, background } = chatCardStyle()
  return { padding, borderRadius: '8px', border, background }
}

/**
 * The skills browser shown by `/skills`, with the skill-authoring create form.
 *
 * @param props - See {@link SkillsCardProps}.
 * @returns The rendered skills card.
 */
export const SkillsCard = defineComponent({
  name: 'SkillsCard',
  inheritAttrs: false,
  props: {
    /** The project whose skills are listed (the routes' id). */
    projectId: { type: String, required: true },
    /** Seeds the search box from `/skills <query>`. */
    initialQuery: { type: String, required: true },
    /** Opens a skill in the editor. */
    onLoad: { type: Function as PropType<SkillsCardProps['onLoad']>, required: true },
    /**
     * Creates a skill named `name`; `null` on failure keeps the form open.
     * When omitted, the "New skill" affordance is hidden.
     */
    onCreate: {
      type: Function as PropType<SkillsCardProps['onCreate']>,
      required: false,
      default: undefined,
    },
    /** Mounts with the create form already open (the bare `/newskill` path). */
    startCreating: { type: Boolean, required: false, default: undefined },
    /** Paths opened this session — each hides its Load button for a Loaded pill. */
    loadedSkillPaths: {
      type: Set as PropType<ReadonlySet<string>>,
      required: false,
      default: undefined,
    },
    /** Paths in the persisted default-loaded set — badge, filled star, Loaded. */
    defaultSkillPaths: {
      type: Set as PropType<ReadonlySet<string>>,
      required: false,
      default: undefined,
    },
    /** Adds/removes a skill from the default-loaded set. Omit to hide the toggle. */
    onToggleDefault: {
      type: Function as PropType<SkillsCardProps['onToggleDefault']>,
      required: false,
      default: undefined,
    },
    /** Resets the default set to the implicit all-skills state. Omit to hide. */
    onResetDefault: {
      type: Function as PropType<SkillsCardProps['onResetDefault']>,
      required: false,
      default: undefined,
    },
    /** The default set is an explicit user-built one (vs the implicit unset→all). */
    defaultsExplicit: { type: Boolean, required: false, default: undefined },
    /** Light theme (drives the row border + field inset). */
    isLight: { type: Boolean, required: true },
    /** Chrome-less inside the command overlay; full card chrome in the timeline. */
    embedded: { type: Boolean, required: false, default: undefined },
  },
  setup(props) {
    const cm = getClassMap()
    const http = useHttpClient()
    const { t } = useTranslation()
    const status = ref<SkillsStatus>('loading')
    const skills = ref<SkillInfo[]>([])
    // The query seeds ONCE (React's `useState` initializer): a later
    // `initialQuery` prop never reseeds it.
    const query = ref(props.initialQuery)
    const creating = ref(!!props.startCreating && !!props.onCreate)
    const newName = ref('')
    const busy = ref(false)

    // The form's name field, for React's `autoFocus` below.
    const nameField = ref<HTMLInputElement | null>(null)

    /**
     * Records the mounted name field (and its removal) for the focus watcher.
     *
     * @param el - The mounted input, or `null` on unmount.
     */
    function setFieldEl(el: unknown): void {
      nameField.value = el instanceof HTMLInputElement ? el : null
    }

    // React's `autoFocus` on the new-name field: when the form opens (at
    // mount with `startCreating`, or on the "New skill" click), focus the
    // field once its render has SETTLED on the page — a post-flush ref fires
    // before this DOM finishes inserting the form here, and a focus that
    // lands on an uninserted element is dropped.
    watch(
      creating,
      async (open) => {
        if (!open) return
        await nextTick()
        nameField.value?.focus()
      },
      { immediate: true },
    )

    // React's effect: the discovery restarts for a replaced `projectId`, and
    // the reply of a cancelled run changes nothing.
    watch(
      () => props.projectId,
      (project, _previous, onCleanup) => {
        let cancelled = false
        status.value = 'loading'
        void (async () => {
          try {
            const { skills: loaded, stillBooting } = await loadProjectSkillsResilient(
              async () =>
                (await http.get<{ files: string[] }>(`/projects/${project}/files-list`)).data
                  .files ?? [],
              async (relativePath) =>
                (await http.get<{ content: string }>(`/projects/${project}/files/${relativePath}`))
                  .data.content,
              {
                isCancelled: () => cancelled,
                // First empty/failed try → flip to the honest "waiting for the
                // sandbox" state while we keep retrying, instead of a
                // misleading "No skills found".
                onRetry: () => {
                  if (!cancelled) status.value = 'waiting'
                },
              },
            )
            if (cancelled) return
            skills.value = loaded
            // A bounded retry that still came back empty means the sandbox
            // never finished scaffolding skills in our window — keep the
            // "waiting" state so the user sees an honest "still starting"
            // message, not "no skills found".
            status.value = loaded.length === 0 && stillBooting ? 'waiting' : 'ready'
          } catch (error) {
            logger.warn('Failed to load project skills', { error })
            if (!cancelled) status.value = 'error'
          }
        })()
        onCleanup(() => {
          cancelled = true
        })
      },
      { immediate: true },
    )

    const filtered = computed(() => filterSkills(skills.value, query.value))
    const rowBorder = computed(() =>
      props.isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)',
    )
    // A subtle neutral inset so the text inputs READ as fields on the clean
    // overlay surface (not just a faint border). Theme-aware, matching the
    // SettingsCard toggle inset; the SAME value is used in ScriptsCard's
    // fields.
    const fieldBg = computed(() => (props.isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.06)'))
    // The 26px/3px card-button box (the size every field in the chat cards
    // shares — see TestsCard's field style).
    const fieldStyle = computed<Record<string, string>>(() => ({
      width: '100%',
      height: '26px',
      padding: '0px 6px',
      borderRadius: '3px',
      border: `1px solid ${rowBorder.value}`,
      background: fieldBg.value,
      color: 'inherit',
      outline: 'none',
    }))

    /**
     * Focuses the new-name field when it mounts (React's `autoFocus`), through
     * a stable ref function so a re-render never steals the focus back.
     *
     * @param el - The mounted input, if any.
     */

    /**
     * Submits the inline "New skill" form: delegates creation to `onCreate`,
     * and on success adds the new skill to the list (so it appears without a
     * re-fetch), clears any active filter so it's visible, and closes the
     * form.
     */
    async function submitNewSkill(): Promise<void> {
      const name = newName.value.trim()
      if (!name || !props.onCreate || busy.value) return
      busy.value = true
      try {
        const created = await props.onCreate(name)
        if (created) {
          skills.value = skills.value.some((s) => s.path === created.path)
            ? skills.value
            : [...skills.value, created].sort((a, b) => a.name.localeCompare(b.name))
          query.value = ''
          newName.value = ''
          creating.value = false
        }
      } finally {
        busy.value = false
      }
    }

    return (): VNodeChild =>
      h(
        'div',
        {
          'data-mol-id': 'skills-card',
          class: cm.textSize('xs'),
          // Non-embedded (inline in the chat timeline) shares the same card
          // chrome as every other info card: subtle primary tint + a uniform
          // 1px border on all sides (chat-card-style). Embedded in an overlay
          // it stays chrome-less. The radius is written as `px` the way the
          // DOM takes it here (the neutral helper returns a unitless number
          // for React).
          style: props.embedded
            ? { padding: '10px 12px' }
            : { ...cardStyle(), marginBottom: '16px' },
        },
        [
          h(
            'div',
            {
              style: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                marginBottom: '6px',
              },
            },
            [
              h(
                'div',
                { style: { display: 'flex', alignItems: 'center', gap: '8px', flexShrink: '0' } },
                [
                  // The overlay's header bar already shows the "Skills" title,
                  // so the card suppresses its own redundant heading when
                  // embedded (single clean title).
                  !props.embedded
                    ? h(
                        'div',
                        {
                          class: cm.cn(cm.fontWeight('medium'), cm.textSize('sm')),
                          style: { flexShrink: '0' },
                        },
                        [t('ide.chat.skills.heading', undefined, { defaultValue: 'Skills' })],
                      )
                    : null,
                  // P3-11: a visible way back from the one-way door of the
                  // first explicit toggle — resets the default-loaded set to
                  // the implicit "load ALL by default" state. A consistent
                  // ghost `cm.button` (matching the row actions, no hover
                  // tooltip — P5-09), shown only when the set is an explicit
                  // user-built one (otherwise it's already all-default and
                  // there's nothing to reset).
                  props.onResetDefault && props.defaultsExplicit
                    ? h(
                        'button',
                        {
                          type: 'button',
                          'data-mol-id': 'skill-reset-defaults',
                          onClick: () => props.onResetDefault?.(),
                          class: cm.cn(
                            cm.button({ variant: 'ghost', size: 'xs' }),
                            cm.touchTargetCompact,
                            cm.shrink0,
                          ),
                        },
                        [
                          t('ide.chat.skills.resetDefaults', undefined, {
                            defaultValue: 'Load all by default',
                          }),
                        ],
                      )
                    : null,
                ],
              ),
              // The "New skill" button stays "New skill" (never toggles into
              // Cancel) and hides while the create form is open — the form
              // owns its own Cancel in its bottom action row.
              props.onCreate && !creating.value
                ? h(
                    Tooltip,
                    {
                      content: t('ide.chat.skills.newTitle', undefined, {
                        defaultValue: 'Create a new project skill',
                      }),
                      placement: 'top',
                    },
                    () =>
                      h(
                        'button',
                        {
                          type: 'button',
                          'data-mol-id': 'skill-new',
                          onClick: () => {
                            creating.value = true
                          },
                          class: cm.cn(
                            cm.button({ variant: 'solid', color: 'primary', size: 'xs' }),
                            cm.touchTargetCompact,
                            cm.shrink0,
                          ),
                        },
                        [t('ide.chat.skills.new', undefined, { defaultValue: 'New skill' })],
                      ),
                  )
                : null,
            ],
          ),

          // New skill — create form below the header (consistent with
          // ScriptsCard's creator): the name input on its OWN row at full
          // width, then a right-aligned bottom action row `[Cancel] [Create]`.
          props.onCreate && creating.value
            ? h(
                'form',
                {
                  key: 'create-form',
                  'data-mol-id': 'skill-create-form',
                  onSubmit: (event: Event) => {
                    event.preventDefault()
                    void submitNewSkill()
                  },
                  class: cm.borderT,
                  style: {
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    padding: '8px 0px',
                    marginTop: '6px',
                    borderColor: rowBorder.value,
                  },
                },
                [
                  h('input', {
                    value: newName.value,
                    'data-mol-id': 'skill-create-name',
                    ref: setFieldEl,
                    onInput: (event: Event) => {
                      newName.value = (event.target as HTMLInputElement).value
                    },
                    placeholder: t('ide.chat.skills.newPlaceholder', undefined, {
                      defaultValue: 'New skill name…',
                    }),
                    class: cm.textSize('xs'),
                    style: fieldStyle.value,
                    onVnodeMounted: syncValueAttr,
                    onVnodeUpdated: syncValueAttr,
                  }),
                  h('div', { style: { display: 'flex', justifyContent: 'flex-end', gap: '6px' } }, [
                    h(
                      'button',
                      {
                        type: 'button',
                        'data-mol-id': 'skill-create-cancel',
                        onClick: () => {
                          creating.value = false
                          newName.value = ''
                        },
                        class: cm.cn(
                          cm.button({ variant: 'ghost', size: 'xs' }),
                          cm.touchTargetCompact,
                          cm.shrink0,
                        ),
                      },
                      [t('ide.chat.skills.cancel', undefined, { defaultValue: 'Cancel' })],
                    ),
                    h(
                      'button',
                      {
                        type: 'submit',
                        'data-mol-id': 'skill-create-submit',
                        disabled: !newName.value.trim() || busy.value,
                        class: cm.cn(
                          cm.button({ variant: 'solid', color: 'primary', size: 'xs' }),
                          cm.touchTargetCompact,
                          cm.shrink0,
                        ),
                      },
                      [t('ide.chat.skills.create', undefined, { defaultValue: 'Create' })],
                    ),
                  ]),
                ],
              )
            : null,

          // Search / filter
          h('input', {
            key: 'search',
            value: query.value,
            'data-mol-id': 'skills-search',
            onInput: (event: Event) => {
              query.value = (event.target as HTMLInputElement).value
            },
            placeholder: t('ide.chat.skills.searchPlaceholder', undefined, {
              defaultValue: 'Filter skills…',
            }),
            class: cm.textSize('xs'),
            style: { ...fieldStyle.value, marginBottom: '6px' },
            onVnodeMounted: syncValueAttr,
            onVnodeUpdated: syncValueAttr,
          }),

          status.value === 'loading'
            ? h(
                'div',
                { key: 'state-loading', class: cm.textMuted, style: { padding: '6px 0px' } },
                [t('ide.chat.skills.loading', undefined, { defaultValue: 'Loading skills…' })],
              )
            : null,

          status.value === 'waiting'
            ? h(
                'div',
                { key: 'state-waiting', class: cm.textMuted, style: { padding: '6px 0px' } },
                [
                  t('ide.chat.skills.waitingForSandbox', undefined, {
                    defaultValue: 'Waiting for the sandbox to finish starting…',
                  }),
                ],
              )
            : null,

          status.value === 'error'
            ? h('div', { key: 'state-error', class: cm.textMuted, style: { padding: '6px 0px' } }, [
                t('ide.chat.skills.error', undefined, {
                  defaultValue: 'Could not load skills for this project.',
                }),
              ])
            : null,

          status.value === 'ready' && filtered.value.length === 0
            ? h('div', { key: 'state-empty', class: cm.textMuted, style: { padding: '6px 0px' } }, [
                query.value.trim()
                  ? t(
                      'ide.chat.skills.noMatch',
                      { query: query.value.trim() },
                      { defaultValue: 'No skills match “{{query}}”.' },
                    )
                  : t('ide.chat.skills.empty', undefined, {
                      defaultValue: 'No skills found in .agents/skills/ for this project.',
                    }),
              ])
            : null,

          status.value === 'ready'
            ? filtered.value.map((skill) => {
                const isLoaded = props.loadedSkillPaths?.has(skill.path) ?? false
                const isDefault = props.defaultSkillPaths?.has(skill.path) ?? false
                // "Loaded" = already in context: either default-loaded
                // (always-on) or opened this session. The Load action is then
                // done, so the right-hand "Load" button is HIDDEN and a blue
                // "Loaded" pill surfaces next to the name instead.
                const alreadyLoaded = isLoaded || isDefault
                return h(
                  'div',
                  {
                    key: skill.path,
                    'data-mol-id': `skill-row-${skill.name}`,
                    class: cm.borderT,
                    style: {
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px',
                      padding: '6px 0px',
                      borderColor: rowBorder.value,
                    },
                  },
                  [
                    h('div', { style: { flex: '1 1 0%', minWidth: '0px' } }, [
                      h(
                        'div',
                        {
                          style: {
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            flexWrap: 'wrap',
                          },
                        },
                        [
                          // The skill NAME is the primary clickable affordance:
                          // a real button reset to read as the name text (no
                          // box chrome) but tinted with the theme primary color
                          // + a pointer cursor so it clearly reads as a link
                          // that opens the skill in the editor. Keeps the
                          // medium weight.
                          h(
                            'button',
                            {
                              type: 'button',
                              'data-mol-id': `skill-open-${skill.name}`,
                              onClick: () => props.onLoad(skill),
                              class: cm.cn(cm.fontWeight('medium'), cm.touchTargetCompact),
                              /* mol-bespoke-button: the item NAME, clickable —
                                 not a CTA (the row's CTA is Load beside it). A
                                 button reset to read as the name text, tinted
                                 with the primary theme token, exactly like the
                                 relevant-skill suggestion's name. */
                              style: {
                                padding: '0px',
                                margin: '0px',
                                border: 'none',
                                background: 'transparent',
                                font: 'inherit',
                                fontWeight: '500',
                                textAlign: 'left',
                                color: 'var(--mol-color-primary, #6366f1)',
                                cursor: 'pointer',
                              },
                            },
                            [skill.name],
                          ),
                          isDefault
                            ? h(
                                'span',
                                {
                                  'data-mol-id': `skill-default-badge-${skill.name}`,
                                  style: skillBadgeStyle('var(--mol-color-success, #22c55e)'),
                                },
                                [
                                  t('ide.chat.skills.defaultBadge', undefined, {
                                    defaultValue: 'Default',
                                  }),
                                ],
                              )
                            : null,
                          alreadyLoaded
                            ? h(
                                'span',
                                {
                                  'data-mol-id': `skill-loaded-badge-${skill.name}`,
                                  style: skillBadgeStyle('var(--mol-color-primary, #6366f1)'),
                                },
                                [
                                  t('ide.chat.skills.loadedBadge', undefined, {
                                    defaultValue: 'Loaded',
                                  }),
                                ],
                              )
                            : null,
                        ],
                      ),
                      skill.description
                        ? h(
                            'div',
                            { class: cm.textMuted, style: { marginTop: '2px', lineHeight: '1.4' } },
                            [skill.description],
                          )
                        : null,
                    ]),
                    // Action group: the blue "Load" button (only when NOT yet
                    // loaded), then the star default-toggle as the RIGHTMOST
                    // element.
                    h(
                      'div',
                      {
                        style: {
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          flexShrink: '0',
                        },
                      },
                      [
                        !alreadyLoaded
                          ? h(
                              'button',
                              {
                                type: 'button',
                                'data-mol-id': `skill-load-${skill.name}`,
                                onClick: () => props.onLoad(skill),
                                class: cm.cn(
                                  cm.button({ variant: 'solid', color: 'primary', size: 'xs' }),
                                  cm.touchTargetCompact,
                                  cm.shrink0,
                                ),
                              },
                              [t('ide.chat.skills.load', undefined, { defaultValue: 'Load' })],
                            )
                          : null,
                        props.onToggleDefault
                          ? h(
                              'button',
                              {
                                type: 'button',
                                'data-mol-id': `skill-default-${skill.name}`,
                                'aria-pressed': isDefault ? 'true' : 'false',
                                'aria-label': isDefault
                                  ? t('ide.chat.skills.unsetDefault', undefined, {
                                      defaultValue: 'Stop loading by default',
                                    })
                                  : t('ide.chat.skills.setDefault', undefined, {
                                      defaultValue: 'Load by default',
                                    }),
                                onClick: () => props.onToggleDefault?.(skill, !isDefault),
                                // Icon-only star TOGGLE — `ghost` is legal for a
                                // toggle. It takes the SAME 36px floor as the
                                // Load button it sits beside: sibling controls
                                // in one row match each other.
                                class: cm.cn(
                                  cm.button({ variant: 'ghost', size: 'xs' }),
                                  cm.touchTargetCompact,
                                  cm.shrink0,
                                ),
                                style: {
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                },
                              },
                              [
                                h(Icon, {
                                  name: isDefault ? 'star' : 'star-outline',
                                  size: 13,
                                  'aria-hidden': 'true',
                                  style: { color: 'var(--mol-color-primary, #6366f1)' },
                                }),
                              ],
                            )
                          : null,
                      ],
                    ),
                  ],
                )
              })
            : null,
        ],
      )
  },
})
