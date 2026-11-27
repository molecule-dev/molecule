import { type ReactElement, useCallback, useLayoutEffect, useMemo, useRef } from 'react'
import {
  AccessibilityInfo,
  FlatList,
  Modal,
  Pressable as NativePressable,
  StyleSheet,
  Text as NativeText,
  useWindowDimensions,
  View,
  type ViewStyle,
} from 'react-native'

import { useTranslation } from '@molecule/app-react'
import { getClassMap, type InteractionProps, type KitKeyboardEvent } from '@molecule/app-ui'

import { splitClasses } from './inherited.js'
import { RANGE_DIRECTIONAL_KEYS } from './rangeKeyboard.js'
import { SelectAction, type SelectActionHandle } from './SelectAction.js'
import type { SelectChoice, SelectRow } from './selectOptions.js'

const LOCK_MODAL_KEYS = RANGE_DIRECTIONAL_KEYS | 0b110000

interface SelectMenuProps extends Pick<InteractionProps, 'onKeyDown' | 'onKeyUp'> {
  visible: boolean
  keyboard: boolean
  name: string
  multiple: boolean
  rows: readonly SelectRow[]
  choices: readonly SelectChoice[]
  selected: readonly SelectChoice[]
  choose: (choice: SelectChoice) => void
  dismiss: () => void
  onDismiss: () => void
}

/** The native modal owns focus while open, including focus requests for rows outside the window. */
export function SelectMenu({
  visible,
  keyboard,
  name,
  multiple,
  rows,
  choices,
  selected,
  choose,
  dismiss,
  onDismiss,
  onKeyDown,
  onKeyUp,
}: SelectMenuProps): ReactElement {
  const { t } = useTranslation()
  const cm = getClassMap()
  const { height, fontScale } = useWindowDimensions()
  const rowHeight = Math.ceil(Math.max(48, 40 * fontScale + 8))
  const list = useRef<FlatList<SelectRow>>(null)
  const actions = useRef(new Map<string, SelectActionHandle>())
  const close = useRef<SelectActionHandle>(null)
  const pending = useRef<{ key?: string; announce: boolean } | null>(null)
  const scheduled = useRef<number | null>(null)
  const mounted = useRef(true)
  const enabled = useMemo(() => choices.filter((choice) => !choice.option.disabled), [choices])
  const initial = selected.find((choice) => !choice.option.disabled) ?? enabled[0]
  const selection = new Set(selected.map((choice) => choice.key))

  const cancelFocus = (): void => {
    if (scheduled.current !== null) cancelAnimationFrame(scheduled.current)
    scheduled.current = null
    pending.current = null
  }
  useLayoutEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      cancelFocus()
    }
  }, [])
  useLayoutEffect(() => {
    if (!visible) cancelFocus()
  }, [visible])

  const scheduleFocus = useCallback(() => {
    if (scheduled.current !== null || !pending.current) return
    scheduled.current = requestAnimationFrame(() => {
      scheduled.current = null
      const next = pending.current
      if (!mounted.current || !next) return
      const action = next.key === undefined ? close.current : actions.current.get(next.key)
      if (!action) return
      pending.current = null
      action.focus(next.announce)
    })
  }, [])
  const focus = useCallback(
    (choice: SelectChoice | undefined, announce: boolean): void => {
      pending.current = { key: choice?.key, announce }
      if (choice) list.current?.scrollToIndex({ index: choice.listIndex, animated: false })
      scheduleFocus()
    },
    [scheduleFocus],
  )
  useLayoutEffect(() => {
    const key = pending.current?.key
    if (visible && key !== undefined && !enabled.some((choice) => choice.key === key))
      focus(initial, true)
  }, [visible, enabled, initial, focus])

  const navigate = (event: KitKeyboardEvent, current?: SelectChoice): void => {
    if (event.key === 'Escape') {
      dismiss()
      return
    }
    const index = enabled.findIndex((choice) => choice.key === current?.key)
    if (event.key === 'Tab') {
      const size = enabled.length + 1
      const slot = index === -1 ? enabled.length : index
      focus(enabled[(slot + (event.shiftKey ? -1 : 1) + size) % size], false)
    } else if (enabled.length > 0) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowRight')
        focus(enabled[(index + 1) % enabled.length], false)
      if (event.key === 'ArrowUp' || event.key === 'ArrowLeft')
        focus(enabled[index <= 0 ? enabled.length - 1 : index - 1], false)
      if (event.key === 'Home') focus(enabled[0], false)
      if (event.key === 'End') focus(enabled[enabled.length - 1], false)
    }
  }

  const closeLabel = multiple
    ? t('common.done', undefined, { defaultValue: 'Done' })
    : t('common.close', undefined, { defaultValue: 'Close' })
  const listHeight = Math.min(
    rows.length * rowHeight,
    Math.max(rowHeight, height / 2 - rowHeight * 2),
  )
  const closeClasses = splitClasses(cm.dropdownItem, '')
  return (
    <Modal
      visible={visible}
      transparent
      onRequestClose={dismiss}
      onDismiss={onDismiss}
      onShow={() => {
        if (!visible || !mounted.current) return
        AccessibilityInfo.announceForAccessibility(
          t('ui.select.expanded', undefined, { defaultValue: 'Options menu opened' }),
        )
        focus(initial, true)
      }}
    >
      {visible && (
        <View style={StyleSheet.absoluteFill}>
          <NativePressable
            className={cm.dialogOverlay}
            style={StyleSheet.absoluteFill}
            onPress={dismiss}
            accessible={false}
            focusable={false}
            importantForAccessibility="no-hide-descendants"
          />
          <View
            className={cm.actionSheet}
            style={SHEET_STYLE}
            role="dialog"
            accessibilityViewIsModal
            onAccessibilityEscape={dismiss}
          >
            <View className={cm.actionSheetHeader}>
              <NativeText className={cm.dialogTitle} role="heading">
                {name}
              </NativeText>
            </View>
            <FlatList
              ref={list}
              data={rows}
              style={{ height: listHeight, flexGrow: 0 }}
              initialScrollIndex={initial?.listIndex}
              getItemLayout={(_data, index) => ({
                index,
                length: rowHeight,
                offset: rowHeight * index,
              })}
              keyExtractor={(item) => item.key}
              renderItem={({ item }) => {
                if ('heading' in item) {
                  return (
                    <View style={{ height: rowHeight, justifyContent: 'center' }}>
                      <NativeText className={cm.textMuted} role="heading" numberOfLines={2}>
                        {item.heading}
                      </NativeText>
                    </View>
                  )
                }
                const marked = selection.has(item.key)
                const { label, disabled } = item.option
                const classes = splitClasses(
                  cm.cn(
                    cm.dropdownItem,
                    marked && cm.textPrimary,
                    disabled && cm.dropdownItemDisabled,
                  ),
                  '',
                )
                return (
                  <SelectAction
                    ref={(action) => {
                      if (action) {
                        actions.current.set(item.key, action)
                        if (pending.current?.key === item.key) scheduleFocus()
                      } else actions.current.delete(item.key)
                    }}
                    style={{ height: rowHeight, justifyContent: 'center' }}
                    className={classes.view || undefined}
                    role="option"
                    aria-label={label}
                    aria-selected={marked}
                    aria-disabled={disabled ?? false}
                    keyboard={keyboard}
                    lockFocus={LOCK_MODAL_KEYS}
                    disabled={disabled}
                    onActivate={() => choose(item)}
                    onHardwareKeyDown={onKeyDown}
                    onHardwareKeyUp={onKeyUp}
                    onNavigate={(event) => navigate(event, item)}
                  >
                    <NativeText
                      accessible={false}
                      importantForAccessibility="no"
                      className={classes.text || undefined}
                      numberOfLines={2}
                    >
                      {label}
                    </NativeText>
                  </SelectAction>
                )
              }}
            />
            <SelectAction
              ref={close}
              className={closeClasses.view || undefined}
              style={{ minHeight: rowHeight, justifyContent: 'center' }}
              role="button"
              aria-label={closeLabel}
              keyboard={keyboard}
              lockFocus={LOCK_MODAL_KEYS}
              onActivate={dismiss}
              onHardwareKeyDown={onKeyDown}
              onHardwareKeyUp={onKeyUp}
              onNavigate={(event) => navigate(event)}
            >
              <NativeText
                accessible={false}
                importantForAccessibility="no"
                className={closeClasses.text || undefined}
              >
                {closeLabel}
              </NativeText>
            </SelectAction>
          </View>
        </View>
      )}
    </Modal>
  )
}

const SHEET_STYLE: ViewStyle = { position: 'absolute', bottom: 0, left: 0, right: 0 }
