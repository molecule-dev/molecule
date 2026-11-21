/**
 * `@molecule/app-video-call-controls-react` cases: the participant tile and the
 * bottom controls bar.
 *
 * `ParticipantTile` owns the name badge, the mute / hand-raised indicators and
 * the speaking ring (its video and avatar are node props); `VideoCallControls`
 * owns the mute / camera / screen-share / leave buttons and slots extra controls
 * before Leave. Both are pure UI — every state change is a callback prop — so
 * the cases exercise each prop default and value, the conditional branches
 * (screen-share button, indicators, speaking ring, local suffix), the node
 * props, the class passthrough and each button click.
 *
 * `ParticipantTile` and `VideoCallControls` are the package's only runtime
 * exports (the rest of its public surface is types).
 *
 * @module
 */

import type { CaseA11y } from '../../ui/spec.js'
import type { FeatureCases } from '../spec.js'

/** The case hands the tile a bare img as its avatar slot. */
const AVATAR_WITHOUT_ALT: CaseA11y = {
  expect: ['image-alt'],
  reason: 'The case hands the tile a bare img as its avatar slot',
}

/** The tile's video slot (`<video>`), rendered by the app in real use. */
const video = [{ tag: 'video', attrs: { 'data-video': '' } }]
/** The tile's avatar fallback (`<img>`), shown when no video is supplied. */
const avatar = [{ tag: 'img', attrs: { 'data-avatar': '' } }]
/** The extra controls slot (a chat button in real use). */
const extra = [{ tag: 'span', attrs: { 'data-extra': '' }, children: ['Chat'] }]

/** The mute button (the first button of the bar). */
const muteButton = 'div > button:nth-of-type(1)'
/** The camera button. */
const cameraButton = 'div > button:nth-of-type(2)'
/** The screen-share button; `onToggleScreenShare` must be supplied for it to exist. */
const shareButton = 'div > button:nth-of-type(3)'
/** The leave button (the last button of the bar). */
const leaveButton = 'div > button:last-of-type'

/** The callbacks `VideoCallControls` always receives. */
const baseCallbacks = ['onToggleAudio', 'onToggleVideo', 'onLeave']

/** `@molecule/app-video-call-controls-react`. */
export const videoCallControlsFeature: FeatureCases = {
  package: '@molecule/app-video-call-controls-react',
  families: [
    {
      component: 'ParticipantTile',
      cases: [
        { name: 'name only', props: { name: 'Alice' } },
        { name: 'local participant', props: { name: 'Alice', isLocal: true } },
        { name: 'remote participant', props: { name: 'Alice', isLocal: false } },
        { name: 'video slot', slots: { videoSlot: video } },
        {
          name: 'video slot wins over the avatar',
          slots: { videoSlot: video, avatarSlot: avatar },
        },
        { name: 'avatar slot', a11y: AVATAR_WITHOUT_ALT, slots: { avatarSlot: avatar } },
        { name: 'muted', props: { name: 'Alice', audioEnabled: false } },
        { name: 'audio enabled', props: { name: 'Alice', audioEnabled: true } },
        { name: 'hand raised', props: { name: 'Alice', handRaised: true } },
        { name: 'hand lowered', props: { name: 'Alice', handRaised: false } },
        { name: 'speaking', props: { name: 'Alice', speaking: true } },
        { name: 'quiet', props: { name: 'Alice', speaking: false } },
        { name: 'className passthrough', props: { name: 'Alice', className: 'tile-cls' } },
        {
          name: 'node name',
          slots: { name: [{ tag: 'strong', attrs: { 'data-name': '' }, children: ['Alice'] }] },
        },
        {
          name: 'everything at once',
          props: {
            name: 'Alice',
            audioEnabled: false,
            handRaised: true,
            speaking: true,
            isLocal: true,
            className: 'tile-cls',
          },
          slots: { videoSlot: video },
        },
        {
          name: 'speaking and mute change',
          props: { name: 'Alice' },
          interactions: [
            { type: 'props', props: { speaking: true } },
            { type: 'props', props: { speaking: false, audioEnabled: false } },
          ],
        },
        {
          name: 'local flag flips',
          props: { name: 'Alice' },
          interactions: [
            { type: 'props', props: { isLocal: true } },
            { type: 'props', props: { isLocal: false, handRaised: true } },
          ],
        },
      ],
    },
    {
      component: 'VideoCallControls',
      cases: [
        {
          name: 'defaults',
          props: { audioEnabled: true, videoEnabled: true },
          callbacks: baseCallbacks,
        },
        {
          name: 'muted and camera off',
          props: { audioEnabled: false, videoEnabled: false },
          callbacks: baseCallbacks,
        },
        {
          name: 'screen share on',
          props: { audioEnabled: true, videoEnabled: true, screenSharing: true },
          callbacks: [...baseCallbacks, 'onToggleScreenShare'],
        },
        {
          name: 'screen share off',
          props: { audioEnabled: true, videoEnabled: true, screenSharing: false },
          callbacks: [...baseCallbacks, 'onToggleScreenShare'],
        },
        {
          name: 'screen share without state',
          props: { audioEnabled: true, videoEnabled: true },
          callbacks: [...baseCallbacks, 'onToggleScreenShare'],
        },
        {
          name: 'no screen share control',
          props: { audioEnabled: true, videoEnabled: true },
          callbacks: baseCallbacks,
        },
        {
          name: 'extra controls',
          props: { audioEnabled: true, videoEnabled: true },
          callbacks: baseCallbacks,
          slots: { extraControls: extra },
        },
        {
          name: 'extra controls with screen share',
          props: { audioEnabled: true, videoEnabled: true, screenSharing: true },
          callbacks: [...baseCallbacks, 'onToggleScreenShare'],
          slots: { extraControls: extra },
        },
        {
          name: 'clicking mute calls onToggleAudio',
          props: { audioEnabled: true, videoEnabled: true },
          callbacks: baseCallbacks,
          interactions: [{ type: 'click', selector: muteButton }],
        },
        {
          name: 'clicking camera calls onToggleVideo',
          props: { audioEnabled: true, videoEnabled: true },
          callbacks: baseCallbacks,
          interactions: [{ type: 'click', selector: cameraButton }],
        },
        {
          name: 'clicking screen share calls onToggleScreenShare',
          props: { audioEnabled: true, videoEnabled: true, screenSharing: false },
          callbacks: [...baseCallbacks, 'onToggleScreenShare'],
          interactions: [{ type: 'click', selector: shareButton }],
        },
        {
          name: 'clicking leave calls onLeave',
          props: { audioEnabled: true, videoEnabled: true },
          callbacks: baseCallbacks,
          interactions: [{ type: 'click', selector: leaveButton }],
        },
        {
          name: 'every control clicked in turn',
          props: { audioEnabled: true, videoEnabled: true, screenSharing: true },
          callbacks: [...baseCallbacks, 'onToggleScreenShare'],
          interactions: [
            { type: 'click', selector: muteButton },
            { type: 'click', selector: cameraButton },
            { type: 'click', selector: shareButton },
            { type: 'click', selector: leaveButton },
          ],
        },
        {
          name: 'className passthrough',
          props: { className: 'vcc-cls' },
          callbacks: baseCallbacks,
        },
        {
          name: 'enabled flags flip',
          props: { audioEnabled: true, videoEnabled: true },
          callbacks: baseCallbacks,
          interactions: [
            { type: 'props', props: { audioEnabled: false } },
            { type: 'props', props: { audioEnabled: true, videoEnabled: false } },
          ],
        },
        {
          name: 'screen sharing toggles',
          props: { audioEnabled: true, videoEnabled: true, screenSharing: false },
          callbacks: [...baseCallbacks, 'onToggleScreenShare'],
          interactions: [
            { type: 'props', props: { screenSharing: true } },
            { type: 'props', props: { screenSharing: false } },
          ],
        },
      ],
    },
  ],
}
