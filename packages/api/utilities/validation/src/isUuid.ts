/**
 * Basic regex for determining whether or not a string is a UUID.
 * @param uuid - The uuid.
 * @returns Whether uuid.
 */
export const isUuid = (uuid: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid)
