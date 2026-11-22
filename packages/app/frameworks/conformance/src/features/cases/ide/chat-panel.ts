/**
 * `ChatPanel` cases, one file per area of the panel under `chat-panel/` (each case name starts
 * with its area, `send: …`), over the shared baseline in `chat-panel/fixtures.ts`. Each area's
 * results are stored in its own goldens file, `goldens/ide/ChatPanel/<area>.json`.
 *
 * @module
 */

import type { FeatureCase, FeatureComponentCases } from '../../spec.js'
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
import { testsCases } from './chat-panel/29-tests.js'

/**
 * One area's cases, stored in the area's own goldens file
 * (`goldens/ide/ChatPanel/<area>.json`): one file for all of them would pass what git hosts
 * take, and recording one area's change rewrites only its file.
 *
 * @param area - The area's file name under `chat-panel/`.
 * @param cases - Its cases.
 * @returns The cases, each naming that group.
 */
const inArea = (area: string, cases: FeatureCase[]): FeatureCase[] =>
  cases.map((testCase) => ({ ...testCase, goldensGroup: area }))

/** `ChatPanel`. */
export const chatPanelCases: FeatureComponentCases = {
  component: 'ChatPanel',
  cases: [
    ...inArea('01-mount', mountCases),
    ...inArea('02-history', historyCases),
    ...inArea('03-send', sendCases),
    ...inArea('04-stream-errors', streamErrorsCases),
    ...inArea('05-queue', queueCases),
    ...inArea('06-stream-effects', streamEffectsCases),
    ...inArea('07-auto-fix', autoFixCases),
    ...inArea('08-initial-send', initialSendCases),
    ...inArea('09-composer', composerCases),
    ...inArea('10-plan-compact-cost', planCompactCostCases),
    ...inArea('11-toggle-commands', toggleCommandsCases),
    ...inArea('12-model', modelCases),
    ...inArea('13-effort', effortCases),
    ...inArea('14-removed-model', removedModelCases),
    ...inArea('15-commit', commitCases),
    ...inArea('16-auto-commit', autoCommitCases),
    ...inArea('17-attachments', attachmentsCases),
    ...inArea('18-viewer', viewerCases),
    ...inArea('19-tips', tipsCases),
    ...inArea('20-cards', cardsCases),
    ...inArea('21-timestamps', timestampsCases),
    ...inArea('22-overlays', overlaysCases),
    ...inArea('23-run-scripts', runScriptsCases),
    ...inArea('24-undo', undoCases),
    ...inArea('25-skills', skillsCases),
    ...inArea('26-dictation', dictationCases),
    ...inArea('27-host-handles', hostHandlesCases),
    ...inArea('28-custom-cards', customCardsCases),
    ...inArea('29-tests', testsCases),
  ],
}
