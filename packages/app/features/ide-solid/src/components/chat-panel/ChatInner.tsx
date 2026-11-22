/**
 * `ChatInner` — the inner chat surface, remounted per conversation.
 *
 * It creates one ctx and fills it in the order React declares its slices (the
 * `#region chat:<slice>` markers, top to bottom), then registers every slice's
 * effects at the position its `#effect chat:<slice>:<n>` marker gives it. The
 * render then asks each section for its part, in React's render order. Until a
 * unit ports its slice or section, that part is a stub that reports itself
 * through `notPorted`.
 *
 * @module
 */

import type { JSX } from 'solid-js'

import { BackgroundTaskCommandsProvider } from '../../context/background-task-commands.js'
import { ChatAutoFixBanner } from './ChatAutoFixBanner.jsx'
import { ChatDragOverlay } from './ChatDragOverlay.jsx'
import { ChatInputArea } from './ChatInputArea.jsx'
import { ChatMessages } from './ChatMessages.jsx'
import { ChatReportModal } from './ChatReportModal.jsx'
import { ChatRetryBanner } from './ChatRetryBanner.jsx'
import { ChatShareModal } from './ChatShareModal.jsx'
import type { ChatInnerCtx, ChatInnerProps } from './context.js'
import { type ChatActivitySlice, createChatActivity } from './create-chat-activity.js'
import { type ChatAttachmentsSlice, createChatAttachments } from './create-chat-attachments.js'
import { type ChatAutoCommitSlice, createChatAutoCommit } from './create-chat-auto-commit.js'
import { type ChatAutoFixSlice, createChatAutoFix } from './create-chat-auto-fix.js'
import { type ChatAutoSendSlice, createChatAutoSend } from './create-chat-auto-send.js'
import { type ChatChatSlice, createChatChat } from './create-chat-chat.js'
import { type ChatCommandsSlice, createChatCommands } from './create-chat-commands.js'
import { type ChatComposerSlice, createChatComposer } from './create-chat-composer.js'
import { type ChatContextUsageSlice, createChatContextUsage } from './create-chat-context-usage.js'
import { type ChatEnvSlice, createChatEnv } from './create-chat-env.js'
import { type ChatGitSlice, createChatGit } from './create-chat-git.js'
import { type ChatInputSlice, createChatInput } from './create-chat-input.js'
import { type ChatKeyboardSlice, createChatKeyboard } from './create-chat-keyboard.js'
import { type ChatMentionSlice, createChatMention } from './create-chat-mention.js'
import { type ChatModelActionsSlice, createChatModelActions } from './create-chat-model-actions.js'
import { type ChatModelsSlice, createChatModels } from './create-chat-models.js'
import { type ChatOverlaySlice, createChatOverlay } from './create-chat-overlay.js'
import { type ChatPickersSlice, createChatPickers } from './create-chat-pickers.js'
import { type ChatPopupsSlice, createChatPopups } from './create-chat-popups.js'
import { type ChatPrefsSlice, createChatPrefs } from './create-chat-prefs.js'
import { type ChatQueuedEditSlice, createChatQueuedEdit } from './create-chat-queued-edit.js'
import {
  type ChatRenderHandlersSlice,
  createChatRenderHandlers,
} from './create-chat-render-handlers.js'
import { type ChatScriptsSlice, createChatScripts } from './create-chat-scripts.js'
import { type ChatScrollSlice, createChatScroll } from './create-chat-scroll.js'
import { type ChatSignalsSlice, createChatSignals } from './create-chat-signals.js'
import { type ChatSkillsSlice, createChatSkills } from './create-chat-skills.js'
import { type ChatSoundsSlice, createChatSounds } from './create-chat-sounds.js'
import { type ChatStreamSlice, createChatStream } from './create-chat-stream.js'
import { type ChatSubmitSlice, createChatSubmit } from './create-chat-submit.js'
import { type ChatSystemCardsSlice, createChatSystemCards } from './create-chat-system-cards.js'
import { type ChatTestsSlice, createChatTests } from './create-chat-tests.js'
import { type ChatTestsBarSlice, createChatTestsBar } from './create-chat-tests-bar.js'
import { type ChatTimelineSlice, createChatTimeline } from './create-chat-timeline.js'
import { type ChatTipsSlice, createChatTips } from './create-chat-tips.js'
import { type ChatUndoSlice, createChatUndo } from './create-chat-undo.js'
import { type ChatVoiceSlice, createChatVoice } from './create-chat-voice.js'

/**
 * The ctx while it is being filled: every slice is declared here and assigned
 * by {@link buildChatInnerCtx} in React's declaration order, before any effect
 * or section reads it.
 */
class ChatInnerCtxState implements ChatInnerCtx {
  /** The inner panel's React props. */
  readonly props: ChatInnerProps
  /** The environment (assigned first). */
  declare env: ChatEnvSlice
  /** The stream-event handler. */
  declare stream: ChatStreamSlice
  /** The context-usage ring. */
  declare contextUsage: ChatContextUsageSlice
  /** The verification auto-fix countdown. */
  declare autoFix: ChatAutoFixSlice
  /** The auto-commit reducer. */
  declare autoCommit: ChatAutoCommitSlice
  /** The chat session. */
  declare chat: ChatChatSlice
  /** Git status and the commit bar. */
  declare git: ChatGitSlice
  /** Scroll anchoring. */
  declare scroll: ChatScrollSlice
  /** Tool-call undo tracking. */
  declare undo: ChatUndoSlice
  /** The composer. */
  declare composer: ChatComposerSlice
  /** Popup state. */
  declare popups: ChatPopupsSlice
  /** Sound preferences. */
  declare sounds: ChatSoundsSlice
  /** The panel overlay. */
  declare overlay: ChatOverlaySlice
  /** Dictation. */
  declare voice: ChatVoiceSlice
  /** System cards. */
  declare systemCards: ChatSystemCardsSlice
  /** Activity cards. */
  declare activity: ChatActivitySlice
  /** Tip cards. */
  declare tips: ChatTipsSlice
  /** Display preferences. */
  declare prefs: ChatPrefsSlice
  /** The tests controller. */
  declare tests: ChatTestsSlice
  /** Skills. */
  declare skills: ChatSkillsSlice
  /** Restored model settings. */
  declare models: ChatModelsSlice
  /** The queued-message editor. */
  declare queuedEdit: ChatQueuedEditSlice
  /** Automatic sends. */
  declare autoSend: ChatAutoSendSlice
  /** Tests-bar discovery. */
  declare testsBar: ChatTestsBarSlice
  /** The `@`-mention picker. */
  declare mention: ChatMentionSlice
  /** Attachments. */
  declare attachments: ChatAttachmentsSlice
  /** Saved scripts. */
  declare scripts: ChatScriptsSlice
  /** Textarea input handling. */
  declare input: ChatInputSlice
  /** Model actions. */
  declare modelActions: ChatModelActionsSlice
  /** Slash commands. */
  declare commands: ChatCommandsSlice
  /** `handleSubmit`. */
  declare submit: ChatSubmitSlice
  /** External signals. */
  declare signals: ChatSignalsSlice
  /** Picker derivations. */
  declare pickers: ChatPickersSlice
  /** Keyboard handling. */
  declare keyboard: ChatKeyboardSlice
  /** The render-ready timeline. */
  declare timeline: ChatTimelineSlice
  /** The render's stable handlers. */
  declare renderHandlers: ChatRenderHandlersSlice

  /**
   * Starts the ctx with its props only; the slices follow in order.
   * @param props - The inner panel's React props.
   */
  constructor(props: ChatInnerProps) {
    this.props = props
  }
}

/**
 * Fills the ctx: every slice in React's declaration order, then every effect at
 * its ledger position.
 * @param props - The inner panel's React props.
 * @returns The complete ctx.
 */
function buildChatInnerCtx(props: ChatInnerProps): ChatInnerCtx {
  const ctx = new ChatInnerCtxState(props)

  // Slices, in the order React declares them (`#region` markers, top to bottom).
  ctx.env = createChatEnv(ctx)
  ctx.stream = createChatStream(ctx)
  ctx.contextUsage = createChatContextUsage(ctx)
  ctx.autoFix = createChatAutoFix(ctx)
  ctx.autoCommit = createChatAutoCommit(ctx)
  ctx.chat = createChatChat(ctx)
  ctx.git = createChatGit(ctx)
  ctx.scroll = createChatScroll(ctx)
  ctx.undo = createChatUndo(ctx)
  ctx.composer = createChatComposer(ctx)
  ctx.popups = createChatPopups(ctx)
  ctx.sounds = createChatSounds(ctx)
  ctx.overlay = createChatOverlay(ctx)
  ctx.voice = createChatVoice(ctx)
  ctx.systemCards = createChatSystemCards(ctx)
  ctx.activity = createChatActivity(ctx)
  ctx.tips = createChatTips(ctx)
  ctx.prefs = createChatPrefs(ctx)
  ctx.tests = createChatTests(ctx)
  ctx.skills = createChatSkills(ctx)
  ctx.models = createChatModels(ctx)
  ctx.queuedEdit = createChatQueuedEdit(ctx)
  ctx.autoSend = createChatAutoSend(ctx)
  ctx.testsBar = createChatTestsBar(ctx)
  ctx.mention = createChatMention(ctx)
  ctx.attachments = createChatAttachments(ctx)
  ctx.scripts = createChatScripts(ctx)
  ctx.input = createChatInput(ctx)
  ctx.modelActions = createChatModelActions(ctx)
  ctx.commands = createChatCommands(ctx)
  ctx.submit = createChatSubmit(ctx)
  ctx.signals = createChatSignals(ctx)
  ctx.pickers = createChatPickers(ctx)
  ctx.keyboard = createChatKeyboard(ctx)
  ctx.timeline = createChatTimeline(ctx)
  ctx.renderHandlers = createChatRenderHandlers(ctx)

  // Effects, at each `#effect chat:<slice>:<n>` marker's position in React's
  // effect order (1 → 55).
  ctx.env.effects[1]()
  ctx.contextUsage.effects[1]()
  ctx.autoFix.effects[1]()
  ctx.autoFix.effects[2]()
  ctx.chat.effects[1]()
  ctx.composer.effects[1]()
  ctx.composer.effects[2]()
  ctx.voice.effects[1]()
  ctx.voice.effects[2]()
  ctx.voice.effects[3]()
  ctx.systemCards.effects[1]()
  ctx.systemCards.effects[2]()
  ctx.systemCards.effects[3]()
  ctx.activity.effects[1]()
  ctx.activity.effects[2]()
  ctx.tips.effects[1]()
  ctx.tips.effects[2]()
  ctx.tips.effects[3]()
  ctx.tips.effects[4]()
  ctx.sounds.effects[1]()
  ctx.overlay.effects[1]()
  ctx.tests.effects[1]()
  ctx.tests.effects[2]()
  ctx.sounds.effects[2]()
  ctx.models.effects[2]()
  ctx.models.effects[3]()
  ctx.autoCommit.effects[1]()
  ctx.models.effects[4]()
  ctx.queuedEdit.effects[1]()
  ctx.scroll.effects[1]()
  ctx.scroll.effects[2]()
  ctx.git.effects[1]()
  ctx.git.effects[2]()
  ctx.git.effects[3]()
  ctx.git.effects[4]()
  ctx.autoCommit.effects[2]()
  ctx.autoCommit.effects[3]()
  ctx.testsBar.effects[1]()
  ctx.scroll.effects[3]()
  ctx.scroll.effects[4]()
  ctx.scroll.effects[5]()
  ctx.autoSend.effects[1]()
  ctx.autoSend.effects[2]()
  ctx.autoSend.effects[3]()
  ctx.autoSend.effects[4]()
  ctx.mention.effects[1]()
  ctx.skills.effects[1]()
  ctx.input.effects[1]()
  ctx.signals.effects[1]()
  ctx.signals.effects[2]()
  ctx.signals.effects[3]()
  ctx.signals.effects[4]()
  ctx.pickers.effects[2]()
  ctx.keyboard.effects[1]()
  ctx.timeline.effects[1]()

  return ctx
}

/**
 * Renders the inner chat surface, remounted per conversation.
 * @param props - The inner panel's React props.
 * @returns The chat surface.
 */
export function ChatInner(props: ChatInnerProps): JSX.Element {
  const ctx = buildChatInnerCtx(props)
  return (
    <BackgroundTaskCommandsProvider commands={ctx.timeline.bgCommands()}>
      <div
        style={{
          display: 'flex',
          'flex-direction': 'column',
          flex: '1',
          'min-height': '0px',
          overflow: 'hidden',
          position: 'relative',
        }}
        onDragEnter={(event) => ctx.attachments.handleDragEnter(event)}
        onDragOver={(event) => ctx.attachments.handleDragOver(event)}
        onDragLeave={(event) => ctx.attachments.handleDragLeave(event)}
        onDrop={(event) => ctx.attachments.handleDrop(event)}
      >
        <ChatDragOverlay ctx={ctx} />
        <ChatMessages ctx={ctx} />
        <ChatAutoFixBanner ctx={ctx} />
        <ChatRetryBanner ctx={ctx} />
        <ChatInputArea ctx={ctx} />
        <ChatReportModal ctx={ctx} />
        <ChatShareModal ctx={ctx} />
      </div>
    </BackgroundTaskCommandsProvider>
  )
}
