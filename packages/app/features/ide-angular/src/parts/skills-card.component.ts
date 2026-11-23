/**
 * `/skills` browser + skill authoring — the Angular counterpart of
 * `@molecule/app-ide-react`'s `SkillsCard` (see that file for the design
 * notes): the same inputs (React prop names), the same DOM for the same
 * input, the same callbacks and service calls. An in-timeline card listing
 * the project's skills (Markdown files under `.agents/skills/` with
 * `name`/`description` frontmatter), discovered via the SAME file-list /
 * file-content API the chat uses for `@`-mentions, with a bounded retry that
 * keeps the honest "waiting for the sandbox" state while `.agents/skills/`
 * has not materialized yet. A search box filters by name/description/path;
 * the skill NAME itself opens the skill; a not-yet-loaded skill carries a
 * blue "Load" button while a loaded one shows the blue "Loaded" pill by its
 * name; a green "Default" badge and a star toggle manage the persisted
 * per-project default-loaded set, whose explicit subsets the header's "Load
 * all by default" control resets. The "New skill" affordance opens a create
 * form below the header (the name field on its own row, then
 * `[Cancel] [Create]`), and `onCreate`'s fresh skill joins the list without
 * a re-fetch.
 *
 * Inputs are declared the way the kit's other Angular feature components
 * declare them — one plain field per React prop, named in the decorator's
 * `inputs` array — and every derived value is a method the template reads, so
 * each change-detection pass renders the current state the way React's render
 * does. React keeps the text fields' `value` ATTRIBUTE in step with the
 * controlled value, so each field carries both the property and the
 * attribute; React's `autoFocus` focuses the new-name field when the form
 * opens, done here with a one-shot focus flag consumed once the field exists.
 *
 * Styling uses `getClassMap()` (`cm.*`); the only inline styles are layout
 * the ClassMap can't express, serialized through `styleText` the way React
 * writes numbers (`26` → `26px`). All user-facing text goes through `t()`.
 *
 * @module
 */

import {
  afterEveryRender,
  Component,
  type ElementRef,
  type OnChanges,
  type OnInit,
  signal,
  type SimpleChanges,
  ViewChild,
} from '@angular/core'

import { useHttpClient, useTranslation } from '@molecule/app-angular'
import { chatCardStyle } from '@molecule/app-ide-panel-logic'
import type { SkillInfo } from '@molecule/app-ide-panel-logic/panels'
import { filterSkills, loadProjectSkillsResilient } from '@molecule/app-ide-panel-logic/panels'
import { getLogger } from '@molecule/app-logger'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { styleText, Tooltip } from '@molecule/app-ui-angular'

import { Icon } from '../components/icon.component.js'

const logger = getLogger('skills-card')

/** Discovery status for the skills list — mirrors the React card's. */
export type SkillsStatus = 'loading' | 'waiting' | 'ready' | 'error'

/**
 * Inline pill style for the row badges, tinted with the given theme color var
 * via `color-mix` (the hex in the var is only the CSS-var fallback, the
 * established TipCard convention) — never a hardcoded color. It's an inline
 * style because a tinted pill is layout/tint ClassMap can't express.
 *
 * @param baseColor - The CSS color (a theme var with hex fallback) to tint
 *   the pill text, border, and background with.
 * @returns The badge's style attribute text.
 */
function skillBadgeStyle(baseColor: string): string | null {
  return styleText({
    flexShrink: 0,
    padding: '0px 6px',
    borderRadius: 999,
    fontSize: 10,
    lineHeight: '15px',
    fontWeight: 600,
    color: baseColor,
    border: `1px solid color-mix(in srgb, ${baseColor} 45%, transparent)`,
    background: `color-mix(in srgb, ${baseColor} 16%, transparent)`,
  })
}

/**
 * The skills browser shown by `/skills`, with the skill-authoring create form.
 */
@Component({
  selector: 'div[mol-skills-card]',
  standalone: true,
  imports: [Icon, Tooltip],
  inputs: [
    'projectId',
    'initialQuery',
    'onLoad',
    'onCreate',
    'startCreating',
    'loadedSkillPaths',
    'defaultSkillPaths',
    'onToggleDefault',
    'onResetDefault',
    'defaultsExplicit',
    'isLight',
    'embedded',
  ],
  host: {
    'data-mol-id': 'skills-card',
    '[class]': 'cm.textSize("xs")',
    '[attr.style]': 'rootStyle()',
  },
  // prettier-ignore
  template: `<div [attr.style]="s.headerRow">
      <div [attr.style]="s.titleArea">
        @if (!embedded) {<div [class]="cm.cn(cm.fontWeight('medium'), cm.textSize('sm'))" [attr.style]="s.heading">{{ t('ide.chat.skills.heading', undefined, { defaultValue: 'Skills' }) }}</div>}
        @if (onResetDefault && defaultsExplicit) {<button type="button" data-mol-id="skill-reset-defaults" (click)="resetDefaults()" [class]="quietAction()">{{ t('ide.chat.skills.resetDefaults', undefined, { defaultValue: 'Load all by default' }) }}</button>}
      </div>
      @if (onCreate && !creating()) {<mol-tooltip placement="top"><button type="button" data-mol-id="skill-new" (click)="openCreate()" [class]="primaryAction()">{{ t('ide.chat.skills.new', undefined, { defaultValue: 'New skill' }) }}</button><ng-container ngProjectAs="[slot=content]">{{ t('ide.chat.skills.newTitle', undefined, { defaultValue: 'Create a new project skill' }) }}</ng-container></mol-tooltip>}
    </div>
    @if (onCreate && creating()) {<form data-mol-id="skill-create-form" (submit)="onFormSubmit($event)" [class]="cm.borderT" [attr.style]="formStyle()"><input #createName data-mol-id="skill-create-name" [value]="newName()" [attr.value]="newName()" (input)="onTypeName($event)" [attr.placeholder]="t('ide.chat.skills.newPlaceholder', undefined, { defaultValue: 'New skill name…' })" [class]="cm.textSize('xs')" [attr.style]="fieldStyle()" /><div [attr.style]="s.createActions"><button type="button" data-mol-id="skill-create-cancel" (click)="cancelCreate()" [class]="quietAction()">{{ t('ide.chat.skills.cancel', undefined, { defaultValue: 'Cancel' }) }}</button><button type="submit" data-mol-id="skill-create-submit" [disabled]="!newName().trim() || busy()" [class]="primaryAction()">{{ t('ide.chat.skills.create', undefined, { defaultValue: 'Create' }) }}</button></div></form>}
    <input data-mol-id="skills-search" [value]="query()" [attr.value]="query()" (input)="onSearch($event)" [attr.placeholder]="t('ide.chat.skills.searchPlaceholder', undefined, { defaultValue: 'Filter skills…' })" [class]="cm.textSize('xs')" [attr.style]="searchStyle()" />
    @if (status() === 'loading') {<div [class]="cm.textMuted" [attr.style]="s.state">{{ t('ide.chat.skills.loading', undefined, { defaultValue: 'Loading skills…' }) }}</div>}
    @if (status() === 'waiting') {<div [class]="cm.textMuted" [attr.style]="s.state">{{ t('ide.chat.skills.waitingForSandbox', undefined, { defaultValue: 'Waiting for the sandbox to finish starting…' }) }}</div>}
    @if (status() === 'error') {<div [class]="cm.textMuted" [attr.style]="s.state">{{ t('ide.chat.skills.error', undefined, { defaultValue: 'Could not load skills for this project.' }) }}</div>}
    @if (status() === 'ready' && filtered().length === 0) {<div [class]="cm.textMuted" [attr.style]="s.state">{{ filteredEmptyText() }}</div>}
    @if (status() === 'ready') {@for (skill of filtered(); track skill.path) {<div [attr.data-mol-id]="'skill-row-' + skill.name" [class]="cm.borderT" [attr.style]="rowStyle()"><div [attr.style]="s.info"><div [attr.style]="s.nameRow"><button type="button" [attr.data-mol-id]="'skill-open-' + skill.name" (click)="open(skill)" [class]="cm.cn(cm.fontWeight('medium'), cm.touchTargetCompact)" [attr.style]="s.nameButton">{{ skill.name }}</button>@if (isDefaultRow(skill)) {<span [attr.data-mol-id]="'skill-default-badge-' + skill.name" [attr.style]="defaultBadgeStyle()">{{ t('ide.chat.skills.defaultBadge', undefined, { defaultValue: 'Default' }) }}</span>}@if (isLoadedRow(skill)) {<span [attr.data-mol-id]="'skill-loaded-badge-' + skill.name" [attr.style]="loadedBadgeStyle()">{{ t('ide.chat.skills.loadedBadge', undefined, { defaultValue: 'Loaded' }) }}</span>}</div>@if (skill.description) {<div [class]="cm.textMuted" [attr.style]="s.description">{{ skill.description }}</div>}</div><div [attr.style]="s.actions">@if (!isLoadedRow(skill)) {<button type="button" [attr.data-mol-id]="'skill-load-' + skill.name" (click)="open(skill)" [class]="primaryAction()">{{ t('ide.chat.skills.load', undefined, { defaultValue: 'Load' }) }}</button>}@if (onToggleDefault) {<button type="button" [attr.data-mol-id]="'skill-default-' + skill.name" [attr.aria-pressed]="isDefaultRow(skill) ? 'true' : 'false'" [attr.aria-label]="starLabel(skill)" (click)="toggleDefault(skill)" [class]="quietAction()" [attr.style]="s.starToggle"><svg mol-icon [name]="isDefaultRow(skill) ? 'star' : 'star-outline'" [size]="13" aria-hidden="true" style="color: var(--mol-color-primary, #6366f1)"></svg></button>}</div></div>}}`,
})
export class SkillsCard implements OnChanges, OnInit {
  /** The project whose skills are listed (the routes' id). */
  projectId = ''

  /** Seeds the search box from `/skills <query>` (the FIRST value only). */
  initialQuery = ''

  /** Opens a skill in the editor (it does NOT attach it as message context). */
  onLoad: (skill: SkillInfo) => void = () => {}

  /**
   * Creates a skill named `name`, returning the fresh skill (or `null` on
   * failure, which keeps the form open). `undefined` hides the "New skill"
   * affordance.
   */
  onCreate?: (name: string) => Promise<SkillInfo | null>

  /** Mounts with the create form already open (the bare `/newskill` path). */
  startCreating = false

  /** Paths opened this session — each hides its Load button for a Loaded pill. */
  loadedSkillPaths?: ReadonlySet<string>

  /** Paths in the persisted default-loaded set — badge, filled star, Loaded. */
  defaultSkillPaths?: ReadonlySet<string>

  /** Adds/removes a skill from the default-loaded set. `undefined` hides it. */
  onToggleDefault?: (skill: SkillInfo, next: boolean) => void

  /** Resets the default set to the implicit all-skills state. `undefined` hides it. */
  onResetDefault?: () => void

  /** The default set is an explicit user-built one (vs the implicit unset→all). */
  defaultsExplicit = false

  /** Light theme (drives the row border + field inset). */
  isLight = false

  /** Chrome-less inside the command overlay; full card chrome in the timeline. */
  embedded = false

  /** The bonded ClassMap (styling tokens resolve at render time). */
  protected readonly cm: UIClassMap = getClassMap()

  /** The bonded HTTP client (an `HttpProvider` in the tree supplies it). */
  private readonly http = useHttpClient()

  /** Reactive translation, read in the injection context. */
  protected readonly i18n = useTranslation()

  /** The translation function for the template. */
  protected readonly t = this.i18n.t

  /** The static style texts. */
  protected readonly s = STYLES

  /** The discovery status. */
  protected readonly status = signal<SkillsStatus>('loading')

  /** The discovered skills, sorted by name. */
  private readonly skills = signal<SkillInfo[]>([])

  /** The live search query, seeded ONCE from `initialQuery`. */
  protected readonly query = signal('')

  /** Whether the create form is open. */
  protected readonly creating = signal(false)

  /** The name typed into the create form. */
  protected readonly newName = signal('')

  /** Whether a create request is in flight. */
  protected readonly busy = signal(false)

  /** The run a new one supersedes (React's per-effect `cancelled` flag). */
  private fetchTicket = 0

  /** The create-form name field, for React's `autoFocus`. */
  @ViewChild('createName') private createNameQuery?: ElementRef<HTMLInputElement>

  /** One-shot: focus the name field after the next render (the form opened). */
  private focusName = false

  /**
   * React's effect: the initial binding and every replaced `projectId`
   * re-run the discovery (`ngOnChanges` fires for the first binding too).
   * @param changes - The changed inputs.
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['projectId']) this.load()
  }

  /** Seeds the query and the form state (React's `useState` initializers). */
  ngOnInit(): void {
    this.query.set(this.initialQuery)
    if (this.startCreating && this.onCreate) this.openCreate()
  }

  /**
   * Registers the new-name autofocus as an after-render write (React's
   * `autoFocus`): the focus flag is consumed after the render that put the
   * field in the tree, where a `focusin` listener's state change renders. It
   * no-ops while the form is closed (no element) or the flag is clear.
   */
  constructor() {
    afterEveryRender({ write: () => this.applyNameFocus() })
  }

  /**
   * React's `autoFocus` on the new-name field: consumes the flag once the
   * field is in the tree.
   */
  private applyNameFocus(): void {
    if (!this.focusName) return
    const el = this.createNameQuery?.nativeElement
    if (!el) return
    el.focus()
    this.focusName = false
  }

  /**
   * Runs the discovery: the file list, then each skill's content, with the
   * bounded retry that keeps the "waiting" state. A later run supersedes this
   * one: its reply is ignored the way React's `cancelled` flag ignores it.
   */
  private load(): void {
    const ticket = ++this.fetchTicket
    this.status.set('loading')
    void (async () => {
      try {
        const { skills: loaded, stillBooting } = await loadProjectSkillsResilient(
          async () =>
            (await this.http.get<{ files: string[] }>(`/projects/${this.projectId}/files-list`))
              .data.files ?? [],
          async (relativePath) =>
            (
              await this.http.get<{ content: string }>(
                `/projects/${this.projectId}/files/${relativePath}`,
              )
            ).data.content,
          {
            isCancelled: () => ticket !== this.fetchTicket,
            // First empty/failed try → flip to the honest "waiting for the
            // sandbox" state while we keep retrying, instead of a misleading
            // "No skills found".
            onRetry: () => {
              if (ticket === this.fetchTicket) this.status.set('waiting')
            },
          },
        )
        if (ticket !== this.fetchTicket) return
        this.skills.set(loaded)
        // A bounded retry that still came back empty means the sandbox never
        // finished scaffolding skills in our window — keep the "waiting"
        // state so the user sees an honest "still starting" message, not
        // "no skills found".
        this.status.set(loaded.length === 0 && stillBooting ? 'waiting' : 'ready')
      } catch (error) {
        logger.warn('Failed to load project skills', { error })
        if (ticket === this.fetchTicket) this.status.set('error')
      }
    })()
  }

  /**
   * The listed skills after the search filter.
   * @returns The matching skills, in input order.
   */
  protected filtered(): SkillInfo[] {
    return filterSkills(this.skills(), this.query())
  }

  /**
   * The theme's row border colour.
   * @returns The border colour.
   */
  protected rowBorder(): string {
    return this.isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)'
  }

  /**
   * The theme's neutral field inset.
   * @returns The field background.
   */
  private fieldBackground(): string {
    return this.isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.06)'
  }

  /**
   * The card container's inline style: chrome-less inside the command
   * overlay, the boxed card (with the timeline's bottom-margin rhythm)
   * otherwise.
   * @returns The style attribute text.
   */
  protected rootStyle(): string | null {
    return styleText(
      this.embedded ? { padding: '10px 12px' } : { ...chatCardStyleAngular(), marginBottom: 16 },
    )
  }

  /**
   * The create form's inline style.
   * @returns The style attribute text.
   */
  protected formStyle(): string | null {
    return styleText({
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      padding: '8px 0px',
      marginTop: 6,
      borderColor: this.rowBorder(),
    })
  }

  /**
   * The text field's style bag: the same box as every card button (26px
   * tall, 3px radius) in the theme's neutral inset.
   * @returns The style bag.
   */
  private fieldBag(): Record<string, string | number> {
    return {
      width: '100%',
      height: 26,
      padding: '0px 6px',
      borderRadius: 3,
      border: `1px solid ${this.rowBorder()}`,
      background: this.fieldBackground(),
      color: 'inherit',
      outline: 'none',
    }
  }

  /**
   * A text field's inline style.
   * @returns The style attribute text.
   */
  protected fieldStyle(): string | null {
    return styleText(this.fieldBag())
  }

  /**
   * The search field's inline style: the field box plus the listing's top
   * margin rhythm.
   * @returns The style attribute text.
   */
  protected searchStyle(): string | null {
    return styleText({ ...this.fieldBag(), marginBottom: 6 })
  }

  /**
   * A skill row's inline style.
   * @returns The style attribute text.
   */
  protected rowStyle(): string | null {
    return styleText({
      display: 'flex',
      alignItems: 'flex-start',
      gap: 8,
      padding: '6px 0px',
      borderColor: this.rowBorder(),
    })
  }

  /**
   * Whether the skill is in the persisted default-loaded set.
   * @param skill - The skill.
   * @returns True when it is a default.
   */
  protected isDefaultRow(skill: SkillInfo): boolean {
    return this.defaultSkillPaths?.has(skill.path) ?? false
  }

  /**
   * Whether the skill is already in context (default-loaded or opened this
   * session).
   * @param skill - The skill.
   * @returns True when it is loaded.
   */
  protected isLoadedRow(skill: SkillInfo): boolean {
    return (this.loadedSkillPaths?.has(skill.path) ?? false) || this.isDefaultRow(skill)
  }

  /**
   * The star toggle's aria-label.
   * @param skill - The skill.
   * @returns The translated label.
   */
  protected starLabel(skill: SkillInfo): string {
    return this.isDefaultRow(skill)
      ? this.t('ide.chat.skills.unsetDefault', undefined, {
          defaultValue: 'Stop loading by default',
        })
      : this.t('ide.chat.skills.setDefault', undefined, { defaultValue: 'Load by default' })
  }

  /**
   * The empty-listing message (no match, or nothing found).
   * @returns The translated message.
   */
  protected filteredEmptyText(): string {
    return this.query().trim()
      ? this.t(
          'ide.chat.skills.noMatch',
          { query: this.query().trim() },
          { defaultValue: 'No skills match “{{query}}”.' },
        )
      : this.t('ide.chat.skills.empty', undefined, {
          defaultValue: 'No skills found in .agents/skills/ for this project.',
        })
  }

  /**
   * A headline action's class string.
   * @returns The resolved classes.
   */
  protected primaryAction(): string {
    return this.cm.cn(
      this.cm.button({ variant: 'solid', color: 'primary', size: 'xs' }),
      this.cm.touchTargetCompact,
      this.cm.shrink0,
    )
  }

  /**
   * A quiet action's class string (the reset control, the create-form
   * buttons, the star toggle).
   * @returns The resolved classes.
   */
  protected quietAction(): string {
    return this.cm.cn(
      this.cm.button({ variant: 'ghost', size: 'xs' }),
      this.cm.touchTargetCompact,
      this.cm.shrink0,
    )
  }

  /**
   * The green "Default" badge's style.
   * @returns The style attribute text.
   */
  protected defaultBadgeStyle(): string | null {
    return skillBadgeStyle('var(--mol-color-success, #22c55e)')
  }

  /**
   * The blue "Loaded" badge's style.
   * @returns The style attribute text.
   */
  protected loadedBadgeStyle(): string | null {
    return skillBadgeStyle('var(--mol-color-primary, #6366f1)')
  }

  /**
   * Opens a skill in the editor (React calls `onLoad` with no event
   * argument).
   * @param skill - The skill to open.
   */
  protected open(skill: SkillInfo): void {
    this.onLoad(skill)
  }

  /** Opens the create form (the "New skill" button; the form's Cancel owns closing). */
  protected openCreate(): void {
    this.creating.set(true)
    this.focusName = true
  }

  /** Closes the create form and clears the typed name. */
  protected cancelCreate(): void {
    this.creating.set(false)
    this.newName.set('')
  }

  /** Resets the default-loaded set to the implicit all-skills state. */
  protected resetDefaults(): void {
    this.onResetDefault?.()
  }

  /**
   * Toggles the skill's membership in the default-loaded set (React calls
   * `onToggleDefault` with no event argument).
   * @param skill - The skill.
   */
  protected toggleDefault(skill: SkillInfo): void {
    this.onToggleDefault?.(skill, !this.isDefaultRow(skill))
  }

  /**
   * Reads the search field into the query, keeping the `value` attribute in
   * step the way React's controlled input does.
   * @param event - The native input event.
   */
  protected onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value
    this.query.set(value)
    ;(event.target as HTMLInputElement).setAttribute('value', value)
  }

  /**
   * Reads the create-form name field, keeping the `value` attribute in step
   * the way React's controlled input does.
   * @param event - The native input event.
   */
  protected onTypeName(event: Event): void {
    const value = (event.target as HTMLInputElement).value
    this.newName.set(value)
    ;(event.target as HTMLInputElement).setAttribute('value', value)
  }

  /**
   * Submits the create form: delegates creation to `onCreate`, and on
   * success adds the new skill to the list (so it appears without a
   * re-fetch), clears any active filter so it's visible, and closes the form.
   * @param event - The native submit event.
   */
  protected onFormSubmit(event: Event): void {
    event.preventDefault()
    void this.submitNewSkill()
  }

  /** The form's submission, split from the event handler for the async work. */
  private async submitNewSkill(): Promise<void> {
    const name = this.newName().trim()
    const onCreate = this.onCreate
    if (!name || !onCreate || this.busy()) return
    this.busy.set(true)
    try {
      const created = await onCreate(name)
      if (created) {
        this.skills.update((prev) =>
          prev.some((s) => s.path === created.path)
            ? prev
            : [...prev, created].sort((a, b) => a.name.localeCompare(b.name)),
        )
        this.query.set('')
        this.newName.set('')
        this.creating.set(false)
      }
    } finally {
      this.busy.set(false)
    }
  }
}

/**
 * The container chrome shared by the chat timeline's boxed cards, with the
 * radius as React writes it (`styleText` gives the number its `px`).
 *
 * @returns The card container's style bag.
 */
function chatCardStyleAngular(): Record<string, string | number> {
  const { padding, border, background } = chatCardStyle()
  return { padding, borderRadius: 8, border, background }
}

/** The static style texts. */
const STYLES = {
  /** The header row: title area left, actions right. */
  headerRow: styleText({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 6,
  }),
  /** The title area left of the header. */
  titleArea: styleText({ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }),
  /** The card heading (`Skills`). */
  heading: styleText({ flexShrink: 0 }),
  /** The create form's bottom action row. */
  createActions: styleText({ display: 'flex', justifyContent: 'flex-end', gap: 6 }),
  /** The listing states' rows (loading, waiting, error, empty). */
  state: styleText({ padding: '6px 0px' }),
  /** A row's info column. */
  info: styleText({ flex: '1 1 0%', minWidth: 0 }),
  /** The name/badge line. */
  nameRow: styleText({ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }),
  /** A skill description line. */
  description: styleText({ marginTop: 2, lineHeight: 1.4 }),
  /** The action group right of each row. */
  actions: styleText({ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }),
  /** The icon-only star toggle. */
  starToggle: styleText({ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }),
  /** The row name button, reset to read as the name text (the golden's text). */
  nameButton: styleText({
    padding: '0px',
    margin: '0px',
    border: 'medium',
    background: 'transparent',
    font: 'inherit',
    fontWeight: 500,
    textAlign: 'left',
    color: 'var(--mol-color-primary, #6366f1)',
    cursor: 'pointer',
  }),
} as const
