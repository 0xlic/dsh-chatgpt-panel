# DSH ChatGPT Panel

A local [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) bundle that adds a **ChatGPT** entry to the left sidebar and opens
`https://chatgpt.com/` in an embedded browser with reload and navigation controls.

> **Desktop-first.** The embedded browser uses the DSH desktop shell's native
> Electron guest bridge, so `chatgpt.com` is not blocked by its
> `X-Frame-Options: SAMEORIGIN` response. In a plain browser tab the panel falls
> back to an iframe and explains why the site cannot be framed.

## Features

- **Left sidebar entry** — a speech-bubble/spark icon beside the built-in
  Plugins and Schedules entries.
- **Native guest browser** — on the DSH desktop shell the panel hosts an
  Electron guest through the shell's lease-scoped `dshDesktop.browser` bridge.
  The guest is a real Chromium page with sandboxing and context isolation; the
  plugin never injects Node or Electron access into the visited page.
- **Stays loaded across panels** — the guest lives in a persistent
  `shell.overlay` surface, while the `main` panel is only a measuring anchor.
  Switching to another panel hides the surface; switching back shows the same
  page instantly instead of loading it again. The guest is destroyed only when
  the plugin unloads, the page reloads, or the app closes.
- **Reload** — the toolbar refresh button reloads the actual page. When the
  guest has not reached a document yet, it recreates the guest instead.
- **Navigation** — Back and Forward follow the guest's Chromium history.
- **Open externally** — opens the current ChatGPT address in the system browser
  through the shell's normal external-link handling.
- **Theme-aware chrome** — the toolbar uses `--dsw-alias-*` tokens and follows
  light and dark themes. Visible text is localized in English and Chinese.

## Requirements

- DSH Desktop for the embedded experience (the `dshDesktop.browser` bridge).
- A DSH profile that can install a local bundle. The plugin declares itself as
  `@local/dsh-chatgpt-panel` and has no npm dependencies of its own.

## Install

Clone the repository:

```bash
git clone https://github.com/0xlic/dsh-chatgpt-panel.git
```

Install the directory as a DSH bundle. From an agent session in DSH, call
`plugin_manager` with `action: install_bundle` and the absolute path to the
clone:

```text
plugin_manager({
  action: "install_bundle",
  target: "/absolute/path/to/dsh-chatgpt-panel"
})
```

The same operation is available from the Plugins page's local install flow.
Installing links the directory into the active profile, adds the bundle to the
profile's bundle list, and activates the `chatgpt-panel` Loader row. The bundle
has no build step: `client.js` is a plain browser bundle served by DSH.

## How it works

| Piece | Role |
|---|---|
| `client.js` | Registers the `chatgpt` sidebar entry and the `main` panel, then keeps the guest alive in `shell.overlay`. |
| `main` panel | Renders only a measuring anchor; it publishes the center-column box to the persistent surface. |
| `shell.overlay` surface | Owns the native `<webview>`, the toolbar, reload, history, and the error card. It hides with `visibility: hidden` when another panel is selected. |
| `dshDesktop.browser.acquire()` | Reserves a sandboxed guest and a workspace-scoped session partition. |
| `index.js` | Empty Host half; the Client module owns all UI. |
| `locale/*.json`, `icon.svg` | Plugin Manager display metadata and icon. |

The guest partition is owned by the desktop shell and is recreated with the app
process. A ChatGPT login therefore lasts for one app run; it is not a persistent
browser profile.

## Development

1. Edit `client.js` (plain JavaScript, no bundler).
2. Reload the DSH page or restart the app to load a fresh client module.
3. The plugin is a linked directory, so no reinstall is needed while developing.

The only external runtime import is React from the DSH browser module table.

## Limitations

- **Desktop only for embedding.** `chatgpt.com` sends
  `X-Frame-Options: SAMEORIGIN`, so a normal browser iframe cannot show it. The
  panel displays an explanation and an external-open action in that case.
- **Login lifetime.** The shell's guest partition is process-scoped; sign in
  again after restarting the app.
- **Popups.** The desktop shell hands page popups (for example an OAuth account
  chooser) to the system browser. Email/password sign-in stays inside the
  embedded guest.
- **Idle guest.** While another panel is selected, the ChatGPT guest remains
  loaded in the background and keeps its network session.

## License

No license has been added to this repository yet. Add one before redistributing
or reusing the code outside personal use.
