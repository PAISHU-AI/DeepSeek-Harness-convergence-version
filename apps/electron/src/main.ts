/** Electron main-process entry for the local DeepSeek Harness desktop application. */

import { app, BrowserWindow, shell } from 'electron'
import { mkdir } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { HostProcess } from './runtime.ts'
import { isAllowedExternalUrl, isAllowedNavigation } from './security.ts'

let host: HostProcess | undefined
let quitting = false

function runtimeRoot(): string {
  if (app.isPackaged) return join(process.resourcesPath, 'harness')
  return resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
}

function desktopWindow(): BrowserWindow {
  return new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 960,
    minHeight: 640,
    show: false,
    backgroundColor: '#101114',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })
}

async function bootstrap(): Promise<void> {
  await app.whenReady()
  const win = desktopWindow()
  win.webContents.session.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false))
  const root = runtimeRoot()
  const dshHome = join(app.getPath('userData'), 'harness')
  await mkdir(dshHome, { recursive: true })
  host = new HostProcess({
    nodePath: process.execPath,
    dshEntry: join(root, 'apps/cli/lib/bin.js'),
    dshHome,
  })

  try {
    const url = await host.start()
    win.webContents.setWindowOpenHandler(({ url: external }) => {
      if (isAllowedExternalUrl(external)) void shell.openExternal(external)
      return { action: 'deny' }
    })
    win.webContents.on('will-navigate', (event, destination) => {
      if (!isAllowedNavigation(destination, url)) event.preventDefault()
    })
    await win.loadURL(url.href)
    win.show()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await win.loadURL(`data:text/html,${encodeURIComponent(`<main><h1>DeepSeek Harness failed to start</h1><pre>${message.replaceAll('&', '&amp;').replaceAll('<', '&lt;')}</pre></main>`)}`)
    win.show()
  }
}

app.on('window-all-closed', () => app.quit())
app.on('before-quit', (event) => {
  if (quitting) return
  event.preventDefault()
  quitting = true
  void host?.stop().finally(() => app.quit())
})

void bootstrap()
