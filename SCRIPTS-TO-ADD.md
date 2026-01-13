# Scripts to Add to package.json

Please add these scripts to your `package.json` file manually:

```json
"scripts": {
  "electron:dev": "concurrently \"npm run dev\" \"wait-on http://localhost:8080 && electron .\"",
  "electron:build": "node scripts/build-electron.js",
  "electron:start": "electron .",
  "build:electron-main": "tsc -p electron/tsconfig.json"
}
```

Also add this to package.json:

```json
"main": "dist-electron/main.js"
```

## How to Use

1. **Development**: `npm run electron:dev` - Runs app in development mode
2. **Build .exe**: `npm run electron:build` - Creates Windows installer
3. **Test Built**: `npm run electron:start` - Tests the built app

The .exe installer will be in the `dist-electron/` folder!
