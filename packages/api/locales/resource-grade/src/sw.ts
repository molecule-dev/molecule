import type { GradeTranslations } from './types.js'

/** Grade translations for Swahili. */
export const sw: GradeTranslations = {
  'grade.error.forbidden': 'Access denied',
  'grade.error.foreignKeysRequired':
    'Kitambulisho cha usajili, Kitambulisho cha kazi, Kitambulisho cha mtumiaji, na Kitambulisho cha kozi vinahitajika',
  'grade.error.scoreNumeric': 'Pointi za alama na Pointi za juu lazima ziwe nambari',
  'grade.error.maxPointsPositive': 'Pointi za juu lazima ziwe kubwa kuliko sifuri',
  'grade.error.scoreOutOfRange': 'Pointi za alama lazima ziwe kati ya Pointi 0 na max',
  'grade.error.createFailed': 'Imeshindwa kuchapisha alama',
  'grade.error.notFound': 'Daraja halijapatikana',
  'grade.error.readFailed': 'Imeshindwa kusoma alama',
  'grade.error.listFailed': 'Imeshindwa kuorodhesha alama',
  'grade.error.updateFailed': 'Imeshindwa kusasisha daraja',
  'grade.error.deleteFailed': 'Imeshindwa kufuta daraja',
  'grade.error.noGrades': 'Hakuna alama zilizopatikana',
  'grade.error.courseAverageFailed': 'Imeshindwa kuhesabu wastani wa kozi',
  'grade.error.gpaFailed': 'Imeshindwa kukokotoa GPA',
  'grade.error.transcriptFailed': 'Imeshindwa kutengeneza nakala',
}
