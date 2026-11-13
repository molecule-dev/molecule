import type { ProjectTranslations } from './types.js'

/** Project translations for Spanish. */
export const es: ProjectTranslations = {
  'project.error.nameAndTypeRequired': 'Se requieren nombre y tipo de proyecto',
  'project.error.notFound': 'No encontrado',
  'project.error.forbidden': 'Acceso denegado',
  'project.error.createFailed': 'No se pudo crear el proyecto',
  'project.error.invalidType':
    'Tipo de proyecto no compatible; se esperaba uno de los siguientes: api, app, full-stack, static, status-page, status-page-edge',
  'project.error.deleteFailed': 'No se pudo eliminar el proyecto.',
  'project.error.listFailed': 'No se pudieron listar los proyectos',
  'project.error.readFailed': 'No se pudo leer el proyecto',
  'project.error.updateFailed': 'No se pudo actualizar el proyecto.',
}
