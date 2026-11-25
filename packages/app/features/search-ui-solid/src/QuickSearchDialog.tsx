/**
 * Solid quick-search dialog — the counterpart of
 * `@molecule/app-search-ui-react`'s `QuickSearchDialog`.
 *
 * @module
 */

import { type Accessor, type JSX, Show } from 'solid-js'

import type { ClientSearchDocument } from '@molecule/app-client-search'
import { useTranslation } from '@molecule/app-solid'
import { getClassMap, type OverlayTarget } from '@molecule/app-ui'
import { Modal } from '@molecule/app-ui-solid'

import { Kbd } from './Kbd.jsx'
import { SearchBox } from './SearchBox.jsx'
import { SearchResults } from './SearchResults.jsx'
import type { QuickSearchDialogProps } from './types.js'

/**
 * Whether a session field is an accessor (what a `useSearchSession` result
 * holds) rather than a plain value.
 *
 * @param value - The session field.
 * @returns True for an accessor.
 */
const isAccessor = <T,>(value: Accessor<T> | T): value is Accessor<T> => typeof value === 'function'

/**
 * Reads a session field, calling an accessor and passing a plain value
 * through, so the dialog takes a session from `useSearchSession` or a plain
 * object alike.
 *
 * @param value - The session field.
 * @returns The value.
 */
const read = <T,>(value: Accessor<T> | T): T => (isAccessor(value) ? value() : value)

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
export const QuickSearchDialog = <T extends ClientSearchDocument>(
  props: QuickSearchDialogProps<T>,
): JSX.Element => {
  const cm = getClassMap()
  const { t } = useTranslation()
  // React's default parameter: the ids carry the `quick-search` prefix unless overridden.
  const molId = (): string => props.molId ?? 'quick-search'

  const inputTarget: OverlayTarget = {
    get current() {
      return props.session.inputRef.current
    },
  }

  return (
    <Show when={props.open}>
      <Modal
        open={props.open}
        onClose={props.onClose}
        size="lg"
        initialFocus={inputTarget}
        closeOnEscape={false}
        showCloseButton={false}
        closeLabel={t('searchUi.close', undefined, { defaultValue: 'Close' })}
        aria-label={props.label ?? t('searchUi.dialogLabel', undefined, { defaultValue: 'Search' })}
        data-mol-id={molId()}
      >
        <SearchBox
          value={read(props.session.query)}
          onChange={(value: string) => props.session.setQuery(value)}
          onKeyDown={(event: KeyboardEvent) => props.session.onKeyDown(event)}
          inputRef={props.session.inputRef}
          placeholder={props.placeholder}
          count={read(props.session.active) ? read(props.session.hits).length : undefined}
          filters={read(props.session.parsed).filters}
          onRemoveFilter={(index: number) => props.session.removeFilter(index)}
          onClear={() => props.session.clear()}
          examples={props.examples}
          shortcut={null}
          molId={molId()}
        />
        <div class={cm.dialogBody} data-mol-id={`${molId()}-pane`}>
          <SearchResults
            hits={read(props.session.active) ? read(props.session.hits) : []}
            view={props.view}
            activeIndex={read(props.session.activeIndex)}
            onActivate={(index: number) => props.session.setActiveIndex(index)}
            onOpen={(doc: T) => props.session.open(doc)}
            onPrefetch={(doc: T) => props.session.prefetch(doc)}
            renderLink={props.renderLink}
            emptyText={
              read(props.session.active) ? props.emptyText : (props.idleText ?? props.emptyText)
            }
            molId={molId()}
          />
        </div>
        <p class={cm.cn(cm.dialogFooter, cm.resultMeta)} data-mol-id={`${molId()}-keys`}>
          <Kbd>↑</Kbd> <Kbd>↓</Kbd> <Kbd>↵</Kbd> <Kbd>esc</Kbd>{' '}
          {t('searchUi.dialogKeys', undefined, {
            defaultValue:
              'The arrow keys move through the results, Enter opens one, Escape closes.',
          })}
        </p>
      </Modal>
    </Show>
  )
}
