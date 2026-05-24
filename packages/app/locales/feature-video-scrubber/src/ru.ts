import type { VideoScrubberTranslations } from './types.js'

/** FeatureVideoScrubber translations for ru. */
export const ru: Partial<VideoScrubberTranslations> = {
  'videoScrubber.aria.root': 'Видеоскруббер',
  'videoScrubber.aria.strip':
    'Кинопленка — ползунок воспроизведения на<x> {{время}}</x> s (рамка)<x> {{рамка}}</x> )',
  'videoScrubber.aria.playhead': 'Playhead на<x> {{время}}</x> с',
  'videoScrubber.aria.frameReadout': 'Рамка<x> {{рамка}}</x> из<x> {{общий}}</x>',
  'videoScrubber.aria.thumbnail': 'Предварительный просмотр кадра',
  'videoScrubber.thumbnails.empty': 'Предварительный просмотр отсутствует',
  'videoScrubber.frameReadout.total': '/<x> {{общий}}</x> рамки',
}
