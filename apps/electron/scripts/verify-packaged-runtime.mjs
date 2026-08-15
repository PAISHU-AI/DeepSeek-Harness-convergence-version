import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const harness = resolve(root, 'apps/electron/dist/mac-arm64/DeepSeek Harness.app/Contents/Resources/harness')

if (!existsSync(harness)) throw new Error(`packaged runtime missing: ${harness}`)

for (const name of ['.credentials.yaml', 'credentials.json', 'settings.yaml', '.anonymous-user-id', 'profiles', 'sessions', 'storages']) {
  if (existsSync(resolve(harness, name))) {
    throw new Error(`packaged application contains user data: ${name}`)
  }
}

console.log('packaged runtime contains no user credentials or user state')
