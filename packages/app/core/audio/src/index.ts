/**
 * Audio player core interface for molecule.dev.
 *
 * Provides a standardized API for audio playback. Bond a provider
 * (e.g. `@molecule/app-audio-howler`) to supply the concrete implementation.
 *
 * @remarks
 * - **Wire it with THIS package's `setProvider()` — NOT `bond('audio', …)`.** This core
 *   keeps its own local singleton and does not read the `@molecule/app-bond` registry;
 *   `requireProvider()` throws until `setProvider()` has run.
 * - **Browsers block autoplay.** `autoplay: true` or `play()` outside a user gesture is
 *   silently ignored until the user has interacted with the page — start playback from a
 *   click/tap handler, and treat "no sound on page load" as policy, not a bug.
 * - `destroy()` the player when its view unmounts — leaked instances keep buffers and
 *   callbacks alive across navigation.
 * - `getDuration()` returns 0 until the audio metadata has loaded; read it in
 *   `onProgress` (or after playback starts), not synchronously after `createPlayer`.
 *
 * @e2e
 * Playback verification — drive the real rendered UI (live preview, no mocks),
 * adapt each item to this app's actual audio screens/controls, and check every
 * box off one by one. This core is PLAYBACK ONLY (no recording); a box you
 * can't check is an integration bug to fix — not a skip:
 * - [ ] Loading a track and pressing the play control actually plays: the
 *   current-time readout advances, the progress bar moves, and the UI shows the
 *   playing state (isPlaying() true, getCurrentTime() keeps climbing). Confirm
 *   sound is audible, not just that the state flipped — start it from a
 *   click/tap so autoplay policy does not silently block it.
 * - [ ] The pause control halts playback: current time freezes, the progress
 *   bar stops, and the control toggles back to "play"; pressing play resumes
 *   from the same position, not the start.
 * - [ ] Dragging/clicking the scrubber to a target position seeks there:
 *   getCurrentTime() jumps to that time and the displayed elapsed time matches.
 * - [ ] The volume/mute control changes output: raising/lowering the slider is
 *   audible and getVolume() reflects it; muting (volume 0) silences the audio
 *   without pausing it.
 * - [ ] Total duration and elapsed time render correctly once metadata loads
 *   (getDuration() > 0, read via onProgress), not "0:00 / 0:00" stuck on screen.
 * - [ ] Reaching the end fires the ended state: the onEnd callback runs and the
 *   UI resets to the start (or advances to the next track), not a silent hang.
 * - [ ] The audio source loads from the app's own origin (a bundled/served
 *   asset), not a broken external URL — no 404/CORS error in the console and
 *   sound actually reaches the output.
 *
 * @module
 *
 * @example
 * ```typescript
 * import { requireProvider, setProvider } from '@molecule/app-audio'
 * import { provider } from '@molecule/app-audio-howler'
 *
 * setProvider(provider) // at startup
 *
 * const player = requireProvider().createPlayer({
 *   src: '/audio/track.mp3',
 *   volume: 0.8,
 *   onEnd: () => console.log('Playback finished'),
 * })
 * playButton.onclick = () => player.play() // user gesture — autoplay is blocked
 * ```
 */

export * from './provider.js'
export * from './types.js'
