import { existsSync } from 'node:fs'
import { cp, mkdir, readdir, readlink, rm, symlink, unlink } from 'node:fs/promises'
import { dirname, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const staging = resolve(root, 'dist/desktop-runtime')
await rm(staging, { recursive: true, force: true })
await mkdir(staging, { recursive: true })

// dsh discovers plugins from its complete workspace dependency closure. pnpm's
// deploy command cannot currently retain all of the dynamic profile peers, so
// stage the built runtime in the same layout that Node resolves in development.
// Electron Builder intentionally omits hidden `.pnpm` directories from an
// extra-resource tree. Keep pnpm's real package store in a visible sibling,
// then retarget the workspace links to it below.
const sourceModules = resolve(root, 'node_modules')
const sourceStore = resolve(sourceModules, '.pnpm')
const stagedModules = resolve(staging, 'node_modules')
const stagedHiddenStore = resolve(stagedModules, '.pnpm')
const stagedStore = resolve(staging, 'pnpm-store')

await cp(sourceModules, stagedModules, {
  recursive: true,
  dereference: false,
  verbatimSymlinks: true,
  filter: source => source !== sourceStore,
})
await cp(sourceStore, stagedStore, {
  recursive: true,
  dereference: false,
  verbatimSymlinks: true,
})

for (const directory of ['packages', 'vendor', 'native/landlock-run', 'apps/cli', 'apps/web']) {
  await cp(resolve(root, directory), resolve(staging, directory), {
    recursive: true,
    dereference: false,
    // Preserve pnpm's relative workspace links. The default normalizes them
    // to absolute paths, which would make a packaged application silently
    // execute code from the developer checkout instead of its bundled copy.
    verbatimSymlinks: true,
  })
}

/** Replace links to the hidden pnpm store with links to the packaged store. */
async function relocatePnpmLinks(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name)
    if (entry.isDirectory()) {
      await relocatePnpmLinks(path)
      continue
    }
    if (!entry.isSymbolicLink()) continue
    const target = await readlink(path)
    const resolvedTarget = resolve(dirname(path), target)
    const fromSourceStore = resolvedTarget === sourceStore || resolvedTarget.startsWith(`${sourceStore}${sep}`)
    const fromStagedHiddenStore = resolvedTarget === stagedHiddenStore || resolvedTarget.startsWith(`${stagedHiddenStore}${sep}`)
    if (!fromSourceStore && !fromStagedHiddenStore) continue
    const source = fromSourceStore ? sourceStore : stagedHiddenStore
    const stagedTarget = resolve(stagedStore, relative(source, resolvedTarget))
    await unlink(path)
    await symlink(relative(dirname(path), stagedTarget), path)
  }
}

await relocatePnpmLinks(staging)

for (const path of [resolve(staging, 'apps/cli/lib/bin.js')]) {
  if (!existsSync(path)) throw new Error(`desktop runtime staging missed ${path}`)
}

// User data belongs exclusively in Electron's per-user application-support
// directory (`DSH_HOME` is set there by main.ts). Never make a distributable
// artifact carry credentials, settings, history, or initialized profiles.
for (const name of ['.credentials.yaml', 'credentials.json', 'settings.yaml', '.anonymous-user-id', 'profiles', 'sessions', 'storages']) {
  if (existsSync(resolve(staging, name))) {
    throw new Error(`refusing to package user data: ${name}`)
  }
}
