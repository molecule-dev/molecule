import type { VideoScrubberTranslations } from './types.js'

/** FeatureVideoScrubber translations for bg. */
export const bg: Partial<VideoScrubberTranslations> = {
  'videoScrubber.aria.root': 'Видео плъзгач',
  'videoScrubber.aria.strip':
    'Филмова лента — позиция за възпроизвеждане на {{time}} s (кадър {{frame}} )',
  'videoScrubber.aria.playhead': 'Показалец на възпроизвеждане в {{time}} с',
  'videoScrubber.aria.frameReadout': 'Рамка {{frame}} от {{total}}',
  'videoScrubber.aria.thumbnail': 'Преглед на кадъра',
  'videoScrubber.thumbnails.empty': 'Без предварителен преглед',
  'videoScrubber.frameReadout.total': '/ {{total}} рамки',
}
