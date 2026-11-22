/**
 * The sample blog API's route table, written the way a template's handlers index is: the
 * scanner reads each `router.use` mount for its handler's prefix.
 *
 * @module
 */
import { Router } from 'express'

import { router as posts } from './posts.js'

/** Every API route, mounted under `/api` by the app. */
export const router = Router()

router.use('/posts', posts)
