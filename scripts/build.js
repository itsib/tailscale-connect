const fs = require('fs');
const { resolve } = require('path');
const AdmZip = require('adm-zip');
const metadata = require('../src/metadata.json');
const { execSync } = require('child_process');

const rootDir = `${__dirname}/..`

function copySourcesToProject() {
  const copyDir = (source, destination) => {
    const sourceFullPath = resolve(rootDir, source);
    const destinationFullPath = resolve(rootDir, destination);
    fs.mkdirSync(destinationFullPath);
    for (const file of fs.readdirSync(sourceFullPath)) {
      fs.copyFileSync(resolve(sourceFullPath, file), resolve(destinationFullPath, file))
    }
  }

  fs.mkdirSync(resolve(rootDir, 'dist'));

  // Copy metadata.json
  fs.copyFileSync(resolve(rootDir, 'src/extension.js'), resolve(rootDir, 'dist/extension.js'))
  fs.copyFileSync(resolve(rootDir, 'src/prefs.js'), resolve(rootDir, 'dist/prefs.js'))

  // Copy metadata.json
  fs.copyFileSync(resolve(rootDir, 'src/metadata.json'), resolve(rootDir, 'dist/metadata.json'))

  // Copy styles
  fs.copyFileSync(resolve(rootDir, 'src/stylesheet.css'), resolve(rootDir, 'dist/stylesheet.css'))

  // Copy others
  copyDir('src/prefs-ui', 'dist/prefs-ui');
  copyDir('src/ext-ui', 'dist/ext-ui');
  copyDir('src/icons', 'dist/icons');
  copyDir('src/libs', 'dist/libs');
  copyDir('src/schemas', 'dist/schemas');
}

function buildSchemas() {
  execSync(`glib-compile-schemas ${resolve(rootDir, 'dist/schemas/')}`);
}

function zipPackExtension(zipFilename) {
  // Pack extension
  const zipDist = resolve(rootDir, zipFilename);
  const zip = new AdmZip();
  zip.addLocalFolder(resolve(rootDir, 'dist'));
  zip.writeZip(zipDist);
}

(() => {
  copySourcesToProject();

  buildSchemas();

  const zipFilename = `${metadata.uuid}.zip`;

  zipPackExtension(zipFilename);

  console.log(`\x1b[00;32mBuild complete. Zip file: \x1b[01;32m${zipFilename}\x1b[0m\n`);
  console.log(`\x1b[00;33mInstall with:\x1b[0m  \x1b[00;37mgnome-extensions install ${zipFilename}\x1b[0m`);
  console.log(`\x1b[00;33mUpdate with:\x1b[0m   \x1b[00;37mgnome-extensions install ${zipFilename} --force\x1b[0m`);
  console.log(`\x1b[00;33mEnable with:\x1b[0m   \x1b[00;37mgnome-extensions enable ${metadata.uuid}\x1b[0m`);
})();