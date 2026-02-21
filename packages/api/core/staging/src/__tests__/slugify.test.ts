import { describe, expect, it } from 'vitest'

import { branchToSlug } from '../slugify.js'

describe('branchToSlug', () => {
  it('should convert simple branch names', () => {
    expect(branchToSlug('main')).toBe('main')
    expect(branchToSlug('develop')).toBe('develop')
  })

  it('should convert slashes to hyphens', () => {
    expect(branchToSlug('feature/user-login')).toBe('feature-user-login')
    expect(branchToSlug('fix/auth/oauth')).toBe('fix-auth-oauth')
  })

  it('should lowercase the result', () => {
    expect(branchToSlug('Feature/UserLogin')).toBe('feature-userlogin')
    expect(branchToSlug('HOTFIX')).toBe('hotfix')
  })

  it('should replace underscores with hyphens', () => {
    expect(branchToSlug('feature_branch')).toBe('feature-branch')
  })

  it('should strip refs/heads/ prefix', () => {
    expect(branchToSlug('refs/heads/main')).toBe('main')
    expect(branchToSlug('refs/heads/feature/login')).toBe('feature-login')
  })

  it('should collapse consecutive hyphens', () => {
    expect(branchToSlug('feature//double')).toBe('feature-double')
    expect(branchToSlug('a---b')).toBe('a-b')
  })

  it('should trim leading and trailing hyphens', () => {
    expect(branchToSlug('-leading')).toBe('leading')
    expect(branchToSlug('trailing-')).toBe('trailing')
    expect(branchToSlug('-both-')).toBe('both')
  })

  it('should truncate to maxLength', () => {
    const long = 'feature/this-is-a-very-long-branch-name-that-should-be-truncated'
    const slug = branchToSlug(long, 20)
    expect(slug.length).toBeLessThanOrEqual(20)
    expect(slug).toBe('feature-this-is-a-ve')
  })

  it('should avoid trailing hyphen after truncation', () => {
    const slug = branchToSlug('feature/a-b-c-d-e', 11)
    expect(slug.endsWith('-')).toBe(false)
  })

  it('should handle special characters', () => {
    expect(branchToSlug('feat@123')).toBe('feat-123')
    expect(branchToSlug('fix(bug)')).toBe('fix-bug')
    expect(branchToSlug('v1.2.3')).toBe('v1-2-3')
  })

  it('should handle empty string', () => {
    expect(branchToSlug('')).toBe('')
  })

  it('should use default maxLength of 40', () => {
    const long = 'a'.repeat(50)
    expect(branchToSlug(long).length).toBe(40)
  })
})
