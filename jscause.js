'use strict';

/* *************************************
   *
   * Setup
   *
   ************************************** */
const JSCAUSE_APPLICATION_VERSION = '0.2.0';
const JSCAUSE_CONF_FILENAME = 'jscause.conf';
const fs = require('fs');
const urlUtils = require('url');
const crypto = require('crypto');
const formidable = require('./jscvendor/formidable');
const http = require('http');
const path = require('path');
const sanitizeFilename = require('./jscvendor/sanitize-filename');
const FORMDATA_MULTIPART_RE = /^multipart\/form-data/i;
const FORMDATA_URLENCODED_RE = /^application\/x-www-form-urlencoded/i;

const DEFAULT_HOSTNAME = 'localhost';
const DEFAULT_PORT = 3000;
const DEFAULT_UPLOAD_DIR = './workbench/uploads';

/* *****************************************
 * 
 * Helper functions
 * 
 * *****************************************/

function prepareConfigFileForParsing(readConfigFile)
{
  return readConfigFile
    .replace(/\/\/[^\n]*/g, '') // Strip //
    .replace(/\n\s*/g, '\n') // Strip leading white space at the beginning of line.
    .replace(/^\s*/g, '');  // Strip leading white space at the beginning of file.
}

function validateJSONFile(readConfigFile, fileName)
{
  let readConfigJSON;

  try
  {
    readConfigJSON = JSON.parse(readConfigFile) || {};
  }
  catch(e)
  {
    console.log(`ERROR: Invalid ${fileName} file format.`);
    console.log(`ERROR: ${e.message}`);
    const positionExtract = e.message.match(/.+at position (\d+).*$/i);
    if (positionExtract)
    {
      const errorPosition = positionExtract[1];
      if (errorPosition)
      {
        const excerpt = (readConfigFile || '').substr(errorPosition - 20, 40).split(/\n/);
        console.log('ERROR: Error is around the following section of the file:');
        console.log(`ERROR: ${excerpt.join('')}`);
      }
    }
  }

  return readConfigJSON;
}

function configFileFreeOfDuplicates(readConfigFile, fileName)
{
  // JSON gets rid of duplicate keys.  However, let's tell the user if the original
  // file had duplicate first-level keys, in case it was a mistake.
  // This is done after the parsing took place because at this point we know
  // that the source file is legal JSON (except for the potential duplicae keys),
  // and thus the code can be easy to parse.

  let processingConfigFile;
  let parseErrorDescription;
  let currentPos = 0;
  let processingContext = 'keys';
  let processingState = 'expectkey';
  let valueTypeQueue = [];
  let skipNext = false;
  let currentChar;
  let parseError = false;
  let keyChars = [];
  let firstLevelKeys = [];

  // Get rid of initial surrounding brackets.
  // But first, let's find out if said initial surrounding (if any) brackets match.
  const firstCharMatch = readConfigFile.match(/^\s*(.{1})/);
  
  // Good for debugging.
  //const lastCharMatch = readConfigFile.match(/(.{1})\**?\s*$/);
  const lastCharMatch = readConfigFile.match(/(.{1})\s*$/);

  if (firstCharMatch && lastCharMatch)
  {
    if (firstCharMatch[1] === '{')
    {
      if (lastCharMatch[1] !== '}')
      {
        parseErrorDescription = `Unexpected ending ${lastCharMatch[1]}.`;
        parseError = true;
      }
    }
  }

  if (!parseError)
  {
    processingConfigFile = readConfigFile
      .replace(/^\s*\{\s*?\n?/, '')
      .replace(/\n?\s*?\}\s*$/, '');
  }

  while (!parseError && (currentPos < processingConfigFile.length))
  {
    currentChar = processingConfigFile.substr(currentPos, 1);
    
    // Good for debugging.
    if (currentChar === '*')
    {
      break;
    }

    if (skipNext)
    {
      skipNext = false;
    }
    else
    {
      if (!currentChar.match(/[\n\s]/) || (processingState === 'gettingkey') || (processingState === 'gettingvalue'))
      {
        // Good for debugging.
        //console.log('Pass - begin');
        //console.log(processingContext);
        //console.log(processingState);
        //console.log(currentChar);
        
        if (processingContext === 'keys')
        {
          if (processingState === 'expectkey')
          {
            if (currentChar === '"')
            {
              keyChars = [];
              processingState = 'gettingkey';
            }
            else if (currentChar === '}')
            {
              const poppedType = valueTypeQueue.pop();
              if (poppedType)
              {
                if (currentChar === poppedType)
                {
                  processingContext = 'values';
                  processingState = 'donegettingvalue';
                }
                else
                {
                  parseErrorDescription = `Expected ${poppedType}.`;
                  parseError = true;
                }
              }
              else
              {
                parseErrorDescription = `Unexpected ${currentChar}.`;
                parseError = true;
              }
            }
            else if (currentChar !== ',')
            {
              parseErrorDescription = 'Expected quote.';
              parseError = true;
            }
          }
          else if (processingState === 'gettingkey')
          {
            if (currentChar === '\\')
            {
              skipNext = true;
            }
            else if (currentChar === '"')
            {
              processingState = 'expectcolon';

              if (valueTypeQueue.length === 0)
              {
                const keyName = keyChars.join('').toLowerCase();
                const keyNameLowerCase = keyName.toLowerCase();
                if (firstLevelKeys.indexOf(keyNameLowerCase) === -1)
                {
                  firstLevelKeys.push(keyNameLowerCase);
                }
                else
                {
                  parseErrorDescription = `Duplicate key: ${keyName}`;
                  parseError = true;
                }
              }
            }
            else
            {
              keyChars.push(currentChar);
            }
          }
          else if (processingState === 'expectcolon')
          {
            if (currentChar === ':')
            {
              processingContext = 'values';
              processingState = 'expectvalue';
            }
            else
            {
              parseErrorDescription = 'Expected colon.';
              parseError = true;
            }
          }
          else
          {
            parseErrorDescription = 'Unexpected error.';
            parseError = true;
          }
        }
        else if (processingContext === 'values')
        {
          if (processingState === 'expectvalue')
          {
            if (currentChar === '"')
            {
              processingState = 'gettingstring';
            }
            else if (currentChar === '[')
            {
              valueTypeQueue.push(']');
            }
            else if (currentChar === '{')
            {
              valueTypeQueue.push('}');
              processingContext = 'keys';
              processingState = 'expectkey';
            }
            else if (currentChar === ']')
            {
              const poppedType = valueTypeQueue.pop();
              if (poppedType)
              {
                if (currentChar === poppedType)
                {
                  processingState = 'donegettingvalue';
                }
                else
                {
                  parseErrorDescription = `Expected ${poppedType}.`;
                  parseError = true;
                }
              }
              else
              {
                parseErrorDescription = `Unexpected ${currentChar}.`;
                parseError = true;
              }
            }
            else if (currentChar !== ',')
            {
              processingState = 'gettingliteral';
            }
          }
          else if (processingState === 'gettingstring')
          {
            if (currentChar === '\\')
            {
              skipNext = true;
            }
            else if (currentChar === '"')
            {
              processingState = 'donegettingvalue';
            }
          }
          else if ((processingState === 'gettingliteral') || (processingState === 'donegettingvalue'))
          {
            if (currentChar === ']')
            {
              const poppedType = valueTypeQueue.pop();
              if (poppedType)
              {
                if (currentChar === poppedType)
                {
                  processingState = 'donegettingvalue';
                }
                else
                {
                  parseErrorDescription = `Expected ${poppedType}.`;
                  parseError = true;
                }
              }
              else
              {
                parseErrorDescription = `Unexpected ${currentChar}.`;
                parseError = true;
              }
            }
            else if (currentChar === '}')
            {
              const poppedType = valueTypeQueue.pop();
              if (poppedType)
              {
                if (currentChar === poppedType)
                {
                  processingState = 'donegettingvalue';
                }
                else
                {
                  parseErrorDescription = `Expected ${poppedType}.`;
                  parseError = true;
                }
              }
              else
              {
                parseErrorDescription = `Unexpected ${currentChar}.`;
                parseError = true;
              }
            }
            else if (currentChar === ',')
            {
              if ((valueTypeQueue.length > 0) && valueTypeQueue[valueTypeQueue.length - 1] === ']')
              {
                processingState = 'expectvalue';
              }
              else
              {
                processingContext = 'keys';
                processingState = 'expectkey';
              }
            }
            else if ((currentChar === '"') || (currentChar === '[') || (currentChar === '{'))
            {
              parseErrorDescription = '"," expected.';
              parseError = true;
            }
            else if (processingState === 'donegettingvalue')
            {
              parseErrorDescription = `Unexpected ${currentChar}.`;
              parseError = true;
            }
          }
        }
        else
        {
          parseErrorDescription = 'Unexpected error.';
          parseError = true;
        }
      }
    }

    // Good for debugging.
    //console.log('Pass - end');
    //console.log(processingContext);
    //console.log(processingState);

    currentPos++;
  }

  if (!parseError && (valueTypeQueue.length !== 0))
  {
    // In theory, we should never get here because the file has already been JSON.parsed.
    const lastBracket = valueTypeQueue.pop();
    parseErrorDescription = `Unexpected end of file. ${lastBracket} was never found.`;
    parseError = true;
  }

  if (parseError)
  {
    console.log(`ERROR: Error parsing ${fileName}`);
    console.log(`ERROR: ${parseErrorDescription}`);
  }

  return !parseError;
}

const defaultSiteConfig = {
  server: null,
  indexRun: null,
  hostName: DEFAULT_HOSTNAME,
  port: DEFAULT_PORT,
  uploadDirectory: null,
  canUpload: true,
  maxPayloadSizeBytes: 3 * 1024, // 3 KB
};

const symbolsToSanitize =
{
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  '\'': '&#39;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;'
};

function printInit(ctx)
{
  ctx.outputQueue = [];
}

function assignAppHeaders(ctx, headers)
{
  ctx.appHeaders = Object.assign(ctx.appHeaders, headers);
}

function sanitizeForHTMLOutput(inputText)
{
  return String(inputText).replace(/[&<>"'`=/]/g, (s) => symbolsToSanitize[s]);
}

function setUploadDirectory(dirName, siteConfig)
{
  let setupSuccess = false;
  if (!siteConfig || !siteConfig.canUpload)
  {
    setupSuccess = true;
  }
  else
  {
    if (fs.existsSync(dirName))
    {
      try
      {
        fs.accessSync(dirName, fs.constants.W_OK);
        setupSuccess = true;
      }
      catch (e)
      {
        console.log(`ERROR: Upload directory ${dirName} is not writeable`);
      }
    }
    else
    {
      console.log(`ERROR: Upload directory ${dirName} not found`);
    }

    if (setupSuccess)
    {
      siteConfig.uploadDirectory = dirName.replace(/\/?$/,'');
    }
  }

  return setupSuccess;
}

function doDeleteFile(thisFile)
{
  fs.unlink(thisFile.path, (err) =>
  {
    if (err)
    {
      console.log(`WARNING: Could not delete unhandled uploaded file: ${thisFile.name}`);
      console.log(`WARNING (CONT): On the file system as: ${thisFile.path}`);
      console.log(err);
    }
  });
}

function doMoveToUploadDir(thisFile, uploadDirectory, { responder, req, res, indexRun, formContext, pendingWork })
{
  pendingWork.pendingRenaming++;
  const oldFilePath = thisFile.path;
  const newFilePath = `${uploadDirectory}/jscupload_${crypto.randomBytes(16).toString('hex')}`;

  fs.rename(oldFilePath, newFilePath, (err) =>
  {
    pendingWork.pendingRenaming--;
    if (err)
    {
      console.log(`ERROR: Could not rename unhandled uploaded file: ${thisFile.name}`);
      console.log(`ERROR (CONT): Renaming from: ${oldFilePath}`);
      console.log(`ERROR (CONT): Renaming to: ${newFilePath}`);
      console.log(err);
    }
    else
    {
      thisFile.path = newFilePath;
    }
    
    if (pendingWork.pendingRenaming <= 0)
    {
      responder(req, res, indexRun, formContext);
    }
  });
}

function deleteUnhandledFiles(unhandledFiles)
{
  Object.keys(unhandledFiles).forEach((name) =>
  {
    const fileInfo = unhandledFiles[name];
    if (Array.isArray(fileInfo))
    {
      fileInfo.forEach((thisFile) =>
      {
        doDeleteFile(thisFile);
      });

    }
    else
    {
      doDeleteFile(fileInfo);
    }
  });
}

function doneWith(ctx, id)
{
  if (id)
  {
    delete ctx.waitForQueue[id];
  }

  if (Object.keys(ctx.waitForQueue).length === 0)
  {
    const formFiles = ctx.uploadedFiles;
    if (formFiles)
    {
      deleteUnhandledFiles(formFiles);
    }

    const { runtimeException } = ctx;
    if (runtimeException)
    {
      ctx.outputQueue = ['<br />Runtime error!<br />'];
      console.log(`ERROR: Runtime error: ${extractErrorFromRuntimeObject(runtimeException)}`);
      console.log(runtimeException);
    }

    const { resObject, statusCode } = ctx;
    resObject.statusCode = statusCode;
    if (ctx.compileTimeError)
    {
      resObject.end('Compile time error!');
    }
    else
    {
      resObject.end((ctx.outputQueue || []).join(''));
    }
  }
}

function finishUpHeaders(ctx)
{
  const { appHeaders, resObject } = ctx;
  Object.keys(appHeaders).forEach((headerName) => resObject.setHeader(headerName, appHeaders[headerName]));
}

function createRunTime(rtContext)
{
  const { getParams, postParams, contentType,
    requestMethod, uploadedFiles, additional } = rtContext;

  return {
    print: (output = '') => rtContext.outputQueue.push(output),
    printSafely: (output = '') => rtContext.outputQueue.push(sanitizeForHTMLOutput(output)),
    header: (nameOrObject, value) =>
    {
      assignAppHeaders.apply(this,
        (typeof(nameOrObject) === 'string') ?
          [rtContext, {[nameOrObject]: value}] :
          [].concat(rtContext, nameOrObject)
      );
    },
    waitFor: (cb) =>
    {
      const waitForId = rtContext.waitForNextId++;
      rtContext.waitForQueue[waitForId] = true;
      return () =>
      {
        try
        {
          cb();
        }
        catch(e)
        {
          rtContext.runtimeException = e;
        }

        doneWith(rtContext, waitForId);
      }
    },
    getParams,
    postParams,
    contentType,
    requestMethod,
    uploadedFiles,
    additional
  };
}

function extractErrorFromCompileObject(e)
{
  const lineNumberInfo = (e.stack || ':(unknown)').toString().split('\n')[0];
  const lineNumber = lineNumberInfo.split(/.*:([^:]*)$/)[1] || '(unknown)';
  return `${e.message} at line ${lineNumber}`;
}

function extractErrorFromRuntimeObject(e)
{
  const lineNumberInfo = e.stack || '<anonymous>::(unknown)';
  const [, fileName = '', potentialFileNumber] = lineNumberInfo.match(/^(.+):(\d+)\n/) || [];
  const atInfo = (potentialFileNumber) ?
    `at file ${fileName}, line ${potentialFileNumber}`
    :
    `at line ${((lineNumberInfo.match(/<anonymous>:(\d*):\d*/i) || [])[1] || '(unknown)')}`
  return `${e.message} ${atInfo}`;
}

/* *************************************
   *
   * Server stuff
   *
   ************************************** */

function responder(req, res, indexRun,
  { requestMethod, contentType, requestBody,
    formData, formFiles, maxSizeExceeded,
    forbiddenUploadAttempted
  })
{
  let postParams;
  let uploadedFiles = {};
  const additional = {};

  if (contentType === 'formDataWithUpload')
  {
    postParams = formData;
    uploadedFiles = formFiles;
  }
  else if (contentType === 'formData')
  {
    postParams = formData;
  }
  else if (contentType === 'jsonData')
  {
    const postBody = Buffer.concat(requestBody).toString();
    let parseSuccess = true;
    try {
      postParams = JSON.parse(postBody);
    }
    catch(e)
    {
      parseSuccess = false;
    }

    if (!parseSuccess)
    {
      postParams = {};
      additional.jsonParseError = true;
    }
  }
  else
  {
    // Assumed postData (text/plain).  Pass it raw.
    const postBody = Buffer.concat(requestBody);
    postParams = { data: postBody };
  }

  const resContext =
  {
    outputQueue: undefined,
    appHeaders: {},
    resObject: res,
    waitForNextId: 1,
    waitForQueue: {},
    getParams: urlUtils.parse(req.url, true).query,
    postParams,
    requestMethod,
    contentType,
    uploadedFiles,
    additional,
    statusCode: 200,
    compileTimeError: false,
    runtimeException: undefined
  };


  if (additional.jsonParseError)
  {
    resContext.statusCode = 400;
  }

  const runTime = createRunTime(resContext);

  if (!maxSizeExceeded && !forbiddenUploadAttempted)
  {
    if (indexRun)
    {
      printInit(resContext);
      try
      {
        indexRun(runTime);
      }
      catch (e)
      {
        resContext.runtimeException = e;
        resContext.statusCode = 500;
      }

      assignAppHeaders(resContext, {'Content-Type': 'text/html; charset=utf-8'});

      finishUpHeaders(resContext);
    }
    else
    {
      resContext.statusCode = 500;
      resContext.compileTimeError = true;
    }
  }
  
  doneWith(resContext);
}

function sendPayLoadExceeded(res, maxPayloadSizeBytes)
{
  console.log(`ERROR: Payload exceeded limit of ${maxPayloadSizeBytes} bytes`);
  res.statusCode = 413;
  res.setHeader('Connection', 'close');
  res.end('Request size exceeded!');
}

function sendUploadIsForbidden(res)
{
  console.log('ERROR: Uploading is forbidden.');
  res.statusCode = 403;
  res.setHeader('Connection', 'close');
  res.end('Forbidden!');
}

function startServer(serverConfig)
{
  const { server, sites } = serverConfig;
  const [ siteConfig ] = sites;
  const { canUpload, hostName, port, maxPayloadSizeBytes, uploadDirectory, indexRun } = siteConfig;

  server.on('request', (req, res) =>
  {
    const { headers = {}, method } = req;
    const requestMethod = (method || '').toLowerCase();

    if ((requestMethod !== 'get') && (requestMethod !== 'post'))
    {
      res.statusCode = 405;
      res.end('Not allowed!');
      return;
    }

    let contentType = (headers['content-type'] || '').toLowerCase();
    const contentLength = parseInt(headers['content-length'] || 0, 10);
    const isUpload = FORMDATA_MULTIPART_RE.test(contentType);
    const incomingForm = ((requestMethod === 'post') &&
                          (isUpload || FORMDATA_URLENCODED_RE.test(contentType)));

    const postedForm = (incomingForm && canUpload) ?
      new formidable.IncomingForm()
      :
      null;

    let maxSizeExceeded = false;
    let forbiddenUploadAttempted = false;
    
    const postedFormData = { params: {}, files: {}, pendingWork: { pendingRenaming: 0 } };

    if (contentLength && maxPayloadSizeBytes && (contentLength >= maxPayloadSizeBytes))
    {
      maxSizeExceeded = true;
      sendPayLoadExceeded(res, maxPayloadSizeBytes);
    }
    else if (incomingForm && !canUpload)
    {
      forbiddenUploadAttempted = true;
      sendUploadIsForbidden(res);
    }
    else if (postedForm)
    {
      postedForm.keepExtensions = false;

      postedForm.parse(req);

      postedForm.on('field', (name, value) =>
      {
        postedFormData.params[name] = value;
      });

      postedForm.on('file', (name, file) =>
      {
        file.unsafeName = file.name;
        file.name = sanitizeFilename(file.name, { replacement: '_' }).replace(';', '_');

        if (postedFormData.files[name])
        {
          if (!Array.isArray(postedFormData.files[name]))
          {
            postedFormData.files[name] = [ postedFormData.files[name] ];
          }
          postedFormData.files[name].push(file);
        }
        else
        {
          postedFormData.files[name] = file;
        }
      });

      postedForm.on('progress', function(bytesReceived)
      {
        if (maxPayloadSizeBytes && (bytesReceived >= maxPayloadSizeBytes))
        {
          maxSizeExceeded = true;
          sendPayLoadExceeded(res, maxPayloadSizeBytes);
        }
      });

      postedForm.on('end', () =>
      {
        const { params: formData, files: formFiles, pendingWork } = postedFormData;
        const postType = (isUpload) ? 'formDataWithUpload' : 'formData';

        const formContext =
        {
          requestMethod,
          contentType: postType,
          formData,
          formFiles,
          maxSizeExceeded,
          forbiddenUploadAttempted
        };

        if (isUpload)
        {
          Object.keys(formFiles).forEach((fileKey) =>
          {
            const thisFile = formFiles[fileKey];
            if (Array.isArray(thisFile))
            {
              thisFile.forEach((thisActualFile) =>
              {
                doMoveToUploadDir(thisActualFile, uploadDirectory, { responder, req, res, indexRun, formContext, pendingWork });
              });
            }
            else
            {
              doMoveToUploadDir(thisFile, uploadDirectory, { responder, req, res, indexRun, formContext, pendingWork });
            }
          });
        }
        else
        {
          responder(req, res, indexRun, formContext);
        }
      });
    }
    else
    {
      let requestBody = [];
      let bodyLength = 0;
      req.on('data', (chunk) =>
      {
        if (canUpload)
        {
          const futureBodyLength = bodyLength + chunk.length;

          if (futureBodyLength && maxPayloadSizeBytes && (futureBodyLength >= maxPayloadSizeBytes))
          {
            maxSizeExceeded = true;
            sendPayLoadExceeded(res, maxPayloadSizeBytes);
          }
          else
          {
            bodyLength += chunk.length;
            requestBody.push(chunk);
          }
        }
        else
        {
          forbiddenUploadAttempted = true;
          sendUploadIsForbidden(res);
        }
      }).on('end', () =>
      {
        if (contentType === 'application/json')
        {
          contentType = 'jsonData';
        }

        const postContext = { requestMethod, contentType, requestBody, maxSizeExceeded, forbiddenUploadAttempted };
        responder(req, res, indexRun, postContext);
      });
    }

    req.on('error', (err) =>
    {
      console.log('ERROR: Request related error.');
      console.log(err);
    })
  });

  server.listen(port, hostName, () =>
  {
    console.log(`JSCause Server version ${JSCAUSE_APPLICATION_VERSION} running at http://${hostName}:${port}/`);
  });

  server.on('error', (e) =>
  {
    console.log('ERROR: Could not start listening on hostname and port specified.')
    console.log('ERROR: Error returned by the server follows.')
    console.log(`ERROR: ${e.message}`);
    console.log('ERROR: Server not started.');
  });
}

function readConfigurationFile(name, path = '.')
{
  let stats;
  let readConfigFile;
  let readSuccess = false;
  const fullPath = `${path}/${name}`;

  try
  {
    stats = fs.statSync(fullPath);
    readSuccess = true;
  }
  catch (e)
  {
    console.log(`ERROR: Cannot find ${name} file`);
    console.log(e);
  }

  if (readSuccess)
  {
    readSuccess = false;

    if (stats.isDirectory())
    {
      console.log(`ERROR: ${name} is a directory.`);
    }
    else
    {
      try
      {
        readConfigFile = fs.readFileSync(fullPath, 'utf-8');
        readSuccess = true;
      }
      catch(e)
      {
        console.log(`ERROR: Cannot load ${name} file.`);
        console.log(e);
      }
    }
  }

  if (!readSuccess)
  {
    readConfigFile = undefined;
  }

  return readConfigFile;
}

function readAndProcessJSONFile(jsonFileName, jsonFilePath)
{
  let readConfigJSON;
  let finalConfigJSON;

  let readConfigFile = readConfigurationFile(jsonFileName, jsonFilePath);

  if (readConfigFile)
  {
    readConfigFile = prepareConfigFileForParsing(readConfigFile);
    readConfigJSON = validateJSONFile(readConfigFile, jsonFileName);
    if (readConfigJSON && configFileFreeOfDuplicates(readConfigFile, jsonFileName))
    {
      finalConfigJSON = readConfigJSON;
    }
  }

  return finalConfigJSON;
}

function prepareConfiguration(configJSON, allowedKeys, fileName)
{
  const configKeys = Object.keys(configJSON);
  const configKeysLength = configKeys.length;
  const processedConfigJSON = {};
  let finalProcessedConfigJSON;
  let invalidKeysFound = false;

  for (let i = 0; i < configKeysLength; i++)
  {
    const configKey = configKeys[i] || '';
    const configKeyLowerCase = configKey.toLowerCase();
    if (allowedKeys.indexOf(configKeyLowerCase) === -1)
    {
      const emptyValueReport = (configKey) ? '': ' (empty value)';
      const casingReport = (configKey === configKeyLowerCase) ? '' : ` ("${configKey}")`;
      console.log(`ERROR: "${configKeyLowerCase}"${casingReport}${emptyValueReport} is not a valid configuration key.`);
      invalidKeysFound = true;
    }
    else
    {
      processedConfigJSON[configKeyLowerCase] = configJSON[configKey];
    }
  }

  if (invalidKeysFound)
  {
    console.log(`ERROR: Check that all the keys and values in ${fileName} are valid.`);
  }
  else
  {
    finalProcessedConfigJSON = processedConfigJSON;
  }

  return finalProcessedConfigJSON;
}

function createSiteDefaultSiteConfig()
{
  return Object.assign({}, defaultSiteConfig);
}

const siteConfig = createSiteDefaultSiteConfig();

let stats;

//const indexFile = './website/index.jssp'; //__RP
const indexFile = './sites/mysite/website/index.jssp';

let serverStarted = false;
let readSuccess = false;
let indexExists = false;

const compileContext =
{
  data: null,
  compiledModule: null
};

/* ***************************************************
 *
 * Reading and processing the site configuration file
 *
 *****************************************************/
const globalConfigJSON = readAndProcessJSONFile(JSCAUSE_CONF_FILENAME);

if (globalConfigJSON)
{
  console.log('NOT BAD!');//__RP
  console.log(globalConfigJSON);
}

/* ***************************************************
 *
 * Reading and processing the site configuration file
 *
 *****************************************************/
let siteJSONFileName;
let siteJSONFilePath;

siteJSONFileName = 'site_configuration.json';
siteJSONFilePath = './sites/mysite';

const siteConfigJSON = readAndProcessJSONFile(siteJSONFileName, siteJSONFilePath);

if (siteConfigJSON)
{
  const allAllowedKeys =
  [
    'hostname',
    'port',
    'uploaddirectory',
    'canupload',
    'maxpayloadsizebytes'
  ];

  const requiredKeysNotFound = [];

  let soFarSoGood = true;
  
  let processedConfigJSON = prepareConfiguration(siteConfigJSON, allAllowedKeys, siteJSONFileName);
  let configValue;
  let configKeyName;

  // hostname
  if (processedConfigJSON)
  {
    configKeyName = 'hostname';
    configValue = processedConfigJSON[configKeyName];

    if (typeof(configValue) === 'string')
    {
      if (configValue.replace(/^\s*/g, '').replace(/\s*$/g, ''))
      {
        siteConfig.hostName = configValue;
      }
      else
      {
        console.log('ERROR: Configuration:  hostname cannot be empty.');
        soFarSoGood = false;
      }
    }
    else
    {
      if (typeof(configValue) === 'undefined')
      {
        requiredKeysNotFound.push(configKeyName);
      }
      else
      {
        console.log('ERROR: Configuration:  Invalid hostname.  String value expected.');
      }
      soFarSoGood = false;
    }

    configKeyName = 'port';
    configValue = processedConfigJSON[configKeyName];

    if ((typeof(configValue) !== 'undefined') && ((typeof(configValue) !== 'string') || configValue.replace(/^\s*/g, '').replace(/\s*$/g, '')))
    {
      const portNumber = parseFloat(configValue, 10);
      if (!isNaN(portNumber) && (portNumber === Math.floor(portNumber)))
      {
        siteConfig.port = portNumber;
      }
      else
      {
        console.log('ERROR: Configuration:  Invalid port.  Integer number expected.');
        soFarSoGood = false;
      }
    }
    else
    {
      if (typeof(configValue) === 'undefined')
      {
        requiredKeysNotFound.push(configKeyName);
      }
      else
      {
        console.log('ERROR: Configuration:  port cannot be empty.');
      }
      soFarSoGood = false;
    }

    configKeyName = 'canupload';
    configValue = processedConfigJSON[configKeyName];

    if (typeof(configValue) === 'boolean')
    {
      siteConfig.canupload = configValue;
    }
    else
    {
      if (typeof(configValue) === 'undefined')
      {
        requiredKeysNotFound.push(configKeyName);
      }
      else
      {
        console.log('ERROR: Configuration:  Invalid canupload.  Boolean expected.');
      }
      soFarSoGood = false;
    }

    configKeyName = 'maxpayloadsizebytes';
    configValue = processedConfigJSON[configKeyName];

    if ((typeof(configValue) !== 'string') || configValue.replace(/^\s*/g, '').replace(/\s*$/g, ''))
    {
      const uploadSize = parseFloat(configValue, 10);
      if (!isNaN(uploadSize) && (uploadSize === Math.floor(uploadSize)))
      {
        siteConfig.maxPayloadSizeBytes = uploadSize;
      }
      else
      {
        console.log('ERROR: Configuration:  Invalid maxpayloadsizebytes.  Integer number expected.');
        soFarSoGood = false;
      }
    }
    else
    {
      if (typeof(configValue) === 'undefined')
      {
        requiredKeysNotFound.push(configKeyName);
      }
      else
      {
        console.log('ERROR: Configuration:  maxpayloadsizebytes cannot be empty.');
      }
      soFarSoGood = false;
    }

    configKeyName = 'uploaddirectory';
    configValue = processedConfigJSON[configKeyName];

    if (typeof(configValue) === 'string')
    {
      const dirName = configValue.replace(/^\s*/g, '').replace(/\s*$/g, '');
      if (dirName)
      {
        siteConfig.uploadDirectory = dirName;
      }
      else
      {
        console.log('ERROR: Configuration:  uploaddirectory cannot be empty.');
        soFarSoGood = false;
      }
    }
    else
    {
      if (typeof(configValue) === 'undefined')
      {
        requiredKeysNotFound.push(configKeyName);
      }
      else
      {
        console.log('ERROR: Configuration:  Invalid uploaddirectory.  String value expected.');
      }
      soFarSoGood = false;
    }
  }
  else {
    soFarSoGood = false;
  }

  if (requiredKeysNotFound.length)
  {
    if (requiredKeysNotFound.length === 1)
    {
      console.log('ERROR: Configuration:  The following configuration attribute was not found:');
    }
    else
    {
      console.log('ERROR: Configuration:  The following configuration attributes were not found:');
    }
    requiredKeysNotFound.forEach((keyName) =>
    {
      console.log(`ERROR: - ${keyName}`);
    });
    soFarSoGood = false;
  }

  readSuccess = soFarSoGood;
}

if (readSuccess)
{
  readSuccess = false;

  try
  {
    stats = fs.statSync(indexFile);
    readSuccess = true;
  }
  catch (e)
  {
    console.log('ERROR: Cannot find index file');
    console.log(e);
  }
}

if (readSuccess)
{
  readSuccess = false;

  if (stats.isDirectory())
  {
    console.log(`ERROR: Entry point is a directory: ${indexFile}`);
  }
  else
  {
    try
    {
      compileContext.data = fs.readFileSync(indexFile, 'utf-8');
      readSuccess = true;
    }
    catch(e)
    {
      console.log('ERROR: Cannot load index file.');
      console.log(e);
    }
  }
}

if (readSuccess)
{
  const Module = module.constructor;
  Module._nodeModulePaths(path.dirname(''))
  compileContext.compiledModule = new Module();
  try
  {
    const CONTEXT_HTML = 0;
    const CONTEXT_JAVASCRIPT = 1;

    // Matches '<js', '<JS', /js>' or '/JS>'
    // Adds a prefixing space to distinguish from 
    // '\<js', '\<JS', '/js>', '/JS>', for easy splitting
    // (Otherwise, it would delete whatever character is right before.)
    let unprocessedData = compileContext.data
      .replace(/^[\s\n]*<html\s*\/>/i, '<js/js>')
      .replace(/([^\\])<js/gi,'$1 <js')
      .replace(/^<js/i,' <js')
      .replace(/([^\\])\/js>/gi, '$1 /js>')
      .replace(/^\/js>/i, ' /js>');

    const processedDataArray = [];

    const firstOpeningTag = unprocessedData.indexOf(' <js');
    const firstClosingTag = unprocessedData.indexOf(' /js>');

    let processingContext = ((firstOpeningTag === -1) && (firstClosingTag === -1) || ((firstClosingTag > -1) && ((firstClosingTag < firstOpeningTag) || (firstOpeningTag === -1)))) ?
      CONTEXT_JAVASCRIPT :
      CONTEXT_HTML;

    do
    {
      if (processingContext === CONTEXT_HTML)
      {
        const [processBefore, processAfter] = unprocessedData
          .split(/\s<js([\s\S]*)/);

        unprocessedData = processAfter;

        const printedStuff = (processBefore) ?
          processBefore
            .replace(/\\(<js)/gi,'$1') // Matches '\<js' or '\<JS' and gets rid of the '\'.
            .replace(/\\(\/js>)/gi,'$1') // Matches '\/js>' or '\/JS>' and gets rid of the '\'.
            .replace(/\\/g,'\\\\')
            .replace(/'/g,'\\\'')
            .replace(/[^\S\n]{2,}/g, ' ')
            .replace(/^\s*|\n\s*/g, '\n')
            .split(/\n/)
            .join(' \\n \\\n') :
          '';
      
        if (printedStuff)
        {
          processedDataArray.push(`rt.print('${printedStuff}');`);
        }

        processingContext = CONTEXT_JAVASCRIPT;
      }
      else
      {
        // Assuming processingContext is CONTEXT_JAVASCRIPT

        const [processBefore, processAfter] = unprocessedData
          .split(/\s\/js>([\s\S]*)/);

        if (processBefore.match(/<html\s*\//i))
        {
          console.log('WARNING: <html/> keyword found in the middle of code.  Did you mean to put it in the beginning of an HTML section?');
        }

        processedDataArray.push(processBefore);
        
        unprocessedData = processAfter;

        processingContext = CONTEXT_HTML;
      }
    } while (unprocessedData);
    
    const processedData = processedDataArray.join('');

    try
    {
      compileContext.compiledModule._compile(`module.exports = (rt) => {${processedData}};`, '');
      indexExists = true;
    }
    catch (e)
    {
      console.log(`ERROR: Compile error: ${extractErrorFromCompileObject(e)}`);
      console.log(e);
    }
  }
  catch (e)
  {
    console.log('ERROR: Parsing error, possibly internal.');
    console.log(e);
  }
}

if (indexExists)
{
  siteConfig.indexRun = compileContext.compiledModule.exports;

  if (typeof(siteConfig.indexRun) !== 'function')
  {
    siteConfig.indexRun = undefined;
    console.log('ERROR: Could not compile code.');
  }
  else if (setUploadDirectory(siteConfig.uploadDirectory || DEFAULT_UPLOAD_DIR, siteConfig))
  {
    // All is well so far.
    if ((siteConfig.maxPayloadSizeBytes || 0) < 0)
    {
      siteConfig.canUpload = false;
    }
  }
}

const serverConfig = {
  sites: [ siteConfig ]
};

if (indexExists)
{
  serverConfig.server = http.createServer();
  startServer(serverConfig);
  serverStarted = true;
}

if (!serverStarted)
{
  console.log('ERROR: Server not started.');
}
