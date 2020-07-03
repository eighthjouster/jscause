#!/usr/bin/env node

'use strict';

const fs = require('fs');
const fsPath = require('path');
const JSZip = require('./jscbuilding/vendor/jszip.min.js');

runBuild();

function onFileRead(zip, fileName, fileContents) {
  console.log('Processing: ' + fileName);
  zip.file(fsPath.join('jscause', fileName), fileContents);
}

function onTemplateFileRead(zip, fileName, fileContents) {
  console.log('Processing: ' + fileName);
  zip.file(fsPath.join('jscause', fsPath.relative(fsPath.join('jscbuilding', 'site_template'), fileName)), fileContents);
}

function readDir(dirPath, onReadError) {
  let fileNames;
  try
  {
    fileNames = fs.readdirSync(dirPath);
  }
  catch(e)
  {
    onReadError(e);
  }

  return fileNames;
}

function readStats(path, onReadError) {
  let stats;
  try
  {
    stats = fs.lstatSync(path);
  }
  catch (e)
  {
    onReadError(e);
  }

  return stats;
}

function readFileContents(path, onReadError) {
  let fileContents;
  try
  {
    fileContents = fs.readFileSync(path);
  }
  catch(e)
  {
    onReadError(e);
  }

  return fileContents;
}

function readDirectoryContents(dirPath, zip, onfileContents, onReadError) {
  const directoryPaths = [ dirPath ];
  let allGood = true;

  do {
    let currentDirectoryPath = directoryPaths.shift();

    const fileNames = readDir(currentDirectoryPath, onReadError);

    if (!fileNames) {
      allGood = false;
      return;
    }

    while (allGood && fileNames.length)
    {
      const fileName = fileNames.shift();

      if (fileName === '.DS_Store') {
        continue;
      }

      const fullPath = fsPath.join(currentDirectoryPath, fileName);

      const stats = readStats(fullPath, onReadError);

      if (stats) {
        if (stats.isDirectory())
        {
          directoryPaths.unshift(fullPath);
        }
        else {
          const fileContents = readFileContents(fullPath, onReadError);

          allGood = typeof(fileContents) !== 'undefined';

          if (allGood) {
            onfileContents(zip, fullPath, fileContents);
          }
        }
      }
      else {
        allGood = false;
      }
    }
  }
  while (allGood && (directoryPaths.length > 0));

  return allGood;
}

function onReadJSCVendorError(err) {
  console.error(err)
  console.error('ERROR:  An error occurred while processing jscvendor.');
}

function onReadJSCTemplatesError(err) {
  console.error(err)
  console.error('ERROR:  An error occurred while processing the site templates.');
}

function runBuild() {
  const zip = new JSZip();

  const fileContents = readFileContents('./jscause.js', onReadJSCVendorError);
  zip.file(fsPath.join('jscause', 'jscause.js'), fileContents);

  if (readDirectoryContents('jscvendor', zip, onFileRead, onReadJSCVendorError) &&
      readDirectoryContents(fsPath.join('jscbuilding', 'site_template'), zip, onTemplateFileRead, onReadJSCTemplatesError)) {
    zip
      .generateNodeStream({ type: 'nodebuffer', streamFiles: true })
      .pipe(fs.createWriteStream(fsPath.join('dist', 'jscause_standalone.zip')))
      .on('finish', function() {
        console.log();
        console.log('SUCCESS: dist/jscause_standalone.zip created.');
        console.log();
      })
      .on('error', function(err) {
        console.error(err);
        console.error('ERROR: Could not create zip file.  Make sure you have all the required permissions to write to dist/, and that any previous zip files in it are deletable/overwritable.');
      });
  }
  else {
    console.error('ERROR: Could not create zip file.');
  }
}
