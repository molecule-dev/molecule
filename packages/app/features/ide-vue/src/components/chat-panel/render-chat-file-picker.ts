/**
 * The `@` file picker popup — React's render section "File picker popup".
 *
 * Owned by U13, nested inside the input area. It lists the ranked entries the
 * composer's query leaves visible, marking the active editor file and the open
 * tabs, and a click stages the entry as an attachment and lifts the query out.
 *
 * @module
 */

import { h, type VNodeChild } from 'vue'

import type { ChatCtx } from './context.js'

/**
 * Normalizes a tab path for comparison with the picker's project-relative
 * entries: `/workspace/` is stripped, and a leading slash with it.
 *
 * @param p - The path as the host reported it.
 * @returns The project-relative path.
 */
function normalizeTabPath(p: string): string {
  return p.startsWith('/workspace/')
    ? p.slice('/workspace/'.length)
    : p.startsWith('/')
      ? p.slice(1)
      : p
}

/**
 * Renders the file picker.
 *
 * @param ctx - The panel context (the open picker, its ranked entries, the
 *   active file and open tabs, the ClassMap and the translations).
 * @returns The picker, or `null` while it is closed or has no visible entry.
 */
export function renderChatFilePicker(ctx: ChatCtx): VNodeChild {
  const filePicker = ctx.popups.filePicker.value
  const filteredEntries = ctx.pickers.filteredEntries.value
  if (!filePicker || filteredEntries.length === 0) return null

  const cm = ctx.env.cm
  const t = ctx.env.t
  const activeFile = ctx.props.activeFile
  const openTabs = ctx.props.openTabs

  const activeNorm = activeFile ? normalizeTabPath(activeFile) : null
  const openTabSet = new Set((openTabs ?? []).map(normalizeTabPath))

  return h(
    'div',
    {
      class: cm.cn(cm.surface, cm.borderAll),
      style: {
        position: 'absolute',
        bottom: '100%',
        left: '0px',
        right: '0px',
        marginBottom: '0px',
        borderRadius: '6px 6px 0 0',
        overflow: 'hidden',
        zIndex: '100',
        boxShadow: '0 -4px 16px rgba(0,0,0,0.25)',
        maxHeight: ctx.env.popupMaxHeight.value,
        overflowY: 'auto',
      },
    },
    filteredEntries.map((entry, idx) => {
      const fileName = entry.name.split('/').pop() ?? entry.name
      const dirPath = entry.name.includes('/')
        ? entry.name.slice(0, entry.name.lastIndexOf('/'))
        : ''
      const isActive = activeNorm === entry.name
      const isOpenTab = !isActive && openTabSet.has(entry.name)
      return h(
        'button',
        {
          key: entry.name,
          type: 'button',
          onClick: () => {
            ctx.renderHandlers.stableSelectFileEntry(entry)
          },
          onMouseenter: (event: MouseEvent) => {
            const target = event.currentTarget as HTMLElement | null
            if (target) target.style.background = 'rgba(128,128,128,0.15)'
          },
          onMouseleave: (event: MouseEvent) => {
            const target = event.currentTarget as HTMLElement | null
            if (target) {
              target.style.background =
                idx === filePicker.selectedIdx ? 'rgba(128,128,128,0.1)' : 'transparent'
            }
          },
          class: cm.w('full'),
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            border: 'none',
            borderTop: idx > 0 ? '1px solid rgba(128,128,128,0.12)' : 'none',
            cursor: 'pointer',
            color: 'inherit',
            textAlign: 'left',
            fontSize: '12px',
            background: idx === filePicker.selectedIdx ? 'rgba(128,128,128,0.1)' : 'transparent',
          },
        },
        [
          h('span', { style: { fontFamily: 'monospace', fontWeight: '500' } }, [fileName]),
          dirPath
            ? h(
                'span',
                {
                  class: cm.textMuted,
                  style: { fontSize: '11px', fontFamily: 'monospace', opacity: '0.6' },
                },
                [dirPath],
              )
            : null,
          isActive || isOpenTab
            ? h(
                'span',
                {
                  style: {
                    marginLeft: 'auto',
                    fontSize: '10px',
                    opacity: '0.5',
                    flexShrink: '0',
                  },
                },
                [
                  isActive
                    ? t('ide.chat.activeFile', undefined, { defaultValue: 'active' })
                    : t('ide.chat.openTab', undefined, { defaultValue: 'open' }),
                ],
              )
            : null,
        ],
      )
    }),
  )
}
