/**
 * `ChatPanel` cases, one file per area of the panel under `chat-panel/` (each case name starts
 * with its area, `send: …`), over the shared baseline in `chat-panel/fixtures.ts`.
 *
 * @module
 */

import type { FeatureComponentCases } from '../../spec.js'
import { mountCases } from './chat-panel/01-mount.js'
import { historyCases } from './chat-panel/02-history.js'
import { sendCases } from './chat-panel/03-send.js'
import { streamErrorsCases } from './chat-panel/04-stream-errors.js'
import { queueCases } from './chat-panel/05-queue.js'
import { streamEffectsCases } from './chat-panel/06-stream-effects.js'
import { autoFixCases } from './chat-panel/07-auto-fix.js'
import { initialSendCases } from './chat-panel/08-initial-send.js'
import { composerCases } from './chat-panel/09-composer.js'
import { planCompactCostCases } from './chat-panel/10-plan-compact-cost.js'
import { toggleCommandsCases } from './chat-panel/11-toggle-commands.js'
import { modelCases } from './chat-panel/12-model.js'
import { effortCases } from './chat-panel/13-effort.js'
import { removedModelCases } from './chat-panel/14-removed-model.js'
import { commitCases } from './chat-panel/15-commit.js'
import { autoCommitCases } from './chat-panel/16-auto-commit.js'
import { attachmentsCases } from './chat-panel/17-attachments.js'
import { viewerCases } from './chat-panel/18-viewer.js'
import { tipsCases } from './chat-panel/19-tips.js'
import { cardsCases } from './chat-panel/20-cards.js'
import { timestampsCases } from './chat-panel/21-timestamps.js'
import { overlaysCases } from './chat-panel/22-overlays.js'
import { runScriptsCases } from './chat-panel/23-run-scripts.js'
import { undoCases } from './chat-panel/24-undo.js'
import { skillsCases } from './chat-panel/25-skills.js'
import { dictationCases } from './chat-panel/26-dictation.js'
import { hostHandlesCases } from './chat-panel/27-host-handles.js'
import { customCardsCases } from './chat-panel/28-custom-cards.js'

/** `ChatPanel`. */
export const chatPanelCases: FeatureComponentCases = {
  component: 'ChatPanel',
  cases: [
    ...mountCases,
    ...historyCases,
    ...sendCases,
    ...streamErrorsCases,
    ...queueCases,
    ...streamEffectsCases,
    ...autoFixCases,
    ...initialSendCases,
    ...composerCases,
    ...planCompactCostCases,
    ...toggleCommandsCases,
    ...modelCases,
    ...effortCases,
    ...removedModelCases,
    ...commitCases,
    ...autoCommitCases,
    ...attachmentsCases,
    ...viewerCases,
    ...tipsCases,
    ...cardsCases,
    ...timestampsCases,
    ...overlaysCases,
    ...runScriptsCases,
    ...undoCases,
    ...skillsCases,
    ...dictationCases,
    ...hostHandlesCases,
    ...customCardsCases,
  ],
}
