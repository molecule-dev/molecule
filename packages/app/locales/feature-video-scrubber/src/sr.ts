import type { VideoScrubberTranslations } from './types.js'

/** FeatureVideoScrubber translations for sr. */
export const sr: Partial<VideoScrubberTranslations> = {
  'videoScrubber.aria.root': 'Видео клизач',
  'videoScrubber.aria.strip':
    'Филмска трака — позиција за репродукцију на<x> {{време}}</x> с (оквир<x> {{frame}}</x> )',
  'videoScrubber.aria.playhead': 'Показивач репродукције на<x> {{време}}</x> с',
  'videoScrubber.aria.frameReadout': 'Оквир<x> {{frame}}</x> од<x> {{укупно}}</x>',
  'videoScrubber.aria.thumbnail': 'Преглед кадра',
  'videoScrubber.thumbnails.empty': 'Без прегледа',
  'videoScrubber.frameReadout.total': '/<x> {{укупно}}</x> оквири',
}
