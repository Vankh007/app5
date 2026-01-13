# KHMERZOON Desktop App (Electron)

Your app is now set up as a native desktop application with full protection against browser extensions and downloads!

## 🚀 Development

Run the app in development mode:

```bash
npm run electron:dev
```

This will start both the Vite dev server and Electron app with hot-reload.

## 📦 Building the .exe Installer

To create a Windows installer (.exe file):

```bash
npm run electron:build
```

This will:
1. Build your React app for production
2. Compile the Electron code
3. Package everything into a Windows installer

The `.exe` file will be in: `dist-electron/KHMERZOON-Setup-{version}.exe`

## 🎯 Features

✅ **True Native Desktop App** - Runs outside browser
✅ **Complete Extension Blocking** - No browser extensions can interfere
✅ **Download Protection** - Downloads are blocked at system level
✅ **Right-click Protection** - Context menu disabled
✅ **Professional Installer** - Users install like any Windows program
✅ **Auto-updates Ready** - Can be configured for automatic updates
✅ **Desktop Shortcuts** - Installed to Start Menu and Desktop

## 📋 Distribution

1. Build your app: `npm run electron:build`
2. Share the `.exe` file from `dist-electron/` folder
3. Users download and run the installer
4. App installs like any Windows program
5. Creates desktop shortcut automatically

## 🔒 Security Features

- All browser extensions blocked
- Downloads prevented at system level
- External navigation blocked
- Context menu disabled
- DevTools disabled in production
- Keyboard shortcuts for saving blocked

## 💡 Next Steps

1. Test in development: `npm run electron:dev`
2. Build installer: `npm run electron:build`
3. Test the installer on Windows
4. Distribute to your users!

## ⚙️ Configuration

- Installer settings: `electron-builder.json`
- Main process: `electron/main.ts`
- Security preload: `electron/preload.ts`

Your app now has maximum protection against downloading! 🎉
