import type { VideoScrubberTranslations } from './types.js'

/** FeatureVideoScrubber translations for ru. */
export const ru: Partial<VideoScrubberTranslations> = {
  'videoScrubber.aria.root': 'Видеоскруббер',
  'videoScrubber.aria.strip':
    'Кинопленка — ползунок воспроизведения на {{time}} s (рамка) {{frame}} )',
  'videoScrubber.aria.playhead': 'Playhead на {{time}} с',
  'videoScrubber.aria.frameReadout': 'Рамка {{frame}} из {{total}}',
  'videoScrubber.aria.thumbnail': 'Предварительный просмотр кадра',
  'videoScrubber.thumbnails.empty': 'Предварительный просмотр отсутствует',
  'videoScrubber.frameReadout.total': '/ {{total}} рамки',
}
