import type { GradeTranslations } from './types.js'

/** Grade translations for Portuguese. */
export const pt: GradeTranslations = {
  'grade.error.forbidden': 'Access denied',
  'grade.error.foreignKeysRequired':
    'Os campos enrollmentId, assignmentId, userId e courseId são obrigatórios.',
  'grade.error.scoreNumeric': 'scorePoints e maxPoints devem ser números.',
  'grade.error.maxPointsPositive': 'maxPoints deve ser maior que zero',
  'grade.error.scoreOutOfRange': 'A pontuação deve estar entre 0 e maxPoints.',
  'grade.error.createFailed': 'Não foi possível publicar a nota.',
  'grade.error.notFound': 'Nota não encontrada',
  'grade.error.readFailed': 'Não conseguiu ler a nota',
  'grade.error.listFailed': 'Não foram listadas as notas.',
  'grade.error.updateFailed': 'Falha ao atualizar a nota',
  'grade.error.deleteFailed': 'Falha ao excluir a nota',
  'grade.error.noGrades': 'Nenhuma nota encontrada',
  'grade.error.courseAverageFailed': 'Falha ao calcular a média do curso',
  'grade.error.gpaFailed': 'Falha ao calcular o GPA',
  'grade.error.transcriptFailed': 'Falha ao gerar transcrição',
}
