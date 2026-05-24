import type { VideoScrubberTranslations } from './types.js'

/** FeatureVideoScrubber translations for nb. */
export const nb: Partial<VideoScrubberTranslations> = {
  'videoScrubber.aria.root': 'Videoskrubbing',
  'videoScrubber.aria.strip':
    'Filmstripe — avspillingshode på<x> {{tid}}</x> s (ramme<x> {{ramme}}</x> )',
  'videoScrubber.aria.playhead': 'Avspillingshode på<x> {{tid}}</x> s',
  'videoScrubber.aria.frameReadout': 'Ramme<x> {{ramme}}</x> av<x> {{total}}</x>',
  'videoScrubber.aria.thumbnail': 'Forhåndsvisning av bilde',
  'videoScrubber.thumbnails.empty': 'Ingen forhåndsvisning',
  'videoScrubber.frameReadout.total': '/<x> {{total}}</x> rammer',
}
