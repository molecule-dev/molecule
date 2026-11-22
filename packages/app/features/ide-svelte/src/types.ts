/**
 * Props and shared types for the Svelte IDE components — the counterpart of
 * `@molecule/app-ide-react`'s `src/types.ts`. They live in plain TypeScript so
 * the contract type-checks without Svelte tooling and consumers can import it;
 * each component's `<script module>` re-exports the ones it uses.
 *
 * @module
 */

import type { ChatMessage, ContextCompaction, ContextUsage } from '@molecule/app-ai-chat'
import type { IconName } from '@molecule/app-icons'
import type {
  AutoCommitState,
  ChatEventCardAction,
  ChatEventCardSegment,
  ChatUserIdentity,
  CommandId,
  DeviceFrameSelectorProps,
} from '@molecule/app-ide-panel-logic'
import type {
  ModelPicker,
  SettingDescriptor,
  SkillInfo,
} from '@molecule/app-ide-panel-logic/panels'

export * from './props.js'

/**
 * A commit card as the panel renders it (React's `CommitCard`): the full git
 * message the endpoint returned, its files, and its state.
 */
export interface CommitCard {
  /** Local id of the card (the panel's own, until the server record lands). */
  id: string
  /** The FULL commit message, as the commit endpoint returned it. */
  message: string
  /** The committed file paths. */
  files: string[]
  /** When the card was created (epoch milliseconds). */
  timestamp: number
  /** The commit's state. */
  status: 'running' | 'done' | 'error'
  /** The commit's hash, when the server reported one. */
  hash?: string
}

/** Props for `CommitCardItem` — the React prop names, React's own contract. */
export interface CommitCardItemProps {
  /** The commit to render. */
  card: CommitCard
  /** Reverts the commit; resolves to the revert commit's hash (offers redo). */
  onRevert?: (hash: string) => Promise<string | undefined>
}

/** The host's upgrade/sign-in CTA builder context (React's `buildUpgradeCta` argument). */
export interface UpgradeCtaContext {
  /** Whether the user must sign up. */
  requiresSignup?: boolean
  /** The limit rule the backend enforced. */
  limitType?: string
  /** The remedy the backend resolved. */
  billingAction?: string
  /** The plan an upgrade would move to, or `null` when there is none. */
  upgradeTier?: string | null
}

/**
 * Props for `MessageItem` — the React prop names, React's own contract, plus
 * this framework's `isLight` (its sibling cards take the resolved theme mode
 * as a prop rather than reading it through a hook).
 */
export interface MessageItemProps {
  /** The message to render. */
  msg: ChatMessage
  /** Sends a message (the loop-limit card's Continue action). */
  sendMessage?: (msg: string) => void
  /** Answers a pending `ask_user` question. */
  handleAskUserResponse?: (response: string) => void
  /** Whether a turn is running (disables the loop-limit card's first action). */
  isLoading?: boolean
  /** Transient background-phase label shown by the streaming indicator. */
  streamingStatus?: string | null
  /** Navigates the preview to a route path on a chat link click. */
  onNavigatePreview?: (path: string) => void
  /** The tool calls whose effect is undone. */
  undoneTcIds?: Set<string>
  /** Undoes or redoes one tool call's effect. */
  handleUndoToggle?: (tcId: string, undone: boolean) => void
  /** Opens a file as a preview tab. */
  onFileOpen?: (path: string) => void
  /** Pins a file's tab. */
  onFileDoubleClick?: (path: string) => void
  /** Opens a changed file's diff. */
  onFileDiff?: (path: string, diff?: { original: string; modified: string }) => void
  /** Writes a file back. */
  handleFileRevert?: (path: string, content: string) => Promise<void>
  /** Replaces the composer input and moves the cursor to its end. */
  setInputAndCursorEnd?: (val: string) => void
  /** Opens the model picker on a chosen entry. */
  setModelPicker?: (
    value: ModelPicker | null | ((previous: ModelPicker | null) => ModelPicker | null),
  ) => void
  /** The live conversation mode (discovery maps to `plan`). */
  chatMode?: 'plan' | 'execute'
  /** Whether the host theme is light (defaults to the bonded theme provider's mode). */
  isLight?: boolean
  /** The signed-in user's avatar (used only for author-less own messages). */
  userAvatar?: string | null
  /** Opens the clicked author's profile. */
  onProfileClick?: (identity: ChatUserIdentity) => void
  /** The signed-in user's id (author-less messages belong to them). */
  currentUserId?: string
  /** Discovery phase — roomier spacing between cards. */
  discovery?: boolean
  /** Host-supplied upgrade/sign-in CTA builder (resource-limit banners). */
  buildUpgradeCta?: (
    context: UpgradeCtaContext,
  ) => ChatEventCardAction | ChatEventCardAction[] | null | undefined
  /** Agent display name, interpolated into the team-only badge tip. */
  agentName?: string
  /** Whether the user may write shared project state. */
  canEdit?: boolean
  /** Skips a tool call that is running right now. */
  onSkipToolCall?: (toolCallId: string) => void | Promise<boolean | void>
  /** Why this viewer cannot skip, already translated — `null` when they can. */
  skipToolCallReason?: string | null
  /** Whether the header row shows the message's time. */
  showTimestamp?: boolean
}

/** The notice tones a card can carry. */
export type NoticeTone = 'info' | 'gold' | 'upgrade' | 'success' | 'signup'

/** Props for `NoticeCard` — the React prop names, React's own contract. */
export interface NoticeCardProps {
  /** The card's tone: its accent colour and default icon. */
  tone: NoticeTone
  /** The plain body text (used when `content` is absent). */
  text?: string
  /** A composable body: text, inline monospace code and inline actions, in order. */
  content?: ChatEventCardSegment[]
  /** The card's actions (one, several, or none). */
  action?: ChatEventCardAction | ChatEventCardAction[] | null
  /** An icon-name override (defaults to the tone's icon). */
  icon?: IconName
}

/** Props for `ResourceLimitBanner` — the React prop names. */
export interface ResourceLimitBannerProps {
  /** The backend's message for the hit limit. */
  message: string
  /** The host's CTA buttons (from its `buildUpgradeCta`). */
  action?: ChatEventCardAction | ChatEventCardAction[] | null
}

/** Props for `VerificationBadge` — the React prop names. */
export interface VerificationBadgeProps {
  /** The verification outcome. */
  status: 'ok' | 'error'
  /** The runner's output (shown behind the failure disclosure). */
  output?: string
  /** The workspaces the verification covered. */
  workspaces: string[]
  /** The check categories that reported (`type`, `lint`, `runtime`). */
  categories?: string[]
  /** Whether the stored render check could not run for this pass. */
  renderCheckUnavailable?: boolean
}

/** Props for `AutoCommitBadge` — the React prop names, React's own contract. */
export interface AutoCommitBadgeProps {
  /** The countdown state (`intervalSeconds`, `remaining`). */
  state: AutoCommitState
  /** Commits immediately (the click's only effect, and only when not held). */
  onCommitNow: () => void
  /**
   * Held while the agent works (a turn is streaming / an auto-fix is
   * pending): committing mid-turn is unsafe, so the click is suppressed and
   * the label stays "Commit".
   */
  disabled?: boolean
  /**
   * In normal flow — e.g. occupying the commit bar's button slot — instead
   * of a floating button absolutely positioned over the input area.
   */
  inline?: boolean
  /** Combined action/info label, e.g. "Commit 2 files". */
  label?: string
}

/** React's `ErrorInfo`, as far as the chat item boundary uses it: where the throw happened. */
export interface ChatItemErrorInfo {
  /** The component stack of the throw, when the framework provides one. */
  componentStack: string | null
}

/** Props for `ContextUsageIndicator` — the React prop names, React's own contract. */
export interface ContextUsageIndicatorProps {
  /** The conversation's current usage sample. */
  usage: ContextUsage
  /** The earlier samples of the conversation, for the history chart. */
  history?: ContextUsage[]
  /** The completed compactions of the conversation. */
  compactions?: ContextCompaction[]
  /** The project whose session totals load; absent renders no refresh button. */
  projectId?: string
  /** The conversation the usage belongs to (`null` scopes the session to the project). */
  conversationId?: string | null
  /** Opens the chat settings; absent renders no settings button. */
  onOpenSettings?: () => void
}

/**
 * Props for `DeviceFrameSelector`, extending the shared
 * `DeviceFrameSelectorProps` with the in-dropdown action callbacks (P4-04):
 * the device dropdown also hosts the Rotate and Open-in-new-tab controls that
 * used to be separate toolbar buttons.
 */
export interface DeviceFrameSelectorWithActionsProps extends DeviceFrameSelectorProps {
  /** Whether the current frame can be rotated — gates the Rotate item ("when/where relevant"). */
  canRotate?: boolean
  /** Whether the preview is currently rotated to landscape — renders Rotate as a CHECKED toggle. */
  rotated?: boolean
  /** Rotate the current fixed-frame device portrait ⇄ landscape. Omit to hide the Rotate item. */
  onRotate?: () => void
  /** Open the preview URL in a new browser tab. Omit to hide the Open-in-new-tab item. */
  onOpenExternal?: () => void
}

/** Props for `HelpCard` — the React prop names, React's own contract. */
export interface HelpCardProps {
  /** Light theme (drives the upgrade rule's colour). */
  isLight: boolean
  /** The agent's display name, interpolated through the guide. */
  agentName?: string
  /** The product's display name, interpolated into the intro. */
  productName?: string
  /** Host-supplied plan/upgrade blurb — the shared IDE owns no pricing copy. */
  upgradeLines?: readonly string[]
  /** The blurb's call-to-action, or a row of them. */
  upgradeAction?: ChatEventCardAction | ChatEventCardAction[]
}

/** Props for `RelevantSkillSuggestion` — the React prop names, React's own contract. */
export interface RelevantSkillSuggestionProps {
  /** The skill to suggest. */
  skill: SkillInfo
  /** Loads the skill — opens it in the editor. */
  onLoad: (skill: SkillInfo) => void
  /** Opens the skill the way the clickable name does; omitted, the name is plain text. */
  onOpen?: (skill: SkillInfo) => void
  /** Dismisses the suggestion. */
  onDismiss: (skill: SkillInfo) => void
}

/** Props for `SettingsCard` — the React prop names, React's own contract. */
export interface SettingsCardProps {
  /** The ordered settings rows (built from the shared `SETTINGS` metadata). */
  settings: readonly SettingDescriptor[]
  /** Runs a slash command (a setting whose edit is the bare command). */
  onRunCommand: (id: CommandId) => void
  /** Prefills the chat input with a scoped command (a mode-scoped model edit). */
  onPrefillInput?: (input: string) => void
  /** Whether the host theme is light (drives the row border + value pill colours). */
  isLight: boolean
  /** The host's agent identity, interpolated into the descriptions. */
  agentName?: string
  /** Whether the card sits inside the settings overlay (`true`) or the chat timeline. */
  embedded?: boolean
}

/** Props for `TipCard` — the React prop names, React's own contract. */
export interface TipCardProps {
  /** The (already-localized) tip text. */
  text: string
  /** Dismisses the tip — the host removes it from the timeline. */
  onDismiss: () => void
  /**
   * Recolours the card tint + icon for a semantic tip (e.g. the gold viewer
   * tip that explains the team-only message treatment).
   */
  accent?: string
  /** Overrides the leading glyph (default `lightbulb`). */
  icon?: IconName
}
