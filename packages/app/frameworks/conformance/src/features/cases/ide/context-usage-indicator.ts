/**
 * `ContextUsageIndicator` cases: the chat header's context ring and its
 * details modal, in every state the props and the session-usage hook produce —
 * the collapsed ring and its label across the target/window/threshold
 * branches, the semantic colors at the 50% and 90% boundaries, the hover
 * preview (reveal, move into, Escape, the dismiss timer), the details modal
 * (open, the refresh and settings actions, the target help, the composition
 * table's branches, the history chart and its 128-sample bound, the completed
 * compactions), the session-usage fetch over the scripted HTTP fake (arrival,
 * failure and retry, the 15-second refresh while open), navigation to another
 * conversation discarding the open preview, and a locale switch.
 *
 * The session totals load on hover/open from
 * `GET /projects/:id/chat-usage`, scripted through `context.http`; the
 * 15-second refresh moves on `fakeTimers` advances. No case pins a wall-clock
 * "now": the chart and compaction times render the samples' own timestamps.
 *
 * @module
 */

import type { FeatureComponentCases } from '../../spec.js'

/** The `GET` the session hook issues for project `p1`, scoped to conversation `c/one`. */
const P1_C1 = { method: 'GET', url: '/projects/p1/chat-usage?conversationId=c%2Fone' }

/** The `GET` the session hook issues for project `p1`, scoped to the whole project. */
const P1_ALL = { method: 'GET', url: '/projects/p1/chat-usage' }

/** The `GET` the session hook issues for project `p1` under conversation `c2`. */
const P1_C2 = { method: 'GET', url: '/projects/p1/chat-usage?conversationId=c2' }

/** An OK reply carrying `data`. */
const ok = (data: unknown): { status: number; data: unknown } => ({ status: 200, data })

/** The loaded session totals most fetch cases share (a daily window, 25% spent). */
const TOTALS = {
  inputTokens: 1000,
  outputTokens: 2000,
  cacheReadInputTokens: 3000,
  cacheCreationInputTokens: 4000,
  allowancePercent: 25,
  allowanceWindow: 'daily',
  allowanceResetAt: Date.UTC(2026, 10, 20, 2, 45),
}

/** The request composition most composition cases share: actual tokens reported, one unknown image. */
const COMPOSITION = {
  version: 1,
  basis: 'core-provider-context-json',
  percentBasis: 'estimated-known-tokens',
  totalChars: 13000,
  totalBytes: 14000,
  estimatedChars: 12000,
  estimatedTokens: 3000,
  charsPerToken: 4,
  actualInputTokens: 3100,
  unknownTokenItems: 1,
  serializationFailures: 0,
  categories: [
    {
      id: 'toolResults',
      chars: 12000,
      bytes: 12000,
      items: 1,
      unknownItems: 0,
      estimatedTokens: 3000,
      percent: 100,
      bytePercent: 85.71,
    },
    {
      id: 'images',
      chars: 1000,
      bytes: 2000,
      items: 1,
      unknownItems: 1,
      estimatedTokens: null,
      percent: null,
      bytePercent: 14.29,
    },
  ],
}

/** The usage most cases share: 3.1K of a 100K window against a 10K background target. */
const USAGE = {
  inputTokens: 3100,
  contextWindow: 100000,
  backgroundCompactAtTokens: 10000,
  compactAtTokens: 60000,
  composition: COMPOSITION,
  requestId: 'request-2',
  at: '2026-10-20T10:01:00Z',
}

/** The usage without the composition detail (light-load cases). */
const bareUsage = (inputTokens: number, extra: Record<string, unknown> = {}): unknown => ({
  inputTokens,
  contextWindow: 100000,
  requestId: 'request-2',
  at: '2026-10-20T10:01:00Z',
  ...extra,
})

/** The session reply the hover/fetch cases serve. */
const sessionOk = ok(TOTALS)

/** `ContextUsageIndicator`. */
export const contextUsageIndicatorCases: FeatureComponentCases = {
  component: 'ContextUsageIndicator',
  cases: [
    // ── The ring and its label ──────────────────────────────────────────────
    {
      name: 'the collapsed ring and its aria label at a light load',
      props: { usage: USAGE },
    },
    {
      name: 'the background target wins over the compact threshold and clamps a full ring',
      props: {
        usage: {
          inputTokens: 11000,
          contextWindow: 100000,
          backgroundCompactAtTokens: 10000,
          compactAtTokens: 60000,
        },
      },
    },
    {
      name: 'the compact threshold alone labels the ring',
      props: {
        usage: { inputTokens: 5000, contextWindow: 100000, compactAtTokens: 10000 },
      },
    },
    {
      name: 'without a threshold the context window is the limit',
      props: { usage: bareUsage(0) },
    },
    {
      name: 'a zero window still reports a one-token limit',
      props: { usage: { inputTokens: 0, contextWindow: 0 } },
    },

    // ── The semantic colors and the status sentence ─────────────────────────
    {
      name: 'the ring color follows the ratio across the semantic thresholds',
      props: { usage: bareUsage(49000) },
      interactions: [
        { type: 'props', props: { usage: bareUsage(50000) } },
        { type: 'props', props: { usage: bareUsage(90000) } },
      ],
    },
    {
      name: 'exactly ninety percent reads Context nearly full',
      props: { usage: bareUsage(80000) },
      interactions: [{ type: 'props', props: { usage: bareUsage(90000) } }],
    },
    {
      name: 'at the target the status says At compaction target',
      props: {
        usage: { inputTokens: 10000, contextWindow: 100000, backgroundCompactAtTokens: 10000 },
      },
    },

    // ── The hover preview ───────────────────────────────────────────────────
    {
      name: 'hover reveals the percentage and the tooltip with the session rows',
      props: { usage: USAGE, projectId: 'p1', conversationId: 'c/one' },
      context: { http: [{ ...P1_C1, ...sessionOk }] },
      interactions: [{ type: 'mouseenter', selector: '[data-mol-id="chat-context-usage"]' }],
    },
    {
      name: 'a null conversation scopes the session totals to the whole project',
      props: { usage: USAGE, projectId: 'p1', conversationId: null },
      context: { http: [{ ...P1_ALL, ...sessionOk }] },
      interactions: [{ type: 'mouseenter', selector: '[data-mol-id="chat-context-usage"]' }],
    },
    {
      name: 'moving into the tooltip keeps it open',
      props: { usage: USAGE, projectId: 'p1', conversationId: 'c/one' },
      context: { http: [{ ...P1_C1, ...sessionOk }] },
      interactions: [
        { type: 'mouseenter', selector: '[data-mol-id="chat-context-usage"]' },
        { type: 'mouseenter', selector: '[aria-live="polite"]' },
      ],
    },
    {
      name: 'leaving the trigger dismisses the preview after the grace timer',
      props: { usage: USAGE, projectId: 'p1', conversationId: 'c/one' },
      context: { http: [{ ...P1_C1, ...sessionOk }] },
      fakeTimers: true,
      interactions: [
        // The clock tick before the first event: a frozen fake `Date` stamps
        // the hover at or before the trigger listener's attach stamp, which a
        // framework's event dedupe may drop (Vue's `_vts` guard).
        { type: 'advance', ms: 1 },
        { type: 'mouseenter', selector: '[data-mol-id="chat-context-usage"]' },
        { type: 'mouseleave', selector: '[data-mol-id="chat-context-usage"]' },
        { type: 'advance', ms: 200 },
      ],
    },
    {
      name: 'Escape on the trigger dismisses an open preview at once',
      props: { usage: USAGE, projectId: 'p1', conversationId: 'c/one' },
      context: { http: [{ ...P1_C1, ...sessionOk }] },
      interactions: [
        { type: 'mouseenter', selector: '[data-mol-id="chat-context-usage"]' },
        { type: 'keydown', selector: '[data-mol-id="chat-context-usage"]', key: 'Escape' },
      ],
    },
    {
      name: 'focus without :focus-visible reveals nothing, and blur keeps it hidden',
      props: { usage: USAGE, projectId: 'p1' },
      context: { http: [{ ...P1_ALL, ...sessionOk }] },
      interactions: [
        { type: 'focus', selector: '[data-mol-id="chat-context-usage"]' },
        { type: 'blur', selector: '[data-mol-id="chat-context-usage"]' },
      ],
    },

    // ── The details modal ───────────────────────────────────────────────────
    {
      name: 'click opens the details modal with the summary, session rows and hints',
      props: { usage: USAGE, projectId: 'p1', conversationId: 'c/one' },
      callbacks: ['onOpenSettings'],
      context: { http: [{ ...P1_C1, ...sessionOk }] },
      interactions: [{ type: 'click', selector: '[data-mol-id="chat-context-usage"]' }],
    },
    {
      name: 'Escape closes the modal',
      props: { usage: USAGE, projectId: 'p1' },
      context: { http: [{ ...P1_ALL, ...sessionOk }] },
      interactions: [
        { type: 'click', selector: '[data-mol-id="chat-context-usage"]' },
        { type: 'keydown', selector: '[role="dialog"]', key: 'Escape' },
      ],
    },
    {
      name: 'the settings button closes the modal and reports onOpenSettings',
      props: { usage: USAGE, projectId: 'p1' },
      callbacks: ['onOpenSettings'],
      context: { http: [{ ...P1_ALL, ...sessionOk }] },
      interactions: [
        { type: 'click', selector: '[data-mol-id="chat-context-usage"]' },
        { type: 'click', selector: '[data-mol-id="chat-context-settings"]' },
      ],
    },
    {
      name: 'without a project there is no refresh button',
      props: { usage: USAGE },
      callbacks: ['onOpenSettings'],
      interactions: [{ type: 'click', selector: '[data-mol-id="chat-context-usage"]' }],
    },
    {
      name: 'without onOpenSettings there is no settings button',
      props: { usage: USAGE, projectId: 'p1' },
      context: { http: [{ ...P1_ALL, ...sessionOk }] },
      interactions: [{ type: 'click', selector: '[data-mol-id="chat-context-usage"]' }],
    },

    // ── The session fetch lifecycle ─────────────────────────────────────────
    {
      name: 'the session totals arrive while the tooltip is open',
      props: { usage: USAGE, projectId: 'p1', conversationId: 'c/one' },
      context: { http: [{ ...P1_C1, defer: true }] },
      interactions: [
        { type: 'mouseenter', selector: '[data-mol-id="chat-context-usage"]' },
        { type: 'http', ...P1_C1, ...sessionOk },
      ],
    },
    {
      name: 'a failed reply states the error and the retry succeeds',
      props: { usage: USAGE, projectId: 'p1' },
      context: { http: [{ ...P1_ALL, status: 500 }] },
      interactions: [
        { type: 'click', selector: '[data-mol-id="chat-context-usage"]' },
        { type: 'click', selector: '[data-mol-id="chat-context-refresh"]' },
      ],
    },
    {
      name: 'the refresh button re-fetches while the modal is open',
      props: { usage: USAGE, projectId: 'p1' },
      context: {
        http: [
          { ...P1_ALL, ...sessionOk },
          { ...P1_ALL, ...sessionOk },
        ],
      },
      interactions: [
        { type: 'click', selector: '[data-mol-id="chat-context-usage"]' },
        { type: 'click', selector: '[data-mol-id="chat-context-refresh"]' },
      ],
    },
    {
      name: 'the totals refresh every 15 seconds while the modal is open',
      props: { usage: USAGE, projectId: 'p1' },
      context: {
        http: [
          { ...P1_ALL, ...sessionOk },
          { ...P1_ALL, ...sessionOk },
          { ...P1_ALL, ...sessionOk },
        ],
      },
      fakeTimers: true,
      interactions: [
        { type: 'click', selector: '[data-mol-id="chat-context-usage"]' },
        { type: 'advance', ms: 15000 },
        { type: 'keydown', selector: '[role="dialog"]', key: 'Escape' },
        { type: 'advance', ms: 30000 },
      ],
    },

    // ── The composition table ───────────────────────────────────────────────
    {
      name: 'the composition table lists the measurable categories and the unknown media',
      props: { usage: USAGE, projectId: 'p1' },
      context: { http: [{ ...P1_ALL, ...sessionOk }] },
      interactions: [{ type: 'click', selector: '[data-mol-id="chat-context-usage"]' }],
    },
    {
      name: 'a pending provider report says the counts are estimates',
      props: {
        usage: {
          ...USAGE,
          composition: { ...COMPOSITION, actualInputTokens: null },
        },
        projectId: 'p1',
      },
      context: { http: [{ ...P1_ALL, ...sessionOk }] },
      interactions: [{ type: 'click', selector: '[data-mol-id="chat-context-usage"]' }],
    },
    {
      name: 'a composition without unknown content omits the unknown-cost line',
      props: {
        usage: {
          ...USAGE,
          composition: {
            ...COMPOSITION,
            actualInputTokens: null,
            unknownTokenItems: 0,
            categories: [COMPOSITION.categories[0]],
          },
        },
        projectId: 'p1',
      },
      context: { http: [{ ...P1_ALL, ...sessionOk }] },
      interactions: [{ type: 'click', selector: '[data-mol-id="chat-context-usage"]' }],
    },

    // ── The history chart ───────────────────────────────────────────────────
    {
      name: 'the history chart draws the samples with the target line',
      props: {
        usage: USAGE,
        history: [
          { ...USAGE, requestId: 'request-1', at: '2026-10-20T10:00:00Z', inputTokens: 20000 },
        ],
      },
      interactions: [{ type: 'click', selector: '[data-mol-id="chat-context-usage"]' }],
    },
    {
      name: 'a single sample draws no chart',
      props: { usage: USAGE },
      interactions: [{ type: 'click', selector: '[data-mol-id="chat-context-usage"]' }],
    },
    {
      name: 'an incoming actual replaces the same request stale estimate',
      props: {
        usage: USAGE,
        history: [
          { ...USAGE, requestId: 'request-1', at: '2026-10-20T10:00:00Z', inputTokens: 20000 },
          { ...USAGE, composition: { ...COMPOSITION, actualInputTokens: null }, inputTokens: 5000 },
        ],
      },
      interactions: [{ type: 'click', selector: '[data-mol-id="chat-context-usage"]' }],
    },
    {
      name: 'samples without an id and time are dropped from the history',
      props: {
        usage: USAGE,
        history: [
          { ...USAGE, requestId: 'request-1', at: '2026-10-20T10:00:00Z', inputTokens: 20000 },
          { inputTokens: 9000, contextWindow: 100000 },
        ],
      },
      interactions: [{ type: 'click', selector: '[data-mol-id="chat-context-usage"]' }],
    },
    {
      name: 'samples sharing a timestamp space by index instead of time',
      props: {
        usage: USAGE,
        history: [
          { ...USAGE, requestId: 'request-1', at: '2026-10-20T10:01:00Z', inputTokens: 20000 },
        ],
      },
      interactions: [{ type: 'click', selector: '[data-mol-id="chat-context-usage"]' }],
    },
    {
      name: 'a history past 128 samples keeps the first and the newest 127',
      props: {
        usage: USAGE,
        history: Array.from({ length: 150 }, (_, index) => ({
          ...USAGE,
          requestId: String(index),
          at: new Date(Date.UTC(2026, 9, 20, 10, 0, index)).toISOString(),
          inputTokens: 20000 + index,
        })),
      },
      interactions: [{ type: 'click', selector: '[data-mol-id="chat-context-usage"]' }],
    },

    // ── The completed compactions ───────────────────────────────────────────
    {
      name: 'completed compactions list their events',
      props: {
        usage: USAGE,
        compactions: [
          {
            at: '2026-10-20T10:00:30Z',
            compactedCount: 12,
            beforeChars: 80000,
            afterChars: 8000,
            elapsedMs: 4500,
          },
          {
            at: '2026-10-20T10:00:45Z',
            compactedCount: 3,
            beforeChars: 120000,
            afterChars: 15000,
            elapsedMs: 6400,
          },
        ],
      },
    },

    // ── Navigation resets the view ──────────────────────────────────────────
    {
      name: 'navigation to another conversation discards the preview and totals',
      props: { usage: USAGE, projectId: 'p1', conversationId: 'c/one' },
      context: {
        http: [
          { ...P1_C1, ...sessionOk },
          { ...P1_C2, ...sessionOk },
        ],
      },
      interactions: [
        { type: 'mouseenter', selector: '[data-mol-id="chat-context-usage"]' },
        { type: 'props', props: { conversationId: 'c2' } },
      ],
    },

    // ── Locale ──────────────────────────────────────────────────────────────
    {
      name: 'a switch to French re-renders every label',
      props: { usage: USAGE, projectId: 'p1', conversationId: 'c/one' },
      callbacks: ['onOpenSettings'],
      context: {
        http: [{ ...P1_C1, ...sessionOk }],
        translations: {
          fr: {
            'ide.chat.context.title': 'Utilisation du contexte',
            'ide.chat.context.indicator':
              '{{tokens}} / {{limit}} jetons · {{target}} ({{percent}}%)',
            'ide.chat.context.atTarget': 'Au seuil de compaction',
            'ide.chat.context.nearTarget': 'Contexte presque plein',
            'ide.chat.context.healthy': 'Le contexte a de la place',
            'ide.chat.context.target': 'Seuil de compaction',
            'ide.chat.context.window': 'Fenêtre de contexte',
            'ide.chat.context.tokenUnit': 'jetons',
            'ide.chat.context.headroom': '{{tokens}} jetons de marge',
            'ide.chat.context.openDetails': 'Cliquez pour le détail, l’historique et les réglages',
            'ide.chat.context.refresh': 'Actualiser l’utilisation',
            'ide.chat.context.settings': 'Réglages du chat',
            'ide.chat.context.targetHelp': 'La compaction est prévue autour de ce seuil.',
            'ide.chat.context.windowSize': 'Fenêtre de contexte du modèle : {{tokens}} jetons.',
            'ide.chat.context.breakdown': 'Composition de la requête',
            'ide.chat.context.actual': 'Entrée déclarée : {{tokens}} jetons (cache inclus).',
            'ide.chat.context.pending':
              'L’utilisation du fournisseur est en attente ; les comptes sont des estimations.',
            'ide.chat.context.estimate':
              'Estimation du texte connu : {{tokens}} jetons. Requête : {{chars}} caractères / {{bytes}} octets. Les parts décrivent les jetons estimés, pas la facturation.',
            'ide.chat.context.unknown':
              'Des images, pièces jointes ou contenus non mesurables ont un coût inconnu et sont exclus des parts estimées.',
            'ide.chat.context.category': 'Catégorie',
            'ide.chat.context.category.toolResults': 'Résultats d’outils',
            'ide.chat.context.category.images': 'Images',
            'ide.chat.context.tokens': 'Jetons est.',
            'ide.chat.context.share': 'Part',
            'ide.chat.context.bytes': 'Octets',
            'ide.chat.context.history': 'Contexte dans le temps · {{count}} requêtes',
            'ide.chat.context.chart':
              'Jetons d’entrée dans le temps ; la ligne pointillée marque le seuil actuel',
            'ide.chat.context.compactions': 'Compactions terminées : {{count}}',
            'ide.chat.context.compaction':
              '{{at}} · {{before}} → {{after}} caractères · {{seconds}} s',
            'ide.chat.context.session': 'Session actuelle',
            'ide.chat.context.sessionTotal': '{{tokens}} jetons',
            'ide.chat.context.sessionDetail': '{{input}} entrée (cache inclus) · {{output}} sortie',
            'ide.chat.context.live': 'En direct',
            'ide.chat.context.allowance': 'Quota global d’IA',
            'ide.chat.context.remainingPercent': '~{{percent}}% restant',
            'ide.chat.context.unmetered': 'Non mesuré',
            'ide.chat.context.unavailable': 'Indisponible',
            'ide.chat.context.loading': 'Chargement…',
            'ide.chat.context.usageError':
              'L’utilisation n’a pas pu être actualisée. Ouvrez les détails pour réessayer.',
            'ide.chat.context.ownerAllowance': 'Partagé entre les projets du propriétaire.',
            'ide.chat.context.monthly': 'Quota mensuel.',
            'ide.chat.context.daily': 'Quota quotidien.',
            'ide.chat.context.resets': 'Réinitialisation {{at}}.',
          },
        },
      },
      interactions: [
        { type: 'click', selector: '[data-mol-id="chat-context-usage"]' },
        { type: 'locale', locale: 'fr' },
      ],
    },
  ],
}
