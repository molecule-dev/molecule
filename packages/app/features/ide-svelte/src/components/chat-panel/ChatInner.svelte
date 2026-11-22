<!--
  ChatInner — React's `ChatInner` (ChatPanel.tsx lines 2171–2237 and the render
  it returns): the inner chat surface that owns the conversation, re-mounted per
  conversation by `ChatPanel`'s `{#key chatKey}`.

  This is the skeleton. It creates every slice in the order React declares its
  `#region` markers (top to bottom), calls each numbered effect at the position
  its `#effect` marker gives it — so Svelte's effect-creation order is React's
  effect order — and renders every section in render order. The slices and
  sections other units port are stubs: they report themselves through
  `notPorted` and do nothing else.
-->
<script lang="ts">
  import { setBackgroundTaskCommands } from '../../context/background-task-commands.js'
  import { createChatActivity } from './chat-activity.svelte.js'
  import { createChatAttachments } from './chat-attachments.svelte.js'
  import { createChatAutoCommit } from './chat-auto-commit.svelte.js'
  import { createChatAutoFix } from './chat-auto-fix.svelte.js'
  import { createChatAutoSend } from './chat-auto-send.svelte.js'
  import { createChatChat } from './chat-chat.svelte.js'
  import { createChatCommands } from './chat-commands.svelte.js'
  import { createChatComposer } from './chat-composer.svelte.js'
  import { createChatContextUsage } from './chat-context-usage.svelte.js'
  import { createChatEnv } from './chat-env.svelte.js'
  import { createChatGit } from './chat-git.svelte.js'
  import { createChatInput } from './chat-input.svelte.js'
  import { createChatKeyboard } from './chat-keyboard.svelte.js'
  import { createChatMention } from './chat-mention.svelte.js'
  import { createChatModelActions } from './chat-model-actions.svelte.js'
  import { createChatModels } from './chat-models.svelte.js'
  import { createChatOverlay } from './chat-overlay.svelte.js'
  import { createChatPickers } from './chat-pickers.svelte.js'
  import { createChatPopups } from './chat-popups.svelte.js'
  import { createChatPrefs } from './chat-prefs.svelte.js'
  import { createChatQueuedEdit } from './chat-queued-edit.svelte.js'
  import { createChatRenderHandlers } from './chat-render-handlers.svelte.js'
  import { createChatScripts } from './chat-scripts.svelte.js'
  import { createChatScroll } from './chat-scroll.svelte.js'
  import { createChatSignals } from './chat-signals.svelte.js'
  import { createChatSkills } from './chat-skills.svelte.js'
  import { createChatSounds } from './chat-sounds.svelte.js'
  import { createChatStream } from './chat-stream.svelte.js'
  import { createChatSubmit } from './chat-submit.svelte.js'
  import { createChatSystemCards } from './chat-system-cards.svelte.js'
  import { createChatTests } from './chat-tests.svelte.js'
  import { createChatTestsBar } from './chat-tests-bar.svelte.js'
  import { createChatTimeline } from './chat-timeline.svelte.js'
  import { createChatTips } from './chat-tips.svelte.js'
  import { createChatUndo } from './chat-undo.svelte.js'
  import { createChatVoice } from './chat-voice.svelte.js'
  import ChatAutoFixBanner from './ChatAutoFixBanner.svelte'
  import ChatDragOverlay from './ChatDragOverlay.svelte'
  import ChatInputArea from './ChatInputArea.svelte'
  import ChatMessages from './ChatMessages.svelte'
  import ChatReportModal from './ChatReportModal.svelte'
  import ChatRetryBanner from './ChatRetryBanner.svelte'
  import ChatShareModal from './ChatShareModal.svelte'
  import type { ChatInnerProps } from './context.svelte.js'
  import { ChatContext } from './context.svelte.js'

  /** React's `ChatInnerProps`. */
  const props: ChatInnerProps = $props()

  /** The shared state every slice reads from, at call time. */
  const ctx = new ChatContext(() => props)

  // ── Slice creation and effects, in React's ledger order ──────────────────
  // A slice is created at its first `#region`; each `#effect <slice>:<n>` is
  // called where React declares it. Svelte runs `$effect`s in creation order,
  // so the effect ledger is React's.
  ctx.env = createChatEnv(ctx)
  ctx.env.mount()
  ctx.env.effects[1]()

  ctx.stream = createChatStream(ctx)
  ctx.stream.mount()

  ctx.contextUsage = createChatContextUsage(ctx)
  ctx.contextUsage.mount()
  ctx.contextUsage.effects[1]()

  ctx.autoFix = createChatAutoFix(ctx)
  ctx.autoFix.mount()
  ctx.autoFix.effects[1]()
  ctx.autoFix.effects[2]()

  ctx.autoCommit = createChatAutoCommit(ctx)
  ctx.autoCommit.mount()

  ctx.chat = createChatChat(ctx)
  ctx.chat.mount()
  ctx.chat.effects[1]()

  ctx.git = createChatGit(ctx)
  ctx.git.mount()

  ctx.scroll = createChatScroll(ctx)
  ctx.scroll.mount()

  ctx.undo = createChatUndo(ctx)
  ctx.undo.mount()

  ctx.composer = createChatComposer(ctx)
  ctx.composer.mount()
  ctx.composer.effects[1]()
  ctx.composer.effects[2]()

  ctx.popups = createChatPopups(ctx)
  ctx.popups.mount()

  ctx.sounds = createChatSounds(ctx)
  ctx.sounds.mount()

  ctx.overlay = createChatOverlay(ctx)
  ctx.overlay.mount()

  ctx.voice = createChatVoice(ctx)
  ctx.voice.mount()
  ctx.voice.effects[1]()
  ctx.voice.effects[2]()
  ctx.voice.effects[3]()

  ctx.systemCards = createChatSystemCards(ctx)
  ctx.systemCards.mount()
  ctx.systemCards.effects[1]()
  ctx.systemCards.effects[2]()
  ctx.systemCards.effects[3]()

  ctx.activity = createChatActivity(ctx)
  ctx.activity.mount()
  ctx.activity.effects[1]()
  ctx.activity.effects[2]()

  ctx.tips = createChatTips(ctx)
  ctx.tips.mount()
  ctx.tips.effects[1]()
  ctx.tips.effects[2]()
  ctx.tips.effects[3]()
  ctx.tips.effects[4]()

  ctx.sounds.effects[1]()

  ctx.prefs = createChatPrefs(ctx)
  ctx.prefs.mount()

  ctx.overlay.effects[1]()

  ctx.tests = createChatTests(ctx)
  ctx.tests.mount()
  ctx.tests.effects[1]()
  ctx.tests.effects[2]()

  ctx.sounds.effects[2]()

  ctx.skills = createChatSkills(ctx)
  ctx.skills.mount()

  ctx.models = createChatModels(ctx)
  ctx.models.mount()
  ctx.models.effects[2]()
  ctx.models.effects[3]()

  ctx.autoCommit.effects[1]()

  ctx.models.effects[4]()

  ctx.queuedEdit = createChatQueuedEdit(ctx)
  ctx.queuedEdit.mount()
  ctx.queuedEdit.effects[1]()

  ctx.autoSend = createChatAutoSend(ctx)
  ctx.autoSend.mount()

  ctx.scroll.effects[1]()
  ctx.scroll.effects[2]()
  ctx.git.effects[1]()
  ctx.git.effects[2]()
  ctx.git.effects[3]()
  ctx.git.effects[4]()
  ctx.autoCommit.effects[2]()
  ctx.autoCommit.effects[3]()

  ctx.testsBar = createChatTestsBar(ctx)
  ctx.testsBar.mount()
  ctx.testsBar.effects[1]()

  ctx.scroll.effects[3]()
  ctx.scroll.effects[4]()
  ctx.scroll.effects[5]()

  ctx.autoSend.effects[1]()
  ctx.autoSend.effects[2]()
  ctx.autoSend.effects[3]()
  ctx.autoSend.effects[4]()

  ctx.mention = createChatMention(ctx)
  ctx.mention.mount()
  ctx.mention.effects[1]()

  ctx.attachments = createChatAttachments(ctx)
  ctx.attachments.mount()

  ctx.skills.effects[1]()

  ctx.scripts = createChatScripts(ctx)
  ctx.scripts.mount()

  ctx.input = createChatInput(ctx)
  ctx.input.mount()
  ctx.input.effects[1]()

  ctx.modelActions = createChatModelActions(ctx)
  ctx.modelActions.mount()

  ctx.commands = createChatCommands(ctx)
  ctx.commands.mount()

  ctx.submit = createChatSubmit(ctx)
  ctx.submit.mount()

  ctx.signals = createChatSignals(ctx)
  ctx.signals.mount()
  ctx.signals.effects[1]()
  ctx.signals.effects[2]()
  ctx.signals.effects[3]()
  ctx.signals.effects[4]()

  ctx.pickers = createChatPickers(ctx)
  ctx.pickers.mount()
  ctx.pickers.effects[2]()

  ctx.keyboard = createChatKeyboard(ctx)
  ctx.keyboard.mount()
  ctx.keyboard.effects[1]()

  ctx.timeline = createChatTimeline(ctx)
  ctx.timeline.mount()
  ctx.timeline.effects[1]()

  ctx.renderHandlers = createChatRenderHandlers(ctx)
  ctx.renderHandlers.mount()

  // Lets a Wait card name the command it waits on, as React's provider does.
  setBackgroundTaskCommands(ctx.timeline.bgCommands)
</script>

<!-- React's root is a plain drag surface with no ARIA role; conformance compares
     the DOM, so the role the a11y rule wants cannot be added here. -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  style="display: flex; flex-direction: column; flex: 1; min-height: 0; overflow: hidden; position: relative;"
  ondragenter={ctx.attachments.actions.handleDragEnter}
  ondragover={ctx.attachments.actions.handleDragOver}
  ondragleave={ctx.attachments.actions.handleDragLeave}
  ondrop={ctx.attachments.actions.handleDrop}
>
  <ChatDragOverlay {ctx} />
  <ChatMessages {ctx} />
  <ChatAutoFixBanner {ctx} />
  <ChatRetryBanner {ctx} />
  <ChatInputArea {ctx} />
  <ChatReportModal {ctx} />
  <ChatShareModal {ctx} />
</div>
