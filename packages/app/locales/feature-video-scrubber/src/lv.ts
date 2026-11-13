import type { VideoScrubberTranslations } from './types.js'

/** FeatureVideoScrubber translations for lv. */
export const lv: Partial<VideoScrubberTranslations> = {
  'videoScrubber.aria.root': 'Video skruberis',
  'videoScrubber.aria.strip':
    'Filmas josla — atskaņošanas galviņa pie {{time}} s (kadrs {{frame}})',
  'videoScrubber.aria.playhead': 'Playhead at {{time}}s',
  'videoScrubber.aria.frameReadout': 'Frame {{frame}} of {{total}}',
  'videoScrubber.aria.thumbnail': 'Kadra priekšskatījums',
  'videoScrubber.thumbnails.empty': 'Nav priekšskatījuma',
  'videoScrubber.frameReadout.total': '/ {{total}} frames',
}
