import type { VideoScrubberTranslations } from './types.js'

/** FeatureVideoScrubber translations for bs. */
export const bs: Partial<VideoScrubberTranslations> = {
  'videoScrubber.aria.root': 'Video preglednik',
  'videoScrubber.aria.strip':
    'Filmska traka — pokazivač reprodukcije na {{time}} s (okvir {{frame}} )',
  'videoScrubber.aria.playhead': 'Položaj za reprodukciju na {{time}} s',
  'videoScrubber.aria.frameReadout': 'Okvir {{frame}} od {{total}}',
  'videoScrubber.aria.thumbnail': 'Pregled kadra',
  'videoScrubber.thumbnails.empty': 'Nema pregleda',
  'videoScrubber.frameReadout.total': '/ {{total}} okviri',
}
