/**
 * The chat "system card" vocabulary and the one construction of a system card
 * from a recorded `CardEvent`.
 *
 * The React panel carries these notices inline in its chat timeline — the
 * model/mode/setting/skills/custom system cards, the dismissable tips, the
 * captured activity cards, commit cards, attached files and the composer's
 * command/mode/effort/file pickers. Every framework's panel shows the same
 * cards, so the types and the `CardEvent` → {@link SystemCard} mapping live
 * here, framework-neutral. A view supplies its own `t()`, model catalog,
 * region choices, custom-card factory and logger through
 * {@link CardEventToSystemCardDeps}; nothing in this module reads React state,
 * refs, props or hooks.
 *
 * @module
 */

import type { CardEvent } from '@molecule/app-ai-chat'
import type { AppModelDefinition } from '@molecule/app-ai-models'
import type { TranslateFunction } from '@molecule/app-i18n'
import type { IconName } from '@molecule/app-icons'

import type {
  ChatEventCard,
  ChatEventCardAction,
  ChatEventCardFactory,
  ChatEventCardSegment,
} from '../customEventCards.js'
import type { Activity } from './activity-utilities.js'
import type { EffortMode } from './chat-effort-utilities.js'
import type { ModelMode } from './chat-model-mode-utilities.js'
import { effectiveModelRegion } from './chat-models-utilities.js'
import type { TipDef } from './chat-tips-utilities.js'

// ---------------------------------------------------------------------------
// Composer and timeline entry types
// ---------------------------------------------------------------------------

/** One entry of the composer's `@`-file picker list. */
export interface FileEntry {
  /** File or directory name. */
  name: string
  /** Whether the entry is a file or a directory. */
  type: 'file' | 'directory'
  /** Size in bytes, when known. */
  size?: number
}

/** A file the composer will send along with the message. */
export interface AttachedFile {
  /** Sandbox file path for @-mentioned text files. */
  path?: string
  /** Browser File object for drag-dropped/pasted/picked binary files. */
  file?: File
  /** Display name. */
  filename: string
  /** MIME type. */
  mediaType: string
  /** File size in bytes. */
  size: number
  /** Object URL for image thumbnail preview (revoked on removal). */
  previewUrl?: string
}

/** The composer's `@`-file picker state. */
export interface FilePicker {
  /** The listed entries, already filtered by {@link FilePicker.query}. */
  entries: FileEntry[]
  /** The composer text the picker filters by, as of the last write to the composer. */
  query: string
  /** The highlighted row's index. */
  selectedIdx: number
}

/** The composer's slash-command menu state. */
export interface CommandMenu {
  /** The highlighted row's index. */
  selectedIdx: number
  /** The composer text the picker filters by, as of the last write to the composer. */
  text: string
  /**
   * Opened via the slash BUTTON with text already in the composer: list every
   * runnable command instead of filtering by the composer text (which the
   * toggle deliberately leaves untouched). Cleared the moment typing re-derives
   * the menu from the input.
   */
  showAll?: boolean
}

/** One entry of the conversation history list. */
export interface ConversationSummary {
  /** The conversation id. */
  id: string
  /** ISO creation timestamp. */
  createdAt: string
  /** ISO last-update timestamp. */
  updatedAt: string
  /** The stored preview line, or null when the conversation has none. */
  preview: string | null
}

/** A commit card in the chat timeline. */
export interface CommitCard {
  /** The card's identity (and the commit's id while running). */
  id: string
  /** The commit message. */
  message: string
  /** The committed file paths. */
  files: string[]
  /** Numeric timestamp for timeline ordering. */
  timestamp: number
  /** Where the commit is in its lifecycle. */
  status: 'running' | 'done' | 'error'
  /** The resulting commit hash, once the commit succeeded. */
  hash?: string
}

/**
 * `Omit` that distributes over a union, so each member keeps its own remaining keys
 * (plain `Omit<A | B, K>` collapses to the common keys only).
 */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never

/**
 * Fields shared by every system card. `action` (an optional CTA button, or array of
 * them) is common — any card may carry one.
 */
export interface SystemCardBase {
  /** The card's identity in the timeline. */
  id: string
  /** Plain-text body (the accessible/non-toned fallback). */
  text: string
  /** Numeric timestamp for timeline ordering. */
  timestamp: number
  /** An optional CTA button (or buttons) shown with the card. */
  action?: ChatEventCardAction | ChatEventCardAction[]
}

/**
 * Default card (no `variant`): a plain inline notice, or — with `tone` set — a
 * dismissable tip box. Owns the body/styling fields the rich variants never use.
 */
export interface PlainSystemCard extends SystemCardBase {
  /** The default card has no variant key. */
  variant?: undefined
  /**
   * Composable inline body for a `tone` (tip) card — an ordered list of segments
   * (plain strings + inline link actions) rendered in sequence, used INSTEAD of
   * `text` + appended `action`s so a link can sit mid-sentence (see
   * {@link ChatEventCard.content}). `text` stays the plain-text fallback.
   */
  content?: ChatEventCardSegment[]
  /**
   * When true, render with the emphasized (highlighted box) style instead of the
   * muted inline style — e.g. a host-supplied sign-up / upgrade nudge. The caller
   * opts in explicitly; the styling is never inferred from the card's route or copy.
   */
  emphasized?: boolean
  /**
   * Tip TONE — picks the card's accent colour + default icon so every notice card shares
   * ONE consistent box, differing only by colour/icon: `info` (blue), `gold` (amber tip),
   * `upgrade` (amber clock), `success` (green check), `signup` (primary sign-in). Setting
   * a tone implies emphasis; `emphasized` without a tone falls back to `info`. See
   * {@link ChatEventCard.tone}.
   */
  tone?: 'info' | 'gold' | 'upgrade' | 'success' | 'signup'
  /** Icon-name override (a `@molecule/app-icons` glyph); defaults to the tone's icon. */
  icon?: IconName
  /**
   * The limit this card already explains (a backend `limitType`). While a live error
   * carries the same `limitType` — i.e. the limit banner is restating it right above the
   * composer — this card is dropped from the timeline so the same limit is stated once,
   * not twice. See {@link ChatEventCard.coversLimitType}.
   */
  coversLimitType?: string
  /** A critical event — keeps its timestamp with timestamps off. See {@link ChatEventCard.critical}. */
  critical?: boolean
}

/** The `/help` high-level guide card. `text` carries the `buildHelpText` fallback. */
export interface HelpSystemCard extends SystemCardBase {
  /** The `/help` card variant. */
  variant: 'help'
}

/**
 * The compact, clickable "Loaded {{count}} skills" notice built from a recorded `skills`
 * card event; its onClick, which opens the `/skills` browser, is attached at render time.
 */
export interface SkillsLoadedSystemCard extends SystemCardBase {
  /** The loaded-skills card variant. */
  variant: 'skillsLoaded'
}

/**
 * A system card — a discriminated union keyed on `variant`, so each card type declares
 * ONLY its own fields and the compiler enforces validity (`content`/`tone` only on the
 * plain/tip card). The render switch narrows on `variant`. The `/settings`, `/skills`,
 * `/scripts` and `/test` browsers are overlays (`panelOverlay`), not cards.
 */
export type SystemCard = PlainSystemCard | HelpSystemCard | SkillsLoadedSystemCard

/**
 * Options for `addSystemCard`: the card's fields minus the generated `id`, the
 * positional `text` and the `timestamp` it stamps. Distributes over the union (see
 * {@link DistributiveOmit}) so a caller only ever names the fields valid for the variant it sets.
 */
export type AddSystemCardOptions = DistributiveOmit<SystemCard, 'id' | 'text' | 'timestamp'>

/** A dismissable auto-tip entry in the chat timeline. */
export interface TipCardEntry {
  /** The card's identity in the timeline. */
  id: string
  /**
   * The tip's definition ({@link TipDef}), NOT the rendered sentence: the entry
   * stores WHAT to say and the render translates it
   * (`tipText(t, tip, { agentName })`), so a locale switch re-translates every
   * visible tip instead of leaving the sentence the effect captured before the
   * switch.
   */
  tip: TipDef
  /** Numeric timestamp for timeline ordering. */
  timestamp: number
  /**
   * Accent colour override (border/background tint + icon colour) for a
   * semantic tip — e.g. the viewer tip goes gold to match the team-only
   * message treatment it explains. Default: the neutral primary tint.
   */
  accent?: string
  /** Leading-icon override (e.g. `people` for the viewer tip). Default: `lightbulb`. */
  icon?: IconName
}

/** An inline activity card entry in the chat timeline (a captured side effect). */
export interface ActivityCardEntry {
  /** The card's identity in the timeline. */
  id: string
  /** The captured side effect. */
  activity: Activity
  /** Numeric timestamp for timeline ordering (derived from the activity's ISO timestamp). */
  timestamp: number
  /**
   * Set when this card was applied from a teammate's broadcast (the chat push channel),
   * not this client's own stream. Rendered but NEVER persisted — the originating member
   * already persisted it; if every viewer re-PUT, members would race on the conversation
   * row.
   */
  received?: boolean
}

/** The `/model` picker state. */
export interface ModelPicker {
  /** The highlighted row's index. */
  selectedIdx: number
  /** The composer text the picker filters by, as of the last write to the composer. */
  text: string
  /**
   * When set, the picker is scoped to a mode: selections persist to that
   * mode's settings field (`planModel` / `executeModel` / `commitModel` /
   * `compactModel`) and the free-tier lock follows the mode's rules. Unset =
   * the legacy single `chatModel` ("Default"). Driven live by the mode
   * dropdown at the top of the picker; the `/model --plan` etc. flags merely
   * preselect it.
   */
  mode?: ModelMode
}

/**
 * The `/effort` level picker — a selectable list of the target mode's model's
 * own effort levels (mirrors how bare `/model` opens the model picker).
 */
export interface EffortPicker {
  /** The highlighted row's index. */
  selectedIdx: number
  /** The composer text the picker filters by, as of the last write to the composer. */
  text: string
  /**
   * The mode being edited — a selection persists to `effortByMode[mode]`.
   * Opens scoped to the live conversation mode (or the `--plan` / `--execute`
   * flag); the picker's own mode dropdown re-scopes it in place, and the
   * listed levels follow that mode's MODEL (plan and execute can run models
   * with entirely different native effort scales).
   */
  mode: EffortMode
}

// ---------------------------------------------------------------------------
// Card-event mapping
// ---------------------------------------------------------------------------

/**
 * The log surface {@link cardEventToSystemCard} uses for a custom-card factory
 * failure — structurally the `Logger` a panel gets from `@molecule/app-logger`,
 * so this module stays free of a logger dependency.
 */
export interface ChatCardEventLogger {
  /**
   * Record a failed custom-card factory.
   *
   * @param message - What failed and why it matters.
   * @param args - The error and the offending event name.
   */
  error(message: string, ...args: unknown[]): void
}

/** What {@link cardEventToSystemCard} needs from its caller. */
export interface CardEventToSystemCardDeps {
  /** The caller's translate function (keys, values and defaults pass through unchanged). */
  t: TranslateFunction
  /** The project's model catalog, for a model card's processing-region code. */
  models: AppModelDefinition[]
  /** The viewer's per-model region choices, keyed by model id. */
  modelRegions: Record<string, string>
  /** Resolves an app-registered custom-card factory (see `registerCustomEventCard`). */
  getFactory: (name: string) => ChatEventCardFactory | undefined
  /** The caller's logger, for a factory that throws. */
  logger: ChatCardEventLogger
}

/**
 * Build a renderable {@link SystemCard} from a card-message's raw {@link CardEvent}. This is the ONE
 * construction, used IDENTICALLY for a live `card` event (now a card-message in the transcript)
 * and for a card-message loaded on refresh — so the rendered card is the same in both, with
 * no separate store and no client-side "should I show this" decision. App-specific copy /
 * actions stay client-side (the server records only the raw data); returns null for an
 * unrenderable card (a custom event with no registered factory, or a non-execute mode) so
 * the timeline simply omits it.
 *
 * @param cardEvent - The raw recorded card payload.
 * @param id - The card-message's id, carried onto the built card.
 * @param timestamp - The card-message's timestamp, carried onto the built card.
 * @param deps - The caller's translate function, model catalog, region choices, custom-card factory resolver and logger.
 * @returns The system card to render, or null when the event has nothing to show.
 */
export function cardEventToSystemCard(
  cardEvent: CardEvent,
  id: string,
  timestamp: number,
  deps: CardEventToSystemCardDeps,
): SystemCard | null {
  const { t, models, modelRegions, getFactory, logger } = deps
  // Suffix a card's copy with the member who made the change, when the
  // server attributed one — so a teammate watching knows WHO flipped the
  // model/effort/mode, live and on reload.
  const withBy = (text: string): string => {
    const by = (cardEvent as { by?: string }).by
    return by
      ? t('ide.chat.cardBy', { text, name: by }, { defaultValue: '{{text}} — {{name}}' })
      : text
  }
  switch (cardEvent.kind) {
    case 'model': {
      const label = cardEvent.label || cardEvent.model
      // Append the model's effective processing-region code — catalog
      // models only. A custom/BYO endpoint has no meaningful region: its
      // catalog `regions` defaults to ['us'] as a placeholder, not a real
      // re-host choice, so never surface a region for it.
      const def = models.find((m) => m.id === cardEvent.model)
      const regionCode =
        def && def.provider !== 'custom'
          ? effectiveModelRegion(def, modelRegions[def.id]).toUpperCase()
          : null
      return {
        id,
        text: withBy(
          regionCode
            ? t(
                'ide.chat.modelInUseRegion',
                { model: label, region: regionCode },
                { defaultValue: 'Now using {{model}} ({{region}})' },
              )
            : t('ide.chat.modelInUse', { model: label }, { defaultValue: 'Now using {{model}}' }),
        ),
        timestamp,
      }
    }
    case 'mode':
      // The plan→build handoff ("🔨 Building your app") and the plan-mode
      // announcement a new conversation is seeded with ("📝 Plan mode") —
      // the server records mode cards only for those two.
      if (cardEvent.mode === 'plan') {
        return {
          id,
          text: withBy(t('ide.chat.phasePlanning', undefined, { defaultValue: '📝 Plan mode' })),
          timestamp,
        }
      }
      if (cardEvent.mode !== 'execute') return null
      return {
        id,
        text: withBy(
          t('ide.chat.phaseBuilding', undefined, { defaultValue: '🔨 Building your app' }),
        ),
        timestamp,
      }
    case 'setting': {
      // A Synthase-altering setting changed (effort / fast mode / max loops /
      // region / auto-fix / auto-approve) — announced to every member, live
      // and on reload. Copy reuses the same localized strings as the local
      // confirmation cards, so the shared card reads identically.
      let text: string | null = null
      if (cardEvent.setting === 'effort') {
        const level = String(cardEvent.value ?? 'default')
        const cardMode = cardEvent.mode ?? ''
        text = cardEvent.label
          ? t(
              'ide.chat.effort.setMode',
              { mode: cardMode, level, model: cardEvent.label },
              { defaultValue: 'Reasoning effort for {{mode}} set to {{level}} ({{model}}).' },
            )
          : t(
              'ide.chat.setting.effort',
              { mode: cardMode, level },
              { defaultValue: 'Reasoning effort for {{mode}} set to {{level}}.' },
            )
      } else if (cardEvent.setting === 'fastMode') {
        text = cardEvent.value
          ? t('ide.chat.fastModeOn', undefined, {
              defaultValue: 'Fast mode on — faster responses at a higher rate',
            })
          : t('ide.chat.fastModeOff', undefined, { defaultValue: 'Fast mode off' })
      } else if (cardEvent.setting === 'maxToolLoops') {
        text = t(
          'ide.chat.maxLoopsSet',
          { n: Number(cardEvent.value ?? 0) },
          { defaultValue: 'Max tool iterations set to {{n}}' },
        )
      } else if (cardEvent.setting === 'region') {
        text = t(
          'ide.chat.modelInUseRegion',
          { model: cardEvent.label ?? '', region: String(cardEvent.value ?? '').toUpperCase() },
          { defaultValue: 'Now using {{model}} ({{region}})' },
        )
      } else if (cardEvent.setting === 'autoFix') {
        text = cardEvent.value
          ? t('ide.chat.autoFixEnabled', undefined, { defaultValue: 'Auto-fix enabled.' })
          : t('ide.chat.autoFixDisabled', undefined, { defaultValue: 'Auto-fix disabled.' })
      } else if (cardEvent.setting === 'autoApprove') {
        text = cardEvent.value
          ? t('ide.chat.autoApproveEnabled', undefined, {
              defaultValue:
                'Auto-approve on — destructive commands run without asking. The exfiltration guard still asks. Turn off with /autoapprove.',
            })
          : t('ide.chat.autoApproveDisabled', undefined, {
              defaultValue: 'Auto-approve off — destructive commands ask before running.',
            })
      }
      if (!text) return null
      return { id, text: withBy(text), timestamp }
    }
    case 'skills':
      return {
        id,
        variant: 'skillsLoaded',
        text: t(
          'ide.chat.skills.loadedCount',
          { count: cardEvent.count },
          { defaultValue: '🧠 Loaded {{count}} skills' },
        ),
        timestamp,
      }
    case 'custom': {
      // App-registered renderer (registerCustomEventCard) builds the copy/actions/tone
      // from the raw data — keeping app-specific text out of this shared package.
      //
      // This runs in a memo ABOVE the timeline's per-item boundaries, so a factory
      // that throws would take the whole panel down rather than one card — and the
      // factory is host code reading model-authored `data`, exactly the combination
      // that caused the 2026-08-14 outage. One unrenderable card must cost one card.
      let card: ChatEventCard | undefined | null
      try {
        card = getFactory(cardEvent.name)?.(cardEvent.data)
      } catch (error) {
        logger.error('Custom chat card factory threw — dropping the card', {
          error,
          name: cardEvent.name,
        })
        return null
      }
      if (!card) return null
      return {
        id,
        text: card.text,
        ...(card.action ? { action: card.action } : {}),
        ...(card.emphasized ? { emphasized: card.emphasized } : {}),
        ...(card.tone ? { tone: card.tone } : {}),
        ...(card.icon ? { icon: card.icon } : {}),
        ...(card.content ? { content: card.content } : {}),
        ...(card.coversLimitType ? { coversLimitType: card.coversLimitType } : {}),
        ...(card.critical ? { critical: true } : {}),
        timestamp,
      }
    }
    default:
      return null
  }
}

// ---------------------------------------------------------------------------
// One translated sentence around an inline segment
// ---------------------------------------------------------------------------

/**
 * The stand-in a translated sentence is rendered with, to find where its slot lands. A
 * private-use character: no translation or name carries it.
 */
export const CARD_SEGMENT_SLOT = ''

/**
 * A card body that puts one inline segment (a clickable code name, a link) where a
 * translated sentence's placeholder sits: `Loaded {{name}} skill` gives
 * `['Loaded ', segment, ' skill']`. The sentence stays ONE translation, so each language
 * places the name where its grammar wants it; two fragment keys around the name
 * ("Loaded " + " skill") forced English word order on every language.
 *
 * @param render - Renders the sentence with the given text as the placeholder's value
 *   (the caller's `t()` call).
 * @param segment - The segment that takes the placeholder's place.
 * @returns The segments in order, without empty strings, or `null` when the rendered
 *   sentence does not carry the placeholder exactly once (render the plain text then).
 */
export function cardSegmentsAround(
  render: (slot: string) => string,
  segment: ChatEventCardSegment,
): ChatEventCardSegment[] | null {
  const parts = render(CARD_SEGMENT_SLOT).split(CARD_SEGMENT_SLOT)
  if (parts.length !== 2) return null
  const [before, after] = parts
  return [...(before ? [before] : []), segment, ...(after ? [after] : [])]
}
