/**
 * The components `@molecule/app-ide-react` renders but does not export, for the
 * conformance kit's part cases. Not exposed by the package's `exports`.
 *
 * The four framework packages generate their `parts.ts` from the files present
 * (`.experiments/feature-parity/ide-barrels.mjs`); this one is maintained by
 * hand and lists exactly the parts the cases render.
 *
 * @module
 */

export { AutoCommitBadge } from './components/AutoCommitBadge.js'
export { BackgroundTasksStrip } from './components/BackgroundTasksStrip.js'
export { ChatItemBoundary } from './components/ChatItemBoundary.js'
export { ContextSessionUsage } from './components/ContextSessionUsage.js'
export { ContextUsageIndicator } from './components/ContextUsageIndicator.js'
export { DockStrip } from './components/DockStrip.js'
export { FileExplorerContextMenu } from './components/FileExplorerContextMenu.js'
export { HelpCard } from './components/HelpCard.js'
export { MarkdownContent } from './components/MarkdownContent.js'
export { PlanCard } from './components/PlanCard.js'
export { RelevantSkillSuggestion } from './components/RelevantSkillSuggestion.js'
export { ScriptsCard } from './components/ScriptsCard.js'
export { SettingsCard } from './components/SettingsCard.js'
export { SkillsCard } from './components/SkillsCard.js'
export { StreamingIndicator } from './components/StreamingIndicator.js'
export { TestStatusBar } from './components/TestStatusBar.js'
export { TipCard } from './components/TipCard.js'
export { WorkCard } from './components/WorkCard.js'
