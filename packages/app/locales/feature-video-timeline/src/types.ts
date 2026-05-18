/** Translation keys for the feature-video-timeline locale package. */
export type VideoTimelineTranslationKey =
  | 'videoTimeline.aria.root'
  | 'videoTimeline.aria.ruler'
  | 'videoTimeline.aria.playhead'
  | 'videoTimeline.aria.zoom'
  | 'videoTimeline.aria.mode'
  | 'videoTimeline.zoom.in'
  | 'videoTimeline.zoom.out'
  | 'videoTimeline.zoom.in.icon'
  | 'videoTimeline.zoom.out.icon'
  | 'videoTimeline.mode.ripple'
  | 'videoTimeline.mode.insert'
  | 'videoTimeline.trackKind.video'
  | 'videoTimeline.trackKind.audio'
  | 'videoTimeline.trackKind.subtitle'

/** Translation record mapping video-timeline keys to translated strings. */
export type VideoTimelineTranslations = Record<VideoTimelineTranslationKey, string>
