/**
 * Message resource authorizers.
 *
 * Thread participation is enforced inside each handler (the authenticated
 * user must be `participantAId` or `participantBId`). Message authorship
 * is enforced in the service layer (`editMessage`, `deleteMessage`).
 * No additional authorizers are required.
 *
 * @module
 */
