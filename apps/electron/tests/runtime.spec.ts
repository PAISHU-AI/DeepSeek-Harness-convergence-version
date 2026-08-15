import { describe, expect, it } from 'vitest'
import { parseHostUrl } from '../src/runtime.ts'

describe('parseHostUrl', () => {
  it('accepts the loopback URL announced by the Harness host', () => {
    const url = parseHostUrl('dsh web: http://127.0.0.1:43123')

    expect(url?.href).toBe('http://127.0.0.1:43123/')
  })

  it('rejects a non-loopback or malformed Host announcement', () => {
    expect(parseHostUrl('dsh web: http://harness.example:43123')).toBeUndefined()
    expect(parseHostUrl('dsh web: http://127.0.0.1:not-a-port')).toBeUndefined()
    expect(parseHostUrl('unrelated diagnostic')).toBeUndefined()
  })
})
