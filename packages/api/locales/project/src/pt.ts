import type { ProjectTranslations } from './types.js'

/** Project translations for Portuguese. */
export const pt: ProjectTranslations = {
  'project.error.nameAndTypeRequired': 'O nome e o tipo de projeto são obrigatórios',
  'project.error.notFound': 'Não encontrado',
  'project.error.forbidden': 'Acesso negado',
  'project.error.createFailed': 'Falha ao criar o projeto',
  'project.error.invalidType':
    'Tipo de projeto não suportado; esperava-se um dos seguintes: api, app, full-stack, static, status-page, status-page-edge',
  'project.error.deleteFailed': 'Falha ao excluir o projeto',
  'project.error.listFailed': 'Falha ao listar projetos',
  'project.error.readFailed': 'Falha ao ler o projeto',
  'project.error.updateFailed': 'Falha ao atualizar o projeto',
}
