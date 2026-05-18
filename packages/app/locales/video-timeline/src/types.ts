/** Translation keys for the video-timeline locale package. */
export type VideoTimelineTranslationKey =
  | 'videoTimeline.aria.ruler'
  | 'videoTimeline.aria.playhead'
  | 'videoTimeline.zoom.in'
  | 'videoTimeline.zoom.out'
  | 'videoTimeline.aria.mode'
  | 'videoTimeline.aria.root'
  | 'videoTimeline.mode.${mode}'
  | 'videoTimeline.zoom.in.icon'

/** Translation record mapping video-timeline-react keys to translated strings. */
export type VideoTimelineTranslations = Record<VideoTimelineTranslationKey, string>
