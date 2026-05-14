import type { VersionHistoryTranslations } from './types.js'

/** Version-history resource translations for Portuguese. */
export const pt: VersionHistoryTranslations = {
  'versionHistory.error.countFailed': 'Falha ao contar versões',
  'versionHistory.error.createFailed': 'Falha ao criar versão',
  'versionHistory.error.diffFailed': 'Falha ao comparar versões',
  'versionHistory.error.diffNotFound':
    'Uma ou ambas as versões não foram encontradas, ou pertencem a recursos diferentes',
  'versionHistory.error.invalidVersion': 'O número da versão deve ser um inteiro positivo',
  'versionHistory.error.listFailed': 'Falha ao listar versões',
  'versionHistory.error.missingId': 'O ID da versão é obrigatório',
  'versionHistory.error.missingResource': 'O tipo e o ID do recurso são obrigatórios',
  'versionHistory.error.notFound': 'Versão não encontrada',
  'versionHistory.error.readFailed': 'Falha ao ler versão',
  'versionHistory.error.restoreFailed': 'Falha ao restaurar versão',
  'versionHistory.error.validationFailed': 'A validação falhou',
}
