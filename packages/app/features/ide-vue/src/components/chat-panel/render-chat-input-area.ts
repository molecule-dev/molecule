/**
 * The input area — React's render section "── Input area ──": one
 * position-relative block that holds every composer-anchored surface above the
 * composer itself.
 *
 * This unit ports the TOP of the block (the proactive "relevant skill"
 * suggestion, then the attachment error, the dictation error and the dictation
 * notice); it composes the rest, in React's order, from the surface renderers:
 * the attachment chips (U13), the command menu (U6), the dictation picker
 * (U12), the model picker (U9), the effort picker (U11), the sounds picker
 * (U11), the panel overlay (U6), the file picker (U13), the queued messages
 * (U16), the tests strip (U15) and the input container (P4).
 *
 * @module
 */

import { h, type VNodeChild } from 'vue'

import { ACCEPTED_FILE_TYPES } from '@molecule/app-ide-panel-logic'
import type { SkillInfo } from '@molecule/app-ide-panel-logic/panels'

import { RelevantSkillSuggestion } from '../../parts/RelevantSkillSuggestion.js'
import type { ChatCtx } from './context.js'
import { renderChatAttachmentChips } from './render-chat-attachment-chips.js'
import { renderChatCommandMenu } from './render-chat-command-menu.js'
import { renderChatEffortPicker } from './render-chat-effort-picker.js'
import { renderChatFilePicker } from './render-chat-file-picker.js'
import { renderChatInputContainer } from './render-chat-input-container.js'
import { renderChatMicPicker } from './render-chat-mic-picker.js'
import { renderChatModelPicker } from './render-chat-model-picker.js'
import { renderChatPanelOverlay } from './render-chat-panel-overlay.js'
import { renderChatQueuedMessages } from './render-chat-queued-messages.js'
import { renderChatSoundsPicker } from './render-chat-sounds-picker.js'
import { renderChatTestsStrip } from './render-chat-tests-strip.js'

/**
 * Renders the input area and everything anchored above the composer.
 *
 * @param ctx - The panel context.
 * @returns The input area's block with its notices and every composer-anchored surface.
 */
export function renderChatInputArea(ctx: ChatCtx): VNodeChild {
  const cm = ctx.env.cm
  const relevantSkill = ctx.skills.relevantSkill.value
  const attachmentError = ctx.popups.attachmentError.value
  const voiceError = ctx.voice.voiceError.value
  const voiceNotice = ctx.voice.voiceNotice.value

  return h('div', { class: cm.shrink0, style: { position: 'relative' } }, [
    // Proactive "Relevant skill" suggestion (SYN4) — one-click Load, just above
    // the composer; appears only when the relevance pass matches.
    relevantSkill
      ? h(RelevantSkillSuggestion, {
          skill: relevantSkill,
          onLoad: (skill: SkillInfo) => {
            ctx.skills.loadSkill(skill)
          },
          onOpen: (skill: SkillInfo) => {
            ctx.props.onFileOpen?.(skill.path, { focus: true })
          },
          onDismiss: (skill: SkillInfo) => {
            ctx.skills.dismissRelevantSkill(skill)
          },
        })
      : null,
    // Attachment error.
    attachmentError
      ? h(
          'div',
          { class: cm.cn(cm.textSize('xs'), cm.textError), style: { padding: '4px 10px' } },
          [attachmentError],
        )
      : null,
    // Dictation error (dead speech service / blocked microphone).
    voiceError
      ? h(
          'div',
          { class: cm.cn(cm.textSize('xs'), cm.textError), style: { padding: '4px 10px' } },
          [voiceError],
        )
      : null,
    // Dictation notice (on-device model preparing on first use).
    voiceNotice
      ? h(
          'div',
          { class: cm.cn(cm.textSize('xs'), cm.textMuted), style: { padding: '4px 10px' } },
          [voiceNotice],
        )
      : null,
    renderChatAttachmentChips(ctx),
    // Hidden file input for the attachment button.
    h('input', {
      ref: (el: unknown) => {
        ctx.attachments.fileInputRef.current = el instanceof HTMLInputElement ? el : null
      },
      type: 'file',
      multiple: true,
      accept: ACCEPTED_FILE_TYPES,
      style: { display: 'none' },
      onChange: (event: Event) => ctx.attachments.handleFileSelect(event),
    }),
    renderChatCommandMenu(ctx),
    renderChatMicPicker(ctx),
    renderChatModelPicker(ctx),
    renderChatEffortPicker(ctx),
    renderChatSoundsPicker(ctx),
    renderChatPanelOverlay(ctx),
    renderChatFilePicker(ctx),
    renderChatQueuedMessages(ctx),
    renderChatTestsStrip(ctx),
    renderChatInputContainer(ctx),
  ])
}
