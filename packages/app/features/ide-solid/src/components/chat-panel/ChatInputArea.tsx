/**
 * The input area — React's render section “── Input area ──”: one
 * position-relative block that holds every composer-anchored surface above the
 * composer itself.
 *
 * This unit ports the TOP of the block (the proactive "relevant skill"
 * suggestion, then the attachment error, the dictation error and the dictation
 * notice); it composes the rest, in React's order, from the surface sections:
 * the attachment chips (U13), the command menu (U6), the dictation picker (U12),
 * the model picker (U9), the effort picker (U11), the sounds picker (U11), the
 * panel overlay (U6), the file picker (U13), the queued messages (U16), the
 * tests strip (U15) and the input container (P4).
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { Show } from 'solid-js'

import { ACCEPTED_FILE_TYPES } from '@molecule/app-ide-panel-logic'

import { RelevantSkillSuggestion } from '../../parts/RelevantSkillSuggestion.jsx'
import { ChatAttachmentChips } from './ChatAttachmentChips.jsx'
import { ChatCommandMenu } from './ChatCommandMenu.jsx'
import { ChatComposer } from './ChatComposer.jsx'
import { ChatEffortPicker } from './ChatEffortPicker.jsx'
import { ChatFilePicker } from './ChatFilePicker.jsx'
import { ChatMicPicker } from './ChatMicPicker.jsx'
import { ChatModelPicker } from './ChatModelPicker.jsx'
import { ChatPanelOverlay } from './ChatPanelOverlay.jsx'
import { ChatQueuedMessages } from './ChatQueuedMessages.jsx'
import { ChatSoundsPicker } from './ChatSoundsPicker.jsx'
import { ChatTestsStrip } from './ChatTestsStrip.jsx'
import type { ChatInnerCtx } from './context.js'

/** Props for {@link ChatInputArea}. */
export interface ChatInputAreaProps {
  /** The inner panel's shared state. */
  ctx: ChatInnerCtx
}

/**
 * Renders the input area.
 * @param props - The inner ctx.
 * @returns The area's notices and every composed surface, in React's order.
 */
export function ChatInputArea(props: ChatInputAreaProps): JSX.Element {
  const ctx = props.ctx
  const cm = ctx.env.cm

  return (
    <div class={cm.shrink0} style={{ position: 'relative' }}>
      {/* Proactive "Relevant skill" suggestion (SYN4) — one-click Load, just
          above the composer; appears only when the relevance pass matches. */}
      <Show when={ctx.skills.relevantSkill()}>
        {(skill) => (
          <RelevantSkillSuggestion
            skill={skill()}
            onLoad={(target) => ctx.skills.loadSkill(target)}
            onOpen={(target) => ctx.props.onFileOpen?.(target.path, { focus: true })}
            onDismiss={(target) => ctx.skills.dismissRelevantSkill(target)}
          />
        )}
      </Show>

      {/* Attachment error */}
      <Show when={ctx.popups.attachmentError()}>
        {(message) => (
          <div class={cm.cn(cm.textSize('xs'), cm.textError)} style={{ padding: '4px 10px' }}>
            {message()}
          </div>
        )}
      </Show>

      {/* Dictation error (dead speech service / blocked microphone) */}
      <Show when={ctx.voice.voiceError()}>
        {(message) => (
          <div class={cm.cn(cm.textSize('xs'), cm.textError)} style={{ padding: '4px 10px' }}>
            {message()}
          </div>
        )}
      </Show>

      {/* Dictation notice (on-device model preparing on first use) */}
      <Show when={ctx.voice.voiceNotice()}>
        {(notice) => (
          <div class={cm.cn(cm.textSize('xs'), cm.textMuted)} style={{ padding: '4px 10px' }}>
            {notice()}
          </div>
        )}
      </Show>

      <ChatAttachmentChips ctx={ctx} />
      {/* Hidden file input for the attachment button */}
      <input
        ref={(element: HTMLInputElement) => {
          ctx.attachments.fileInputRef.current = element
        }}
        type="file"
        multiple
        accept={ACCEPTED_FILE_TYPES}
        style={{ display: 'none' }}
        onChange={(event) => ctx.attachments.handleFileSelect(event)}
      />
      <ChatCommandMenu ctx={ctx} />
      <ChatMicPicker ctx={ctx} />
      <ChatModelPicker ctx={ctx} />
      <ChatEffortPicker ctx={ctx} />
      <ChatSoundsPicker ctx={ctx} />
      <ChatPanelOverlay ctx={ctx} />
      <ChatFilePicker ctx={ctx} />
      <ChatQueuedMessages ctx={ctx} />
      <ChatTestsStrip ctx={ctx} />
      <ChatComposer ctx={ctx} />
    </div>
  )
}
