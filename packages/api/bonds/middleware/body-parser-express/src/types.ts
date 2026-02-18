/**
 * Express body parser type augmentations.
 *
 * @module
 */

declare module 'express-serve-static-core' {
  /**
   * Extend Express's `Request` (`req`) object to include multipart fields.
   */
  export interface Request {
    /**
     * The original unparsed body when using the JSON parser.
     */
    rawBody?: string
  }
}
