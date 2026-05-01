/** Translation keys for the gradebook-react locale package. */
export type GradebookTranslationKey =
  | 'gradebook.aria.region'
  | 'gradebook.empty'
  | 'gradebook.col.title'
  | 'gradebook.col.letter'
  | 'gradebook.col.numeric'
  | 'gradebook.col.numericPct'
  | 'gradebook.col.weight'
  | 'gradebook.col.contribution'
  | 'gradebook.col.posted'
  | 'gradebook.gpa.title'
  | 'gradebook.gpa.outOf'
  | 'gradebook.gpa.trend.up'
  | 'gradebook.gpa.trend.down'
  | 'gradebook.gpa.trend.flat'

/** Translation record mapping gradebook keys to translated strings. */
export type GradebookTranslations = Record<GradebookTranslationKey, string>
