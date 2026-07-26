import type { VideoScrubberTranslations } from './types.js'

/** FeatureVideoScrubber translations for hr. */
export const hr: Partial<VideoScrubberTranslations> = {
  'videoScrubber.aria.root': 'Video preglednik',
  'videoScrubber.aria.strip':
    'Filmska vrpca — pokazivač reprodukcije na {{time}} s (okvir {{frame}} )',
  'videoScrubber.aria.playhead': 'Položaj reprodukcije na {{time}} s',
  'videoScrubber.aria.frameReadout': 'Okvir {{frame}} od {{total}}',
  'videoScrubber.aria.thumbnail': 'Pregled okvira',
  'videoScrubber.thumbnails.empty': 'Nema pregleda',
  'videoScrubber.frameReadout.total': '/ {{total}} okviri',
}
