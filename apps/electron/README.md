# DeepSeek Harness Desktop

Electron is a native shell around the existing local DSH web surface. It does
not expose a browser server to the network: the embedded host binds to
`127.0.0.1` on an ephemeral port, and Electron loads only that exact origin.

## Development

From the repository root:

```bash
pnpm run desktop:dev
```

This first builds the DSH packages, then opens the macOS desktop app. Harness
state is stored separately in Electron's application-support directory, under
`@deepseek-ai/dsh-desktop/harness`.

That directory is never staged into the application. The distribution build
fails if it finds credentials, settings, sessions, storage, or initialized
profiles inside the packaged runtime.

## macOS arm64 package

```bash
pnpm run desktop:dist
```

The command stages the built DSH runtime and emits an unsigned arm64 DMG under
`apps/electron/release/`. Code signing and notarization are deliberately left
to the release environment that owns the Apple Developer credentials.
