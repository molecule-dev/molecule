import type { VideoScrubberTranslations } from './types.js'

/** FeatureVideoScrubber translations for fil. */
export const fil: Partial<VideoScrubberTranslations> = {
  'videoScrubber.aria.root': 'Pangkuskos ng video',
  'videoScrubber.aria.strip':
    'Filmstrip — playhead sa<x> {{oras}}</x> s (balangkas<x> {{frame}}</x> )',
  'videoScrubber.aria.playhead': 'Playhead sa<x> {{oras}}</x> mga',
  'videoScrubber.aria.frameReadout': 'Balangkas<x> {{frame}}</x> ng<x> {{kabuuan}}</x>',
  'videoScrubber.aria.thumbnail': 'Preview ng frame',
  'videoScrubber.thumbnails.empty': 'Walang preview',
  'videoScrubber.frameReadout.total': '/<x> {{kabuuan}}</x> mga frame',
}
