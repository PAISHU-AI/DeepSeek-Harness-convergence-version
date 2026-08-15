import { describe, expect, it } from 'vitest'
import { isAllowedExternalUrl, isAllowedNavigation } from '../src/security.ts'

describe('isAllowedNavigation', () => {
  const host = new URL('http://127.0.0.1:43123/')

  it('allows only the exact local Host origin', () => {
    expect(isAllowedNavigation('http://127.0.0.1:43123/session/1', host)).toBe(true)
    expect(isAllowedNavigation('http://127.0.0.1:43124/', host)).toBe(false)
  })

  it('does not treat another loopback form as the assigned Host', () => {
    expect(isAllowedNavigation('http://localhost:43123/', host)).toBe(false)
    expect(isAllowedNavigation('https://example.com/', host)).toBe(false)
  })
})

describe('isAllowedExternalUrl', () => {
  it('permits HTTPS browser links only', () => {
    expect(isAllowedExternalUrl('https://deepseek.com/')).toBe(true)
    expect(isAllowedExternalUrl('http://deepseek.com/')).toBe(false)
    expect(isAllowedExternalUrl('file:///etc/passwd')).toBe(false)
  })
})
