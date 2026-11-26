/**
 * The chat panel's blocking dialog for browsing skills, scripts, settings and
 * test runs. Its heading and content follow the selected view.
 *
 * @module
 */

import { NgComponentOutlet, NgTemplateOutlet } from '@angular/common'
import { Component, ElementRef, inject, TemplateRef, type Type } from '@angular/core'

import {
  DEFAULT_AGENT_NAME,
  MolPlacement,
  placeContentBefore,
  setElementPresent,
  usePlacement,
} from '@molecule/app-angular'
import {
  panelOverlayHeading,
  type TestFailure,
  type TestSelection,
} from '@molecule/app-ide-panel-logic'
import type { CommandId, SettingDescriptor, SkillInfo } from '@molecule/app-ide-panel-logic/panels'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Modal, styleText } from '@molecule/app-ui-angular'

import { ScriptsCard } from '../../parts/scripts-card.component.js'
import { SettingsCard } from '../../parts/settings-card.component.js'
import { SkillsCard } from '../../parts/skills-card.component.js'
import { TestsCard } from '../tests-card.component.js'
import { ChatChat } from './chat-chat.slice.js'
import { ChatCommands } from './chat-commands.slice.js'
import { ChatInnerState } from './chat-inner-state.js'
import { ChatInput } from './chat-input.slice.js'
import type { PanelOverlayVariant } from './chat-overlay.slice.js'
import { ChatOverlay } from './chat-overlay.slice.js'
import { ChatSkills } from './chat-skills.slice.js'
import { ChatTests } from './chat-tests.slice.js'
import { ChatTimeline } from './chat-timeline.slice.js'

/** React's “Panel overlay popup (/skills, /scripts, /settings)” section. */
@Component({
  selector: 'div[mol-chat-panel-overlay]',
  standalone: true,
  imports: [
    Modal,
    NgComponentOutlet,
    NgTemplateOutlet,
    ScriptsCard,
    SettingsCard,
    SkillsCard,
    TestsCard,
  ],
  hostDirectives: [MolPlacement],
  // prettier-ignore
  template: `@if (overlayValue(); as variant) {<mol-modal [open]="true" [showCloseButton]="false" [size]="'lg'" [attr.aria-label]="heading(variant)" (close)="close()" data-mol-id="chat-panel-overlay"><div [class]="headerClass" [attr.style]="headerStyle"><span [class]="titleClass">{{ heading(variant) }}</span><button type="button" data-mol-id="panel-overlay-close" [attr.aria-label]="closeLabel()" (click)="close()" [attr.style]="closeStyle()">{{ '✕' }}</button></div><div style="overflow-y: auto; flex: 1">@if (variant === 'settings') {<div mol-settings-card [settings]="settings()" [onRunCommand]="runCommand" [onPrefillInput]="prefillInput" [isLight]="isLight()" [agentName]="agentName()" [embedded]="true"></div>}@if (variant === 'skills') {<div mol-skills-card [projectId]="projectId()" [initialQuery]="query()" [onLoad]="loadSkill" [onCreate]="createSkill" [loadedSkillPaths]="skills.loadedSkillPaths()" [defaultSkillPaths]="skills.defaultSkillPaths()" [onToggleDefault]="toggleDefaultSkill" [onResetDefault]="resetDefaultSkills" [defaultsExplicit]="skills.defaultSkillsExplicit()" [isLight]="isLight()" [embedded]="true"></div>}@if (variant === 'scripts') {<div mol-scripts-card [projectId]="projectId()" [initialQuery]="query()" [isLight]="isLight()" [agentName]="agentName()" [embedded]="true"></div>}@if (variant === 'tests') {@if (nativeHistoryTemplate(); as history) {<ng-container [ngTemplateOutlet]="history"></ng-container>} @else if (nativeHistoryComponent(); as historyComponent) {<ng-container [ngComponentOutlet]="historyComponent"></ng-container>}<div mol-tests-card [tests]="tests.testsList()" [status]="tests.testsStatus()" [run]="tests.testsRun()" [agentName]="agentName()" [initialQuery]="query()" [canRun]="canRunTests()" [onRun]="startTestsRun" [onCancel]="cancelTestsRun" [onSkipCurrent]="skipCurrentTest" [onFix]="fixTests" [fixDisabledReason]="fixDisabledReason()" [isLight]="isLight()" [embedded]="true"></div>}</div></mol-modal>}`,
})
export class ChatPanelOverlay {
  /** The shared panel state (the props the cards and the dialog read). */
  private readonly state = inject(ChatInnerState)

  /** The overlay slice: the open variant, its query and the close action. */
  private readonly overlay = inject(ChatOverlay)

  /** The settings card's row source (React's `computeSettingsList()`). */
  private readonly timeline = inject(ChatTimeline)

  /** The skills slice: the card's load / create / default actions. */
  protected readonly skills = inject(ChatSkills)

  /** The tests slice: the browser's snapshot and its run actions. */
  protected readonly tests = inject(ChatTests)

  /** The commands slice: the settings card's edit actions. */
  private readonly commands = inject(ChatCommands)

  /** The input slice: the settings card's prefill action. */
  private readonly input = inject(ChatInput)

  /** The chat slice: whether a turn is in flight (the fix row's reason). */
  private readonly chat = inject(ChatChat)

  /** The bonded ClassMap (styling tokens resolve at render time). */
  protected readonly cm: UIClassMap = getClassMap()

  /** The header bar's ClassMap classes (`cm.cn(cm.textSize('xs'), cm.textMuted)`). */
  protected readonly headerClass: string

  /** The heading's ClassMap class (`cm.fontWeight('medium')`). */
  protected readonly titleClass: string

  /** The header bar's inline layout. */
  protected readonly headerStyle = styleText({
    padding: '5px 12px',
    borderBottom: '1px solid rgba(128,128,128,0.12)',
    flexShrink: 0,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  })

  /** Runs a settings row's command (React's `onRunCommand`). */
  protected readonly runCommand = (id: CommandId): void => {
    void this.commands.executeCommand(id)
  }

  /** Prefills the composer with a scoped command (React's `onPrefillInput`). */
  protected readonly prefillInput = (value: string): void => {
    this.input.setInputAndCursorEnd(`${value} `)
  }

  /** Opens a skill (React's `onLoad`). */
  protected readonly loadSkill = (skill: SkillInfo): void => {
    this.skills.loadSkill(skill)
  }

  /** Creates a skill (React's `onCreate`). */
  protected readonly createSkill = (name: string): Promise<SkillInfo | null> =>
    this.skills.createSkill(name)

  /** Adds / removes a skill from the default set (React's `onToggleDefault`). */
  protected readonly toggleDefaultSkill = (skill: SkillInfo, next: boolean): void => {
    this.skills.toggleDefaultSkill(skill, next)
  }

  /** Resets the default set (React's `onResetDefault`). */
  protected readonly resetDefaultSkills = (): void => {
    this.skills.resetDefaultSkills()
  }

  /** Starts a tests run (React's `onRun`). */
  protected readonly startTestsRun = (selection: TestSelection): void => {
    this.tests.startTestsRun(selection)
  }

  /** Cancels the running tests run (React's `onCancel`). */
  protected readonly cancelTestsRun = (): void => {
    this.tests.cancelTestsRun()
  }

  /** Skips the running test (React's `onSkipCurrent`). */
  protected readonly skipCurrentTest = (): void => {
    this.tests.skipCurrentTest()
  }

  /** Sends the failures to the executor (React's `onFix`). */
  protected readonly fixTests = (failures: TestFailure[]): void => {
    this.tests.fixTests(failures)
  }

  /** Composes the fixed ClassMap classes and places the kit dialog. */
  constructor() {
    this.headerClass = this.cm.cn(this.cm.textSize('xs'), this.cm.textMuted)
    this.titleClass = this.cm.fontWeight('medium')
    const host: ElementRef<HTMLElement> = inject(ElementRef)
    usePlacement(() => {
      const element = host.nativeElement
      placeContentBefore(element, element)
      setElementPresent(element, false)
    })
  }

  /**
   * The open overlay variant (the template's `@if` alias).
   *
   * @returns The variant to render, or null.
   */
  protected overlayValue(): PanelOverlayVariant | null {
    return this.overlay.panelOverlay()
  }

  /**
   * The dialog's accessible name (also the header title).
   *
   * @param variant - The open variant.
   * @returns The translated heading.
   */
  protected heading(variant: PanelOverlayVariant): string {
    return panelOverlayHeading(this.state.env.t, variant)
  }

  /** Closes the overlay (React's ✕). */
  protected close(): void {
    this.overlay.setPanelOverlay(null)
  }

  /**
   * The overlay's search seed (a `/skills <query>` invocation).
   *
   * @returns The seed.
   */
  protected query(): string {
    return this.overlay.panelOverlayQuery()
  }

  /**
   * The ✕'s accessible label.
   *
   * @returns The translated label.
   */
  protected closeLabel(): string {
    return this.state.env.t('ide.chat.closeOverlay', undefined, { defaultValue: 'Close' })
  }

  /**
   * The ✕'s inline style, grown to the 36px touch floor on coarse pointers.
   *
   * @returns React's style text for the button.
   */
  protected closeStyle(): string | null {
    return styleText({
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: 'inherit',
      padding: '0 2px',
      fontSize: '14px',
      lineHeight: 1,
      opacity: 0.6,
      // Touch floor for this secondary header ✕ (36px, like the notice-card
      // actions); fine pointers keep the slim header.
      ...(this.state.env.isCoarse()
        ? {
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 36,
            minHeight: 36,
          }
        : {}),
    })
  }

  /**
   * The settings card's ordered rows.
   *
   * @returns React's `computeSettingsList()` output.
   */
  protected settings(): readonly SettingDescriptor[] {
    return this.timeline.computeSettingsList()
  }

  /**
   * The host's durable native history as a template, when the host supplies one
   * (the conformance kit materializes a node prop as a template).
   *
   * @returns The template to project, or null.
   */
  protected nativeHistoryTemplate(): TemplateRef<unknown> | null {
    const history = this.state.props().nativeTests?.history
    return history instanceof TemplateRef ? history : null
  }

  /**
   * The host's durable native history as an Angular component, when the host
   * supplies one.
   *
   * @returns The component to render, or null.
   */
  protected nativeHistoryComponent(): Type<unknown> | null {
    const history = this.state.props().nativeTests?.history
    return typeof history === 'function' ? history : null
  }

  /**
   * Whether the tests browser may run (React's capability gate).
   *
   * @returns Whether the card offers its run controls.
   */
  protected canRunTests(): boolean {
    const canEdit = this.state.props().canEdit
    return (this.state.props().canRunTests ?? canEdit !== false) && canEdit !== false
  }

  /**
   * Why the tests browser's fix action is disabled, or null.
   *
   * @returns The translated reason, or null.
   */
  protected fixDisabledReason(): string | null {
    const t = this.state.env.t
    if (this.state.props().canEdit === false) {
      return t('ide.tests.viewerCannotRun', undefined, {
        defaultValue: 'Only editors can run this project’s tests.',
      })
    }
    if (this.chat.isLoading() || this.chat.isRemoteStreaming()) {
      return t('ide.tests.fixBusy', undefined, {
        defaultValue: 'Wait for the current turn to finish.',
      })
    }
    return null
  }

  /**
   * The project the cards read.
   *
   * @returns The project id.
   */
  protected projectId(): string {
    return this.state.props().projectId
  }

  /**
   * The agent's display name (React's resolved `agentName`).
   *
   * @returns The agent name.
   */
  protected agentName(): string {
    return this.state.props().agentName ?? DEFAULT_AGENT_NAME
  }

  /**
   * Whether the host theme is light.
   *
   * @returns `true` for the light theme.
   */
  protected isLight(): boolean {
    return this.state.env.isLight()
  }
}
