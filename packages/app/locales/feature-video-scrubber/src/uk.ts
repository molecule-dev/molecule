import type { VideoScrubberTranslations } from './types.js'

/** FeatureVideoScrubber translations for uk. */
export const uk: Partial<VideoScrubberTranslations> = {
  'videoScrubber.aria.root': 'Відеопомічник',
  'videoScrubber.aria.strip':
    'Кінострічка — позиція відтворення на<x> {{час}}</x> s (кадр<x> {{кадр}}</x> )',
  'videoScrubber.aria.playhead': 'Точка відтворення на<x> {{час}}</x> с',
  'videoScrubber.aria.frameReadout': 'Рамка<x> {{кадр}}</x> з<x> {{всього}}</x>',
  'videoScrubber.aria.thumbnail': 'Попередній перегляд кадру',
  'videoScrubber.thumbnails.empty': 'Без попереднього перегляду',
  'videoScrubber.frameReadout.total': '/<x> {{всього}}</x> рамки',
}
