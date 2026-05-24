import type { VideoScrubberTranslations } from './types.js'

/** FeatureVideoScrubber translations for fi. */
export const fi: Partial<VideoScrubberTranslations> = {
  'videoScrubber.aria.root': 'Videon valintakytkin',
  'videoScrubber.aria.strip':
    'Filminauha — toistopää kohdassa<x> {{aika}}</x> s (kehys<x> {{kehys}}</x> )',
  'videoScrubber.aria.playhead': 'Toistopää osoitteessa<x> {{aika}}</x> s',
  'videoScrubber.aria.frameReadout': 'Kehys<x> {{kehys}}</x> jostakin<x> {{kokonais}}</x>',
  'videoScrubber.aria.thumbnail': 'Kehyksen esikatselu',
  'videoScrubber.thumbnails.empty': 'Ei esikatselua',
  'videoScrubber.frameReadout.total': '/<x> {{kokonais}}</x> kehykset',
}
