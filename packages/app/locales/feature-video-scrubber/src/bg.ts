import type { VideoScrubberTranslations } from './types.js'

/** FeatureVideoScrubber translations for bg. */
export const bg: Partial<VideoScrubberTranslations> = {
  'videoScrubber.aria.root': 'Видео плъзгач',
  'videoScrubber.aria.strip':
    'Филмова лента — позиция за възпроизвеждане на<x> {{време}}</x> s (кадър<x> {{кадър}}</x> )',
  'videoScrubber.aria.playhead': 'Показалец на възпроизвеждане в<x> {{време}}</x> с',
  'videoScrubber.aria.frameReadout': 'Рамка<x> {{кадър}}</x> от<x> {{общо}}</x>',
  'videoScrubber.aria.thumbnail': 'Преглед на кадъра',
  'videoScrubber.thumbnails.empty': 'Без предварителен преглед',
  'videoScrubber.frameReadout.total': '/<x> {{общо}}</x> рамки',
}
