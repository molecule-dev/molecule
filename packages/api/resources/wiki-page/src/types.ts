/** Database row shape for a wiki page record. */
export interface WikiPageRow {
  id: string
  space_id: string
  parent_id: string | null
  slug: string
  title: string
  body: string
  position: number
  is_published: boolean
  created_at: string | Date
  updated_at: string | Date
}

/** Database row shape for a wiki space record. */
export interface WikiSpaceRow {
  id: string
  owner_id: string
  is_public?: boolean
  visibility?: string
}

/** Breadcrumb entry used when rendering a wiki page's ancestor trail. */
export interface WikiPageBreadcrumb {
  id: string
  slug: string
  title: string
}
