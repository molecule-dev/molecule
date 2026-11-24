/**
 * Records the email, SMS, push, webhook and channel messages your API sends in the molecule.dev
 * Activity panel.
 *
 * In the molecule.dev dev sandbox each send is recorded and not delivered. In a production deploy
 * it is delivered by your own provider and recorded with its outcome. Anywhere else (your machine,
 * another host) the call does nothing and your providers send as usual.
 *
 * Call it last in `setupBonds()`, after every provider is bonded, so it can wrap them.
 * `mlcl add @molecule/api-activity-capture --inject` writes the call for you, and projects created
 * on molecule.dev come with it.
 *
 * ```typescript
 * import { setupActivityCapture } from '@molecule/api-activity-capture'
 *
 * import { setupEmailsMailgun } from './emails-mailgun.js'
 *
 * export async function setupBonds(): Promise<void> {
 *   setupEmailsMailgun()
 *   await setupActivityCapture()
 * }
 * ```
 *
 * The platform turns it on with `MOLECULE_ACTIVITY_URL` (where events go) and
 * `MOLECULE_ACTIVITY_MODE` (`tee` delivers and records; anything else records only). A category
 * whose capture package cannot be loaded keeps its real provider.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './setup.js'
