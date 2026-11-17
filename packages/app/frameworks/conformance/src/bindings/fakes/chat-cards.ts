/**
 * Binding-case fakes for one area: the app's custom chat cards, which a chat panel renders for a
 * `custom` stream event through `registerCustomEventCard` (`@molecule/app-ide-panel-logic`).
 *
 * A case seeds this area through `context.areas.chatCards`: for each custom event name, what the
 * app's card factory answers. A card (rendered as written), `'data'` (the event's `data` is the
 * card, so one case can show several cards under one name), `'throw'` (the factory throws, as host
 * code reading bad data would) or `null` (the factory renders nothing). An action whose `onClick`
 * is a string gets a click handler that records `chatCards.click` with that string. The factory's
 * own calls are not recorded: a panel may build its cards on every render, and how often it
 * renders is not behaviour another framework can match.
 *
 * Each case registers its own factory for every name it seeds and, after the case, puts back the
 * factory each name had before. The registry cannot remove a factory, so a name that had none keeps
 * one that answers null, which a panel treats exactly as a name nobody registered.
 *
 * @module
 */

import {
  type ChatEventCard,
  type ChatEventCardAction,
  type ChatEventCardFactory,
  type ChatEventCardSegment,
  getCustomEventCardFactory,
  registerCustomEventCard,
} from '@molecule/app-ide-panel-logic'

import type { AreaFakesFactory } from '../spec.js'

/** A card action as a case writes it: `onClick` names the click, recorded as `chatCards.click`. */
export type CaseCardAction = Omit<ChatEventCardAction, 'onClick'> & { readonly onClick?: string }

/** A chat card as a case writes it: its actions take a click name (see {@link CaseCardAction}). */
export type CaseChatCard = Omit<ChatEventCard, 'action' | 'content'> & {
  readonly action?: CaseCardAction | CaseCardAction[]
  readonly content?: (string | { readonly code: string } | CaseCardAction)[]
}

/** What a case can seed for this area (`context.areas.chatCards`): the factory's answer per event name. */
export type ChatCardsSeed = Readonly<Record<string, CaseChatCard | 'data' | 'throw' | null>>

/**
 * Whether an event's `data` is a card a case wrote.
 *
 * @param value - The event data.
 * @returns True when it has the card's text.
 */
function isCaseCard(value: unknown): value is CaseChatCard {
  return (
    typeof value === 'object' && value !== null && 'text' in value && typeof value.text === 'string'
  )
}

/**
 * Turns a case's card into the card the factory returns, with recording click handlers.
 *
 * @param card - The card as the case wrote it.
 * @param record - The case's recorder.
 * @returns The chat card.
 */
function toCard(
  card: CaseChatCard,
  record: (name: string, args: unknown[]) => void,
): ChatEventCard {
  const action = ({ onClick, ...rest }: CaseCardAction): ChatEventCardAction =>
    onClick === undefined ? rest : { ...rest, onClick: () => record('chatCards.click', [onClick]) }
  const segment = (
    part: string | { readonly code: string } | CaseCardAction,
  ): ChatEventCardSegment => (typeof part === 'string' || !('label' in part) ? part : action(part))
  const { action: actions, content, ...rest } = card
  return {
    ...rest,
    ...(actions === undefined
      ? {}
      : { action: Array.isArray(actions) ? actions.map(action) : action(actions) }),
    ...(content === undefined ? {} : { content: content.map(segment) }),
  }
}

/**
 * The factory a case seeds for one event name.
 *
 * @param name - The custom event name.
 * @param seeded - What the case seeded for it.
 * @param record - The case's recorder.
 * @returns The factory.
 */
function factoryFor(
  name: string,
  seeded: ChatCardsSeed[string],
  record: (name: string, args: unknown[]) => void,
): ChatEventCardFactory {
  return (data) => {
    if (seeded === null) return null
    if (seeded === 'throw')
      throw new Error(`conformance: the ${name} card factory threw (as the case asked)`)
    if (seeded !== 'data') return toCard(seeded, record)
    if (!isCaseCard(data))
      throw new Error(`conformance: a ${name} event whose data is the card needs data.text`)
    return toCard(data, record)
  }
}

/**
 * Builds this area's fakes for one case.
 *
 * @param context - The case context (`context.areas?.chatCards` is this area's seed).
 * @param record - Receives each card click.
 * @returns The area's cleanup (nothing else: the panel reads the registry itself).
 */
export const createChatCardsFakes: AreaFakesFactory = (context, record) => {
  const seed = context.areas?.chatCards
  if (!seed) return {}
  const before = Object.keys(seed).map((name) => ({
    name,
    factory: getCustomEventCardFactory(name),
  }))
  for (const [name, seeded] of Object.entries(seed))
    registerCustomEventCard(name, factoryFor(name, seeded, record))
  return {
    dispose: () => {
      for (const { name, factory } of before) registerCustomEventCard(name, factory ?? (() => null))
    },
  }
}
