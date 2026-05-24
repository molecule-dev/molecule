import type { VideoScrubberTranslations } from './types.js'

/** FeatureVideoScrubber translations for sv. */
export const sv: Partial<VideoScrubberTranslations> = {
  'videoScrubber.aria.root': 'Videoskrubber',
  'videoScrubber.aria.strip':
    'Filmremsa — uppspelningshuvud vid<x> {{tid}}</x> s (ram<x> {{ram}}</x> )',
  'videoScrubber.aria.playhead': 'Uppspelningshuvud vid<x> {{tid}}</x> s',
  'videoScrubber.aria.frameReadout': 'Ram<x> {{ram}}</x> av<x> {{total}}</x>',
  'videoScrubber.aria.thumbnail': 'Förhandsgranskning av bildruta',
  'videoScrubber.thumbnails.empty': 'Ingen förhandsgranskning',
  'videoScrubber.frameReadout.total': '/<x> {{total}}</x> ramar',
}
