/**
 * Modal component.
 *
 * @module
 */

import {
  createEffect,
  createSignal,
  createUniqueId,
  type JSX,
  onCleanup,
  onMount,
  sharedConfig,
  Show,
  splitProps,
} from 'solid-js'
import { isServer } from 'solid-js/web'

import { OverlayLayer } from '@molecule/app-overlay-dom'
import { BodyPortal, PresentWhileNode, useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import type { ModalProps } from '../types.js'
import { reactDomProps, toStyleProps, type WithRef } from '../utilities/dom.js'
import { renderIcon } from '../utilities/renderIcon.jsx'
import { withDisplayName } from './displayName.js'

/**
 * Renders the Modal component.
 *
 * Renders into a `document.body` portal. Every other declared prop (`id`,
 * `title`, `aria-*`, `data-*`, `automationId` as `data-mol-id`, the DOM event
 * handlers) reaches the inner dialog `<div>`; a caller's `role`, `tabIndex` or
 * `aria-labelledby` replaces the default (e.g. `role="alertdialog"`).
 *
 * The internal close button always carries `data-mol-id="modal-close"`
 * as the molecule-convention default for the one fixed interactive
 * element inside the chrome.
 *
 * Implements the WAI-ARIA APG dialog (modal) pattern: on open, focus moves
 * to the first focusable element inside the dialog (or the dialog itself
 * when it has none); Tab/Shift+Tab are trapped inside the dialog; on close,
 * focus returns to whatever was focused before the dialog opened. Stacked
 * dialogs (a confirm above a drawer) each register on the document stack —
 * Escape and the Tab trap only act for the TOPMOST dialog, and the body
 * scroll lock is reference-counted so closing one of several open dialogs
 * never unlocks scroll behind the ones still open.
 *
 * @param props - The component props.
 * @returns The rendered modal JSX.
 */
export const Modal = withDisplayName<
  WithRef<ModalProps & { 'data-mol-id'?: string }, HTMLDivElement>
>((props) => {
  const [local, rest] = splitProps(props, [
    'open',
    'onClose',
    'title',
    'children',
    'size',
    'showCloseButton',
    'closeOnOverlayClick',
    'closeOnEscape',
    'footer',
    'centered',
    'closeLabel',
    'preventScroll',
    'initialFocus',
    'className',
    'style',
    'testId',
  ])

  const cm = getClassMap()
  const { t } = useTranslation()
  const titleId = createUniqueId()
  const [dialog, setDialog] = createSignal<HTMLDivElement | null>(null)
  const layer = new OverlayLayer((focus, transition) => {
    if (transition === 'open') queueMicrotask(focus)
    else focus()
  })
  // The empty anchor is adopted by the mounting document without adding an element.
  const origin = isServer ? undefined : document.createTextNode('')
  const [portalTarget, setPortalTarget] = createSignal<HTMLElement | null>(null)
  // Reuse the server's inline branch during hydration, then move to the portal.
  const [inline, setInline] = createSignal(isServer || !!sharedConfig.context)
  onMount(() => {
    setPortalTarget((dialog()?.ownerDocument ?? origin?.ownerDocument)?.body ?? null)
    setInline(false)
  })

  createEffect(() => {
    layer.sync({
      open: local.open && !inline(),
      kind: 'modal',
      surface: { current: dialog() },
      dismissKey: local.closeOnEscape ?? true,
      dismissBackdrop: local.closeOnOverlayClick ?? true,
      focus: { trap: true, initial: local.initialFocus, restore: 'opener' },
      lockScroll: local.preventScroll ?? true,
      onDismiss: () => local.onClose(),
    })
  })
  onCleanup(() => layer.release())

  const passthrough = (): Record<string, unknown> => reactDomProps(rest)

  // The wrapper is a presentation layer around the dialog: a click on the
  // wrapper itself (the backdrop) closes, and a click that bubbled up from
  // inside the dialog stops here, so it never reaches whatever rendered the
  // modal. Escape closes from the keyboard.
  const handleOverlayClick = (e: MouseEvent & { currentTarget: HTMLDivElement }): void => {
    if (e.target !== e.currentTarget) {
      e.stopPropagation()
      return
    }
    layer.dismissBackdrop()
  }

  /**
   * Forwards the close button's click to `onClose`. The core type declares no
   * parameters, but the reference wires it as the click handler, so it
   * receives the event.
   *
   * @param event - The close button's click event.
   */
  const handleCloseClick = (event: MouseEvent): void => {
    const onClose = local.onClose as (event: MouseEvent) => void
    onClose(event)
  }

  const closeButton = (closeClassName: string): JSX.Element | null =>
    (local.showCloseButton ?? true) ? (
      <button
        type="button"
        onClick={handleCloseClick}
        class={closeClassName}
        data-mol-id="modal-close"
        aria-label={local.closeLabel ?? t('ui.modal.close', undefined, { defaultValue: 'Close' })}
      >
        {renderIcon('x-mark', cm.iconMd)}
      </button>
    ) : null

  // `centered` has no dedicated ClassMap resolver option (dialogWrapper is
  // a fixed token, not a `{ centered }`-parameterized one) — a top-anchored
  // layout is expressed as the one inline-style exception the workspace
  // styling rule allows for values ClassMap genuinely cannot express.
  // Long-term this belongs in UIClassMap (e.g. `dialogWrapper(opts?: {
  // centered?: boolean })`), which needs @molecule/app-ui + the ClassMap
  // bond, both outside this package.
  const wrapperStyle = (): JSX.CSSProperties | undefined =>
    (local.centered ?? true) ? undefined : { 'align-items': 'flex-start' }

  const content = (): JSX.Element => (
    <>
      {/* Overlay background */}
      <div class={cm.dialogOverlay} aria-hidden="true" />

      {/* Centering wrapper */}
      <div
        class={cm.dialogWrapper}
        style={toStyleProps(wrapperStyle())}
        role="presentation"
        onClick={handleOverlayClick}
      >
        {/* Content */}
        <div
          ref={setDialog}
          role="dialog"
          aria-modal="true"
          aria-labelledby={rest['aria-labelledby'] ?? (local.title ? titleId : undefined)}
          tabindex={-1}
          class={cm.cn(cm.modal({ size: local.size ?? 'md' }), local.className)}
          style={toStyleProps(local.style)}
          data-testid={local.testId}
          {...passthrough()}
        >
          {/* With a title the close button shares the header row; without
                one it floats over the top-right corner — a title-less modal
                must not spend a full-width header band on just the X. */}
          <Show when={local.title} fallback={closeButton(cm.dialogCloseFloating)}>
            <div class={cm.dialogHeader}>
              <h2 id={titleId} class={cm.dialogTitle}>
                {local.title}
              </h2>
              {closeButton(cm.dialogClose)}
            </div>
          </Show>

          <div class={cm.dialogBody}>{local.children}</div>

          {/* React's `slot(footer)`: a footer that renders nothing adds no footer bar. */}
          <PresentWhileNode node={local.footer}>
            {(footer) => <div class={cm.dialogFooter}>{footer()}</div>}
          </PresentWhileNode>
        </div>
      </div>
    </>
  )

  return (
    <>
      {origin}
      <Show when={local.open}>
        <Show when={!inline()} fallback={content()}>
          <BodyPortal mount={portalTarget()}>{content()}</BodyPortal>
        </Show>
      </Show>
    </>
  )
}, 'Modal')
