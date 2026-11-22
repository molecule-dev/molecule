/**
 * Device-frame selector for the preview panel — a themed dropdown menu.
 *
 * Solid counterpart of `@molecule/app-ide-react`'s `DeviceFrameSelector` (see
 * that file for the design notes): the same props (React names), the same DOM
 * for the same input, the same callbacks. The trigger shows the CURRENT
 * frame's icon plus a chevron-down affordance; opening it lists every device
 * frame with its bonded icon + i18n label, then — after a divider — the
 * preview's Rotate (a `menuitemcheckbox` toggle, shown only where relevant)
 * and Open-in-new-tab actions sharing the frame rows' roving focus.
 *
 * Styling uses `getClassMap()` (`cm.*`); the only inline styles are layout the
 * ClassMap can't express, written the way the DOM takes them (Solid, unlike
 * React, does not append `px` to numeric style values, so the pixels spell
 * their unit). All user-facing text goes through `t()`.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { createEffect, createMemo, createSignal, For, onCleanup } from 'solid-js'

import type { IconName } from '@molecule/app-icons'
import type { DeviceFrameSelectorProps } from '@molecule/app-ide-panel-logic'
import { DEVICE_FRAMES, DEVICE_META } from '@molecule/app-ide-panel-logic'
import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { Tooltip } from '@molecule/app-ui-solid'

import { Icon } from './Icon.jsx'

/** One device frame (the shared frame union, read off the panel-logic list). */
type Frame = (typeof DEVICE_FRAMES)[number]

/**
 * Props for {@link DeviceFrameSelector}, extending the shared
 * {@link DeviceFrameSelectorProps} with the in-dropdown action callbacks (P4-04):
 * the device dropdown also hosts the Rotate and Open-in-new-tab controls that
 * used to be separate toolbar buttons.
 */
export interface DeviceFrameSelectorWithActionsProps extends DeviceFrameSelectorProps {
  /** Whether the current frame can be rotated — gates the Rotate item ("when/where relevant"). */
  canRotate?: boolean
  /** Whether the preview is currently rotated to landscape — renders Rotate as a CHECKED toggle. */
  rotated?: boolean
  /** Rotate the current fixed-frame device portrait ⇄ landscape. Omit to hide the Rotate item. */
  onRotate?: () => void
  /** Open the preview URL in a new browser tab. Omit to hide the Open-in-new-tab item. */
  onOpenExternal?: () => void
}

/**
 * A dropdown that selects the preview device frame and hosts the Rotate +
 * Open-in-new-tab actions.
 * @param props - {@link DeviceFrameSelectorWithActionsProps}.
 * @returns The rendered device-frame selector element.
 */
export function DeviceFrameSelector(props: DeviceFrameSelectorWithActionsProps): JSX.Element {
  const { t } = useTranslation()
  const cm = getClassMap()

  const [open, setOpen] = createSignal(false)
  // Index of the menu item with roving focus while the menu is open.
  const [activeIndex, setActiveIndex] = createSignal(0)
  let rootRef: HTMLDivElement | undefined
  let triggerRef: HTMLButtonElement | undefined
  // Filled once per created row by the rows' ref functions (React's `itemRefs`).
  const itemRefs: Array<HTMLButtonElement | undefined> = []

  /**
   * The frame the preview currently shows.
   * @returns The frame.
   */
  const currentIndex = (): number => Math.max(0, DEVICE_FRAMES.indexOf(props.current))

  // Action rows shown below the device frames (P4-04), after a divider: Rotate
  // (only "where relevant" — a rotatable frame AND a wired handler) and Open in
  // new tab (whenever a handler is wired). A memo over the wired handlers and
  // the translated labels, so the rows follow a prop change and a locale switch
  // the way React's render does.
  const actionItems = createMemo<
    ReadonlyArray<{
      id: string
      icon: IconName
      label: string
      run: () => void
      /** When set, the row renders as a `menuitemcheckbox` reflecting this state. */
      checked?: boolean
    }>
  >(() => [
    ...(props.canRotate && props.onRotate
      ? [
          {
            id: 'preview-device-rotate',
            icon: 'rotate' as const,
            label: t('ide.device.rotate', undefined, { defaultValue: 'Rotate' }),
            run: props.onRotate,
            // Rotate is a TOGGLE (portrait ⇄ landscape) — show its state with
            // a check, so it reads as a toggle, not a one-shot action.
            checked: !!props.rotated,
          },
        ]
      : []),
    ...(props.onOpenExternal
      ? [
          {
            id: 'preview-open-external',
            icon: 'link-external' as const,
            label: t('ide.preview.openNewTab', undefined, { defaultValue: 'Open in new tab' }),
            run: props.onOpenExternal,
          },
        ]
      : []),
  ])

  /**
   * The total roving-focus targets: device frames + the conditional action rows.
   * @returns The row count.
   */
  const itemCount = (): number => DEVICE_FRAMES.length + actionItems().length

  /**
   * Closes the menu, returning focus to the trigger unless the close should
   * leave focus where it is (React's `closeMenu(refocus)`).
   * @param refocus - Whether the trigger takes focus back (default `true`).
   */
  const closeMenu = (refocus = true): void => {
    // React batches `setOpen(false)`: its DOM still has the menu when the
    // trigger is focused, so the focus event's relatedTarget is the menu row.
    // Solid flushes synchronously, so focus FIRST to reach the same DOM state.
    if (refocus) triggerRef?.focus()
    setOpen(false)
  }

  /**
   * Opens the menu with roving focus on the given row.
   * @param index - The row the focus starts on.
   */
  const openMenu = (index: number): void => {
    setActiveIndex(index)
    setOpen(true)
  }

  // Close on outside pointer-down (React's `useEffect` on `open`).
  createEffect(() => {
    if (!open()) return
    const onPointerDown = (event: MouseEvent): void => {
      if (rootRef && !rootRef.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    onCleanup(() => document.removeEventListener('mousedown', onPointerDown))
  })

  // Move real DOM focus to the active row whenever the menu opens / moves
  // (React's `useEffect` on `[open, activeIndex]` — Solid effects run after
  // the DOM update, so the row exists by the time it is focused).
  createEffect(() => {
    if (open()) itemRefs[activeIndex()]?.focus()
  })

  /**
   * Selects a frame: fires `onChange` and closes the menu.
   * @param frame - The chosen frame.
   */
  const select = (frame: Frame): void => {
    props.onChange(frame)
    closeMenu()
  }

  /**
   * Runs an action row (Rotate / Open in new tab) then closes the menu.
   * @param run - The action's callback.
   */
  const runAction = (run: () => void): void => {
    run()
    closeMenu()
  }

  /**
   * The trigger's keyboard handling: ArrowDown / Enter / Space open at the
   * current frame, ArrowUp opens at the last row.
   * @param event - The key press.
   */
  const onTriggerKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      openMenu(currentIndex())
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      openMenu(itemCount() - 1)
    }
  }

  /**
   * The menu's keyboard handling: the arrows move the roving focus with
   * wrapping, Home/End jump to the ends, Escape closes (refocusing the
   * trigger) and Tab lets focus leave while the menu collapses.
   * @param event - The key press.
   */
  const onMenuKeyDown = (event: KeyboardEvent): void => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        setActiveIndex((index) => (index + 1) % itemCount())
        break
      case 'ArrowUp':
        event.preventDefault()
        setActiveIndex((index) => (index - 1 + itemCount()) % itemCount())
        break
      case 'Home':
        event.preventDefault()
        setActiveIndex(0)
        break
      case 'End':
        event.preventDefault()
        setActiveIndex(itemCount() - 1)
        break
      case 'Escape':
        event.preventDefault()
        closeMenu()
        break
      case 'Tab':
        // Let focus leave naturally, but collapse the menu.
        setOpen(false)
        break
      default:
        break
    }
  }

  /**
   * The translated label for one frame's menu row (a `t()` call per row, so a
   * locale switch re-renders the menu like React's render does).
   * @param frame - The frame.
   * @returns The translated label.
   */
  const frameLabel = (frame: Frame): string =>
    t(DEVICE_META[frame].labelKey, undefined, { defaultValue: DEVICE_META[frame].label })

  /**
   * One menu row's inline style: the shared icon + label row treatment whose
   * highlight is a theme token (never a hex, never a ClassMap background).
   * The keys are kebab-case: Solid's style handler applies them through the
   * CSSOM's `setProperty`, which takes kebab only (camelCase keys are
   * silently dropped).
   * @param isActive - Whether the row holds the roving focus.
   * @returns The style object.
   */
  const rowStyle = (isActive: boolean): Record<string, string> => ({
    display: 'flex',
    'align-items': 'center',
    gap: '8px',
    width: '100%',
    padding: '6px 8px',
    'text-align': 'left',
    border: 'none',
    'border-radius': '6px',
    color: 'inherit',
    cursor: 'pointer',
    font: 'inherit',
    // Highlight (hover + keyboard) via a theme token — kept inline so it
    // doesn't fight a ClassMap background class.
    background: isActive ? 'var(--mol-color-surface-secondary, transparent)' : 'transparent',
  })

  return (
    <div
      ref={(el) => {
        rootRef = el
      }}
      style={{ position: 'relative', display: 'inline-flex' }}
    >
      <Tooltip
        content={t('ide.device.select', undefined, { defaultValue: 'Device frame' })}
        placement="bottom"
      >
        <button
          ref={(el) => {
            triggerRef = el
          }}
          type="button"
          data-mol-id="preview-device-cycle"
          aria-haspopup="menu"
          aria-expanded={open()}
          aria-label={`${t('ide.device.select', undefined, { defaultValue: 'Device frame' })}: ${t(
            DEVICE_META[props.current].labelKey,
            undefined,
            { defaultValue: DEVICE_META[props.current].label },
          )}`}
          onClick={() => (open() ? closeMenu(false) : openMenu(currentIndex()))}
          onKeyDown={onTriggerKeyDown}
          class={cm.cn(
            cm.button({ variant: 'ghost', size: 'xs' }),
            cm.touchTarget,
            props.className,
          )}
        >
          <Icon name={DEVICE_META[props.current].icon} size={16} aria-hidden="true" />
          {/* kebab here: this style reaches the <svg> through the Icon's own
              spread, whose setProperty path takes kebab keys. */}
          <Icon name="chevron-down" size={12} aria-hidden="true" style={{ 'margin-left': '1px' }} />
        </button>
      </Tooltip>

      {open() && (
        <div
          role="menu"
          aria-label={t('ide.device.select', undefined, { defaultValue: 'Device frame' })}
          // tabindex={-1}: the WAI-ARIA menu pattern keeps focus on the items,
          // but the menu itself must be able to HOLD focus programmatically.
          tabindex={-1}
          onKeyDown={onMenuKeyDown}
          class={cm.cn(cm.surface, cm.borderAll, cm.shadowLifted, cm.textSize('xs'))}
          style={{
            position: 'absolute',
            top: '100%',
            right: '0px',
            'margin-top': '4px',
            'min-width': '168px',
            padding: '4px',
            'border-radius': '8px',
            display: 'flex',
            'flex-direction': 'column',
            gap: '2px',
            'z-index': 30,
          }}
        >
          {/* The rows live in <For>, not a bare .map(): the frame list is
              static, so each row is created ONCE and React's in-place style
              rewrite on a moving highlight (the CSSOM's longhand expansion of
              an overwritten `background`) is what this DOM carries too. */}
          <For each={DEVICE_FRAMES}>
            {(frame, index) => {
              const isActive = (): boolean => index() === activeIndex()
              /* mol-bespoke-button: a menuitemradio ROW inside the device
                 menu — icon + label + check, the menu's own treatment, not a
                 CTA. Its highlight is a theme token and its hit floor is the
                 ClassMap's 36px row floor (the trigger's 44px would double the
                 menu). */
              return (
                <button
                  ref={(node) => {
                    itemRefs[index()] = node
                  }}
                  type="button"
                  role="menuitemradio"
                  aria-checked={frame === props.current}
                  tabindex={isActive() ? 0 : -1}
                  data-mol-id={`preview-device-option-${frame}`}
                  onClick={() => select(frame)}
                  onMouseEnter={() => setActiveIndex(index())}
                  class={cm.touchTargetCompact}
                  style={rowStyle(isActive())}
                >
                  <Icon name={DEVICE_META[frame].icon} size={16} aria-hidden="true" />
                  <span style={{ flex: '1 1 0%' }}>{frameLabel(frame)}</span>
                  {frame === props.current && <Icon name="check" size={14} aria-hidden="true" />}
                </button>
              )
            }}
          </For>

          {/* Divider between the device frames and the action rows (P4-04). A
              thin theme-token line, never a hex. */}
          {actionItems().length > 0 && (
            <div
              role="separator"
              aria-hidden="true"
              data-mol-id="preview-device-menu-separator"
              style={{
                height: '1px',
                margin: '4px 0px',
                background: 'var(--mol-color-border, rgba(128,128,128,0.2))',
              }}
            />
          )}

          {/* Rotate / Open in new tab — the same icon + label row styling as
              the frame options above, but plain `menuitem`s (actions, not
              radio choices). <For> keys the rows by item identity, so a memo
              change rebuilds exactly the row that changed the way React's
              keyed re-render does. */}
          <For each={actionItems()}>
            {(item, actionIdx) => {
              const index = (): number => DEVICE_FRAMES.length + actionIdx()
              const isActive = (): boolean => index() === activeIndex()
              /* mol-bespoke-button: the action ROWS of the same menu —
                 identical row treatment and hit floor to the frame options
                 above, so the menu reads as one list. */
              return (
                <button
                  ref={(node) => {
                    itemRefs[index()] = node
                  }}
                  type="button"
                  role={item.checked !== undefined ? 'menuitemcheckbox' : 'menuitem'}
                  aria-checked={item.checked}
                  tabindex={isActive() ? 0 : -1}
                  data-mol-id={item.id}
                  onClick={() => runAction(item.run)}
                  onMouseEnter={() => setActiveIndex(index())}
                  class={cm.touchTargetCompact}
                  style={rowStyle(isActive())}
                >
                  <Icon name={item.icon} size={16} aria-hidden="true" />
                  <span style={{ flex: '1 1 0%' }}>{item.label}</span>
                  {/* Toggle rows (Rotate) show a check when on — the selected
                      device row's affordance, so it reads as a toggle. */}
                  {item.checked && <Icon name="check" size={14} aria-hidden="true" />}
                </button>
              )
            }}
          </For>
        </div>
      )}
    </div>
  )
}
