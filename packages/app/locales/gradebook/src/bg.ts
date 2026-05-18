import type { GradebookTranslations } from './types.js'

/** Gradebook translations for bg. */
export const bg: Partial<GradebookTranslations> = {
  'gradebook.aria.region': 'Дневник с оценки',
  'gradebook.empty': 'Все още няма оценки.',
  'gradebook.col.title': 'Курс',
  'gradebook.col.letter': 'Писмо',
  'gradebook.col.numeric': 'Резултат',
  'gradebook.col.numericPct': 'Резултат (%)',
  'gradebook.col.weight': 'Тегло',
  'gradebook.col.contribution': 'Принос към GPA',
  'gradebook.col.posted': 'Публикувано',
  'gradebook.gpa.title': 'Среден успех',
  'gradebook.gpa.outOf': 'извън<x> {{max}}</x>',
  'gradebook.gpa.trend.up': 'Възходяща тенденция',
  'gradebook.gpa.trend.down': 'Тенденция надолу',
  'gradebook.gpa.trend.flat': 'Стабилен',
}
