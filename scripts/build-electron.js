const { build } = require('vite');
const { build: electronBuild } = require('electron-builder');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

async function buildElectronApp() {
  console.log('🚀 Building Electron app...\n');

  try {
    // Step 1: Build Vite app
    console.log('📦 Building React app with Vite...');
    await build({
      configFile: path.resolve(__dirname, '../vite.config.ts'),
      mode: 'production'
    });
    console.log('✅ React app built successfully\n');

    // Step 2: Compile TypeScript for Electron
    console.log('⚙️  Compiling Electron TypeScript...');
    await new Promise((resolve, reject) => {
      exec('npx tsc -p electron/tsconfig.json', (error, stdout, stderr) => {
        if (error) {
          console.error('Error:', stderr);
          reject(error);
        } else {
          console.log(stdout);
          resolve();
        }
      });
    });
    console.log('✅ Electron TypeScript compiled\n');

    // Step 3: Build Electron app
    console.log('🔨 Packaging Electron app...');
    await electronBuild({
      config: JSON.parse(fs.readFileSync('electron-builder.json', 'utf-8'))
    });
    console.log('✅ Electron app packaged successfully!\n');
    console.log('📍 Output: dist-electron/');
    console.log('🎉 You can find your .exe installer in the dist-electron folder!');

  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

buildElectronApp();
