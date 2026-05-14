import type { TrashTranslations } from './types.js'

/** Trash translations for Portuguese. */
export const pt: TrashTranslations = {
  'trash.error.alreadyResolved': 'O item descartado já foi restaurado ou removido permanentemente',
  'trash.error.countFailed': 'Falha ao contar itens descartados',
  'trash.error.listFailed': 'Falha ao listar itens descartados',
  'trash.error.missingId': 'O ID da lixeira é obrigatório',
  'trash.error.missingResource': 'O tipo e o ID do recurso são obrigatórios',
  'trash.error.notFound': 'Item descartado não encontrado',
  'trash.error.noRestoreHandler':
    'Nenhum manipulador de restauração registrado para este tipo de recurso',
  'trash.error.purgeFailed': 'Falha ao remover permanentemente o item descartado',
  'trash.error.readFailed': 'Falha ao ler o item descartado',
  'trash.error.restoreFailed': 'Falha ao restaurar o item descartado',
  'trash.error.trashFailed': 'Falha ao mover o item para a lixeira',
  'trash.error.validationFailed': 'A validação falhou',
}
