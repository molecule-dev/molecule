/**
 * React's section “── Input area ──” (ChatPanel.tsx lines 5785–5818): one
 * position-relative block that holds every composer-anchored surface above the
 * composer itself.
 *
 * This unit ports the TOP of the block — the proactive “Relevant skill”
 * suggestion, then the attachment error, the dictation error and the dictation
 * notice. The surfaces below it (attachment chips, the hidden file input, the
 * command menu, the pickers, the panel overlay, the file picker, the queued
 * messages, the tests strip and the input container) are their own sections,
 * composed inside this block in React's render order.
 *
 * The host element IS React's root `<div>` (its ClassMap class and inline
 * position), so the port adds no node.
 *
 * @module
 */

import { type AfterViewInit, Component, type ElementRef, inject, ViewChild } from '@angular/core'

import { ACCEPTED_FILE_TYPES } from '@molecule/app-ide-panel-logic'
import type { SkillInfo } from '@molecule/app-ide-panel-logic/panels'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { RelevantSkillSuggestion } from '../../parts/relevant-skill-suggestion.component.js'
import { ChatAttachmentChips } from './chat-attachment-chips.component.js'
import { ChatAttachments } from './chat-attachments.slice.js'
import { ChatCommandMenu } from './chat-command-menu.component.js'
import { ChatComposerSection } from './chat-composer.component.js'
import { ChatEffortPicker } from './chat-effort-picker.component.js'
import { ChatFilePicker } from './chat-file-picker.component.js'
import { ChatInnerState } from './chat-inner-state.js'
import { ChatMicPicker } from './chat-mic-picker.component.js'
import { ChatModelPicker } from './chat-model-picker.component.js'
import { ChatPanelOverlay } from './chat-panel-overlay.component.js'
import { ChatPopups } from './chat-popups.slice.js'
import { ChatQueuedMessagesSection } from './chat-queued-messages-section.component.js'
import { ChatSkills } from './chat-skills.slice.js'
import { ChatSoundsPicker } from './chat-sounds-picker.component.js'
import { ChatTestsStrip } from './chat-tests-strip.component.js'
import { ChatVoice } from './chat-voice.slice.js'

/** One element's inline style, in React's style-object shape. */
type StyleObject = Record<string, unknown>

/**
 * React's “── Input area ──” section: the notices and the relevant-skill
 * suggestion above the composer.
 */
@Component({
  selector: 'div[mol-chat-input-area]',
  standalone: true,
  imports: [
    ChatAttachmentChips,
    ChatCommandMenu,
    ChatComposerSection,
    ChatEffortPicker,
    ChatFilePicker,
    ChatMicPicker,
    ChatModelPicker,
    ChatPanelOverlay,
    ChatQueuedMessagesSection,
    ChatSoundsPicker,
    ChatTestsStrip,
    RelevantSkillSuggestion,
  ],
  host: {
    '[class]': 'rootClass()',
    '[style]': 'rootStyle()',
  },
  // prettier-ignore
  template: `@if (relevantSkill(); as skill) {<div mol-relevant-skill-suggestion [skill]="skill" [onLoad]="loadSkill" [onOpen]="openSkill" [onDismiss]="dismissSkill"></div>}@if (attachmentError()) {<div [class]="errorClass" [style]="noticeStyle">{{ attachmentError() }}</div>}@if (voiceError()) {<div [class]="errorClass" [style]="noticeStyle">{{ voiceError() }}</div>}@if (voiceNotice()) {<div [class]="mutedClass" [style]="noticeStyle">{{ voiceNotice() }}</div>}<div mol-chat-attachment-chips></div><input #fileInput type="file" multiple [accept]="acceptedFileTypes" style="display: none" (change)="handleFileSelect($event)" /><div mol-chat-command-menu></div><div mol-chat-mic-picker></div><div mol-chat-model-picker></div><div mol-chat-effort-picker></div><div mol-chat-sounds-picker></div><div mol-chat-panel-overlay></div><div mol-chat-file-picker></div><div mol-chat-queued-messages-section></div><div mol-chat-tests-strip></div><div mol-chat-composer></div>`,
})
export class ChatInputArea implements AfterViewInit {
  /** The shared state, read for the env (the ClassMap and the file opener). */
  private readonly state = inject(ChatInnerState)

  /** The skills slice: the proactive suggestion and its load/dismiss actions. */
  private readonly skills = inject(ChatSkills)

  /** The popups slice: why the last attachment was rejected. */
  private readonly popups = inject(ChatPopups)

  /** The voice slice: the dictation error and the on-device-model notice. */
  private readonly voice = inject(ChatVoice)

  /** The attachments slice: the hidden file input's ref and its change handler. */
  private readonly attachments = inject(ChatAttachments)

  /** The MIME types the hidden file input accepts (React's `ACCEPTED_FILE_TYPES`). */
  protected readonly acceptedFileTypes = ACCEPTED_FILE_TYPES

  /** The hidden file input for the attachment button. */
  @ViewChild('fileInput') private fileInput?: ElementRef<HTMLInputElement>

  /** Stages the files picked in the hidden input (React's `handleFileSelect`). */
  protected readonly handleFileSelect = (event: Event): void =>
    this.attachments.handleFileSelect(event)

  /** The bonded ClassMap (styling tokens resolve at render time). */
  private readonly cm: UIClassMap = getClassMap()

  /** The error lines' ClassMap classes. */
  protected readonly errorClass: string

  /** The notice line's ClassMap classes. */
  protected readonly mutedClass: string

  /** The notices' inline padding. */
  protected readonly noticeStyle: StyleObject = { padding: '4px 10px' }

  /** Loads the suggested skill (the suggestion's Load button). */
  protected readonly loadSkill = (skill: SkillInfo): void => this.skills.loadSkill(skill)

  /** Opens the suggested skill's file, as clicking its name does. */
  protected readonly openSkill = (skill: SkillInfo): void => {
    this.state.props().onFileOpen?.(skill.path, { focus: true })
  }

  /** Dismisses the suggestion. */
  protected readonly dismissSkill = (skill: SkillInfo): void =>
    this.skills.dismissRelevantSkill(skill)

  /** Composes the notice lines' ClassMap classes once. */
  constructor() {
    this.errorClass = this.cm.cn(this.cm.textSize('xs'), this.cm.textError)
    this.mutedClass = this.cm.cn(this.cm.textSize('xs'), this.cm.textMuted)
  }

  /**
   * React's root ClassMap class (`cm.shrink0`).
   *
   * @returns The class string for the host element.
   */
  protected rootClass(): string {
    return this.cm.shrink0
  }

  /**
   * React's root inline position: every popup anchors to this block.
   *
   * @returns React's style object for the host element.
   */
  protected rootStyle(): StyleObject {
    return { position: 'relative' }
  }

  /**
   * The proactive “Relevant skill” suggestion (SYN4), or null when the
   * relevance pass has not matched.
   *
   * @returns The skill to suggest, or null.
   */
  protected relevantSkill(): SkillInfo | null {
    return this.skills.relevantSkill()
  }

  /**
   * Why the last attachment was rejected, or null.
   *
   * @returns The attachment error.
   */
  protected attachmentError(): string | null {
    return this.popups.attachmentError()
  }

  /**
   * The dictation error (a dead speech service or a blocked microphone), or null.
   *
   * @returns The dictation error.
   */
  protected voiceError(): string | null {
    return this.voice.voiceError()
  }

  /**
   * The dictation notice (the on-device model preparing on first use), or null.
   *
   * @returns The dictation notice.
   */
  protected voiceNotice(): string | null {
    return this.voice.voiceNotice()
  }

  /** Hands the hidden file input to the attachments slice, as React's `fileInputRef` holds it. */
  ngAfterViewInit(): void {
    this.attachments.fileInputRef.current = this.fileInput?.nativeElement ?? null
  }
}
