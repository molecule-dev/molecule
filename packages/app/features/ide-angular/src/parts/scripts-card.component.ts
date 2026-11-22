/**
 * `/scripts` browser — the Angular counterpart of `@molecule/app-ide-react`'s
 * `ScriptsCard` (see that file for the design notes): the same inputs (React
 * prop names), the same DOM for the same input, the same service calls. An
 * in-timeline card listing the project's saved scripts, loaded via
 * `GET /projects/:id/scripts`; a search box filters by name or description;
 * each row's Run `POST`s to the run endpoint and shows the captured output
 * inline; a collapsible "New script" creator `POST`s a script back to
 * `POST /projects/:id/scripts` and reloads.
 *
 * The host element IS React's root element (an attribute selector on a
 * `div`), and every derived value is a method or computed the template reads,
 * so each change-detection pass renders the current state the way React's
 * render does. React keeps the text fields' `value` ATTRIBUTE in step with
 * the controlled value (the DOM snapshot carries the attribute as well as the
 * live property), so both are bound; the textarea carries the property alone.
 * A `<select>`'s selection cannot be applied before its `<option>` children
 * exist (React applies it in the commit, after children mount), so the
 * module-local `SelectOptionValue` directive applies it after each view check
 * — and only when an option matches, the way React's updateOptions leaves a
 * no-match select at the browser's own first-option selection.
 *
 * Styling uses `getClassMap()` (`cm.*`); the only inline styles are layout
 * the ClassMap can't express, serialized through `styleText` the way React
 * writes numbers (`26` → `26px`). All user-facing text goes through `t()`.
 *
 * @module
 */

import {
  type AfterViewChecked,
  Component,
  Directive,
  ElementRef,
  inject,
  type OnChanges,
  signal,
  type SimpleChanges,
} from '@angular/core'

import { DEFAULT_AGENT_NAME, useHttpClient, useTranslation } from '@molecule/app-angular'
import { chatCardStyle } from '@molecule/app-ide-panel-logic'
import type { ScriptInfo, ScriptParam, ScriptRunResult } from '@molecule/app-ide-panel-logic/panels'
import {
  buildSaveScriptPayload,
  filterScripts,
  formatRunOutput,
  isSaveScriptValid,
  missingRequiredParams,
  runSucceeded,
} from '@molecule/app-ide-panel-logic/panels'
import { getLogger } from '@molecule/app-logger'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { styleText } from '@molecule/app-ui-angular'

const logger = getLogger('scripts-card')

/** Discovery status for the scripts list — mirrors the React card's. */
type ScriptsStatus = 'loading' | 'ready' | 'error'

/** Per-script run state: `'running'` while in flight, then the result. */
type RunState = 'running' | ScriptRunResult

/**
 * The card's inline-style texts that never change, serialized once with
 * `styleText` (React's camelCase numbers become `px` exactly the way React
 * writes them; the conformance normalizer sorts declarations, so key order is
 * free).
 */
const STYLES = {
  /** The header row: title area left, "New script" right. */
  headerRow: styleText({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 6,
  }),
  /** The title area left of the header (an empty flex child when embedded). */
  titleArea: styleText({ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }),
  /** The card heading (`Scripts`). */
  heading: styleText({ flexShrink: 0 }),
  /** The creator's column of fields. */
  creator: styleText({
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    padding: '8px 0px',
    marginTop: 6,
  }),
  /** The bottom action rows (creator + option form). */
  actionRow: styleText({ display: 'flex', justifyContent: 'flex-end', gap: 6 }),
  /** The option form's column of fields. */
  options: styleText({ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }),
  /** One param's label row. */
  paramLabel: styleText({ display: 'flex', flexDirection: 'column', gap: 2 }),
  /** The save error line. */
  saveError: styleText({ lineHeight: 1.4 }),
  /** The listing states' rows (loading, error, empty). */
  state: styleText({ padding: '6px 0px' }),
  /** A script row. */
  row: styleText({ padding: '6px 0px' }),
  /** A row's single line: name block left, Run right. */
  rowLine: styleText({ display: 'flex', alignItems: 'flex-start', gap: 8 }),
  /** The name/description block left of the Run. */
  nameBlock: styleText({ flex: '1 1 0%', minWidth: 0 }),
  /** The run output block. */
  output: styleText({ marginTop: 6 }),
  /** The run output's status line. */
  outputStatus: styleText({ fontWeight: 600, marginBottom: 2 }),
} as const

/**
 * Whether a run state holds a settled result (the union's object arm).
 *
 * @param run - The state, or nothing before the script's first run.
 * @returns True when it is a result.
 */
function isResult(run: RunState | undefined): run is ScriptRunResult {
  return run !== undefined && run !== 'running'
}

/**
 * Applies a controlled select's wanted value AFTER its options exist (React
 * applies it in the commit): marks the matching option selected, and — like
 * React's updateOptions — leaves the select alone when nothing matches, so it
 * keeps the browser's own first-option selection.
 *
 * @param el - The select element.
 * @param wanted - The wanted value.
 */
function applySelectValue(el: HTMLSelectElement, wanted: string): void {
  for (const option of Array.from(el.options)) {
    if (option.value === wanted) {
      option.selected = true
      return
    }
  }
}

/**
 * One enum option field's controlled select: its options are the field's own
 * children (created before the view is checked) and the wanted value is
 * applied after each view check, matching only.
 */
@Directive({
  selector: 'select[mol-scripts-select-value]',
  standalone: true,
  inputs: ['wanted'],
})
class SelectOptionValue implements AfterViewChecked {
  /** The wanted value (an option of the select, or nothing that matches). */
  wanted = ''

  /** The select host. */
  private readonly host: ElementRef<HTMLSelectElement> = inject(ElementRef)

  /**
   * Applies the wanted selection once the options exist.
   */
  ngAfterViewChecked(): void {
    applySelectValue(this.host.nativeElement, this.wanted)
  }
}

/**
 * The scripts browser shown by `/scripts`.
 */
@Component({
  selector: 'div[mol-scripts-card]',
  standalone: true,
  imports: [SelectOptionValue],
  inputs: ['projectId', 'initialQuery', 'isLight', 'agentName', 'embedded'],
  host: {
    'data-mol-id': 'scripts-card',
    '[class]': 'cm.textSize("xs")',
    '[attr.style]': 'rootStyle()',
  },
  // prettier-ignore
  template: `<div [attr.style]="s.headerRow">
      <div [attr.style]="s.titleArea">
        @if (!embedded) {<div [class]="cm.cn(cm.fontWeight('medium'), cm.textSize('sm'))" [attr.style]="s.heading">{{ t('ide.chat.scripts.heading', undefined, { defaultValue: 'Scripts' }) }}</div>}
      </div>
      @if (!creating()) {<button type="button" data-mol-id="scripts-new-toggle" (click)="openCreator()" [class]="cm.cn(cm.button({ variant: 'solid', color: 'primary', size: 'xs' }), cm.touchTargetCompact, cm.shrink0)">{{ t('ide.chat.scripts.new', undefined, { defaultValue: 'New script' }) }}</button>}
    </div>
    @if (creating()) {<div data-mol-id="scripts-creator" [class]="cm.borderT" [attr.style]="creatorStyle()">
      <input [value]="newName()" [attr.value]="newName()" data-mol-id="scripts-new-name" (input)="onName($event)" [attr.placeholder]="t('ide.chat.scripts.namePlaceholder', undefined, { defaultValue: 'Script name (e.g. run-tests)' })" [class]="cm.textSize('xs')" [attr.style]="fieldInputStyle()" />
      <input [value]="newDescription()" [attr.value]="newDescription()" data-mol-id="scripts-new-description" (input)="onDescription($event)" [attr.placeholder]="t('ide.chat.scripts.descriptionPlaceholder', undefined, { defaultValue: 'What does it do?' })" [class]="cm.textSize('xs')" [attr.style]="fieldInputStyle()" />
      <textarea [value]="newBody()" data-mol-id="scripts-new-body" (input)="onBody($event)" [attr.placeholder]="t('ide.chat.scripts.bodyPlaceholder', undefined, { defaultValue: '#!/bin/sh\nnpm test' })" rows="4" [class]="cm.textSize('xs')" [attr.style]="bodyStyle()"></textarea>
      @if (saveError(); as message) {<div [class]="cm.textError" [attr.style]="s.saveError">{{ message }}</div>}
      <div [attr.style]="s.actionRow">
        <button type="button" data-mol-id="scripts-cancel" (click)="closeCreator()" [class]="cm.cn(cm.button({ variant: 'ghost', size: 'xs' }), cm.touchTargetCompact, cm.shrink0)">{{ t('ide.chat.scripts.cancelNew', undefined, { defaultValue: 'Cancel' }) }}</button>
        <button type="button" data-mol-id="scripts-save" (click)="save()" [disabled]="saving()" [class]="cm.cn(cm.button({ variant: 'solid', color: 'primary', size: 'xs' }), cm.touchTargetCompact, cm.shrink0)">{{ saving() ? t('ide.chat.scripts.saving', undefined, { defaultValue: 'Saving…' }) : t('ide.chat.scripts.save', undefined, { defaultValue: 'Save script' }) }}</button>
      </div>
    </div>}
    <input [value]="query()" [attr.value]="query()" data-mol-id="scripts-search" (input)="onSearch($event)" [attr.placeholder]="t('ide.chat.scripts.searchPlaceholder', undefined, { defaultValue: 'Filter scripts…' })" [class]="cm.textSize('xs')" [attr.style]="searchStyle()" />
    @if (status() === 'loading') {<div [class]="cm.textMuted" [attr.style]="s.state">{{ t('ide.chat.scripts.loading', undefined, { defaultValue: 'Loading scripts…' }) }}</div>}
    @if (status() === 'error') {<div [class]="cm.textMuted" [attr.style]="s.state">{{ t('ide.chat.scripts.error', undefined, { defaultValue: 'Could not load scripts for this project.' }) }}</div>}
    @if (status() === 'ready' && filtered().length === 0) {<div [class]="cm.textMuted" [attr.style]="s.state">{{ emptyText() }}</div>}
    @if (status() === 'ready') {@for (script of filtered(); track script.name) {<div [attr.data-mol-id]="'script-row-' + script.name" [class]="cm.borderT" [attr.style]="rowStyle()">
      <div [attr.style]="s.rowLine">
        <div [attr.style]="s.nameBlock">
          <div [class]="cm.fontWeight('medium')">{{ script.name }}</div>
          @if (script.description) {<div [class]="cm.textMuted" [attr.style]="rowDescriptionStyle()">{{ script.description }}</div>}
        </div>
        <button type="button" [attr.data-mol-id]="'script-run-' + script.name" (click)="runClick(script)" [disabled]="runStates()[script.name] === 'running'" [class]="cm.cn(cm.button({ variant: 'solid', color: 'primary', size: 'xs' }), cm.touchTargetCompact, cm.shrink0)">{{ runLabel(script) }}</button>
      </div>
      @if (script.params?.length && openForms()[script.name]) {<div [attr.data-mol-id]="'script-options-' + script.name" [attr.style]="s.options">
        @for (param of script.params; track param.name) {<label [attr.style]="s.paramLabel">
          <span [class]="cm.textMuted">{{ paramLabel(param) }}@if (param.required) {<span [class]="cm.textError">{{ requiredMarker() }}</span>}</span>
          @if (param.type === 'enum') {<select mol-scripts-select-value [wanted]="paramValue(script, param)" [attr.data-mol-id]="'script-option-' + script.name + '-' + param.name" (change)="onParam(script.name, param.name, $event)" [class]="cm.textSize('xs')" [attr.style]="fieldInputStyle()">@if (!param.required) {<option value=""></option>}@for (opt of param.options ?? []; track opt) {<option [value]="opt">{{ opt }}</option>}</select>} @else {<input [value]="paramValue(script, param)" [attr.value]="paramValue(script, param)" [attr.data-mol-id]="'script-option-' + script.name + '-' + param.name" (input)="onParam(script.name, param.name, $event)" [class]="cm.textSize('xs')" [attr.style]="fieldInputStyle()" />}
        </label>}
        <div [attr.style]="s.actionRow">
          <button type="button" [attr.data-mol-id]="'script-options-cancel-' + script.name" (click)="cancelForm(script.name)" [class]="cm.cn(cm.button({ variant: 'ghost', size: 'xs' }), cm.touchTargetCompact, cm.shrink0)">{{ t('ide.chat.scripts.cancelRun', undefined, { defaultValue: 'Cancel' }) }}</button>
          <button type="button" [attr.data-mol-id]="'script-options-run-' + script.name" (click)="submitForm(script)" [disabled]="missingRequiredParams(script, paramValues()[script.name] ?? {}).length > 0" [class]="cm.cn(cm.button({ variant: 'solid', color: 'primary', size: 'xs' }), cm.touchTargetCompact, cm.shrink0)">{{ t('ide.chat.scripts.run', undefined, { defaultValue: 'Run' }) }}</button>
        </div>
      </div>}
      @if (resultOf(script.name); as run) {<div [attr.data-mol-id]="'script-output-' + script.name" [attr.style]="s.output">
        <div [class]="cm.textSize('xs')" [attr.style]="outputStatus(run)">{{ runSucceeded(run) ? t('ide.chat.scripts.exitOk', undefined, { defaultValue: 'Exited 0' }) : t('ide.chat.scripts.exitFail', { code: run.exitCode }, { defaultValue: 'Exited {{code}}' }) }}</div>
        @if (formatRunOutput(run); as output) {<pre [class]="cm.textSize('xs')" [attr.style]="outputStyle()">{{ output }}</pre>} @else {<div [class]="cm.textMuted">{{ t('ide.chat.scripts.noOutput', undefined, { defaultValue: '(no output)' }) }}</div>}
      </div>}
    </div>}}`,
})
export class ScriptsCard implements OnChanges {
  /** The project whose scripts are listed (the routes' id). */
  projectId = ''

  /** Seeds the search box from `/scripts <query>` (the FIRST value only). */
  initialQuery = ''

  /** Light theme (drives the row border + field inset). */
  isLight = false

  /** The agent's display name, for the empty state. */
  agentName?: string

  /** Chrome-less inside the command overlay; full card chrome in the timeline. */
  embedded = false

  /** The bonded HTTP client (an `HttpProvider` in the tree supplies it). */
  private readonly http = useHttpClient()

  /** The bonded ClassMap (styling tokens resolve at render time). */
  protected readonly cm: UIClassMap = getClassMap()

  /** Reactive translation, read in the injection context. */
  protected readonly i18n = useTranslation()

  /** The translation function for the template. */
  protected readonly t = this.i18n.t

  /** The static style texts. */
  protected readonly s = STYLES

  /** How the listing went (starts loading, as React's initial state does). */
  protected readonly status = signal<ScriptsStatus>('loading')

  /** The listing, in the reply's order. */
  protected readonly scripts = signal<ScriptInfo[]>([])

  /** The live search query, seeded ONCE from `initialQuery`. */
  protected readonly query = signal('')

  /** Per-script run state: `'running'` while in flight, then the result. */
  protected readonly runStates = signal<Record<string, RunState>>({})

  /** Which scripts have their option form open. */
  protected readonly openForms = signal<Record<string, boolean>>({})

  /** The values typed into each script's option form. */
  protected readonly paramValues = signal<Record<string, Record<string, string>>>({})

  /** Whether the new-script creator is open. */
  protected readonly creating = signal(false)

  /** The creator's name field. */
  protected readonly newName = signal('')

  /** The creator's description field. */
  protected readonly newDescription = signal('')

  /** The creator's body field. */
  protected readonly newBody = signal('')

  /** Whether a save POST is in flight. */
  protected readonly saving = signal(false)

  /** The creator's validation/transport failure, already translated. */
  protected readonly saveError = signal<string | null>(null)

  /** Seeds the search box once (React's `useState(initialQuery)`). */
  ngOnInit(): void {
    this.query.set(this.initialQuery)
  }

  /**
   * React's effect: the initial binding and every replaced `projectId`
   * re-fetch the list (`ngOnChanges` fires for the first binding too).
   * @param changes - The changed inputs.
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['projectId']) void this.loadScripts()
  }

  /**
   * The listed scripts after the search filter.
   * @returns The matching scripts, in input order.
   */
  protected filtered(): ScriptInfo[] {
    return filterScripts(this.scripts(), this.query())
  }

  /**
   * Loads the listing. React's effect re-runs on a replaced `projectId` (its
   * callback identity changes); `ngOnChanges` re-runs this the same way.
   */
  private async loadScripts(): Promise<void> {
    this.status.set('loading')
    try {
      const res = await this.http.get<{ scripts: ScriptInfo[] }>(
        `/projects/${this.projectId}/scripts`,
      )
      this.scripts.set(res.data.scripts ?? [])
      this.status.set('ready')
    } catch (error) {
      logger.warn('Failed to load project scripts', { error })
      this.status.set('error')
    }
  }

  /**
   * Runs a script. React wraps this in an arrow and calls it with NO event
   * argument.
   * @param name - The script's name.
   * @param params - The typed option values; omitted for a plain run.
   */
  private async handleRun(name: string, params?: Record<string, string>): Promise<void> {
    this.runStates.update((prev) => ({ ...prev, [name]: 'running' }))
    try {
      const res = await this.http.post<ScriptRunResult>(
        `/projects/${this.projectId}/scripts/${encodeURIComponent(name)}/run`,
        params ? { params } : undefined,
      )
      this.runStates.update((prev) => ({ ...prev, [name]: res.data }))
    } catch (error) {
      logger.warn('Failed to run project script', { error, name })
      this.runStates.update((prev) => ({
        ...prev,
        [name]: { stdout: '', stderr: '', exitCode: 1 },
      }))
    }
  }

  /**
   * The Run button's click: a script with options opens its form (seeded with
   * defaults, ONCE — a canceled form keeps its typed values), a plain script
   * runs immediately.
   * @param script - The script whose Run was clicked.
   */
  protected runClick(script: ScriptInfo): void {
    if (script.params?.length) {
      if (!this.paramValues()[script.name]) {
        const seed: Record<string, string> = {}
        for (const p of script.params ?? []) seed[p.name] = p.default ?? ''
        this.paramValues.update((prev) => ({ ...prev, [script.name]: seed }))
      }
      this.openForms.update((prev) => ({ ...prev, [script.name]: true }))
      return
    }
    void this.handleRun(script.name)
  }

  /**
   * Records one typed option value.
   * @param scriptName - The script the form belongs to.
   * @param paramName - The option's name.
   * @param value - The typed value.
   */
  protected onParam(scriptName: string, paramName: string, event: Event): void {
    const value = (event.target as HTMLInputElement).value
    this.paramValues.update((prev) => ({
      ...prev,
      [scriptName]: { ...prev[scriptName], [paramName]: value },
    }))
  }

  /**
   * Run from the option form: dispatch with the typed values, then close.
   * @param script - The script whose form was submitted.
   */
  protected submitForm(script: ScriptInfo): void {
    const values = this.paramValues()[script.name] ?? {}
    this.openForms.update((prev) => ({ ...prev, [script.name]: false }))
    void this.handleRun(script.name, values)
  }

  /**
   * Closes one script's option form without running (React's inline
   * `setOpenForms` arrow, called with no event).
   * @param scriptName - The script whose form closes.
   */
  protected cancelForm(scriptName: string): void {
    this.openForms.update((prev) => ({ ...prev, [scriptName]: false }))
  }

  /**
   * The wanted value of one param's field.
   * @param script - The script the form belongs to.
   * @param param - The option's name.
   * @returns The typed value, or the empty string.
   */
  protected paramValue(script: ScriptInfo, param: ScriptParam): string {
    return this.paramValues()[script.name]?.[param.name] ?? ''
  }

  /** Opens the creator (React calls `setCreating(true)` with no event). */
  protected openCreator(): void {
    this.creating.set(true)
  }

  /** Closes the creator (React calls `setCreating(false)` with no event). */
  protected closeCreator(): void {
    this.creating.set(false)
  }

  /**
   * Saves the new script. React wraps this in an arrow and calls it with NO
   * event argument.
   */
  protected async save(): Promise<void> {
    const payload = buildSaveScriptPayload({
      name: this.newName(),
      description: this.newDescription(),
      body: this.newBody(),
    })
    if (!isSaveScriptValid(payload)) {
      this.saveError.set(
        this.t('ide.chat.scripts.invalid', undefined, {
          defaultValue: 'A script needs a name and a non-empty body.',
        }),
      )
      return
    }
    this.saving.set(true)
    this.saveError.set(null)
    try {
      await this.http.post(`/projects/${this.projectId}/scripts`, payload)
      this.newName.set('')
      this.newDescription.set('')
      this.newBody.set('')
      this.creating.set(false)
      await this.loadScripts()
    } catch (error) {
      logger.warn('Failed to save project script', { error })
      this.saveError.set(
        this.t('ide.chat.scripts.saveError', undefined, {
          defaultValue: 'Could not save the script. Please try again.',
        }),
      )
    } finally {
      this.saving.set(false)
    }
  }

  /**
   * Reads the search field into the query (React's controlled `onChange`).
   * @param event - The native input event.
   */
  protected onSearch(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value)
  }

  /**
   * Reads the creator's name field (React's controlled `onChange`).
   * @param event - The native input event.
   */
  protected onName(event: Event): void {
    this.newName.set((event.target as HTMLInputElement).value)
  }

  /**
   * Reads the creator's description field (React's controlled `onChange`).
   * @param event - The native input event.
   */
  protected onDescription(event: Event): void {
    this.newDescription.set((event.target as HTMLInputElement).value)
  }

  /**
   * Reads the creator's body field (React's controlled `onChange`).
   * @param event - The native input event.
   */
  protected onBody(event: Event): void {
    this.newBody.set((event.target as HTMLTextAreaElement).value)
  }

  /**
   * The empty-listing message (no match, or no scripts yet).
   * @returns The translated message.
   */
  protected emptyText(): string {
    return this.query().trim()
      ? this.t(
          'ide.chat.scripts.noMatch',
          { query: this.query().trim() },
          { defaultValue: 'No scripts match “{{query}}”.' },
        )
      : this.t(
          'ide.chat.scripts.empty',
          { agentName: this.agentName ?? DEFAULT_AGENT_NAME },
          {
            defaultValue:
              'No saved scripts yet. Create one above, or ask {{agentName}} to write and save one.',
          },
        )
  }

  /**
   * A row Run button's label (running, options, or the plain Run).
   * @param script - The row's script.
   * @returns The translated label.
   */
  protected runLabel(script: ScriptInfo): string {
    if (this.runStates()[script.name] === 'running') {
      return this.t('ide.chat.scripts.running', undefined, { defaultValue: 'Running…' })
    }
    return script.params?.length
      ? this.t('ide.chat.scripts.runWithOptions', undefined, { defaultValue: 'Run…' })
      : this.t('ide.chat.scripts.run', undefined, { defaultValue: 'Run' })
  }

  /**
   * Whether a run succeeded (exit code `0`) — panel-logic's helper, on the
   * class so the template can call it.
   * @param run - The settled result.
   * @returns True when it exited zero.
   */
  protected runSucceeded(run: ScriptRunResult): boolean {
    return runSucceeded(run)
  }

  /**
   * A run's combined output text — panel-logic's helper, on the class so the
   * template can call it.
   * @param run - The settled result.
   * @returns The combined stdout/stderr (possibly empty).
   */
  protected formatRunOutput(run: ScriptRunResult): string {
    return formatRunOutput(run)
  }

  /**
   * A script's unsatisfied required options — panel-logic's helper, on the
   * class so the template can gate the form's Run on it.
   * @param script - The script whose options are checked.
   * @param values - The values typed so far.
   * @returns The unsatisfied required params.
   */
  protected missingRequiredParams(
    script: Pick<ScriptInfo, 'params'>,
    values: Record<string, string>,
  ): ScriptParam[] {
    return missingRequiredParams(script, values)
  }

  /**
   * One param's label: the author-written description, else the name.
   * @param param - The param.
   * @returns The label text.
   */
  protected paramLabel(param: ScriptParam): string {
    return param.description || param.name
  }

  /**
   * The required marker beside a param's label, leading space included (the
   * way React's `{' '}` writes it — Angular trims template whitespace, so
   * the space is part of the value).
   * @returns The marker text.
   */
  protected requiredMarker(): string {
    return ` ${this.t('ide.chat.scripts.required', undefined, { defaultValue: '(required)' })}`
  }

  /**
   * The settled result of a script's last run, when it has one.
   * @param name - The script's name.
   * @returns The result, or nothing while it runs and before the first run.
   */
  protected resultOf(name: string): ScriptRunResult | null {
    const run = this.runStates()[name]
    return isResult(run) ? run : null
  }

  /**
   * The theme's row border colour.
   * @returns The border colour.
   */
  private rowBorder(): string {
    // The colours are written the way jsdom's CSSOM serializes them (the
    // golden's spacing), because an `[attr.style]` binding sets the attribute
    // verbatim — no CSSOM pass normalizes it.
    return this.isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)'
  }

  /**
   * The theme's neutral field inset.
   * @returns The background colour.
   */
  private fieldBg(): string {
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
      this.embedded ? { padding: '10px 12px' } : { ...chatCardStyle(), marginBottom: 16 },
    )
  }

  /**
   * The creator's inline style: the fields' column above the theme's border.
   * @returns The style attribute text.
   */
  protected creatorStyle(): string | null {
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
   * The search field's inline style: the single-line field box, one margin
   * under it.
   * @returns The style attribute text.
   */
  protected searchStyle(): string | null {
    return styleText({ ...this.fieldBox(), marginBottom: 6 })
  }

  /**
   * The single-line field box: the base field box pinned to the button CVA's
   * 26px height, no vertical padding on a fixed height (a select clips
   * descenders if the content box shrinks; an input centers its line on its
   * own).
   * @returns The style object.
   */
  private fieldBox(): Record<string, string | number> {
    return {
      width: '100%',
      height: 26,
      padding: '0px 6px',
      borderRadius: 3,
      border: `1px solid ${this.rowBorder()}`,
      background: this.fieldBg(),
      color: 'inherit',
      outline: 'none',
    }
  }

  /**
   * The single-line fields' inline style (creator name/description, the
   * option fields).
   * @returns The style attribute text.
   */
  protected fieldInputStyle(): string | null {
    return styleText(this.fieldBox())
  }

  /**
   * The creator textarea's inline style: the base field box, resizable,
   * monospace.
   * @returns The style attribute text.
   */
  protected bodyStyle(): string | null {
    return styleText({
      width: '100%',
      padding: '4px 6px',
      borderRadius: 3,
      border: `1px solid ${this.rowBorder()}`,
      background: this.fieldBg(),
      color: 'inherit',
      outline: 'none',
      resize: 'vertical',
      fontFamily: 'var(--mol-font-mono, monospace)',
    })
  }

  /**
   * A script row's inline style: the row rhythm above, in the theme's colour.
   * @returns The style attribute text.
   */
  protected rowStyle(): string | null {
    return styleText({ padding: '6px 0px', borderColor: this.rowBorder() })
  }

  /**
   * A row description's inline style.
   * @returns The style attribute text.
   */
  protected rowDescriptionStyle(): string | null {
    return styleText({ marginTop: 2, lineHeight: 1.4 })
  }

  /**
   * The run output status line's inline style, in the exit's colour.
   * @param run - The settled result.
   * @returns The style attribute text.
   */
  protected outputStatus(run: ScriptRunResult): string | null {
    // The colours are written the way jsdom's CSSOM serializes them (the
    // golden's `rgb(…)` form), because an `[attr.style]` binding sets the
    // attribute verbatim — no CSSOM pass normalizes it.
    return styleText({
      fontWeight: 600,
      color: runSucceeded(run) ? 'rgb(63, 185, 80)' : 'rgb(248, 81, 73)',
      marginBottom: 2,
    })
  }

  /**
   * The run output block's inline style.
   * @returns The style attribute text.
   */
  protected outputStyle(): string | null {
    return styleText({
      margin: 0,
      padding: '6px 8px',
      borderRadius: 4,
      border: `1px solid ${this.rowBorder()}`,
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
      maxHeight: 200,
      overflow: 'auto',
      fontFamily: 'var(--mol-font-mono, monospace)',
    })
  }
}
