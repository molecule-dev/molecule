import type { VideoScrubberTranslations } from './types.js'

/** FeatureVideoScrubber translations for hu. */
export const hu: Partial<VideoScrubberTranslations> = {
  'videoScrubber.aria.root': 'Videókereső',
  'videoScrubber.aria.strip':
    'Filmszalag — lejátszófej itt<x> {{idő}}</x> s (keret<x> {{keret}}</x> )',
  'videoScrubber.aria.playhead': 'Lejátszási fej itt:<x> {{idő}}</x> sz',
  'videoScrubber.aria.frameReadout': 'Keret<x> {{keret}}</x> a<x> {{teljes}}</x>',
  'videoScrubber.aria.thumbnail': 'Képkocka előnézete',
  'videoScrubber.thumbnails.empty': 'Nincs előnézet',
  'videoScrubber.frameReadout.total': '/<x> {{teljes}}</x> keretek',
}
