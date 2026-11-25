import type { ReactNode, RefObject } from 'react'

import type { ClientSearchDocument } from '@molecule/app-client-search'
import type { SearchSession } from '@molecule/app-client-search-react'
import { useTranslation } from '@molecule/app-react'
import { type ElementHandle, getClassMap, type KeyboardEventHandler } from '@molecule/app-ui'
import { Modal } from '@molecule/app-ui-react'
import { ScrollArea, Text } from '@molecule/app-ui-react/elements'

import { Kbd } from './Kbd.js'
import { SearchBox } from './SearchBox.js'
import type { SearchResultLinkProps, SearchResultView } from './SearchResults.js'
import { SearchResults } from './SearchResults.js'

/** The search operations and input bindings used by the dialog. */
type QuickSearchSession<T extends ClientSearchDocument> = Pick<
  SearchSession<T>,
  | 'active'
  | 'activeIndex'
  | 'clear'
  | 'hits'
  | 'open'
  | 'parsed'
  | 'prefetch'
  | 'query'
  | 'removeFilter'
  | 'setActiveIndex'
  | 'setQuery'
> & {
  /** Receives the dialog's input handle on either renderer. */
  inputRef: RefObject<ElementHandle | null>
  /** Handles the input's portable key events. */
  onKeyDown: KeyboardEventHandler
}

/** Props for {@link QuickSearchDialog}. */
export interface QuickSearchDialogProps<T extends ClientSearchDocument> {
  /** Whether the dialog is open. Rendered only while open. */
  open: boolean
  /** Close it (Escape with nothing typed, the overlay, or after opening a hit). */
  onClose: () => void
  /** The search session (from `useSearchSession`), created with `syncUrl: false` and `onEscape: onClose`. */
  session: QuickSearchSession<T>
  /** How a hit renders. */
  view: (doc: T) => SearchResultView
  /** Placeholder for the box, already translated. */
  placeholder: string
  /** Example tokens for the tips line. */
  examples?: string[]
  /** Shown while the text matches nothing, already translated. */
  emptyText: string
  /** Shown before anything is typed, already translated. Defaults to the empty text. */
  idleText?: string
  /** Renders each row's link (a router link keeps navigation client-side). */
  renderLink?: (props: SearchResultLinkProps) => ReactNode
  /**
   * The dialog's accessible name, already translated (like `placeholder`, it
   * names nothing visible). Defaults to `t('searchUi.dialogLabel')`
   * ("Search"); the field's placeholder already names the field.
   */
  label?: string
  /** `data-mol-id` prefix. Defaults to `quick-search`. */
  molId?: string
}

/**
 * A search dialog for `mod+k`: the box on top with focus, the hits below in
 * a scrolling pane, and the key hints in the footer. Before anything is
 * typed the pane shows `idleText` rather than a browse list. Enter opens the active
 * hit through the session (which closes the dialog by the caller's `onOpen`).
 * The dialog is named for screen readers through `label` (or the translated
 * "Search" default).
 *
 * @param props - See {@link QuickSearchDialogProps}.
 * @returns The dialog, or nothing while closed.
 */
export function QuickSearchDialog<T extends ClientSearchDocument>({
  open,
  onClose,
  session,
  view,
  placeholder,
  examples,
  emptyText,
  idleText,
  renderLink,
  label,
  molId = 'quick-search',
}: QuickSearchDialogProps<T>): React.JSX.Element | null {
  const cm = getClassMap()
  const { t } = useTranslation()

  if (!open) return null
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      initialFocus={session.inputRef}
      closeOnEscape={false}
      showCloseButton={false}
      closeLabel={t('searchUi.close', undefined, { defaultValue: 'Close' })}
      aria-label={label ?? t('searchUi.dialogLabel', undefined, { defaultValue: 'Search' })}
      data-mol-id={molId}
    >
      <SearchBox
        value={session.query}
        onChange={session.setQuery}
        onKeyDown={session.onKeyDown}
        inputRef={session.inputRef}
        placeholder={placeholder}
        count={session.active ? session.hits.length : undefined}
        filters={session.parsed.filters}
        onRemoveFilter={session.removeFilter}
        onClear={session.clear}
        examples={examples}
        shortcut={null}
        molId={molId}
      />
      <ScrollArea as="div" className={cm.dialogBody} data-mol-id={`${molId}-pane`}>
        <SearchResults
          hits={session.active ? session.hits : []}
          view={view}
          activeIndex={session.activeIndex}
          onActivate={session.setActiveIndex}
          onOpen={session.open}
          onPrefetch={session.prefetch}
          renderLink={renderLink}
          emptyText={session.active ? emptyText : (idleText ?? emptyText)}
          molId={molId}
        />
      </ScrollArea>
      <Text as="p" className={cm.cn(cm.dialogFooter, cm.resultMeta)} data-mol-id={`${molId}-keys`}>
        <Kbd>↑</Kbd> <Kbd>↓</Kbd> <Kbd>↵</Kbd> <Kbd>esc</Kbd>{' '}
        {t('searchUi.dialogKeys', undefined, {
          defaultValue: 'The arrow keys move through the results, Enter opens one, Escape closes.',
        })}
      </Text>
    </Modal>
  )
}
