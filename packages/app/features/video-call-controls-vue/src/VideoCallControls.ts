/**
 * Vue bottom controls bar for a video meeting.
 *
 * Vue counterpart of `@molecule/app-video-call-controls-react`'s
 * `VideoCallControls` — the same props (React names), the same ClassMap
 * tokens, the same i18n keys, and the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-vue'
import { useTranslation } from '@molecule/app-vue'

import type { VideoCallControlsProps } from './types.js'

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
 * Bottom controls bar for a video meeting — mute, camera, screen-share,
 * leave. Pure UI — apps own the WebRTC plumbing.
 *
 * The screen-share button renders only when `onToggleScreenShare` is supplied;
 * `extraControls` slots more buttons before Leave. Control-button glyphs are
 * emoji delivered as i18n default values, so the emoji doubles as the
 * accessible name.
 *
 * @param props - Component props (see {@link VideoCallControlsProps}).
 * @returns The controls bar component.
 */
export const VideoCallControls = defineComponent({
  name: 'VideoCallControls',
  props: {
    audioEnabled: { type: Boolean, default: false },
    onToggleAudio: {
      type: Function as PropType<VideoCallControlsProps['onToggleAudio']>,
      default: undefined,
    },
    videoEnabled: { type: Boolean, default: false },
    onToggleVideo: {
      type: Function as PropType<VideoCallControlsProps['onToggleVideo']>,
      default: undefined,
    },
    screenSharing: { type: Boolean, default: undefined },
    onToggleScreenShare: {
      type: Function as PropType<NonNullable<VideoCallControlsProps['onToggleScreenShare']>>,
      default: undefined,
    },
    onLeave: {
      type: Function as PropType<VideoCallControlsProps['onLeave']>,
      default: undefined,
    },
    extraControls: null,
    className: { type: String, default: undefined },
  },
  setup(props, { slots }) {
    const cm = getClassMap()
    const { t } = useTranslation()

    return (): VNode =>
      h(
        'div',
        {
          class: cm.cn(
            cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
            cm.sp('p', 3),
            props.className,
          ),
        },
        [
          h(
            Button,
            {
              variant: props.audioEnabled ? 'solid' : 'outline',
              onClick: props.onToggleAudio,
              'aria-pressed': !props.audioEnabled,
            },
            () => [
              props.audioEnabled
                ? t('call.muteOn', {}, { defaultValue: '🎙' })
                : t('call.muteOff', {}, { defaultValue: '🔇' }),
            ],
          ),
          h(
            Button,
            {
              variant: props.videoEnabled ? 'solid' : 'outline',
              onClick: props.onToggleVideo,
              'aria-pressed': !props.videoEnabled,
            },
            () => [
              props.videoEnabled
                ? t('call.cameraOn', {}, { defaultValue: '📹' })
                : t('call.cameraOff', {}, { defaultValue: '🚫' }),
            ],
          ),
          ...(props.onToggleScreenShare
            ? [
                h(
                  Button,
                  {
                    variant: props.screenSharing ? 'solid' : 'outline',
                    onClick: props.onToggleScreenShare,
                    'aria-pressed': !!props.screenSharing,
                  },
                  () => [t('call.share', {}, { defaultValue: '🖥' })],
                ),
              ]
            : []),
          ...slotOrProp(slots.extraControls, props.extraControls as VNodeChild),
          h(Button, { variant: 'solid', color: 'error', onClick: props.onLeave }, () => [
            t('call.leave', {}, { defaultValue: 'Leave' }),
          ]),
        ],
      )
  },
})
