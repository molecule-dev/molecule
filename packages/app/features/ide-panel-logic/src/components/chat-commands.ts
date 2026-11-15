/**
 * Slash-command registry for the chat panel.
 *
 * The command definitions themselves now live in the React-free
 * {@link module:../command-metadata | command-metadata} module at the package
 * root, so the **single source of truth** can be imported on either side of the
 * api/app boundary — the IDE chat surfaces read it here, and the molecule.dev
 * API system prompt reads the very same array through the package's
 * `./command-metadata` subpath export. This file re-exports that module so the
 * chat components keep their local `./chat-commands.js` import path; it adds no
 * data of its own (extending the list here instead of in `command-metadata.ts`
 * would re-introduce exactly the duplication SYN15 was about).
 *
 * @module
 */

export * from '../command-metadata.js'
