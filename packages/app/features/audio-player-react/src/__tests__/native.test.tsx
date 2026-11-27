// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { createElement, type MouseEvent, type ReactNode, StrictMode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { type AudioPlayerInstance, type AudioProvider, setProvider } from '@molecule/app-audio'
import { unbond } from '@molecule/app-bond'
import { setClassMap } from '@molecule/app-ui'
import { Box } from '@molecule/app-ui-react/elements'
import { classMap } from '@molecule/app-ui-tailwind'

import { AudioPlayer } from '../native.js'

interface HostProps {
  children?: ReactNode
  className?: string
  disabled?: boolean
  accessibilityElementsHidden?: boolean
  accessibilityHint?: string
  accessibilityLabel?: string
  accessibilityLanguage?: string
  id?: string
  role?: string
  testID?: string
  'aria-label'?: string
  'aria-hidden'?: boolean
  'aria-live'?: 'off' | 'polite' | 'assertive'
  onPress?: (event: MouseEvent<HTMLButtonElement>) => void
}

function attributes(props: HostProps) {
  return {
    id: props.id,
    role: props.role,
    className: props.className,
    lang: props.accessibilityLanguage,
    'aria-description': props.accessibilityHint,
    'data-testid': props.testID,
    'aria-label': props['aria-label'] ?? props.accessibilityLabel,
    'aria-hidden': props['aria-hidden'] ?? props.accessibilityElementsHidden,
    'aria-live': props['aria-live'],
  }
}

vi.mock('react-native', () => ({
  Platform: { OS: 'android', select: ({ default: value }: { default: unknown }) => value },
  StyleSheet: { create: (styles: object) => styles },
  Pressable: (props: HostProps) =>
    createElement(
      'button',
      { ...attributes(props), type: 'button', disabled: props.disabled, onClick: props.onPress },
      props.children,
    ),
  Text: (props: HostProps) => createElement('span', attributes(props), props.children),
  View: (props: HostProps) => createElement('div', attributes(props), props.children),
}))
vi.mock('react-native-svg', () => ({ Svg: () => null }))
vi.mock('react-native-url-polyfill', () => ({ URL }))
vi.mock('react-native-safe-area-context', async () => {
  const { createContext } = await import('react')
  return { SafeAreaInsetsContext: createContext(null) }
})
vi.mock('@react-native-community/slider', () => ({
  default: (
    props: HostProps & {
      value: number
      minimumValue: number
      maximumValue: number
      step: number
      onValueChange: (position: number) => void
      onSlidingStart: (position: number) => void
      onSlidingComplete: (position: number) => void
    },
  ) =>
    createElement('input', {
      ...attributes(props),
      type: 'range',
      min: props.minimumValue,
      max: props.maximumValue,
      step: props.step,
      defaultValue: props.value,
      disabled: props.disabled,
      onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
        props.onValueChange(event.currentTarget.valueAsNumber),
      onMouseDown: (event: MouseEvent<HTMLInputElement>) =>
        props.onSlidingStart(event.currentTarget.valueAsNumber),
      onMouseUp: (event: MouseEvent<HTMLInputElement>) =>
        props.onSlidingComplete(event.currentTarget.valueAsNumber),
    }),
}))

const TRACK = 'https://example.com/episode.mp3'
const NEXT = 'https://example.com/next.mp3'
const CAPTIONS = 'https://example.com/episode.vtt'

const createPlayer = vi.fn<AudioProvider['createPlayer']>()

function makePlayer() {
  return {
    play: vi.fn(),
    pause: vi.fn(),
    stop: vi.fn(),
    seek: vi.fn(),
    setVolume: vi.fn(),
    getVolume: vi.fn(() => 0.6),
    getDuration: vi.fn(() => 0),
    getCurrentTime: vi.fn(() => 0),
    isPlaying: vi.fn(() => false),
    destroy: vi.fn(),
  } satisfies AudioPlayerInstance
}

let player: ReturnType<typeof makePlayer>

beforeEach(() => {
  vi.resetAllMocks()
  player = makePlayer()
  createPlayer.mockReturnValue(player)
  setProvider({ name: 'test-audio', createPlayer })
  setClassMap(classMap)
})

afterEach(() => {
  cleanup()
  unbond('audio')
  vi.unstubAllGlobals()
})

function press(label: string): void {
  fireEvent.click(screen.getByRole('button', { name: label }))
}

function progress(at: number, duration: number): void {
  act(() => createPlayer.mock.lastCall?.[0].onProgress?.(at, duration))
}

it('uses the native controls to play and pause through the bonded provider', () => {
  const onPlay = vi.fn()
  const onPause = vi.fn()
  const view = render(
    <AudioPlayer
      src={TRACK}
      title="Episode"
      subtitle="The Podcast"
      visualizer={
        <Box as="div" data-mol-id="waveform">
          Waveform
        </Box>
      }
      className={classMap.sp('m', 2)}
      onPlay={onPlay}
      onPause={onPause}
    />,
  )
  expect(view.container.querySelector('audio')).toBeNull()
  expect(screen.getByText('Episode')).toBeDefined()
  expect(screen.getByText('The Podcast')).toBeDefined()
  expect(screen.getByTestId('waveform').textContent).toBe('Waveform')
  expect(view.container.firstElementChild?.classList.contains(classMap.sp('m', 2))).toBe(true)
  expect(createPlayer).toHaveBeenCalledExactlyOnceWith({
    src: TRACK,
    autoplay: false,
    volume: 1,
    onProgress: expect.any(Function),
    onEnd: expect.any(Function),
  })
  press('Play')
  expect(player.play).toHaveBeenCalledOnce()
  expect(onPlay).toHaveBeenCalledOnce()
  press('Pause')
  expect(player.pause).toHaveBeenCalledOnce()
  expect(onPause).toHaveBeenCalledOnce()
  expect(screen.getByTestId('audio-player-toggle')).toBe(
    screen.getByRole('button', { name: 'Play' }),
  )
})

it('sends a device slider drag to the player in seconds', () => {
  render(<AudioPlayer src={TRACK} />)
  progress(0, 60)
  const control = screen.getByRole('slider', { name: 'Seek' })
  expect(control).toBe(screen.getByTestId('audio-player-seek'))
  const slider = within(control).getByRole('slider', { hidden: true })
  fireEvent.mouseDown(slider)
  // The native kit's offset, integer step represents 29.5 seconds in this range.
  fireEvent.change(slider, { target: { value: '296' } })
  fireEvent.mouseUp(slider)
  expect(player.seek).toHaveBeenLastCalledWith(29.5)
})

it('updates the elapsed and total time from provider metadata and progress', () => {
  render(<AudioPlayer src={TRACK} />)
  expect(screen.getByText('0:00 / 0:00')).toBeDefined()
  progress(0, 125)
  expect(screen.getByText('0:00 / 2:05')).toBeDefined()
  progress(61.8, 125)
  expect(screen.queryByText('1:01 / 2:05')).not.toBeNull()
})

it('mutes without pausing and restores the existing volume', () => {
  render(<AudioPlayer src={TRACK} />)
  press('Play')
  press('Mute')
  expect(player.setVolume).toHaveBeenNthCalledWith(1, 0)
  expect(player.pause).not.toHaveBeenCalled()
  press('Unmute')
  expect(player.setVolume).toHaveBeenNthCalledWith(2, 0.6)
  expect(screen.getByTestId('audio-player-mute')).toBe(screen.getByRole('button', { name: 'Mute' }))
})

it('starts muted and autoplays once across Strict Mode effect replay', async () => {
  const onPlay = vi.fn()
  await act(async () => {
    render(
      <StrictMode>
        <AudioPlayer src={TRACK} autoPlay defaultMuted onPlay={onPlay} />
      </StrictMode>,
    )
  })
  expect(createPlayer).toHaveBeenLastCalledWith({
    src: TRACK,
    autoplay: true,
    volume: 0,
    onProgress: expect.any(Function),
    onEnd: expect.any(Function),
  })
  expect(onPlay).toHaveBeenCalledOnce()
  expect(screen.getByRole('button', { name: 'Pause' })).toBeDefined()
  press('Unmute')
  expect(player.setVolume).toHaveBeenCalledExactlyOnceWith(1)
})

it('honors autoplay enabled after mount and keeps a user-paused track paused', () => {
  const onPlay = vi.fn()
  const view = render(<AudioPlayer src={TRACK} onPlay={onPlay} />)
  view.rerender(<AudioPlayer src={TRACK} autoPlay onPlay={onPlay} />)
  expect(player.play).toHaveBeenCalledOnce()
  expect(onPlay).toHaveBeenCalledOnce()
  expect(createPlayer).toHaveBeenCalledOnce()
  press('Pause')
  view.rerender(<AudioPlayer src={TRACK} autoPlay={false} onPlay={onPlay} />)
  view.rerender(<AudioPlayer src={TRACK} autoPlay onPlay={onPlay} />)
  expect(player.play).toHaveBeenCalledOnce()
  expect(screen.getByRole('button', { name: 'Play' })).toBeDefined()
})

it('returns the control to Play and reports pause before the latest onEnded', () => {
  const initialEnd = vi.fn()
  const finalEnd = vi.fn()
  const onPause = vi.fn()
  const view = render(<AudioPlayer src={TRACK} onEnded={initialEnd} />)
  press('Play')
  view.rerender(<AudioPlayer src={TRACK} onPause={onPause} onEnded={finalEnd} />)
  expect(createPlayer).toHaveBeenCalledOnce()
  act(() => createPlayer.mock.lastCall?.[0].onEnd?.())
  expect(screen.getByRole('button', { name: 'Play' })).toBeDefined()
  expect(initialEnd).not.toHaveBeenCalled()
  expect(finalEnd).toHaveBeenCalledOnce()
  expect(onPause).toHaveBeenCalledOnce()
  expect(onPause).toHaveBeenCalledBefore(finalEnd)
  press('Play')
  expect(player.play).toHaveBeenCalledTimes(2)
})

it('releases replaced players, retains mute, and ignores events from the old source', () => {
  const end = vi.fn()
  const view = render(<AudioPlayer src={TRACK} defaultMuted onEnded={end} />)
  const first = createPlayer.mock.lastCall?.[0]
  const replacement = makePlayer()
  createPlayer.mockReturnValue(replacement)
  progress(20, 90)
  view.rerender(<AudioPlayer src={NEXT} onEnded={end} />)
  expect(player.destroy).toHaveBeenCalledOnce()
  expect(createPlayer).toHaveBeenLastCalledWith({
    src: NEXT,
    autoplay: false,
    volume: 0,
    onProgress: expect.any(Function),
    onEnd: expect.any(Function),
  })
  act(() => {
    first?.onProgress?.(80, 90)
    first?.onEnd?.()
  })
  expect(screen.getByText('0:00 / 0:00')).toBeDefined()
  expect(end).not.toHaveBeenCalled()
  view.unmount()
  expect(replacement.destroy).toHaveBeenCalledOnce()
})

it('puts the WebVTT language on the live caption and clears cue text after a seek', async () => {
  const fetchTrack = vi
    .fn<typeof fetch>()
    .mockResolvedValue(
      new Response(
        '\uFEFFWEBVTT\r\n\r\nNOTE Comment\r\n\r\nfirst\r\n00:01.000 --> 00:03.000 align:start\r\nLine one\r\nLine two\r\n\r\n00:02.000 --> 00:04.000\r\nOverlap\r\n',
      ),
    )
  vi.stubGlobal('fetch', fetchTrack)
  await act(async () => {
    render(
      <AudioPlayer src={TRACK} captions={CAPTIONS} captionsLang="en-US" captionsLabel="English" />,
    )
  })
  expect(fetchTrack).toHaveBeenCalledExactlyOnceWith(CAPTIONS, { signal: expect.any(AbortSignal) })
  const caption = screen.getByTestId('audio-player-captions')
  expect(caption.getAttribute('aria-live')).toBe('polite')
  expect(caption.getAttribute('lang')).toBe('en-US')
  expect(caption.getAttribute('aria-description')).toBeNull()
  expect(caption.querySelector('[aria-description]')).toBeNull()
  progress(2, 100)
  expect(caption.textContent).toBe('Line one\nLine two\nOverlap')
  progress(3, 100)
  expect(caption.textContent).toBe('Overlap')
  progress(4, 100)
  expect(caption.textContent).toBe('')
})

it('names the Expo bond and setup call when no native audio provider is configured', () => {
  unbond('audio')
  expect(() => renderToStaticMarkup(<AudioPlayer src={TRACK} />)).toThrowError(
    'No audio provider is bonded. Import `provider` from @molecule/app-audio-expo and call `setProvider(provider)` from @molecule/app-audio in `setupProviders()`.',
  )
})
