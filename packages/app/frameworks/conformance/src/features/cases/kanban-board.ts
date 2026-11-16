/**
 * `@molecule/app-kanban-board-react` cases: the board, its columns, each column
 * header and each card — the ClassMap frame, the card count, the accent that is
 * cosmetic only, the node-valued title / body / footer / actions, the
 * `className` pass-through, every callback (`onCardClick`, `onCardMove`,
 * `onDrop`, `onCardDragStart`, `onDragStart`), and the HTML5 drag-drop path
 * between columns (drag start writes the payload, a drop on another column
 * reports the move, a drop on the source column or a malformed payload does
 * nothing).
 *
 * Selectors avoid the harness's own unwrap container: a card's drag wrapper is
 * `div[draggable]` and its clickable `Card` div is its first div child; a
 * column section is selected through a `data-col` marker rendered in a card
 * body (`section:has([data-col="…"])`), so no case depends on how deep a
 * framework mounts the root.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/**
 * One card, with its title the way React's own suite builds it.
 *
 * @param id - Card id.
 * @param over - Extra card fields.
 * @returns The card data.
 */
const card = (id: string, over: Record<string, unknown> = {}): Record<string, unknown> => ({
  id,
  title: `title-${id}`,
  ...over,
})

/**
 * One column, with its title the way React's own suite builds it.
 *
 * @param id - Column id.
 * @param cards - The column's cards.
 * @param over - Extra column fields.
 * @returns The column data.
 */
const column = (
  id: string,
  cards: unknown[] = [],
  over: Record<string, unknown> = {},
): Record<string, unknown> => ({ id, title: `col-${id}`, cards, ...over })

/** A card body marking the column it sits in, for `section:has(…)` selection. */
const marker = (id: string): Record<string, unknown> => ({
  $nodes: [{ tag: 'span', attrs: { 'data-col': id } }],
})

/**
 * A card whose body marks its column.
 *
 * @param id - Card id.
 * @param col - The column id the marker names.
 * @param over - Extra card fields.
 * @returns The card data.
 */
const markedCard = (
  id: string,
  col: string,
  over: Record<string, unknown> = {},
): Record<string, unknown> => card(id, { body: marker(col), ...over })

/** The section of the column whose card body carries this marker. */
const colSection = (id: string): string => `section:has([data-col="${id}"])`

/** A draggable card's wrapper div. */
const dragWrapper = 'div[draggable]'

/** The clickable `Card` div inside a draggable card's wrapper. */
const cardBody = 'div[draggable] > div'

/**
 * Starts a drag of a card, letting the component's own handler write the
 * payload (a step with no data reuses what the handler wrote on the drop).
 *
 * @param selector - The element that starts the drag.
 * @returns The transfer step.
 */
const dragStart = (
  selector: string,
): { type: 'transfer'; selector: string; event: 'dragstart' } => ({
  type: 'transfer',
  selector,
  event: 'dragstart',
})

/**
 * A transfer step carrying an explicit payload.
 *
 * @param selector - The element the event is dispatched on.
 * @param event - The drag event.
 * @param data - The payload entries.
 * @returns The transfer step.
 */
const transfer = (
  selector: string,
  event: 'dragover' | 'drop',
  data?: Record<string, string>,
): {
  type: 'transfer'
  selector: string
  event: 'dragover' | 'drop'
  data?: Record<string, string>
} => (data ? { type: 'transfer', selector, event, data } : { type: 'transfer', selector, event })

/** A board of three columns: two with cards, one empty. */
const board = [
  column('todo', [markedCard('a', 'todo')]),
  column('doing', [markedCard('b', 'doing')]),
  column('done', []),
]

/** A two-column board, for moves. */
const twoColumns = [
  column('todo', [markedCard('a', 'todo')]),
  column('doing', [markedCard('b', 'doing')]),
]

/** `@molecule/app-kanban-board-react`. */
export const kanbanBoardFeature: FeatureCases = {
  package: '@molecule/app-kanban-board-react',
  families: [
    {
      component: 'KanbanBoard',
      cases: [
        { name: 'columns with cards and an empty column', props: { columns: board } },
        { name: 'no columns', props: { columns: [] } },
        {
          name: 'a column accent is cosmetic',
          props: {
            columns: [
              column('todo', [card('a')], { accent: 'primary' }),
              column('done', [], { accent: 'success' }),
            ],
          },
        },
        {
          name: 'className passthrough and change',
          props: { columns: board, className: 'parity-token' },
          interactions: [
            { type: 'props', props: { className: 'parity-other' } },
            { type: 'props', props: { className: undefined } },
          ],
        },
        {
          name: 'header actions and footers per column',
          props: {
            columns: board,
            renderHeaderActions: {
              $fn: 'renderHeaderActions',
              nodes: [{ tag: 'button', attrs: { 'data-hdr': '{0.id}' }, children: ['+'] }],
            },
            renderFooter: {
              $fn: 'renderFooter',
              nodes: [{ tag: 'div', attrs: { 'data-foot': '{0.id}' }, children: ['Add'] }],
            },
          },
        },
        {
          name: 'clicking a card calls onCardClick',
          props: { columns: [column('todo', [card('a')]), column('doing', [card('b')])] },
          callbacks: ['onCardClick'],
          interactions: [{ type: 'click', selector: cardBody }],
        },
        {
          name: 'moving a card to another column calls onCardMove',
          props: { columns: twoColumns },
          callbacks: ['onCardMove'],
          interactions: [
            dragStart(dragWrapper),
            transfer(colSection('doing'), 'dragover'),
            transfer(colSection('doing'), 'drop'),
          ],
        },
        {
          name: 'a drop on the source column does nothing',
          props: { columns: twoColumns },
          callbacks: ['onCardMove'],
          interactions: [
            dragStart(dragWrapper),
            transfer(colSection('todo'), 'dragover'),
            transfer(colSection('todo'), 'drop'),
          ],
        },
        {
          name: 'a drop payload from another column moves the card',
          props: { columns: twoColumns },
          callbacks: ['onCardMove'],
          interactions: [
            transfer(colSection('todo'), 'drop', {
              'text/molecule-kanban': JSON.stringify({ cardId: 'b', fromColumnId: 'doing' }),
            }),
          ],
        },
        {
          name: 'a malformed payload is ignored',
          props: { columns: twoColumns },
          callbacks: ['onCardMove'],
          interactions: [
            transfer(colSection('doing'), 'drop', { 'text/molecule-kanban': 'not-json' }),
          ],
        },
        {
          name: 'a drop with no payload is ignored',
          props: { columns: twoColumns },
          callbacks: ['onCardMove'],
          interactions: [transfer(colSection('doing'), 'drop', {})],
        },
        {
          name: 'without onCardMove a drop is ignored',
          props: { columns: twoColumns },
          interactions: [
            dragStart(dragWrapper),
            transfer(colSection('doing'), 'dragover'),
            transfer(colSection('doing'), 'drop'),
          ],
        },
        {
          name: 'a dragover is prevented when a move can happen',
          props: { columns: twoColumns },
          callbacks: ['onCardMove'],
          interactions: [transfer(colSection('doing'), 'dragover')],
        },
        {
          name: 'the columns change',
          props: { columns: board },
          interactions: [
            {
              type: 'props',
              props: {
                columns: [column('later', [card('x')]), column('blocked', [], { accent: 'error' })],
              },
            },
          ],
        },
      ],
    },
    {
      component: 'KanbanCard',
      cases: [
        { name: 'title only', props: { card: card('a') } },
        {
          name: 'body and footer',
          props: {
            card: card('a', {
              body: 'Body copy',
              footer: { $nodes: [{ tag: 'span', attrs: { 'data-foot': '' }, children: ['Ava'] }] },
            }),
          },
        },
        {
          name: 'title as a node',
          props: {
            card: {
              id: 'n',
              title: {
                $nodes: [{ tag: 'strong', attrs: { 'data-title': '' }, children: ['Bold'] }],
              },
            },
          },
        },
        {
          name: 'className passthrough',
          props: { card: card('a'), className: 'parity-token' },
        },
        {
          name: 'a drag start wraps the card in a draggable div',
          props: { card: card('a') },
          callbacks: ['onDragStart'],
          interactions: [dragStart(dragWrapper)],
        },
        {
          name: 'a click calls the card handler',
          props: { card: card('a') },
          callbacks: ['onClick', 'onDragStart'],
          interactions: [{ type: 'click', selector: cardBody }],
        },
        {
          name: 'the card content changes',
          props: { card: card('a', { body: 'First' }) },
          interactions: [
            { type: 'props', props: { card: card('b', { body: 'Second' }) } },
            { type: 'props', props: { card: { id: 'c', title: 'Third' } } },
          ],
        },
      ],
    },
    {
      component: 'KanbanColumn',
      cases: [
        { name: 'an empty column', props: { column: column('x') } },
        {
          name: 'cards in the column',
          props: { column: column('x', [card('a'), card('b', { body: 'Body b' })]) },
        },
        {
          name: 'header actions and footer slots',
          props: { column: column('x', [card('a')]) },
          slots: {
            headerActions: [{ tag: 'button', attrs: { 'data-act': '' }, children: ['+'] }],
            footer: [{ tag: 'div', attrs: { 'data-foot': '' }, children: ['Add card'] }],
          },
        },
        {
          name: 'a click on a card reports the card and column',
          props: { column: column('x', [card('a')]) },
          callbacks: ['onCardClick', 'onCardDragStart'],
          interactions: [{ type: 'click', selector: cardBody }],
        },
        {
          name: 'a card drag start reports the card and column',
          props: { column: column('x', [card('a')]) },
          callbacks: ['onCardDragStart'],
          interactions: [dragStart(dragWrapper)],
        },
        {
          name: 'a drop reports the column',
          props: { column: column('x', [card('a')]) },
          callbacks: ['onDrop'],
          interactions: [
            transfer('section', 'dragover'),
            transfer('section', 'drop', { 'text/molecule-kanban': '{"cardId":"a"}' }),
          ],
        },
        {
          name: 'className passthrough',
          props: { column: column('x'), className: 'parity-token' },
        },
        {
          name: 'the cards change',
          props: { column: column('x', [card('a')]) },
          interactions: [
            { type: 'props', props: { column: column('x', [card('b'), card('c'), card('d')]) } },
            { type: 'props', props: { column: column('x') } },
          ],
        },
      ],
    },
    {
      component: 'KanbanColumnHeader',
      cases: [
        { name: 'title only', props: { title: 'To do' } },
        { name: 'a title and a count', props: { title: 'To do', count: 2 } },
        { name: 'a zero count is shown', props: { title: 'To do', count: 0 } },
        {
          name: 'actions slot',
          props: { title: 'To do' },
          slots: {
            actions: [{ tag: 'button', attrs: { 'data-act': '' }, children: ['+'] }],
          },
        },
        {
          name: 'title as a node',
          slots: { title: [{ tag: 'strong', attrs: { 'data-title': '' }, children: ['Bold'] }] },
        },
        {
          name: 'className passthrough and change',
          props: { title: 'T', className: 'parity-token' },
          interactions: [
            { type: 'props', props: { className: 'parity-other' } },
            { type: 'props', props: { className: undefined } },
          ],
        },
      ],
    },
  ],
}
