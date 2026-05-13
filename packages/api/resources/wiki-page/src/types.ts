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

export interface WikiSpaceRow {
  id: string
  owner_id: string
  is_public?: boolean
  visibility?: string
}

export interface WikiPageBreadcrumb {
  id: string
  slug: string
  title: string
}
