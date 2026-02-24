/**
 * Live preview panel with iframe and device frame selection.
 *
 * @module
 */

import type { JSX } from 'react'

import { t } from '@molecule/app-i18n'
import { usePreview } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { PreviewPanelProps } from '../types.js'
import { DeviceFrameSelector } from './DeviceFrameSelector.js'

const deviceWidths: Record<string, string> = {
  none: '100%',
  desktop: '100%',
  tablet: '768px',
  mobile: '375px',
}

/**
 * Live preview panel with iframe, device frame selector, and URL bar.
 * @param root0 - The component props.
 * @param root0.className - Optional CSS class name for the container.
 * @returns The rendered preview panel element.
 */
export function PreviewPanel({ className }: PreviewPanelProps): JSX.Element {
  const cm = getClassMap()
  const { state, setUrl, refresh, setDevice, openExternal } = usePreview()

  const iframeWidth = deviceWidths[state.device] || '100%'

  return (
    <div className={cm.cn(cm.flex({ direction: 'col' }), cm.h('full'), cm.surface, className)}>
      {/* Header */}
      <div
        className={cm.cn(
          cm.flex({ direction: 'row', align: 'center', justify: 'between' }),
          cm.sp('px', 3),
          cm.sp('py', 2),
          cm.shrink0,
          cm.borderB,
        )}
      >
        <span className={cm.cn(cm.fontWeight('medium'), cm.textSize('sm'))}>
          {t('ide.preview.title')}
        </span>
        <div className={cm.flex({ direction: 'row', align: 'center', gap: 'sm' })}>
          <DeviceFrameSelector current={state.device} onChange={setDevice} />
          <button
            type="button"
            onClick={refresh}
            className={cm.cn(cm.button({ variant: 'ghost', size: 'xs' }), cm.borderAll)}
            aria-label={t('ide.preview.refresh')}
          >
            {'\u21BB'}
          </button>
          <button
            type="button"
            onClick={openExternal}
            className={cm.cn(cm.button({ variant: 'ghost', size: 'xs' }), cm.borderAll)}
            aria-label={t('ide.preview.openNewTab')}
          >
            {'\u2197'}
          </button>
        </div>
      </div>

      {/* URL bar */}
      <div className={cm.cn(cm.sp('px', 3), cm.sp('py', 1), cm.shrink0, cm.borderB)}>
        <input
          type="text"
          value={state.url}
          onChange={(e) => setUrl(e.target.value)}
          className={cm.cn(
            cm.w('full'),
            cm.textSize('xs'),
            cm.sp('p', 1),
            cm.surfaceSecondary,
            cm.borderAll,
          )}
          style={{
            borderRadius: '4px',
            color: 'inherit',
            outline: 'none',
            fontFamily: 'monospace',
          }}
        />
      </div>

      {/* Iframe */}
      <div
        className={cm.cn(cm.flex({ direction: 'row', justify: 'center' }), cm.surfaceSecondary)}
        style={{
          flex: 1,
          minHeight: 0,
          overflow: 'auto',
        }}
      >
        {state.url ? (
          <iframe
            src={state.url}
            title={t('ide.preview.livePreview')}
            className={cm.cn(state.device !== 'none' && state.device !== 'desktop' && cm.borderAll)}
            style={{
              width: iframeWidth,
              height: '100%',
              borderRadius: state.device === 'mobile' ? '16px' : '0',
              background: '#fff',
            }}
          />
        ) : (
          <div
            className={cm.cn(cm.textMuted, cm.textSize('sm'))}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
            }}
          >
            {state.isLoading ? t('ide.preview.starting') : t('ide.preview.noPreview')}
          </div>
        )}

        {state.error && (
          <div
            className={cm.cn(cm.textSize('sm'), cm.sp('p', 3), cm.bgErrorSubtle, cm.textError)}
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
            }}
          >
            {state.error}
          </div>
        )}
      </div>
    </div>
  )
}

PreviewPanel.displayName = 'PreviewPanel'
