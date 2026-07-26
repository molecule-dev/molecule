import type { VideoScrubberTranslations } from './types.js'

/** FeatureVideoScrubber translations for sr. */
export const sr: Partial<VideoScrubberTranslations> = {
  'videoScrubber.aria.root': 'Видео клизач',
  'videoScrubber.aria.strip':
    'Филмска трака — позиција за репродукцију на {{time}} с (оквир {{frame}} )',
  'videoScrubber.aria.playhead': 'Показивач репродукције на {{time}} с',
  'videoScrubber.aria.frameReadout': 'Оквир {{frame}} од {{total}}',
  'videoScrubber.aria.thumbnail': 'Преглед кадра',
  'videoScrubber.thumbnails.empty': 'Без прегледа',
  'videoScrubber.frameReadout.total': '/ {{total}} оквири',
}
