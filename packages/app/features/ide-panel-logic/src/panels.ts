/**
 * Helper modules of the IDE panel views — chat slash commands, commit/cost/
 * effort/model/scripts/settings/skills/stream/tip helpers, the file-explorer
 * persistence, the quick picker's filter, the tests bar and tool-call utilities,
 * the chat timeline ordering, and the preview panel's behaviour with the headless hooks
 * runtime that runs it outside React. Not re-exported by the framework packages: each framework's IDE
 * package imports this entry for its own views.
 *
 * @module
 */

export * from './chatTimelineOrdering.js'
export * from './components/chat-card-event-utilities.js'
export * from './components/chat-commands.js'
export * from './components/chat-commit-utilities.js'
export * from './components/chat-composer-utilities.js'
export * from './components/chat-cost-utilities.js'
export * from './components/chat-dictation-controller.js'
export * from './components/chat-effort-utilities.js'
export * from './components/chat-help-utilities.js'
export * from './components/chat-model-mode-utilities.js'
export * from './components/chat-models-utilities.js'
export * from './components/chat-scripts-utilities.js'
export * from './components/chat-settings-utilities.js'
export * from './components/chat-skills-utilities.js'
export * from './components/chat-stream-utilities.js'
export * from './components/chat-tests-controller.js'
export * from './components/chat-timeline-utilities.js'
export * from './components/chat-tips-utilities.js'
export * from './components/chat-undo-utilities.js'
export * from './components/context-usage-utilities.js'
export * from './components/fileExplorerPersistence.js'
export * from './components/headless-hooks.js'
export * from './components/preview-panel-logic.js'
export * from './components/preview-panel-session.js'
export * from './components/quick-picker-utilities.js'
export * from './components/tests-bar-utilities.js'
export * from './components/tool-call-utilities.js'
