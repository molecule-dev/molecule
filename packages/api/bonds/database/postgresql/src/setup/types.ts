/**
 * PostgreSQL setup type definitions.
 *
 * @module
 */

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    /**
     * Process Env interface.
     */
    export interface ProcessEnv {
      /**
       * Your production platform (API server host) typically sets this for you.
       *
       * You can set this to initialize your production API's database
       * by retrieving the value from your host and running the following command:
       * ```
       * DATABASE_URL=postgres://yourverylongdatabaseurl npm run setup-database
       * ```
       */
      DATABASE_URL?: string

      /**
       * The PostgreSQL database name.
       *
       * @see https://www.postgresql.org/docs/current/libpq-envars.html
       */
      PGDATABASE?: string

      /**
       * The PostgreSQL user.
       *
       * @see https://www.postgresql.org/docs/current/libpq-envars.html
       */
      PGUSER?: string

      /**
       * The PostgreSQL user's password.
       *
       * @see https://www.postgresql.org/docs/current/libpq-envars.html
       */
      PGPASSWORD?: string
    }
  }
}

// Required for module augmentation
export {}
