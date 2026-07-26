import type { VideoScrubberTranslations } from './types.js'

/** FeatureVideoScrubber translations for fi. */
export const fi: Partial<VideoScrubberTranslations> = {
  'videoScrubber.aria.root': 'Videon valintakytkin',
  'videoScrubber.aria.strip': 'Filminauha — toistopää kohdassa {{time}} s (kehys {{frame}} )',
  'videoScrubber.aria.playhead': 'Toistopää osoitteessa {{time}} s',
  'videoScrubber.aria.frameReadout': 'Kehys {{frame}} jostakin {{total}}',
  'videoScrubber.aria.thumbnail': 'Kehyksen esikatselu',
  'videoScrubber.thumbnails.empty': 'Ei esikatselua',
  'videoScrubber.frameReadout.total': '/ {{total}} kehykset',
}
