const fs = require('fs');
const { resolve } = require('path');
const AdmZip = require('adm-zip');
const metadata = require('./src/metadata.json');

/**
 * Copy folder recursively
 * @param source {string} Path relative project root dir
 * @param destination {string} Path relative project root dir
 */
function copyDir(source, destination) {
  const sourceFullPath = resolve(__dirname, source);
  const destinationFullPath = resolve(__dirname, destination);
  fs.mkdirSync(destinationFullPath);
  for (const file of fs.readdirSync(sourceFullPath)) {
    fs.copyFileSync(resolve(sourceFullPath, file), resolve(destinationFullPath, file))
  }
}

(() => {
  fs.mkdirSync(resolve(__dirname, 'dist'));

  // Copy metadata.json
  fs.copyFileSync(resolve(__dirname, 'src/extension.js'), resolve(__dirname, 'dist/extension.js'))

  // Copy metadata.json
  fs.copyFileSync(resolve(__dirname, 'src/metadata.json'), resolve(__dirname, 'dist/metadata.json'))

  // Copy styles
  fs.copyFileSync(resolve(__dirname, 'src/stylesheet.css'), resolve(__dirname, 'dist/stylesheet.css'))

  // Copy others
  copyDir('src/icons', 'dist/icons');
  copyDir('src/modules', 'dist/modules');

  // Pack extension
  const zipFilename = `${metadata.uuid}.zip`;
  const zipDist = resolve(__dirname, zipFilename);
  const zip = new AdmZip();
  zip.addLocalFolder(resolve(__dirname, 'dist'));
  zip.writeZip(zipDist);

  console.log(`Build complete. Zip file: ${zipFilename}\n`);
  console.log(`Install with: gnome-extensions install ${zipFilename}`);
  console.log(`Update with: gnome-extensions install ${zipFilename} --force`);
  console.log(`Enable with: gnome-extensions enable ${metadata.uuid}`);
})();