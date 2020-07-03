#!/usr/bin/env node

'use strict';

const fs = require('fs');
const JSZip = require('./jscbuildvendor/jszip.min.js');



const zip = new JSZip();
// zip.file("file", content);
// ... and other manipulations

zip
  .generateNodeStream({ type: 'nodebuffer', streamFiles: true })
  .pipe(fs.createWriteStream('dist/jscause_standalone.zip'))
  .on('finish', function() {
    console.log('SUCCESS: dist/jscause_standalone.zip created.');
  })
  .on('error', function(err) {
    console.error(err);
    console.error('ERROR: Could not create zip file.  Make sure you have all the required permissions to write to dist/, and that any previous zip files in it are deletable/overwritable.');
  });

