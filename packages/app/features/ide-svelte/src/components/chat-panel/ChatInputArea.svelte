<!--
  React's section “── Input area ──” (ChatPanel.tsx 5785–5818), its top: the
  position-relative block above the composer holding the proactive
  "Relevant skill" suggestion and the attachment / dictation status lines.

  The surfaces below it (attachment chips, the command menu, the pickers, the
  panel overlay, the queued messages, the tests strip and the composer itself)
  are their own sections, rendered in React's order.

  View only: the state and the handlers come from the slices through `ctx`.
-->
<script lang="ts">
  import { ACCEPTED_FILE_TYPES } from '@molecule/app-ide-panel-logic'

  import RelevantSkillSuggestion from '../../parts/RelevantSkillSuggestion.svelte'
  import ChatAttachmentChips from './ChatAttachmentChips.svelte'
  import ChatCommandMenu from './ChatCommandMenu.svelte'
  import ChatComposerSection from './ChatComposerSection.svelte'
  import ChatEffortPicker from './ChatEffortPicker.svelte'
  import ChatFilePicker from './ChatFilePicker.svelte'
  import ChatMicPicker from './ChatMicPicker.svelte'
  import ChatModelPicker from './ChatModelPicker.svelte'
  import ChatPanelOverlay from './ChatPanelOverlay.svelte'
  import ChatQueuedMessagesSection from './ChatQueuedMessagesSection.svelte'
  import ChatSoundsPicker from './ChatSoundsPicker.svelte'
  import ChatTestsStrip from './ChatTestsStrip.svelte'
  import type { ChatContext } from './context.svelte.js'

  /** The section's shared context. */
  let { ctx }: { ctx: ChatContext } = $props()
</script>

<div class={ctx.env.cm.shrink0} style="position: relative">
  <!-- Proactive "Relevant skill" suggestion (SYN4) — one-click Load, just
       above the composer; appears only when the relevance pass matches. -->
  {#if ctx.skills.relevantSkill}
    <RelevantSkillSuggestion
      skill={ctx.skills.relevantSkill}
      onLoad={ctx.skills.loadSkill}
      onOpen={(skill) => ctx.props.onFileOpen?.(skill.path, { focus: true })}
      onDismiss={ctx.skills.dismissRelevantSkill}
    />
  {/if}

  <!-- Attachment error -->
  {#if ctx.popups.attachmentError}
    <div
      class={ctx.env.cm.cn(ctx.env.cm.textSize('xs'), ctx.env.cm.textError)}
      style="padding: 4px 10px"
    >
      {ctx.popups.attachmentError}
    </div>
  {/if}

  <!-- Dictation error (dead speech service / blocked microphone) -->
  {#if ctx.voice.voiceError}
    <div
      class={ctx.env.cm.cn(ctx.env.cm.textSize('xs'), ctx.env.cm.textError)}
      style="padding: 4px 10px"
    >
      {ctx.voice.voiceError}
    </div>
  {/if}

  <!-- Dictation notice (on-device model preparing on first use) -->
  {#if ctx.voice.voiceNotice}
    <div
      class={ctx.env.cm.cn(ctx.env.cm.textSize('xs'), ctx.env.cm.textMuted)}
      style="padding: 4px 10px"
    >
      {ctx.voice.voiceNotice}
    </div>
  {/if}

  <ChatAttachmentChips {ctx} /><input
    bind:this={ctx.attachments.fileInputRef.current}
    type="file"
    multiple
    accept={ACCEPTED_FILE_TYPES}
    style="display: none"
    onchange={(event) => ctx.attachments.handleFileSelect(event)}
  /><ChatCommandMenu {ctx} /><ChatMicPicker {ctx} /><ChatModelPicker {ctx} /><ChatEffortPicker
    {ctx}
  /><ChatSoundsPicker {ctx} /><ChatPanelOverlay {ctx} /><ChatFilePicker
    {ctx}
  /><ChatQueuedMessagesSection {ctx} /><ChatTestsStrip {ctx} /><ChatComposerSection {ctx} />
</div>
