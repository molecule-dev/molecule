import { t } from '@molecule/api-i18n'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

/**
 * Reads a single device from `res.locals.device`, which is set by the `authUser` authorizer
 * middleware. Returns 404 if the device was not found during authorization.
 * @param resource - The device resource configuration (tableName).
 * @param resource.tableName - The database table name for devices.
 * @returns A request handler that responds with `{ statusCode: 200, body: { props } }`.
 */
export const read = ({ tableName: _tableName }: { tableName: string }) => {
  return (_req: MoleculeRequest, res: MoleculeResponse) => {
    const props = res.locals.device
    if (props) {
      return { statusCode: 200, body: { props } }
    }
    return {
      statusCode: 404,
      body: { error: t('device.error.notFound'), errorKey: 'device.error.notFound' },
    }
  }
}
