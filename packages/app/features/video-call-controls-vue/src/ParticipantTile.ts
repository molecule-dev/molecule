/**
 * Vue participant tile for a video grid.
 *
 * Vue counterpart of `@molecule/app-video-call-controls-react`'s
 * `ParticipantTile` — the same props (React names), the same ClassMap tokens,
 * and the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

/** The centered media layer's inline style, exactly as React writes it. */
const CENTER_STYLE =
  'position: absolute; inset: 0px; display: flex; align-items: center; justify-content: center'

/** The name badge's inline style, exactly as React writes it. */
const BADGE_STYLE =
  'position: absolute; left: 8px; bottom: 8px; padding: 2px 6px; border-radius: 4px; font-size: 12px'

/** The indicators row's inline style, exactly as React writes it. */
const INDICATORS_STYLE = 'position: absolute; right: 8px; bottom: 8px; display: flex; gap: 6px'

/** One indicator glyph's inline style, exactly as React writes it. */
const ICON_STYLE = 'font-size: 12px'

/**
 * Resolves a node-valued prop that may also arrive as a same-named slot: the
 * slot wins, and an absent pair contributes nothing.
 *
 * @param slot - The slot render function, when the caller passed the slot.
 * @param prop - The prop value, when the caller passed the prop.
 * @returns The children to render.
 */
const slotOrProp = (
  slot: (() => VNodeChild[]) | undefined,
  prop: VNodeChild | null | undefined,
): VNodeChild[] => {
  if (slot) return slot()
  return prop != null ? [prop] : []
}

/**
 * Single participant tile for a video grid. Apps supply the video element via
 * `videoSlot`; this component renders the surrounding chrome (name badge, mute
 * indicator, hand-raised, speaking ring).
 *
 * Tiles are fixed 16:9 theme surfaces (`cm.surface` background, theme ink) with
 * a scrim name badge (`cm.bgScrim`, inverse text) and a success-tone speaking
 * ring (`cm.textTone('success')` ink, `currentColor` outline); supply the
 * `<video>` element via `videoSlot` and a fallback via `avatarSlot`.
 *
 * @param props - Component props (see {@link ParticipantTileProps}).
 * @returns The participant tile component.
 */
export const ParticipantTile = defineComponent({
  name: 'ParticipantTile',
  props: {
    // Node-valued props: declared with `null` (any runtime type, no validation).
    name: null,
    videoSlot: null,
    avatarSlot: null,
    audioEnabled: { type: Boolean, default: true },
    handRaised: { type: Boolean, default: false },
    speaking: { type: Boolean, default: false },
    isLocal: { type: Boolean, default: false },
    className: { type: String, default: undefined },
  },
  setup(props, { slots }) {
    const cm = getClassMap()
    const { t } = useTranslation()

    return (): VNode => {
      const video = slotOrProp(slots.videoSlot, props.videoSlot as VNodeChild)
      const media =
        video.length > 0 ? video : slotOrProp(slots.avatarSlot, props.avatarSlot as VNodeChild)
      const rootStyle = [
        'aspect-ratio: 16 / 9',
        'border-radius: 8px',
        'overflow: hidden',
        ...(props.speaking ? ['outline: 3px solid currentColor'] : []),
      ].join('; ')
      return h(
        'div',
        {
          class: cm.cn(
            cm.position('relative'),
            cm.surface,
            props.speaking ? cm.textTone('success') : undefined,
            props.className,
          ),
          style: rootStyle,
        },
        [
          h('div', { style: CENTER_STYLE }, media),
          h('div', { class: cm.cn(cm.bgScrim, cm.textOnTone), style: BADGE_STYLE }, [
            ...slotOrProp(slots.name, props.name as VNodeChild),
            ...(props.isLocal ? [` ${t('call.label.you', {}, { defaultValue: '(you)' })}`] : []),
          ]),
          h('div', { style: INDICATORS_STYLE }, [
            ...(!props.audioEnabled
              ? [
                  h(
                    'span',
                    {
                      'aria-label': t('call.aria.muted', {}, { defaultValue: 'Muted' }),
                      style: ICON_STYLE,
                    },
                    '🔇',
                  ),
                ]
              : []),
            ...(props.handRaised
              ? [
                  h(
                    'span',
                    {
                      'aria-label': t(
                        'call.aria.handRaised',
                        {},
                        {
                          defaultValue: 'Hand raised',
                        },
                      ),
                      style: ICON_STYLE,
                    },
                    '✋',
                  ),
                ]
              : []),
          ]),
        ],
      )
    }
  },
})
