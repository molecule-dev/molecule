/**
 * The IDE shortcut reference and its dialog-scoped keyboard navigation.
 *
 * @module
 */

import { computed, defineComponent, h, type PropType, ref, type VNodeChild, watch } from 'vue'

import type { ShortcutEntry } from '@molecule/app-ide-panel-logic'
import { getClassMap, type OverlayTarget } from '@molecule/app-ui'
import { Modal } from '@molecule/app-ui-vue'
import { useThemeMode, useTranslation } from '@molecule/app-vue'

/**
 * Groups shortcuts by category, preserving insertion order.
 *
 * @param shortcuts - Flat list of shortcut entries.
 * @returns The category → entries pairs, in first-occurrence order (the
 * uncategorized rows' category is `''`).
 */
function groupByCategory(shortcuts: ShortcutEntry[]): Array<[string, ShortcutEntry[]]> {
  const groups = new Map<string, ShortcutEntry[]>()
  for (const entry of shortcuts) {
    const cat = entry.category ?? ''
    const list = groups.get(cat)
    if (list) {
      list.push(entry)
    } else {
      groups.set(cat, [entry])
    }
  }
  return Array.from(groups.entries())
}

/**
 * The badge's inline style for a theme (React's `KeyBadge` `kbd`).
 *
 * @param light - Whether the light theme is active.
 * @returns The style object.
 */
function badgeStyle(light: boolean): Record<string, string> {
  return {
    display: 'inline-block',
    padding: '2px 6px',
    fontSize: '11px',
    fontFamily: 'system-ui, sans-serif',
    lineHeight: '16px',
    borderRadius: '4px',
    border: `1px solid ${light ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)'}`,
    background: light ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)',
    color: 'var(--mol-color-text, currentColor)',
    minWidth: '20px',
    textAlign: 'center',
  }
}

/**
 * Keyboard shortcuts reference panel.
 *
 * @param props - See {@link KeyboardShortcutsPanelProps}.
 * @returns The rendered keyboard shortcuts panel.
 */
export const KeyboardShortcutsPanel = defineComponent({
  name: 'KeyboardShortcutsPanel',
  inheritAttrs: false,
  props: {
    /** List of shortcuts to display. */
    shortcuts: { type: Array as PropType<ShortcutEntry[]>, required: true },
    /** Called when the panel is dismissed. */
    onDismiss: { type: Function as PropType<() => void>, required: true },
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()
    const mode = useThemeMode()
    const dialog = ref<{ $el: HTMLDivElement | null } | null>(null)
    const dialogTarget: OverlayTarget = {
      get current() {
        return dialog.value?.$el ?? null
      },
    }
    const listRef = ref<HTMLDivElement | null>(null)
    const selectedIndex = ref(0)

    // The rows grouped by category, in first-occurrence order
    const groups = computed(() => {
      let start = 0
      return groupByCategory(props.shortcuts).map(([category, entries]) => {
        const group = { category, entries, start }
        start += entries.length
        return group
      })
    })

    // Flat list for keyboard navigation indexing
    const flatEntries = computed(() => groups.value.flatMap(({ entries }) => entries))

    // Scroll selected item into view
    watch(selectedIndex, () => {
      const buttons = listRef.value?.querySelectorAll('[data-shortcut-row]')
      const el = buttons?.[selectedIndex.value] as HTMLElement | undefined
      el?.scrollIntoView({ block: 'nearest' })
    })

    /**
     * The keyboard navigation: the arrows move the highlight over the flat
     * row order (clamped), Enter runs the highlighted row when it has a
     * handler. The dialog owns Escape.
     *
     * @param e - The key press.
     */
    function handleKeyDown(e: KeyboardEvent): void {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          selectedIndex.value = Math.min(selectedIndex.value + 1, flatEntries.value.length - 1)
          break
        case 'ArrowUp':
          e.preventDefault()
          selectedIndex.value = Math.max(selectedIndex.value - 1, 0)
          break
        case 'Enter': {
          e.preventDefault()
          const entry = flatEntries.value[selectedIndex.value]
          if (entry?.execute) {
            entry.execute()
            props.onDismiss()
          }
          break
        }
      }
    }

    /** The close ✕'s static style; hover tints it through the DOM, not here. */
    const closeStyle = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '18px',
      height: '18px',
      borderRadius: '4px',
      border: 'none',
      background: 'transparent',
      color: 'inherit',
      cursor: 'pointer',
      opacity: '0.6',
      transition: 'opacity 100ms, background 100ms',
    }

    /** The key-badge list's style (a flex row of badges after the label). */
    const keysStyle = {
      display: 'flex',
      gap: '4px',
      flexShrink: '0',
      marginLeft: '16px',
    }

    return (): VNodeChild => {
      const light = mode.value === 'light'
      // The selected-row tint follows the theme primary (so a rebranded app
      // tints its own picker), never a literal blue; the hex is only the
      // CSS-var fallback.
      const selectedBg = light
        ? 'color-mix(in srgb, var(--mol-color-primary, #4070e0) 12%, transparent)'
        : 'color-mix(in srgb, var(--mol-color-primary, #4070e0) 25%, transparent)'
      return h(
        Modal,
        {
          open: true,
          onClose: props.onDismiss,
          ref: dialog,
          initialFocus: dialogTarget,
          onKeyDown: handleKeyDown,
          showCloseButton: false,
          'aria-label': t('ide.shortcuts.title', undefined, { defaultValue: 'Keyboard Shortcuts' }),
          style: { maxHeight: '70vh' },
        },
        {
          default: () => [
            // Header
            h(
              'div',
              {
                style: {
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px 10px',
                  borderBottom: '1px solid var(--color-border, #333)',
                  flexShrink: '0',
                },
              },
              [
                h('span', { style: { fontSize: '14px', fontWeight: 600 } }, [
                  t('ide.shortcuts.title', undefined, { defaultValue: 'Keyboard Shortcuts' }),
                ]),
                // mol-bespoke-button: icon-only ✕ panel dismiss — the IDE's one
                // dismiss mark (same SVG, same 4px-radius square box, same hover
                // scrim as the tab close and the chat-card dismisses), on the full
                // 44px coarse floor DESIGN.md reserves for icon-only ✕ dismisses.
                // It was a bare text × with no label and no hit floor.
                h(
                  'button',
                  {
                    type: 'button',
                    'data-mol-id': 'shortcuts-close',
                    onClick: props.onDismiss,
                    'aria-label': t('ide.shortcuts.close', undefined, { defaultValue: 'Close' }),
                    title: t('ide.shortcuts.close', undefined, { defaultValue: 'Close' }),
                    class: cm.cn(cm.touchTarget, cm.shrink0),
                    style: closeStyle,
                    onMouseenter: (e: MouseEvent) => {
                      const el = e.currentTarget as HTMLElement
                      el.style.opacity = '1'
                      el.style.background = 'rgba(128,128,128,0.2)'
                    },
                    onMouseleave: (e: MouseEvent) => {
                      const el = e.currentTarget as HTMLElement
                      el.style.opacity = '0.6'
                      el.style.background = 'transparent'
                    },
                  },
                  [
                    h(
                      'svg',
                      {
                        width: 11,
                        height: 11,
                        viewBox: '0 0 16 16',
                        fill: 'none',
                        'aria-hidden': 'true',
                      },
                      [
                        h('path', {
                          d: 'M3 3l10 10M13 3L3 13',
                          stroke: 'currentColor',
                          'stroke-width': 1.6,
                          'stroke-linecap': 'round',
                        }),
                      ],
                    ),
                  ],
                ),
              ],
            ),
            // Shortcut list
            h(
              'div',
              {
                ref: listRef,
                style: { flex: '1', overflow: 'auto', padding: '8px 0px' },
              },
              groups.value.map(({ category, entries, start }) =>
                h('div', { key: category }, [
                  ...(category
                    ? [
                        h(
                          'div',
                          {
                            style: {
                              padding: '8px 16px 4px',
                              fontSize: '11px',
                              fontWeight: 600,
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              color: 'var(--mol-color-text-secondary, #888)',
                            },
                          },
                          [category],
                        ),
                      ]
                    : []),
                  ...entries.map((entry, index) => {
                    const idx = start + index
                    return h(
                      'button',
                      {
                        key: entry.label,
                        type: 'button',
                        'data-shortcut-row': 'true',
                        'data-mol-id': `shortcut-row-${String(idx)}`,
                        onClick: () => {
                          if (entry.execute) {
                            entry.execute()
                            props.onDismiss()
                          }
                        },
                        onMouseenter: () => {
                          selectedIndex.value = idx
                        },
                        class: cm.touchTargetCompact,
                        /* mol-bespoke-button: a shortcut-list ROW (label + key
                         badges) with keyboard-driven selection — a list item, not
                         a CTA. Its selected tint is a theme token and its 36px
                         coarse floor comes from the ClassMap. */
                        style: {
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '6px 16px',
                          fontSize: '13px',
                          width: '100%',
                          border: 'none',
                          background: idx === selectedIndex.value ? selectedBg : 'transparent',
                          color: 'var(--mol-color-text, currentColor)',
                          cursor: entry.execute ? 'pointer' : 'default',
                          textAlign: 'left',
                          borderRadius: '0px',
                        },
                      },
                      [
                        h('span', null, [entry.label]),
                        h('span', { style: keysStyle }, [
                          ...entry.keys
                            .split(' ')
                            .map((part, i) =>
                              h('kbd', { key: i, style: badgeStyle(light) }, [part]),
                            ),
                        ]),
                      ],
                    )
                  }),
                ]),
              ),
            ),
            // Footer hint
            h(
              'div',
              {
                style: {
                  padding: '8px 16px',
                  borderTop: '1px solid var(--color-border, #333)',
                  fontSize: '11px',
                  color: 'var(--mol-color-text-secondary, #888)',
                  textAlign: 'center',
                  flexShrink: '0',
                },
              },
              [
                t('ide.shortcuts.hint', undefined, {
                  defaultValue: 'Arrow keys to navigate · Enter to run · Esc to close',
                }),
              ],
            ),
          ],
        },
      )
    }
  },
})
