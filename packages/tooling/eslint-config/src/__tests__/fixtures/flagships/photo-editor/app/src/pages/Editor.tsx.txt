/** Loaded form fields use the bonded form controller: edit setters mark dirty; fill setters preserve edits. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useForm, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AdjustmentSlider } from '../components/AdjustmentSlider.js'
import { PhotoEditorLayout } from '../components/PhotoEditorLayout.js'
import { PresetTile } from '../components/PresetTile.js'
import { useMediaQuery } from '../components/useMediaQuery.js'
import { type ApiImage, imageToSamplePhoto } from '../lib/image-adapter.js'
import { SAMPLE_PRESETS } from '../lib/sample-photos.js'

const TOOLS = [
  {
    id: 'select',
    icon: 'arrow_selector_tool',
    labelKey: 'editor.tool.select',
    defaultLabel: 'Select',
  },
  { id: 'crop', icon: 'crop', labelKey: 'editor.tool.crop', defaultLabel: 'Crop' },
  {
    id: 'transform',
    icon: 'transform',
    labelKey: 'editor.tool.transform',
    defaultLabel: 'Transform',
  },
  { id: 'mask', icon: 'masks', labelKey: 'editor.tool.mask', defaultLabel: 'Mask' },
  { id: 'retouch', icon: 'auto_fix', labelKey: 'editor.tool.retouch', defaultLabel: 'Retouch' },
  { id: 'text', icon: 'text_fields', labelKey: 'editor.tool.text', defaultLabel: 'Text' },
] as const

type ToolId = (typeof TOOLS)[number]['id']

type AdjustmentKey =
  | 'exposure'
  | 'contrast'
  | 'saturation'
  | 'hue'
  | 'vibrance'
  | 'highlights'
  | 'shadows'
  | 'temperature'
  | 'grain'

const ADJUSTMENT_DEFS: Array<{
  key: AdjustmentKey
  icon: string
  defaultLabel: string
  min: number
  max: number
  unit?: string
}> = [
  { key: 'exposure', icon: 'wb_sunny', defaultLabel: 'Exposure', min: -100, max: 100 },
  { key: 'contrast', icon: 'contrast', defaultLabel: 'Contrast', min: -100, max: 100 },
  { key: 'highlights', icon: 'brightness_5', defaultLabel: 'Highlights', min: -100, max: 100 },
  { key: 'shadows', icon: 'brightness_3', defaultLabel: 'Shadows', min: -100, max: 100 },
  { key: 'saturation', icon: 'palette', defaultLabel: 'Saturation', min: -100, max: 100 },
  { key: 'vibrance', icon: 'auto_awesome', defaultLabel: 'Vibrance', min: -100, max: 100 },
  {
    key: 'temperature',
    icon: 'device_thermostat',
    defaultLabel: 'Temperature',
    min: -100,
    max: 100,
  },
  { key: 'hue', icon: 'colorize', defaultLabel: 'Hue', min: -180, max: 180, unit: '°' },
  { key: 'grain', icon: 'grain', defaultLabel: 'Grain', min: 0, max: 100 },
]

type AdjustmentState = Record<AdjustmentKey, number>

const ZERO_ADJUSTMENTS: AdjustmentState = {
  exposure: 0,
  contrast: 0,
  saturation: 0,
  hue: 0,
  vibrance: 0,
  highlights: 0,
  shadows: 0,
  temperature: 0,
  grain: 0,
}

interface EditHistoryEntry {
  ts: string
  label: string
  adjustments: AdjustmentState
  preset_id: string | null
}

function parseHistory(raw: unknown): EditHistoryEntry[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return []
    const obj = entry as Record<string, unknown>
    const ts = typeof obj.ts === 'string' ? obj.ts : ''
    const label = typeof obj.label === 'string' ? obj.label : 'Edit'
    const presetId = typeof obj.preset_id === 'string' ? obj.preset_id : null
    const adj = obj.adjustments as Record<string, unknown> | undefined
    const adjustments: AdjustmentState = { ...ZERO_ADJUSTMENTS }
    if (adj) {
      for (const k of Object.keys(ZERO_ADJUSTMENTS)) {
        const v = adj[k]
        if (typeof v === 'number') adjustments[k as AdjustmentKey] = v
      }
    }
    return [{ ts, label, adjustments, preset_id: presetId }]
  })
}

export function Editor() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const photoId = searchParams.get('photo')
  // Below 768px the 3-pane workspace (52px rail + canvas + 300px panel)
  // stacks: tools become a horizontal strip above the canvas, the panel
  // goes full-width below it.
  const belowMobile = useMediaQuery('(max-width: 767px)')

  const [image, setImage] = useState<ApiImage | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [tool, setTool] = useState<ToolId>('transform')
  const [tab, setTab] = useState<'adjust' | 'presets' | 'info'>('adjust')
  const [adjustments, setAdjustments, fillAdjustments] = useForm<AdjustmentState>({
    defaultValues: ZERO_ADJUSTMENTS as AdjustmentState,
    resetOptions: { keepDirtyValues: true },
    resetKey: photoId,
  }).asState()
  const [activePresetId, setActivePresetId] = useState<string | null>(null)
  const [history, setHistory] = useState<EditHistoryEntry[]>([])
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!photoId) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    http
      .get<ApiImage>(`/images/${photoId}`)
      .then((res) => {
        if (cancelled) return
        setImage(res.data)
        const hist = parseHistory(res.data.edit_history)
        setHistory(hist)
        if (hist.length > 0) {
          fillAdjustments(hist[hist.length - 1].adjustments)
          setActivePresetId(hist[hist.length - 1].preset_id)
        } else {
          fillAdjustments(ZERO_ADJUSTMENTS)
          setActivePresetId(null)
        }
        setLoadError(null)
      })
      .catch((err: Error) => {
        if (cancelled) return
        setLoadError(err.message ?? 'Could not load image.')
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, photoId, fillAdjustments])

  const persistEdit = useCallback(
    (label: string, nextAdjustments: AdjustmentState, presetId: string | null) => {
      if (!image) return
      const entry: EditHistoryEntry = {
        ts: new Date().toISOString(),
        label,
        adjustments: nextAdjustments,
        preset_id: presetId,
      }
      const nextHistory = [...history, entry]
      setHistory(nextHistory)
      setSaveStatus('saving')
      http
        .put<ApiImage>(`/images/${image.id}`, { edit_history: nextHistory })
        .then((res) => {
          setImage(res.data)
          setSaveStatus('saved')
          track({
            name: 'edit.applied',
            properties: { image_id: image.id, label, preset_id: presetId },
          })
          if (saveTimer.current) clearTimeout(saveTimer.current)
          saveTimer.current = setTimeout(() => setSaveStatus('idle'), 1500)
        })
        .catch(() => setSaveStatus('error'))
    },
    [history, http, image],
  )

  const setAdjustment = (key: AdjustmentKey, value: number) => {
    setAdjustments((prev) => {
      const next = { ...prev, [key]: value }
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        const labelDef = ADJUSTMENT_DEFS.find((d) => d.key === key)
        persistEdit(
          `${labelDef?.defaultLabel ?? key} ${value > 0 ? '+' : ''}${value}`,
          next,
          activePresetId,
        )
      }, 600)
      return next
    })
  }

  const resetAdjustments = () => {
    setAdjustments(ZERO_ADJUSTMENTS)
    setActivePresetId(null)
    persistEdit('Reset', ZERO_ADJUSTMENTS, null)
  }

  const handleUndo = () => {
    if (history.length === 0) return
    const nextHistory = history.slice(0, -1)
    const head = nextHistory[nextHistory.length - 1]
    setHistory(nextHistory)
    setAdjustments(head?.adjustments ?? ZERO_ADJUSTMENTS)
    setActivePresetId(head?.preset_id ?? null)
    setSaveStatus('saving')
    if (image) {
      http
        .put<ApiImage>(`/images/${image.id}`, { edit_history: nextHistory })
        .then((res) => {
          setImage(res.data)
          setSaveStatus('saved')
          track({ name: 'edit.undone', properties: { image_id: image.id } })
        })
        .catch(() => setSaveStatus('error'))
    }
  }

  const togglePreset = (id: string) => {
    const nextActive = id === activePresetId ? null : id
    setActivePresetId(nextActive)
    const preset = SAMPLE_PRESETS.find((p) => p.id === id)
    if (preset && nextActive) {
      const next: AdjustmentState = {
        ...ZERO_ADJUSTMENTS,
        contrast: preset.adjustments.contrast,
        saturation: preset.adjustments.saturation,
        hue: preset.adjustments.hue,
        grain: preset.adjustments.grain,
        exposure: preset.adjustments.brightness,
      }
      setAdjustments(next)
      persistEdit(`Preset · ${preset.name}`, next, nextActive)
    } else {
      persistEdit('Preset · cleared', adjustments, nextActive)
    }
  }

  const samplePhoto = useMemo(() => (image ? imageToSamplePhoto(image) : null), [image])

  if (!photoId) {
    return (
      <PhotoEditorLayout
        fullBleed
        title={t('nav.editor', {}, { defaultValue: 'Editor' })}
        breadcrumb={t('editor.breadcrumb', {}, { defaultValue: '// editor' })}
      >
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            'h-full text-center px-6',
          )}
        >
          <div data-mol-id="editor-no-photo">
            <span
              className={cm.cn(
                'material-symbols-outlined text-[64px] text-[var(--photo-text-muted)]',
              )}
              aria-hidden="true"
            >
              image
            </span>
            <h2
              className={cm.cn('text-2xl font-bold tracking-tight text-[var(--photo-text)] mt-3')}
            >
              {t('editor.empty.title', {}, { defaultValue: 'Choose a frame to edit' })}
            </h2>
            <p className={cm.cn('text-sm text-[var(--photo-text-muted)] mt-2 max-w-sm mx-auto')}>
              {t(
                'editor.empty.body',
                {},
                { defaultValue: 'Open the library to pick a frame, or upload a new one.' },
              )}
            </p>
            <button
              type="button"
              onClick={() => navigate('/library')}
              className={cm.cn(
                cm.fontWeight('semibold'),
                cm.flex({ align: 'center', gap: 'xs' }),
                'mx-auto mt-4 px-4 py-2 rounded-md text-sm bg-gradient-to-r from-[var(--photo-accent)] to-[var(--photo-danger)] text-white hover:opacity-90 transition-opacity uppercase tracking-widest font-mono',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-[16px]')} aria-hidden="true">
                photo_library
              </span>
              {t('editor.empty.cta', {}, { defaultValue: 'Open library' })}
            </button>
          </div>
        </div>
      </PhotoEditorLayout>
    )
  }

  if (loading || !samplePhoto) {
    return (
      <PhotoEditorLayout
        fullBleed
        title={t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        breadcrumb={t('editor.breadcrumb', {}, { defaultValue: '// editor' })}
      >
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            'h-full text-sm italic text-[var(--photo-text-muted)]',
          )}
          data-mol-id="editor-loading"
        >
          {loadError ?? t('editor.loading', {}, { defaultValue: 'Loading frame…' })}
        </div>
      </PhotoEditorLayout>
    )
  }

  const photo = samplePhoto
  const exportHref = `/export?photo=${photo.id}`

  return (
    <PhotoEditorLayout
      fullBleed
      title={t('editor.title', { name: photo.title }, { defaultValue: '{{name}}' })}
      breadcrumb={t('editor.breadcrumb', {}, { defaultValue: '// editor › adjust' })}
      toolbar={
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
          <span
            data-mol-id="editor-save-status"
            data-status={saveStatus}
            className={cm.cn(
              'mr-2 text-[10px] font-mono uppercase tracking-widest',
              saveStatus === 'error'
                ? 'text-[var(--mol-color-error)]'
                : saveStatus === 'saved'
                  ? 'text-[var(--mol-color-success)]'
                  : 'text-[var(--photo-text-muted)]',
            )}
          >
            {saveStatus === 'saving'
              ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
              : saveStatus === 'saved'
                ? t('common.saved', {}, { defaultValue: 'Saved' })
                : saveStatus === 'error'
                  ? t('editor.save.error', {}, { defaultValue: 'Save failed' })
                  : history.length > 0
                    ? t(
                        'editor.save.history',
                        { n: history.length },
                        { defaultValue: '{{n}} edits' },
                      )
                    : t('editor.save.idle', {}, { defaultValue: 'No edits yet' })}
          </span>
          <button
            type="button"
            data-mol-id="editor-undo"
            onClick={handleUndo}
            disabled={history.length === 0}
            className={cm.cn(
              'px-3 py-1 rounded-md text-[11px] font-mono uppercase tracking-widest text-[var(--photo-text-muted)] border border-[var(--photo-border)] hover:text-[var(--photo-panel-text-highlight)] hover:border-[var(--photo-accent)]/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined text-[14px] align-middle')}
              aria-hidden="true"
            >
              undo
            </span>
            <span className={cm.cn('ml-1')}>{t('editor.undo', {}, { defaultValue: 'Undo' })}</span>
          </button>
          <Link
            to={exportHref}
            data-mol-id="editor-export"
            className={cm.cn(
              cm.fontWeight('semibold'),
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.textSize('xs'),
              'rounded-md bg-gradient-to-r from-[var(--photo-accent)] to-[var(--photo-danger)] text-white hover:opacity-90 transition-opacity uppercase tracking-widest font-mono',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-[14px]')} aria-hidden="true">
              ios_share
            </span>
            <span>{t('common.export', {}, { defaultValue: 'Export' })}</span>
          </Link>
        </div>
      }
    >
      <div
        className={cm.cn(
          cm.flex({ direction: belowMobile ? 'col' : 'row' }),
          belowMobile ? '' : 'h-full',
        )}
      >
        {/* Tool rail — vertical on desktop, horizontal strip on mobile */}
        <aside
          className={cm.cn(
            belowMobile
              ? cm.cn(
                  'w-full shrink-0 border-b border-[var(--photo-border)] bg-[var(--photo-surface)] flex flex-row items-center justify-center py-1.5 px-2 gap-1 overflow-x-auto',
                )
              : cm.cn(
                  'w-[52px] shrink-0 border-r border-[var(--photo-border)] bg-[var(--photo-surface)] flex flex-col items-center py-3 gap-1',
                ),
          )}
        >
          {TOOLS.map((toolItem) => {
            const active = tool === toolItem.id
            return (
              <button
                key={toolItem.id}
                type="button"
                onClick={() => setTool(toolItem.id)}
                aria-label={t(toolItem.labelKey, {}, { defaultValue: toolItem.defaultLabel })}
                aria-pressed={active}
                data-mol-id={`editor-tool-${toolItem.id}`}
                className={cm.cn(
                  'w-10 h-10 shrink-0 rounded-md flex items-center justify-center transition-colors',
                  active
                    ? 'bg-[var(--photo-accent)]/25 text-[var(--photo-panel-text-highlight)] border-l-2 border-[var(--photo-accent)]'
                    : 'text-[var(--photo-text-muted)] hover:text-[var(--photo-text)] hover:bg-[var(--photo-accent)]/15',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-[20px]')} aria-hidden="true">
                  {toolItem.icon}
                </span>
              </button>
            )
          })}
        </aside>

        {/* Canvas */}
        <main
          className={cm.cn(
            'relative bg-[var(--photo-canvas-bg)] flex items-center justify-center overflow-hidden',
            belowMobile ? 'h-[44vh] shrink-0' : 'flex-1 min-w-0',
          )}
        >
          <div
            aria-hidden="true"
            className={cm.cn('absolute inset-0 opacity-90')}
            style={{
              backgroundImage:
                'linear-gradient(45deg, var(--photo-canvas-checker) 25%, transparent 25%), linear-gradient(-45deg, var(--photo-canvas-checker) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, var(--photo-canvas-checker) 75%), linear-gradient(-45deg, transparent 75%, var(--photo-canvas-checker) 75%)',
              backgroundSize: '24px 24px',
              backgroundPosition: '0 0, 0 12px, 12px -12px, 12px 0',
            }}
          />

          <div
            className={cm.cn(
              'relative w-[78%] aspect-[3/2] max-h-[82%] rounded-md overflow-hidden shadow-2xl shadow-black/60',
            )}
            data-mol-id="editor-canvas"
          >
            {image?.current_url || image?.original_url ? (
              <img
                src={image.current_url || image.original_url}
                alt={image.name}
                style={{
                  filter: `brightness(${1 + adjustments.exposure / 100}) contrast(${1 + adjustments.contrast / 100}) saturate(${1 + adjustments.saturation / 100}) hue-rotate(${adjustments.hue}deg)`,
                  transition: 'filter 120ms ease-out',
                }}
                className={cm.cn('absolute inset-0 w-full h-full object-cover')}
              />
            ) : (
              <div
                className={cm.cn('absolute inset-0')}
                style={{
                  background:
                    'linear-gradient(135deg, #312e81 0%, #4c1d95 30%, #831843 65%, #ec4899 100%)',
                }}
                aria-hidden="true"
              />
            )}

            <div
              className={cm.cn(
                'absolute inset-x-12 inset-y-10 border border-surface/40 pointer-events-none',
              )}
              aria-hidden="true"
            >
              <div className={cm.cn('absolute left-1/3 top-0 bottom-0 w-px bg-surface/30')} />
              <div className={cm.cn('absolute left-2/3 top-0 bottom-0 w-px bg-surface/30')} />
              <div className={cm.cn('absolute top-1/3 left-0 right-0 h-px bg-surface/30')} />
              <div className={cm.cn('absolute top-2/3 left-0 right-0 h-px bg-surface/30')} />
              <div
                className={cm.cn(
                  'absolute -left-[5px] -top-[5px] w-2.5 h-2.5 bg-surface border border-foreground/30',
                )}
              />
              <div
                className={cm.cn(
                  'absolute -right-[5px] -top-[5px] w-2.5 h-2.5 bg-surface border border-foreground/30',
                )}
              />
              <div
                className={cm.cn(
                  'absolute -left-[5px] -bottom-[5px] w-2.5 h-2.5 bg-surface border border-foreground/30',
                )}
              />
              <div
                className={cm.cn(
                  'absolute -right-[5px] -bottom-[5px] w-2.5 h-2.5 bg-surface border border-foreground/30',
                )}
              />
            </div>

            <span
              className={cm.cn(
                'absolute top-3 left-3 px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-widest rounded bg-foreground/60 backdrop-blur text-white',
              )}
            >
              {photo.dimensions.width}×{photo.dimensions.height}
            </span>
            <span
              className={cm.cn(
                'absolute bottom-3 right-3 px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-widest rounded bg-foreground/60 backdrop-blur text-white',
              )}
            >
              100%
            </span>
          </div>

          <div
            className={cm.cn(
              'absolute inset-x-0 bottom-0 h-12 bg-[var(--photo-surface)] border-t border-[var(--photo-border)] flex items-center px-4 gap-4 text-[11px] font-mono uppercase tracking-widest text-[var(--photo-text-muted)]',
            )}
          >
            <span className={cm.cn('flex items-center gap-1.5')}>
              <span className={cm.cn('material-symbols-outlined text-[14px]')} aria-hidden="true">
                image
              </span>
              {photo.title}
            </span>
            <span aria-hidden="true">·</span>
            <span className={cm.cn('text-[var(--photo-panel-text-cyan)]')}>RGB</span>
            <span className={cm.cn('ml-auto flex items-center gap-3')}>
              <span className={cm.cn('text-[var(--photo-panel-text-highlight)]')}>
                {photo.dimensions.width}×{photo.dimensions.height}
              </span>
              <span>{(photo.size_bytes / 1_000_000).toFixed(1)}MB</span>
            </span>
          </div>
        </main>

        {/* Right side panel — docked on desktop, full-width below the canvas on mobile */}
        <aside
          className={cm.cn(
            'shrink-0 bg-[var(--photo-surface-elevated)] flex flex-col',
            belowMobile
              ? 'w-full border-t border-[var(--photo-border)]'
              : 'w-[300px] border-l border-[var(--photo-border)]',
          )}
        >
          <div
            className={cm.cn(
              'flex border-b border-[var(--photo-border)] bg-[var(--photo-surface)]',
            )}
          >
            {(['adjust', 'presets', 'info'] as const).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                data-mol-id={`editor-tab-${id}`}
                className={cm.cn(
                  'flex-1 px-3 py-3 text-[10px] font-mono font-bold uppercase tracking-widest transition-colors border-b-2',
                  tab === id
                    ? 'border-[var(--photo-accent)] text-[var(--photo-panel-text-highlight)] bg-[var(--photo-accent)]/10'
                    : 'border-transparent text-[var(--photo-text-muted)] hover:text-[var(--photo-text)]',
                )}
              >
                {t(
                  `editor.tab.${id}`,
                  {},
                  { defaultValue: id.charAt(0).toUpperCase() + id.slice(1) },
                )}
              </button>
            ))}
          </div>

          {tab === 'adjust' && (
            <div className={cm.cn('flex-1 overflow-y-auto px-2 py-3')}>
              <div
                className={cm.cn(
                  'px-2 py-2 mb-2 flex items-center justify-between border-b border-[var(--photo-border)]',
                )}
              >
                <span
                  className={cm.cn(
                    'text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--photo-text-muted)]',
                  )}
                >
                  {t('editor.section.tonality', {}, { defaultValue: 'Tonality' })}
                </span>
                <button
                  type="button"
                  onClick={resetAdjustments}
                  data-mol-id="editor-reset"
                  className={cm.cn(
                    'text-[10px] font-mono uppercase tracking-widest text-[var(--photo-text-muted)] hover:text-[var(--photo-danger)] transition-colors',
                  )}
                >
                  {t('editor.reset', {}, { defaultValue: 'Reset' })}
                </button>
              </div>
              {ADJUSTMENT_DEFS.map((def) => (
                <AdjustmentSlider
                  key={def.key}
                  labelKey={def.key}
                  defaultLabel={def.defaultLabel}
                  icon={def.icon}
                  value={adjustments[def.key]}
                  min={def.min}
                  max={def.max}
                  unit={def.unit}
                  active={adjustments[def.key] !== 0}
                  onChange={(v) => setAdjustment(def.key, v)}
                />
              ))}
            </div>
          )}

          {tab === 'presets' && (
            <div className={cm.cn('flex-1 overflow-y-auto p-3 grid grid-cols-2 gap-3')}>
              {SAMPLE_PRESETS.slice(0, 6).map((preset) => (
                <PresetTile
                  key={preset.id}
                  preset={preset}
                  active={activePresetId === preset.id}
                  onApply={togglePreset}
                />
              ))}
            </div>
          )}

          {tab === 'info' && (
            <div
              className={cm.cn(
                'flex-1 overflow-y-auto px-4 py-4 text-[12px] text-[var(--photo-text)]',
              )}
            >
              <p
                className={cm.cn(
                  'text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--photo-text-muted)] mb-2',
                )}
              >
                {t('editor.info.eyebrow', {}, { defaultValue: 'Frame metadata' })}
              </p>
              <h3 className={cm.cn('text-base font-bold tracking-tight text-[var(--photo-text)]')}>
                {photo.title}
              </h3>
              <dl className={cm.cn('divide-y divide-[var(--photo-border)] mt-4')}>
                <ExifRow
                  label={t('editor.info.dimensions', {}, { defaultValue: 'Dimensions' })}
                  value={`${photo.dimensions.width}×${photo.dimensions.height}`}
                />
                <ExifRow
                  label={t('editor.info.albumId', {}, { defaultValue: 'Album' })}
                  value={image?.album_id ?? '—'}
                />
                <ExifRow
                  label={t('editor.info.public', {}, { defaultValue: 'Public' })}
                  value={
                    image?.is_public
                      ? t('editor.info.publicYes', {}, { defaultValue: 'Yes' })
                      : t('editor.info.publicNo', {}, { defaultValue: 'No' })
                  }
                />
                <ExifRow
                  label={t('editor.info.createdAt', {}, { defaultValue: 'Added' })}
                  value={photo.uploaded_at.slice(0, 10)}
                />
                <ExifRow
                  label={t('editor.info.editedAt', {}, { defaultValue: 'Last edit' })}
                  value={photo.edited_at?.slice(0, 16) ?? '—'}
                />
              </dl>
            </div>
          )}

          <div
            className={cm.cn(
              'border-t border-[var(--photo-border)] bg-[var(--photo-surface)] px-3 py-3 max-h-[200px] overflow-y-auto',
            )}
          >
            <p
              className={cm.cn(
                'text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--photo-text-muted)] mb-2',
              )}
            >
              {t('nav.history', {}, { defaultValue: 'History' })}
            </p>
            {history.length === 0 ? (
              <p className={cm.cn('text-[11px] italic text-[var(--photo-text-muted)]')}>
                {t('editor.history.empty', {}, { defaultValue: 'No edits yet — drag any slider.' })}
              </p>
            ) : (
              <ul className={cm.cn('space-y-1')} data-mol-id="editor-history-list">
                {history
                  .slice(-10)
                  .reverse()
                  .map((entry, i) => (
                    <li
                      key={`${entry.ts}-${i}`}
                      className={cm.cn(
                        'flex items-center gap-2 px-2 py-1 rounded',
                        i === 0
                          ? 'bg-[var(--photo-accent)]/15 text-[var(--photo-panel-text-highlight)]'
                          : 'text-[var(--photo-text)]',
                      )}
                      data-mol-id={`editor-history-entry-${i}`}
                    >
                      <span
                        className={cm.cn(
                          'material-symbols-outlined text-[14px] text-[var(--photo-text-muted)]',
                        )}
                        aria-hidden="true"
                      >
                        tune
                      </span>
                      <span className={cm.cn('text-[12px] truncate')}>{entry.label}</span>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </PhotoEditorLayout>
  )
}

interface ExifRowProps {
  label: string
  value: string
}

function ExifRow({ label, value }: ExifRowProps) {
  const cm = getClassMap()
  return (
    <div className={cm.cn('flex items-center justify-between gap-3 py-2')}>
      <dt
        className={cm.cn(
          'text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--photo-text-muted)]',
        )}
      >
        {label}
      </dt>
      <dd
        className={cm.cn(
          'text-xs font-mono tabular-nums text-[var(--photo-text)] text-right truncate',
        )}
      >
        {value}
      </dd>
    </div>
  )
}

export default Editor
