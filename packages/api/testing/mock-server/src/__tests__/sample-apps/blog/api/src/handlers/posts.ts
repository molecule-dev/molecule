/**
 * The posts routes of a sample blog API, written the way a template's handler file is. The mock
 * server's handler scanner reads this source for its routes and response shapes; nothing runs it.
 *
 * @module
 */
import type { Request, Response } from 'express'
import { Router } from 'express'

/** The posts router, mounted at `/posts`. */
export const router = Router()

const posts: { id: string; title: string }[] = []

router.get('/', async (_req: Request, res: Response) => {
  res.json({ data: posts, total: posts.length })
})

router.get('/:id', async (req: Request, res: Response) => {
  const post = posts.find(({ id }) => id === req.params.id)
  if (!post) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  res.json(post)
})
