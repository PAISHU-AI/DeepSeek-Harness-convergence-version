// @vitest-environment jsdom
/** Browser plugin bundles must never delegate Node built-ins to the module table. */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

function readBundle(): string | undefined {
  try {
    return readFileSync(resolve('packages/client/ui-conversation/lib/client.js'), 'utf8')
  } catch {
    return undefined
  }
}

describe('tsdown client artifact', () => {
  const code = readBundle()

  it.skipIf(code === undefined)('does not require Node built-ins through the browser module loader', () => {
    expect(code).not.toMatch(/require\(["'](?:fs|node:fs|path|node:path|stream|node:stream|url|node:url|os|node:os)["']\)/)
  })
})
