# client

An Electron application with React and TypeScript

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

## Project Setup

### Install

```bash
$ npm install
```

### Development

```bash
$ npm run dev
```

### Build

```bash
# Generate platform icon files from public/TheGreatFilterIcon.png
$ npm run make:icons

# For Windows installer
$ npm run build:win

# For macOS app + dmg
$ npm run build:mac

# For Linux packages (AppImage, snap, deb)
$ npm run build:linux
```

### Build outputs

Electron Builder writes artifacts to `dist/`:

- Windows: `.exe` installer (NSIS)
- macOS: `.dmg` and `.app` bundle
- Linux: `.AppImage`, `.snap`, `.deb`

### Build all platforms for download

`npm run build:all` runs `electron-builder -mwl`, but in practice native builds are most reliable:

- Build Windows on Windows
- Build macOS on macOS
- Build Linux on Linux

For repeatable all-platform releases, use a CI matrix (GitHub Actions) with one job per OS that runs:

```bash
npm ci
npm run make:icons
npm run build
electron-builder --publish never --win   # on windows runner
electron-builder --publish never --mac   # on macos runner
electron-builder --publish never --linux # on linux runner
```
