/**
 * `@molecule/app-ide-react` cases: the IDE panels and their pieces, mounted
 * through the full composition root with the binding kit's chat, HTTP,
 * storage, workspace, editor and preview fakes.
 *
 * Each component's cases live in their own file under `cases/ide/` (one
 * worker per file) and are only composed here; the goldens are stored per
 * component (`goldens/ide/<Component>.json`), so ports of different
 * components record side by side.
 *
 * The framework-neutral half of the package (command and settings metadata,
 * the chat, tests, share, report and activity utilities, the keyboard
 * shortcut matching and the viewport queries) lives in
 * `@molecule/app-ide-panel-logic`: every framework re-exports it, so
 * `shared` lists it instead of comparing copies.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'
import { activityCardCases } from './ide/activity-card.js'
import { chatPanelCases } from './ide/chat-panel.js'
import { chatTimestampCases } from './ide/chat-timestamp.js'
import { commandPaletteCases } from './ide/command-palette.js'
import { deviceFrameSelectorCases } from './ide/device-frame-selector.js'
import { editorPanelCases } from './ide/editor-panel.js'
import { fileExplorerCases } from './ide/file-explorer.js'
import { ideHookCases } from './ide/hooks.js'
import { iconCases } from './ide/icon.js'
import { keyboardShortcutsPanelCases } from './ide/keyboard-shortcuts-panel.js'
import { previewPanelCases } from './ide/preview-panel.js'
import { quickOpenCases } from './ide/quick-open.js'
import { quickPickerCases } from './ide/quick-picker.js'
import { reportModalCases } from './ide/report-modal.js'
import { resizeHandleCases } from './ide/resize-handle.js'
import { searchPanelCases } from './ide/search-panel.js'
import { shareLinkManagerCases } from './ide/share-link-manager.js'
import { shareModalCases } from './ide/share-modal.js'
import { sidebarTabsCases } from './ide/sidebar-tabs.js'
import { tabBarCases } from './ide/tab-bar.js'
import { testsCardCases } from './ide/tests-card.js'
import { toolCallCardCases } from './ide/tool-call-card.js'
import { userAvatarCases } from './ide/user-avatar.js'
import { workspaceLayoutCases } from './ide/workspace-layout.js'

/** `@molecule/app-ide-react`. */
export const ideFeature: FeatureCases = {
  package: '@molecule/app-ide-react',
  composition: 'app',
  goldensPerComponent: true,
  hooks: ideHookCases,
  families: [
    activityCardCases,
    chatPanelCases,
    chatTimestampCases,
    commandPaletteCases,
    deviceFrameSelectorCases,
    editorPanelCases,
    fileExplorerCases,
    iconCases,
    keyboardShortcutsPanelCases,
    previewPanelCases,
    quickOpenCases,
    quickPickerCases,
    reportModalCases,
    resizeHandleCases,
    searchPanelCases,
    shareLinkManagerCases,
    shareModalCases,
    sidebarTabsCases,
    tabBarCases,
    testsCardCases,
    toolCallCardCases,
    userAvatarCases,
    workspaceLayoutCases,
  ],
  shared: {
    ACTIVITY_TYPES: '@molecule/app-ide-panel-logic',
    activityFromEvent: '@molecule/app-ide-panel-logic',
    activityIconName: '@molecule/app-ide-panel-logic',
    activityStatusColors: '@molecule/app-ide-panel-logic',
    activityStatusLabel: '@molecule/app-ide-panel-logic',
    activitySummaryLine: '@molecule/app-ide-panel-logic',
    activityTypeLabel: '@molecule/app-ide-panel-logic',
    applyTestRunEvent: '@molecule/app-ide-panel-logic',
    AUTO_COMMIT_COUNTDOWN_VISIBLE_SECONDS: '@molecule/app-ide-panel-logic',
    AUTO_COMMIT_DISABLED: '@molecule/app-ide-panel-logic',
    autoCommitReducer: '@molecule/app-ide-panel-logic',
    buildReportPayload: '@molecule/app-ide-panel-logic',
    buildSharePayload: '@molecule/app-ide-panel-logic',
    buildShareUrl: '@molecule/app-ide-panel-logic',
    buildTestFixMessage: '@molecule/app-ide-panel-logic',
    canSkipRun: '@molecule/app-ide-panel-logic',
    CHAT_CARD_ICON_SIZE: '@molecule/app-ide-panel-logic',
    CHAT_CARD_NEUTRAL_ACCENT: '@molecule/app-ide-panel-logic',
    CHAT_TIMESTAMPS_EVENT: '@molecule/app-ide-panel-logic',
    CHAT_TIMESTAMPS_STORAGE_KEY: '@molecule/app-ide-panel-logic',
    chatCardBg: '@molecule/app-ide-panel-logic',
    chatCardBorder: '@molecule/app-ide-panel-logic',
    chatCardStyle: '@molecule/app-ide-panel-logic',
    clampPanelSize: '@molecule/app-ide-panel-logic',
    COARSE_POINTER_QUERY: '@molecule/app-ide-panel-logic',
    collectClientInfo: '@molecule/app-ide-panel-logic',
    COMMAND_CATEGORIES: '@molecule/app-ide-panel-logic',
    COMMANDS: '@molecule/app-ide-panel-logic',
    countByKind: '@molecule/app-ide-panel-logic',
    currentRunRowId: '@molecule/app-ide-panel-logic',
    DEFAULT_AUTO_COMMIT_SECONDS: '@molecule/app-ide-panel-logic',
    DEFAULT_SEARCH_EXCLUDED_DIRS: '@molecule/app-ide-panel-logic',
    DEFAULT_SHARE_ROLE: '@molecule/app-ide-panel-logic',
    DEVICE_DIMENSIONS: '@molecule/app-ide-panel-logic',
    DEVICE_FRAMES: '@molecule/app-ide-panel-logic',
    DEVICE_META: '@molecule/app-ide-panel-logic',
    deviceIconName: '@molecule/app-ide-panel-logic',
    EMPTY_REPORT_FORM: '@molecule/app-ide-panel-logic',
    EMPTY_RUN_STATE: '@molecule/app-ide-panel-logic',
    failedTests: '@molecule/app-ide-panel-logic',
    failRun: '@molecule/app-ide-panel-logic',
    filterActivitiesByType: '@molecule/app-ide-panel-logic',
    filterTests: '@molecule/app-ide-panel-logic',
    findKeyboardShortcut: '@molecule/app-ide-panel-logic',
    formatAutoCommitBadge: '@molecule/app-ide-panel-logic',
    formatChatFullTime: '@molecule/app-ide-panel-logic',
    formatChatRelativeTime: '@molecule/app-ide-panel-logic',
    formatReportConfirmation: '@molecule/app-ide-panel-logic',
    getChatTimestampsVisible: '@molecule/app-ide-panel-logic',
    getCustomEventCardFactory: '@molecule/app-ide-panel-logic',
    groupCommandsByCategory: '@molecule/app-ide-panel-logic',
    groupTests: '@molecule/app-ide-panel-logic',
    hasRenderableAvatar: '@molecule/app-ide-panel-logic',
    IS_MAC: '@molecule/app-ide-panel-logic',
    isAutoCommitArmed: '@molecule/app-ide-panel-logic',
    isAutoCommitCountdownVisible: '@molecule/app-ide-panel-logic',
    isAutoCommitDue: '@molecule/app-ide-panel-logic',
    isAutoCommitEnabled: '@molecule/app-ide-panel-logic',
    isDeviceRotatable: '@molecule/app-ide-panel-logic',
    isInputFocused: '@molecule/app-ide-panel-logic',
    isMonacoFocused: '@molecule/app-ide-panel-logic',
    isReportFormValid: '@molecule/app-ide-panel-logic',
    isRowRunning: '@molecule/app-ide-panel-logic',
    isShareRole: '@molecule/app-ide-panel-logic',
    isShortcutBlockedByFocus: '@molecule/app-ide-panel-logic',
    livePanelSize: '@molecule/app-ide-panel-logic',
    markSkipUnavailable: '@molecule/app-ide-panel-logic',
    matchesSideChannelCommand: '@molecule/app-ide-panel-logic',
    MAX_AVATAR_SRC_LENGTH: '@molecule/app-ide-panel-logic',
    MAX_FIX_MESSAGE_OUTPUT_CHARS: '@molecule/app-ide-panel-logic',
    MAX_FIX_OUTPUT_CHARS: '@molecule/app-ide-panel-logic',
    MAX_OUTPUT_LINES: '@molecule/app-ide-panel-logic',
    MAX_PANEL_PERCENT: '@molecule/app-ide-panel-logic',
    MIN_PANEL_PERCENT: '@molecule/app-ide-panel-logic',
    NARROW_VIEWPORT_QUERY: '@molecule/app-ide-panel-logic',
    normalizeKeys: '@molecule/app-ide-panel-logic',
    parseAutoCommitCommand: '@molecule/app-ide-panel-logic',
    parseChatTimestampsVisible: '@molecule/app-ide-panel-logic',
    parseReportCommand: '@molecule/app-ide-panel-logic',
    parseShareCommand: '@molecule/app-ide-panel-logic',
    parseTestCommand: '@molecule/app-ide-panel-logic',
    parseTimestampsCommand: '@molecule/app-ide-panel-logic',
    planChatTimestamps: '@molecule/app-ide-panel-logic',
    registerCustomEventCard: '@molecule/app-ide-panel-logic',
    requestSkip: '@molecule/app-ide-panel-logic',
    resolveAutoCommitSeconds: '@molecule/app-ide-panel-logic',
    resolveChatLocale: '@molecule/app-ide-panel-logic',
    resolveDeviceSize: '@molecule/app-ide-panel-logic',
    resolveUserAvatar: '@molecule/app-ide-panel-logic',
    serializeEvent: '@molecule/app-ide-panel-logic',
    setChatTimestampsVisible: '@molecule/app-ide-panel-logic',
    SETTINGS: '@molecule/app-ide-panel-logic',
    SHARE_ROLE_LABELS: '@molecule/app-ide-panel-logic',
    SHARE_ROLES: '@molecule/app-ide-panel-logic',
    summarizeResults: '@molecule/app-ide-panel-logic',
    testCaseLabel: '@molecule/app-ide-panel-logic',
    testRowLabel: '@molecule/app-ide-panel-logic',
    TestRunProjection: '@molecule/app-ide-panel-logic',
  },
}
