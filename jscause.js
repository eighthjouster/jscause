'use strict';

/* *************************************
   *
   * Setup
   *
   ************************************** */
const JSCAUSE_APPLICATION_VERSION = '0.2.0';

const http = require('http');
const https = require('https');
const fs = require('fs');
const fsPath = require('path');
const urlUtils = require('url');
const crypto = require('crypto');

const JSCAUSE_CONF_FILENAME = 'jscause.conf';
const JSCAUSE_CONF_PATH = 'configuration';
const JSCAUSE_SITES_PATH = 'sites';
const JSCAUSE_CERTS_PATH = 'certs';
const JSCAUSE_WEBSITE_PATH = 'website';
const JSCAUSE_SITECONF_FILENAME = fsPath.join(JSCAUSE_CONF_PATH, 'site.json');
const FORMDATA_MULTIPART_RE = /^multipart\/form-data/i;
const FORMDATA_URLENCODED_RE = /^application\/x-www-form-urlencoded/i;

const PROMISE_ACTOR_TYPE_SUCCESS = 1;
const PROMISE_ACTOR_TYPE_ERROR = 2;

const TERMINAL_ERROR_STRING = '\x1b[31mERROR\x1b[0m';
const TERMINAL_INFO_STRING = '\x1b[32mINFO\x1b[0m';
const TERMINAL_INFO_WARNING = '\x1b[33mWARNING\x1b[0m';

const MAX_FILES_OR_DIRS_IN_DIRECTORY = 2048;
const MAX_DIRECTORIES_TO_PROCESS = 4096;
const MAX_PROCESSED_DIRECTORIES_THRESHOLD = 1024;
const MAX_CACHED_FILES_PER_SITE = 256;
const MAX_CACHEABLE_FILE_SIZE_BYTES = 1024 * 512;

const MIME_TYPES =
{
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.gif': 'image/gif',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.woff': 'application/font-woff',
  '.ttf': 'application/font-ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'application/font-otf',
  '.svg': 'application/image/svg+xml; charset=utf-8'
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

const defaultSiteConfig =
{
  server: null,
  name: '',
  rootDirectoryName: '',
  fullSitePath: '',
  staticFiles: {},
  compiledFiles: {},
  hostName: undefined,
  port: undefined,
  tempWorkDirectory: null,
  canUpload: true,
  maxPayloadSizeBytes: undefined,
  jscpExtensionRequired: 'optional',
  includeHttpPoweredByHeader: true,
  mimeTypes: {},
  enableHTTPS: false,
  httpsCertFile: undefined,
  httpsKeyFile: undefined
};

/* *****************************************
 * 
 * Helper functions
 * 
 * *****************************************/

function vendor_require(vendorModuleName)
{
  let moduleFile;
  let compiledModule;
  let hydratedFile;

  if (typeof(templateFile) === 'undefined')
  {
    try
    {
      templateFile = fs.readFileSync(VENDOR_TEMPLATE_FILENAME, 'utf-8');
    }
    catch(e)
    {
      console.error(`${TERMINAL_ERROR_STRING}: CRITICAL: Cannot load ${VENDOR_TEMPLATE_FILENAME} file. The JSCause installation might be corrupted.`);
      console.error(e);
    }
  }

  if (typeof(templateFile) !== 'undefined')
  {
    const requireName = `${vendorModuleName}/index.js`;
    try
    {
      moduleFile = fs.readFileSync(requireName, 'utf-8');
    }
    catch(e)
    {
      console.error(`${TERMINAL_ERROR_STRING}: CRITICAL: Cannot load ${requireName} file. The JSCause installation might be corrupted.`);
      console.error(e);
    }
  }

  if (typeof(moduleFile) !== 'undefined')
  {
    moduleFile = moduleFile.replace(/\s+require\((['"']{1})/g, ' _jscause_require($1');
    hydratedFile = templateFile.replace('__JSCAUSE__THIS_MODULE__NAME__jscau$e1919', vendorModuleName);
    const Module = module.constructor;
    Module._nodeModulePaths(fsPath.dirname(''));
    try
    {
      const moduleToCompile = new Module();
      moduleToCompile._compile(`${hydratedFile}\n${moduleFile}`, '');
      compiledModule = moduleToCompile.exports;
    }
    catch (e)
    {
      console.error(`${TERMINAL_ERROR_STRING}: CRITICAL: Could not compile vendor module ${vendorModuleName}. The JSCause installation might be corrupted.`);
      console.error(e);
    }
  }

  return compiledModule;
}

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
    console.error(`${TERMINAL_ERROR_STRING}: Invalid ${fileName} file format.`);
    console.error(`${TERMINAL_ERROR_STRING}: ${e.message}`);
    const positionExtract = e.message.match(/.+at position (\d+).*$/i);
    if (positionExtract)
    {
      const errorPosition = positionExtract[1];
      if (errorPosition)
      {
        const excerpt = (readConfigFile || '').substr(errorPosition - 20, 40).split(/\n/);
        console.error(`${TERMINAL_ERROR_STRING}: Error is around the following section of the file:`);
        console.error(`${TERMINAL_ERROR_STRING}: ${excerpt.join('')}`);
      }
    }
  }

  return readConfigJSON;
}

function processKeyContext(state)
{
  let
    {
      processingContext, processingState,
      currentChar , keyChars, valueTypeQueue,
      parseErrorDescription, parseError,
      skipNext, firstLevelKeys
    } = state;

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
  return { processingContext, processingState,
    currentChar, keyChars, valueTypeQueue,
    parseErrorDescription, parseError,
    skipNext, firstLevelKeys
  };
}

function processValueContext(state)
{
  let
    {
      processingContext, processingState,
      currentChar , keyChars, valueTypeQueue,
      parseErrorDescription, parseError,
      skipNext, firstLevelKeys
    } = state;

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

  return { processingContext, processingState,
    currentChar, keyChars, valueTypeQueue,
    parseErrorDescription, parseError,
    skipNext, firstLevelKeys
  };
}
  
function parseNextInConfigFile(state)
{
  let
    {
      processingContext, processingState,
      currentChar , keyChars, valueTypeQueue,
      parseErrorDescription, parseError,
      skipNext, firstLevelKeys
    } = state;

  // Good for debugging.
  //console.log('Pass - begin');
  //console.log(processingContext);
  //console.log(processingState);
  //console.log(currentChar);
  
  if (processingContext === 'keys')
  {
    Object.assign(state, processKeyContext(state));
  }
  else if (processingContext === 'values')
  {
    Object.assign(state, processValueContext(state));
  }
  else
  {
    parseErrorDescription = 'Unexpected error.';
    parseError = true;
  }

  return { processingContext, processingState,
    currentChar, keyChars, valueTypeQueue,
    parseErrorDescription, parseError,
    skipNext, firstLevelKeys
  };
}

function configFileFreeOfDuplicates(readConfigFile, fileName)
{
  // JSON gets rid of duplicate keys.  However, let's tell the user if the original
  // file had duplicate first-level keys, in case it was a mistake.
  // This is done after the parsing took place because at this point we know
  // that the source file is legal JSON (except for the potential duplicae keys),
  // and thus the code can be easy to parse.

  const state = 
  {
    processingConfigFile: null,
    parseErrorDescription: null,
    currentPos: 0,
    processingContext: 'keys',
    processingState: 'expectkey',
    valueTypeQueue: [],
    skipNext: false,
    currentChar: null,
    parseError: false,
    keyChars: [],
    firstLevelKeys: []
  };

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
        state.parseErrorDescription = `Unexpected ending ${lastCharMatch[1]}.`;
        state.parseError = true;
      }
    }
  }

  if (!state.parseError)
  {
    state.processingConfigFile = readConfigFile
      .replace(/^\s*\{\s*?\n?/, '')
      .replace(/\n?\s*?\}\s*$/, '');
  }

  while (!state.parseError && (state.currentPos < state.processingConfigFile.length))
  {
    state.currentChar = state.processingConfigFile.substr(state.currentPos, 1);
    
    // Good for debugging.
    if (state.currentChar === '*')
    {
      break;
    }

    if (state.skipNext)
    {
      state.skipNext = false;
    }
    else
    {
      if (!state.currentChar.match(/[\n\s]/) || (state.processingState === 'gettingkey') || (state.processingState === 'gettingvalue'))
      {
        Object.assign(state, parseNextInConfigFile(state));
      }
    }

    // Good for debugging.
    //console.log('Pass - end');
    //console.log(state.processingContext);
    //console.log(state.processingState);

    state.currentPos++;
  }

  if (!state.parseError && (state.valueTypeQueue.length !== 0))
  {
    // In theory, we should never get here because the file has already been JSON.parsed.
    const lastBracket = state.valueTypeQueue.pop();
    state.parseErrorDescription = `Unexpected end of file. ${lastBracket} was never found.`;
    state.parseError = true;
  }

  if (state.parseError)
  {
    console.error(`${TERMINAL_ERROR_STRING}: Error parsing ${fileName}`);
    console.error(`${TERMINAL_ERROR_STRING}: ${state.parseErrorDescription}`);
  }

  return !state.parseError;
}

function printInit(ctx)
{
  ctx.outputQueue = [];
}

function runAfterInit(ctx)
{
  ctx.runAfterQueue = [];
}

function assignAppHeaders(ctx, headers)
{
  ctx.appHeaders = Object.assign(ctx.appHeaders, headers);
}

function sanitizeForHTMLOutput(inputText)
{
  return String(inputText).replace(/[&<>"'`=/]/g, (s) => symbolsToSanitize[s]);
}

function setTempWorkDirectory(siteConfig)
{
  let  { tempWorkDirectory } = siteConfig;

  let setupSuccess = false;

  if (!siteConfig || !siteConfig.canUpload)
  {
    setupSuccess = true;
  }
  if (fsPath.isAbsolute(tempWorkDirectory))
  {
    console.error(`${TERMINAL_ERROR_STRING}: Temporary work directory path ${tempWorkDirectory} must be specified as relative.`);
  }
  else
  {
    tempWorkDirectory = fsPath.join(siteConfig.fullSitePath, tempWorkDirectory);
    siteConfig.tempWorkDirectory = getDirectoryPathAndCheckIfWritable(tempWorkDirectory);
    setupSuccess = (typeof(siteConfig.tempWorkDirectory) !== 'undefined');
  }

  return setupSuccess;
}

function doDeleteFile(thisFile)
{
  fs.stat(thisFile.path, (err) =>
  {
    if (err)
    {
      if (err.code !== 'ENOENT')
      {
        console.warn(`${TERMINAL_INFO_WARNING}: Could not delete unhandled uploaded file: ${thisFile.name}`);
        console.warn(`${TERMINAL_INFO_WARNING}: (CONT) On the file system as: ${thisFile.path}`);
        console.warn(err);
      }
    }
    else {
      fs.unlink(thisFile.path, (err) =>
      {
        if (err)
        {
          console.warn(`${TERMINAL_INFO_WARNING}: Could not delete unhandled uploaded file: ${thisFile.name}`);
          console.warn(`${TERMINAL_INFO_WARNING}: (CONT) On the file system as: ${thisFile.path}`);
          console.warn(err);
        }
      });
    }
  });
}

function doMoveToTempWorkDir(thisFile, tempWorkDirectory, { responder, siteName, req, res, compiledCode, runFileName, formContext, pendingWork, fullSitePath })
{
  pendingWork.pendingRenaming++;
  const oldFilePath = thisFile.path;
  const newFilePath = fsPath.join(tempWorkDirectory, `jscupload_${crypto.randomBytes(16).toString('hex')}`);
  
  fs.rename(oldFilePath, newFilePath, (err) =>
  {
    pendingWork.pendingRenaming--;
    if (err)
    {
      console.error(`${TERMINAL_ERROR_STRING}: Could not rename unhandled uploaded file: ${thisFile.name}`);
      console.error(`${TERMINAL_ERROR_STRING}: (CONT) Renaming from: ${oldFilePath}`);
      console.error(`${TERMINAL_ERROR_STRING}: (CONT) Renaming to: ${newFilePath}`);
      console.error(err);
    }
    else
    {
      thisFile.path = newFilePath;
    }
    
    if (pendingWork.pendingRenaming <= 0)
    {
      responder(req, res, siteName, compiledCode, runFileName, fullSitePath, formContext);
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

function doneWith(ctx, id, isCancellation)
{
  if (id)
  {
    delete ctx.waitForQueue[id];
  }

  if (isCancellation)
  {
    return;
  }
  
  if (Object.keys(ctx.waitForQueue).length === 0)
  {
    if (ctx.runAfterQueue && ctx.runAfterQueue.length)
    {
      const cb = ctx.runAfterQueue.shift();
      const waitForId = createWaitForCallback(ctx, cb);
      ctx.waitForQueue[waitForId]();
    }
    else
    {
      const formFiles = ctx.uploadedFiles;
      if (formFiles)
      {
        deleteUnhandledFiles(formFiles);
      }

      const { runtimeException, runFileName, reqObject, resObject, compileTimeError, statusCode } = ctx;

      if (runtimeException)
      {
        ctx.outputQueue = [];
        console.error(`${TERMINAL_ERROR_STRING}: Site: ${ctx.siteName}: Runtime error on file ${runFileName}: ${extractErrorFromRuntimeObject(runtimeException)}`);
        console.error(runtimeException);
      }

      if (runtimeException || compileTimeError)
      {
        const { siteName, fullSitePath, compiledFiles, staticFiles, jsCookies } = ctx;
        handleError5xx(reqObject, resObject, jsCookies, siteName, staticFiles, compiledFiles, fullSitePath);
        return;
      }
      else
      {
        let showContents = true;
        if (ctx.redirection.willHappen)
        {
          const { httpStatusCode, location, delay } = ctx.redirection;
          resObject.statusCode = httpStatusCode;
          if (delay)
          {
            resObject.setHeader('Refresh', `${delay}; ${location}`);
          }
          else
          {
            resObject.setHeader('Location', location);
            showContents = false;
          }
        }
        else
        {
          resObject.statusCode = statusCode;
        }
        resEnd(reqObject, resObject, showContents ? (ctx.outputQueue || []).join('') : '');
      }
    }
  }
}

function finishUpHeaders(ctx)
{
  const { appHeaders, resObject } = ctx;
  Object.keys(appHeaders).forEach((headerName) => resObject.setHeader(headerName, appHeaders[headerName]));
}

function createWaitForCallback(rtContext, cb)
{
  const waitForId = rtContext.waitForNextId++;
  
  rtContext.waitForQueue[waitForId] = (...params) =>
  {
    if (!rtContext.runtimeException)
    {
      try
      {
        cb.call({}, ...params);
      }
      catch(e)
      {
        rtContext.runtimeException = e;
      }
    }

    doneWith(rtContext, waitForId);
  };

  return waitForId;
}

function makeRTPromiseHandler(rtContext, resolve, reject)
{
  const resolverCallback = (err, data) =>
  {
    if (err)
    {
      reject(err);
    }
    else
    {
      resolve(data);
    }
  };

  const waitForId = createWaitForCallback(rtContext, resolverCallback);
  return rtContext.waitForQueue[waitForId];
}

function cancelDefaultRTPromises(rtContext, defaultSuccessWaitForId, defaultErrorWaitForId, isCancellation)
{
  let isErrorCancellation = isCancellation;
  if (defaultSuccessWaitForId)
  {
    doneWith(rtContext, defaultSuccessWaitForId, isCancellation);
    isErrorCancellation = true;
  }

  if (defaultErrorWaitForId)
  {
    doneWith(rtContext, defaultErrorWaitForId, isErrorCancellation);
  }
}

function doneWithPromiseCounterActor(rtContext, promiseContext, promiseActorType)
{
  const counterActorId = (promiseActorType === PROMISE_ACTOR_TYPE_SUCCESS) ?
    promiseContext.errorWaitForId :
    promiseContext.successWaitForId;
  if (counterActorId)
  {
    doneWith(rtContext, counterActorId);
  }
}

const makeCustomRtPromiseActor = (rtContext, promiseContext, promiseActorType, defaultSuccessWaitForId, defaultErrorWaitForId, actorCallback) => {
  return (actorCallback) ?
    (...params) =>
    {
      try
      {
        actorCallback.call({}, ...params);
      }
      catch(e)
      {
        rtContext.runtimeException = e;
      }

      doneWithPromiseCounterActor(rtContext, promiseContext, promiseActorType);
      cancelDefaultRTPromises(rtContext, defaultSuccessWaitForId, defaultErrorWaitForId, true);
    } :
    () =>
    {
      doneWithPromiseCounterActor(rtContext, promiseContext, promiseActorType);
      cancelDefaultRTPromises(rtContext, defaultSuccessWaitForId, defaultErrorWaitForId, true);
    };
};

function makeRTOnSuccessOnErrorHandlers(rtContext, promiseContext, defaultSuccessWaitForId, defaultErrorWaitForId)
{
  const rtOnSuccess = (successCallback) =>
  {
    const cb = makeCustomRtPromiseActor(rtContext, promiseContext, PROMISE_ACTOR_TYPE_SUCCESS, defaultSuccessWaitForId, defaultErrorWaitForId, successCallback);

    promiseContext.successWaitForId = createWaitForCallback(rtContext, cb);

    return {
      rtOnError
    };
  };

  const rtOnError = (errorCallback) =>
  {
    if (typeof(promiseContext.successWaitForId) === 'undefined')
    {
      return rtOnSuccess()
        .rtOnError(errorCallback);
    }

    promiseContext.customCallBack = makeCustomRtPromiseActor(rtContext, promiseContext, PROMISE_ACTOR_TYPE_ERROR, defaultSuccessWaitForId, defaultErrorWaitForId, errorCallback);

    promiseContext.errorWaitForId = createWaitForCallback(rtContext, promiseContext.customCallBack);
  };

  return {
    rtOnSuccess,
    rtOnError
  };
}

function makeRTPromise(rtContext, rtPromise)
{
  let defaultSuccessWaitForId;
  let defaultErrorWaitForId;
  const promiseContext =
  {
    successWaitForId: undefined,
    errorWaitForId: undefined,
    customCallBack: undefined
  };

  defaultSuccessWaitForId = createWaitForCallback(rtContext, () =>
  {
    cancelDefaultRTPromises(rtContext, defaultSuccessWaitForId, defaultErrorWaitForId);
  });

  defaultErrorWaitForId = createWaitForCallback(rtContext, (e) =>
  {
    rtContext.runtimeException = e;
    
    if (promiseContext.successWaitForId)
    {
      doneWith(rtContext, promiseContext.successWaitForId, true);
    }

    cancelDefaultRTPromises(rtContext, defaultSuccessWaitForId, defaultErrorWaitForId);
  });

  new Promise(rtPromise)
    .then(() => {
      if (promiseContext.successWaitForId)
      {
        rtContext.waitForQueue[promiseContext.successWaitForId]();
      }
      else
      {
        rtContext.waitForQueue[defaultSuccessWaitForId]();
      }
    })
    .catch((e) =>
    {
      if (promiseContext.errorWaitForId)
      {
        if (promiseContext.customCallBack)
        {
          rtContext.waitForQueue[promiseContext.errorWaitForId](e);
        }
        else {
          rtContext.runtimeException = e;

          if (promiseContext.successWaitForId)
          {
            doneWith(rtContext, promiseContext.successWaitForId);
          }

          cancelDefaultRTPromises(rtContext, defaultSuccessWaitForId, defaultErrorWaitForId, true);
        }
      }
      else
      {
        rtContext.waitForQueue[defaultErrorWaitForId](e);
      }
    });

  return makeRTOnSuccessOnErrorHandlers(rtContext, promiseContext, defaultSuccessWaitForId, defaultErrorWaitForId);
}

function createRunTime(rtContext)
{
  const { runFileName, getParams, postParams, contentType,
    requestMethod, uploadedFiles, additional, jsCookies, reqObject = {} } = rtContext;

  const pathCheck = runFileName.match(/(.*)\/.*\.jscp$/);
  const currentPath = pathCheck && pathCheck[1] || '/';

  return Object.freeze({
    getCurrentPath() { return currentPath; },
    unsafePrint(output = '') { rtContext.outputQueue.push(output); },
    print(output = '') { rtContext.outputQueue.push(sanitizeForHTMLOutput(output)); },
    header(nameOrObject, value)
    {
      assignAppHeaders.apply(this,
        (typeof(nameOrObject) === 'string') ?
          [rtContext, {[nameOrObject]: value}] :
          [].concat(rtContext, nameOrObject)
      );
    },
    waitFor(cb)
    {
      return rtContext.waitForQueue[createWaitForCallback(rtContext, cb)];
    },
    runAfter(cb)
    {
      rtContext.runAfterQueue.push(cb);
    },
    fileExists(path)
    {
      if (!fsPath.isAbsolute(path))
      {
        path = fsPath.join(rtContext.fullSitePath, path);
      }

      return makeRTPromise(rtContext, (resolve, reject) =>
      {
        fs.stat(path, makeRTPromiseHandler(rtContext, resolve, reject));
      });
    },
    readFile(path)
    {
      if (!fsPath.isAbsolute(path))
      {
        path = fsPath.join(rtContext.fullSitePath, path);
      }

      return makeRTPromise(rtContext, (resolve, reject) =>
      {
        fs.readFile(path, 'utf-8', makeRTPromiseHandler(rtContext, resolve, reject));
      });
    },
    copyFile(source, destination, overwrite = true)
    {
      if (!fsPath.isAbsolute(source))
      {
        source = fsPath.join(rtContext.fullSitePath, source);
      }

      if (!fsPath.isAbsolute(destination))
      {
        destination = fsPath.join(rtContext.fullSitePath, destination);
      }

      return makeRTPromise(rtContext, (resolve, reject) =>
      {
        if (overwrite)
        {
          fs.copyFile(source, destination, makeRTPromiseHandler(rtContext, resolve, reject));
        }
        else
        {
          fs.copyFile(source, destination, fs.constants.COPYFILE_EXCL, makeRTPromiseHandler(rtContext, resolve, reject));
        }
      });
    },
    moveFile(source, destination, overwrite = true)
    {
      if (!fsPath.isAbsolute(source))
      {
        source = fsPath.join(rtContext.fullSitePath, source);
      }

      if (!fsPath.isAbsolute(destination))
      {
        destination = fsPath.join(rtContext.fullSitePath, destination);
      }

      return makeRTPromise(rtContext, (resolve, reject) =>
      {
        if (overwrite)
        {
          fs.rename(source, destination, makeRTPromiseHandler(rtContext, resolve, reject));
        }
        else
        {
          fs.stat(destination, (err) =>
          {
            if (err)
            {
              // If file doesn't exist, then we can proceed with the move operation.
              fs.rename(source, destination, makeRTPromiseHandler(rtContext, resolve, reject));
            }
            else
            {
              reject({
                Error: `EEXIST: file already exists, movefile '${source}' -> '${destination}'`,
                code: 'EEXIST',
                syscall: 'rename',
                path: source,
                dest: destination
              });
            }
          });
        }
      });
    },
    deleteFile(path)
    {
      if (!fsPath.isAbsolute(path))
      {
        path = fsPath.join(rtContext.fullSitePath, path);
      }

      return makeRTPromise(rtContext, (resolve, reject) =>
      {
        fs.unlink(path, makeRTPromiseHandler(rtContext, resolve, reject));
      });
    },
    module(moduleName)
    {
      if (fsPath.isAbsolute(moduleName))
      {
        console.error(`${TERMINAL_ERROR_STRING}: Module name and path ${moduleName} must be specified as relative.`);
      }
      else
      {
        const modulePath = fsPath.join(rtContext.fullSitePath, JSCAUSE_WEBSITE_PATH, `${moduleName}.jscm`);
        return require(modulePath);
      }
    },
    getCookie(cookieName = '', options = {})
    {
      const { decodeURIValue = true } = options;
      let value = '';
      if (typeof(cookieName) === 'string')
      {
        if (decodeURIValue)
        {
          value = decodeURIComponent(jsCookies.get(encodeURIComponent(cookieName)) || '');
        }
        else
        {
          value = jsCookies.get(encodeURIComponent(cookieName)) || '';
        }
      }

      return value;
    },
    setCookie(cookieName = '', value = '', options = {})
    {
      if (typeof(cookieName) !== 'string')
      {
        return false;
      }

      let result = false;
      let { expires, maxAge, httpOnly = true, secure, path = '/', domain, sameSite, encodeURIValue = true } = options;

      const { connection = {}, protocol } = reqObject;
      const { encrypted: isEncryptedConnection } = connection || {};

      if (secure && !((protocol === 'https') || isEncryptedConnection))
      {
        throw(new Error('Cookie is secure but the connection is not HTTPS.  Will not send'));
      }

      if (expires && ((typeof(expires) !== 'object') || !(expires instanceof Date)))
      {
        throw(new Error('Invalid expired value.  Date object expected'));
      }

      if (maxAge && (expires || (typeof(maxAge) !== 'number')))
      {
        maxAge = undefined;
      }

      if (sameSite && ((sameSite !== 'strict') && (sameSite !== 'lax')))
      {
        throw(new Error('Invalid sameSite value.  \'strict\' or \'lax\' expected'));
      }

      cookieName = encodeURIComponent(cookieName);
      if (encodeURIValue)
      {
        value = encodeURIComponent(value);
      }

      try
      {
        jsCookies.set(cookieName, value || '', {
          expires,
          maxAge,
          httpOnly: !!httpOnly,
          secure,
          path,
          domain,
          sameSite
        });
        result = true;
      }
      catch(e)
      {
        // Throwing as new error, so the line number makes sense to the user.
        // (Otherwise, the line number shown will be that of the cookies compiled module.)
        throw(new Error(e));
      }

      return result;
    },
    deleteCookie(cookieName = '')
    {
      if (typeof(cookieName) !== 'string')
      {
        return false;
      }

      let result = false;

      cookieName = encodeURIComponent(cookieName);

      try
      {
        jsCookies.set(cookieName);
        result = true;
      }
      catch(e)
      {
        // Throwing as new error, so the line number makes sense to the user.
        // (Otherwise, the line number shown will be that of the cookies compiled module.)
        throw(new Error(e));
      }

      return result;
    },
    redirectTo(redirectUrl = '', delayInSeconds)
    {
      if (rtContext.runFileName === '/error4xx.jscp')
      {
        throw(new Error('Endless redirection detected.'));
      }
      else
      {
        Object.assign(rtContext.redirection,
          {
            willHappen: true,
            httpStatusCode: 302,
            location: redirectUrl
          }
        );

        if (typeof(delayInSeconds) === 'number')
        {
          Object.assign(rtContext.redirection,
            {
              delay: delayInSeconds
            }
          );
        }
      }
    },
    resetRedirectTo()
    {
      Object.assign(rtContext.redirection,
        {
          willHappen: false
        }
      );
    },
    getParams,
    postParams,
    contentType,
    requestMethod,
    uploadedFiles,
    additional
  });
}

function extractErrorFromCompileObject(e)
{
  const lineNumberInfo = (e.stack || ':(unknown)').toString().split('\n')[0];
  const lineNumber = lineNumberInfo.split(/.*:([^:]*)$/)[1] || '(unknown)';
  return `${e.message || 'unknown error'} at line ${lineNumber}`;
}

function extractErrorFromRuntimeObject(e)
{
  const lineNumberInfo = e.stack || '<anonymous>::(unknown)';
  const [, fileName = '', potentialFileNumber] = lineNumberInfo.match(/^(.+):(\d+)\n/) || [];
  const atInfo = (potentialFileNumber) ?
    `at file ${fileName}, line ${potentialFileNumber}`
    :
    `at line ${((lineNumberInfo.match(/<anonymous>:(\d*):\d*/i) || [])[1] || '(unknown)')}`
  return `${e.message || 'unknown error'} ${atInfo}`;
}

/* *************************************
   *
   * Server stuff
   *
   ************************************** */

function responder(req, res, siteName, compiledCode, runFileName, fullSitePath,
  { requestMethod, contentType, requestBody,
    formData, formFiles, maxSizeExceeded,
    forbiddenUploadAttempted, responseStatusCode,
    staticFiles, compiledFiles, jsCookies
  })
{
  let postParams;
  let uploadedFiles = {};
  const additional = {};

  if (contentType === 'formDataWithUpload')
  {
    postParams = formData;
    Object.keys(formFiles).forEach((keyName) =>
    {
      const file = formFiles[keyName];
      uploadedFiles[keyName] =
      {
        lastModifiedDate: file.lastModifiedDate,
        name: file.name,
        path: file.path,
        size: file.size,
        type: file.type,
        unsafeName: file.unsafeName
      }
    });
  }
  else if (contentType === 'formData')
  {
    postParams = formData;
  }
  else if (contentType === 'jsonData')
  {
    const postBody = Buffer.concat(requestBody).toString();
    let parseSuccess = true;
    try
    {
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
    additional,
    appHeaders: {},
    compiledFiles,
    compileTimeError: false,
    contentType,
    fullSitePath,
    getParams: urlUtils.parse(req.url, true).query,
    jsCookies,
    outputQueue: undefined,
    postParams,
    reqObject: req,
    requestMethod,
    resObject: res,
    redirection: { willHappen: false },
    runAfterQueue: undefined,
    runFileName,
    runtimeException: undefined,
    siteName,
    staticFiles,
    statusCode: responseStatusCode || 200,
    uploadedFiles,
    waitForNextId: 1,
    waitForQueue: {}
  };

  if (additional.jsonParseError)
  {
    resContext.statusCode = 400;
  }

  const runTime = createRunTime(resContext);

  if (!maxSizeExceeded && !forbiddenUploadAttempted)
  {
    if (compiledCode)
    {
      printInit(resContext);
      runAfterInit(resContext);
      try
      {
        compiledCode.call({}, runTime);
      }
      catch (e)
      {
        resContext.runtimeException = e;
      }

      assignAppHeaders(resContext, {'Content-Type': 'text/html; charset=utf-8'});

      finishUpHeaders(resContext);
    }
    else
    {
      resContext.compileTimeError = true;
    }
  }
  
  doneWith(resContext);
}

function responderStatic(req, res, siteName, fullPath, contentType, fileSize, statusCode, { fileContents: contents, readStream })
{
  const resObject = res;
  const resContext = { appHeaders: {}, resObject };

  assignAppHeaders(resContext, {'Content-Type': contentType, 'Content-Length': fileSize});
  finishUpHeaders(resContext);
  
  resObject.statusCode = statusCode;

  if (contents || !readStream)
  {
    resEnd(req, resObject, contents);
  }
  else
  {
    req.on('close', () =>
    {
      readStream.destroy();
    });

    readStream.on('data', (data) =>
    {
      resObject.write(data);
    });

    readStream.on('end', () =>
    {
      resEnd(req, resObject);
    });

    readStream.on('close', () =>
    {
      resEnd(req, resObject);
    });

    readStream.on('error', (e) =>
    {
      console.error(`${TERMINAL_ERROR_STRING}: Site ${getSiteNameOrNoName(siteName)}: Cannot serve ${fullPath} file.`);
      console.error(e);
      resObject.statusCode = 404;
      resObject.setHeader('Content-Type', 'application/octet-stream');
      resEnd(req, resObject);
    });
  }
}

function sendPayLoadExceeded(req, res, maxPayloadSizeBytes)
{
  console.error(`${TERMINAL_ERROR_STRING}: Payload exceeded limit of ${maxPayloadSizeBytes} bytes`);
  res.statusCode = 413;
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Connection', 'close');
  resEnd(req, res);
}

function sendUploadIsForbidden(req, res)
{
  console.error(`${TERMINAL_ERROR_STRING}: Uploading is forbidden.`);
  res.statusCode = 403;
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Connection', 'close');
  resEnd(req, res);
}

function handleCustomError(staticFileName, compiledFileName, req, res, jsCookies, siteName, staticFiles, compiledFiles, fullSitePath, errorCode)
{
  const { headers = {}, method } = req;
  const requestMethod = (method || '').toLowerCase();
  const contentType = (headers['content-type'] || '').toLowerCase();
  const acceptedContent = (headers['accept'] || '').toLowerCase();

  let runFileName = staticFileName;

  const isTextTypeExpected = !!(acceptedContent.match(/,?text\/.+,?/) || contentType.match(/^text\/.+/));

  const staticCode = staticFiles && staticFiles[runFileName];
  const staticCodeExists = (typeof(staticCode) !== 'undefined');

  if (isTextTypeExpected)
  {
    if (staticCodeExists)
    {
      serveStaticContent(req, res, siteName, staticFiles[runFileName], errorCode);
      return;
    }

    runFileName = compiledFileName;
    const compiledCode = compiledFiles && compiledFiles[runFileName];
    const compiledCodeExists = (typeof(compiledCode) !== 'undefined');

    if (compiledCodeExists)
    {
      const postContext = { requestMethod, contentType, requestBody: [], responseStatusCode: errorCode, jsCookies };
      responder(req, res, siteName, compiledCode, runFileName, fullSitePath, postContext);
      return;
    }
  }

  res.statusCode = errorCode;
  res.setHeader('Content-Type', 'application/octet-stream');
  resEnd(req, res);
}

function handleError4xx(req, res, jsCookies, siteName, staticFiles, compiledFiles, fullSitePath, errorCode = 404)
{
  handleCustomError('/error4xx.html', '/error4xx.jscp', req, res, jsCookies, siteName, staticFiles, compiledFiles, fullSitePath, errorCode);
}

function handleError5xx(req, res, jsCookies, siteName, staticFiles, compiledFiles, fullSitePath, errorCode = 500)
{
  handleCustomError('/error5xx.html', '/error5xx.jscp', req, res, jsCookies, siteName, staticFiles, compiledFiles, fullSitePath, errorCode);
}

function serveStaticContent(req, res, siteName, staticContent, statusCode = 200)
{
  const { fileContents, fileContentType, fullPath, fileSize } = staticContent;
  if (typeof(fileContents) === 'undefined')
  {
    const readStream = fs.createReadStream(fullPath);
    responderStatic(req, res, siteName, fullPath, fileContentType, fileSize, statusCode, { readStream });
  }
  else
  {
    responderStatic(req, res, siteName, fullPath, fileContentType, fileSize, statusCode, { fileContents });
  }
}

function resEnd(req, res, response)
{
  const { method, url } = req;
  const { statusCode } = res;
  console.log(`${method}: ${url} - ${statusCode}`);//__RP - For now.
  res.end(response);
}

function incomingRequestHandler(req, res)
{
  const { headers = {}, headers: { host: hostHeader = '' }, url, method } = req;
  const [/* Deliberately left blank. */, reqHostName, preparsedReqPort] = hostHeader.match(/(.+):(\d+)$/);
  const requestMethod = (method || '').toLowerCase();
  const reqMethodIsValid = ((requestMethod === 'get') || (requestMethod === 'post'));
  const reqPort = parseInt(preparsedReqPort, 10);
  const runningServer = runningServers[reqPort];

  const jsCookies = new cookies(req, res);
  
  let contentType = (headers['content-type'] || '').toLowerCase();
  let identifiedSite;

  if (runningServer)
  {
    identifiedSite = runningServer.sites[reqHostName];
  }

  if (!identifiedSite || !reqMethodIsValid)
  {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/octet-stream');
    resEnd(req, res);
    return;
  }

  let { pathname: resourceName } = urlUtils.parse(url, true);
  let indexFileNameAutomaticallyAdded = false;
  if (resourceName.match(/\/$/))
  {
    resourceName += 'index.jscp';
    indexFileNameAutomaticallyAdded = true;
  }

  const [ /* Deliberately empty */ , /* Deliberately empty */ , resourceFileExtension ] = resourceName.match(/(.*)\.([^./]+)$/) || [];

  let runFileName = `${resourceName}${(resourceFileExtension) ? '' : '.jscp' }`;

  // Because the filesystem and the browser may have encoded the same file name differently (UTF NFC vs NFD):
  resourceName = encodeURI(decodeURI(resourceName).normalize('NFD'));
  runFileName = encodeURI(decodeURI(runFileName).normalize('NFD'));

  const
    {
      name: siteName, canUpload, maxPayloadSizeBytes,
      tempWorkDirectory, staticFiles, compiledFiles,
      fullSitePath, jscpExtensionRequired, includeHttpPoweredByHeader
    } = identifiedSite;

  if (includeHttpPoweredByHeader)
  {
    res.setHeader('X-Powered-By', 'jscause');
  }

  if ((runFileName === '/error4xx.jscp') ||
      (runFileName === '/error4xx.html') ||
      (runFileName === '/error5xx.jscp') ||
      (runFileName === '/error5xx.html'))
  {
    handleError4xx(req, res, jsCookies, siteName, staticFiles, compiledFiles, fullSitePath);
    return;
  }

  let compiledCode = compiledFiles[runFileName];
  let compiledCodeExists = (typeof(compiledCode) !== 'undefined');

  const jscpExtensionDetected = (resourceFileExtension === 'jscp');
  const indexWithNoExtensionDetected = (!resourceFileExtension && (resourceName.match(/\/index$/)));

  if (!indexFileNameAutomaticallyAdded &&
      ((jscpExtensionRequired === 'never') && (jscpExtensionDetected || indexWithNoExtensionDetected)) ||
      ((jscpExtensionRequired === 'always') && (!resourceFileExtension && compiledCodeExists)))
  {
    handleError4xx(req, res, jsCookies, siteName, staticFiles, compiledFiles, fullSitePath);
    return;
  }
  else if (staticFiles[runFileName])
  {
    serveStaticContent(req, res, siteName, staticFiles[runFileName])
  }
  else
  {
    if (!compiledCodeExists)
    {
      runFileName = `${resourceName}/index.jscp`;
      compiledCode = compiledFiles[runFileName];
      compiledCodeExists = (typeof(compiledCode) !== 'undefined');
    }

    if (!compiledCodeExists)
    {
      handleError4xx(req, res, jsCookies, siteName, staticFiles, compiledFiles, fullSitePath);
      return;
    }

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
      sendPayLoadExceeded(req, res, maxPayloadSizeBytes);
    }
    else if (incomingForm && !canUpload)
    {
      forbiddenUploadAttempted = true;
      sendUploadIsForbidden(req, res);
    }
    else if (postedForm)
    {
      postedForm.keepExtensions = false;

      postedForm.parse(req);

      postedForm.on('error', (err) =>
      {
        console.error(`${TERMINAL_ERROR_STRING}: Form upload related error.`);
        console.error(err);
      });

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
          sendPayLoadExceeded(req, res, maxPayloadSizeBytes);
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
          forbiddenUploadAttempted,
          staticFiles,
          compiledFiles,
          jsCookies
        };

        let formFilesKeys;
        if (isUpload)
        {
          formFilesKeys = Object.keys(formFiles);

          if (formFilesKeys.length)
          {
            formFilesKeys.forEach((fileKey) =>
            {
              const thisFile = formFiles[fileKey];
              if (Array.isArray(thisFile))
              {
                thisFile.forEach((thisActualFile) =>
                {
                  doMoveToTempWorkDir(thisActualFile, tempWorkDirectory, { responder, siteName, req, res, compiledCode, runFileName, formContext, pendingWork, fullSitePath });
                });
              }
              else
              {
                doMoveToTempWorkDir(thisFile, tempWorkDirectory, { responder, siteName, req, res, compiledCode, runFileName, formContext, pendingWork, fullSitePath });
              }
            });
          }
        }

        if (!isUpload || !formFilesKeys)
        {
          responder(req, res, siteName, compiledCode, runFileName, fullSitePath, formContext);
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
            sendPayLoadExceeded(req, res, maxPayloadSizeBytes);
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
          sendUploadIsForbidden(req, res);
        }
      }).on('end', () =>
      {
        if (contentType === 'application/json')
        {
          contentType = 'jsonData';
        }

        const postContext = { requestMethod, contentType, requestBody, maxSizeExceeded, forbiddenUploadAttempted, staticFiles, compiledFiles, jsCookies };
        responder(req, res, siteName, compiledCode, runFileName, fullSitePath, postContext);
      });
    }
  }

  req.on('error', (err) =>
  {
    console.error(`${TERMINAL_ERROR_STRING}: Request related error.`);
    console.error(err);
  })
}

function runWebServer(runningServer, serverPort)
{
  const { webServer, serverName, sites } = runningServer;
  webServer.on('request', incomingRequestHandler);

  webServer.on('error', (e) =>
  {
    console.error(`${TERMINAL_ERROR_STRING}: Server ${serverName} could not start listening on port ${serverPort}.`)
    console.error(`${TERMINAL_ERROR_STRING}: Error returned by the server follows:`)
    console.error(`${TERMINAL_ERROR_STRING}: ${e.message}`);
    console.error(`${TERMINAL_ERROR_STRING}: Server ${serverName} (port: ${serverPort}) not started.`);
    Object.values(sites).forEach((site) =>
    {
      console.error(`${TERMINAL_ERROR_STRING}: - Site ${getSiteNameOrNoName(site.name)} not started.`);
    });
  });

  webServer.listen(serverPort, () =>
  {
    console.log(`${TERMINAL_INFO_STRING}: Server ${serverName} listening on port ${serverPort}`);
  });
}

function startServer(siteConfig)
{
  const { name: siteName, port: serverPort, fullSitePath, enableHTTPS, httpsCertFile: certFileName, httpsKeyFile: keyFileName } = siteConfig;
  let result = true;

  let runningServer = runningServers[serverPort];
  let webServer;
  let serverName;

  if (runningServer)
  {
    serverName  = runningServer.serverName;
  }
  else
  {
    serverName = Object.keys(runningServers).length.toString();

    runningServer =
    {
      serverName,
      sites: {}
    };

    if (enableHTTPS)
    {
      const certsPath = fsPath.join(fullSitePath, JSCAUSE_CONF_PATH, JSCAUSE_CERTS_PATH);
      let sslKey;
      let sslCert;

      try
      {
        sslKey = fs.readFileSync(fsPath.join(certsPath, keyFileName));
      }
      catch(e)
      {
        console.error(`${TERMINAL_ERROR_STRING}: Site ${getSiteNameOrNoName(siteName)}: Cannot read '${keyFileName}' SSL key file.`);
        result = false;
      }

      try
      {
        sslCert = fs.readFileSync(fsPath.join(certsPath, certFileName))
      }
      catch(e)
      {
        console.error(`${TERMINAL_ERROR_STRING}: Site ${getSiteNameOrNoName(siteName)}: Cannot read '${certFileName}' SSL cert file.`);
        result = false;
      }


      if (sslKey && sslCert)
      {
        const httpsOptions =
        {
          key: sslKey,
          cert: sslCert,
        };
        webServer = https.createServer(httpsOptions);
      }
    }
    else
    {
      webServer = http.createServer();
    }
    
    if (webServer)
    {
      runningServer.webServer = webServer;
      runWebServer(runningServer, serverPort);
      runningServers[serverPort] = runningServer;
    }
  }

  runningServer.sites[siteConfig.hostName] = siteConfig;

  if (result)
  {
    console.log(`${TERMINAL_INFO_STRING}: Site ${getSiteNameOrNoName(siteName)} at http${enableHTTPS ? 's' : ''}://${siteConfig.hostName}:${serverPort}/ assigned to server ${serverName}`);
  }

  return result;
}

function readConfigurationFile(name, path = '.')
{
  let stats;
  let readConfigFile;
  let readSuccess = false;
  const fullPath = fsPath.join(path, name);

  try
  {
    stats = fs.statSync(fullPath);
    readSuccess = true;
  }
  catch (e)
  {
    console.error(`${TERMINAL_ERROR_STRING}: Cannot find ${name} file.`);
    console.error(e);
  }

  if (readSuccess)
  {
    readSuccess = false;

    if (stats.isDirectory())
    {
      console.error(`${TERMINAL_ERROR_STRING}: ${name} is a directory.`);
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
        console.error(`${TERMINAL_ERROR_STRING}: Cannot load ${name} file.`);
        console.error(e);
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
      console.error(`${TERMINAL_ERROR_STRING}: "${configKeyLowerCase}"${casingReport}${emptyValueReport} is not a valid configuration key.`);
      invalidKeysFound = true;
    }
    else
    {
      processedConfigJSON[configKeyLowerCase] = configJSON[configKey];
    }
  }

  if (invalidKeysFound)
  {
    console.error(`${TERMINAL_ERROR_STRING}: Check that all the keys and values in ${fileName} are valid.`);
  }
  else
  {
    finalProcessedConfigJSON = processedConfigJSON;
  }

  return finalProcessedConfigJSON;
}

function createInitialSiteConfig(siteInfo)
{
  const { name, port, rootdirectoryname: rootDirectoryName, enablehttps: enableHTTPS } = siteInfo;
  return Object.assign({}, defaultSiteConfig, { name, port, rootDirectoryName, enableHTTPS });
}

function checkForUndefinedConfigValue(configKeyName, configValue, requiredKeysNotFound, errorMsgIfFound)
{
  if (typeof(configValue) === 'undefined')
  {
    requiredKeysNotFound.push(configKeyName);
  }
  else
  {
    console.error(`${TERMINAL_ERROR_STRING}: ${errorMsgIfFound}`);
  }
}

function checkForRequiredKeysNotFound(requiredKeysNotFound, configName)
{
  let soFarSoGood = true;
  if (requiredKeysNotFound.length)
  {
    if (requiredKeysNotFound.length === 1)
    {
      console.error(`${TERMINAL_ERROR_STRING}: ${configName}:  The following configuration attribute was not found:`);
    }
    else
    {
      console.error(`${TERMINAL_ERROR_STRING}: ${configName}:  The following configuration attributes were not found:`);
    }
    requiredKeysNotFound.forEach((keyName) =>
    {
      console.error(`${TERMINAL_ERROR_STRING}: - ${keyName}`);
    });

    soFarSoGood = false;
  }

  return soFarSoGood;
}

function getSiteNameOrNoName(name)
{
  return name ? `'${name}'` : '(no name)';
}

function compileSource(sourceData)
{
  const Module = module.constructor;
  Module._nodeModulePaths(fsPath.dirname(''));
  let compiledModule;
  try
  {
    const CONTEXT_HTML = 0;
    const CONTEXT_JAVASCRIPT = 1;

    // Matches '<js', '<JS', /js>' or '/JS>'
    // Adds a prefixing space to distinguish from 
    // '\<js', '\<JS', '/js>', '/JS>', for easy splitting
    // (Otherwise, it would delete whatever character is right before.)
    let unprocessedData = sourceData
      .replace(/^[\s\n]*<html\s*\/>/i, '<js/js>')
      .replace(/([^\\])<js/gi,'$1 <js')
      .replace(/^<js/i,' <js')
      .replace(/([^\\])\/js>/gi, '$1 /js>')
      .replace(/^\/js>/i, ' /js>');
    
    if (!unprocessedData.match(/\n$/))
    {
      // Adding a blank line at the end of the source code avoids a
      // compilation error if the very last line is a // comment.
      unprocessedData += '\n';
    }

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
          processedDataArray.push(`rt.unsafePrint('${printedStuff}');`);
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
          console.warn(`${TERMINAL_INFO_WARNING}: Site: <html/> keyword found in the middle of code.  Did you mean to put it in the beginning of an HTML section?`);
        }

        processedDataArray.push(processBefore);
        
        unprocessedData = processAfter;

        processingContext = CONTEXT_HTML;
      }
    } while (unprocessedData);
    
    const processedData = processedDataArray.join('');

    try
    {
      const moduleToCompile = new Module();
      moduleToCompile._compile(`module.exports = function(rt) {${processedData}}`, '');
      compiledModule = moduleToCompile.exports;
    }
    catch (e)
    {
      console.error(`${TERMINAL_ERROR_STRING}: Site: Compile error: ${extractErrorFromCompileObject(e)}`);
      console.error(e);
    }
  }
  catch (e)
  {
    console.error(`${TERMINAL_ERROR_STRING}: Site: Parsing error, possibly internal.`);
    console.error(e);
  }

  return compiledModule;
}

function processSourceFile(sourceFilePath, siteJSONFilePath)
{
  let sourcePath = fsPath.join(...sourceFilePath);
  if (!fsPath.isAbsolute(sourcePath))
  {
    sourcePath = fsPath.join(siteJSONFilePath, JSCAUSE_WEBSITE_PATH, ...sourceFilePath);
  }
  let compileData;
  let compiledSource;
  let stats;

  try
  {
    stats = fs.statSync(sourcePath);
  }
  catch (e)
  {
    console.error(`${TERMINAL_ERROR_STRING}: Site: Cannot find source file: ${sourcePath}`);
    console.error(e);
  }

  if (stats)
  {
    if (stats.isDirectory())
    {
      console.error(`${TERMINAL_ERROR_STRING}: Site: Entry point is a directory: ${sourcePath}`);
    }
    else
    {
      try
      {
        compileData = fs.readFileSync(sourcePath, 'utf-8');
      }
      catch(e)
      {
        console.error(`${TERMINAL_ERROR_STRING}: Site: Cannot load source file: ${sourcePath}`);
        console.error(e);
      }
    }
  }

  if (typeof(compileData) !== 'undefined')
  {
    const possiblyCompiledSource = compileSource(compileData);
    if (typeof(possiblyCompiledSource) === 'function')
    {
      compiledSource = possiblyCompiledSource;
    }
    else
    {
      console.error(`${TERMINAL_ERROR_STRING}: Site: Could not compile code for ${fsPath.join(...sourceFilePath)}.`);
    }
  }

  return compiledSource;
}

function parseHostName(processedConfigJSON, siteConfig, requiredKeysNotFound)
{
  let soFarSoGood = true;
  const configKeyName = 'hostname';
  const configValue = processedConfigJSON[configKeyName];

  if (typeof(configValue) === 'string')
  {
    if (configValue.replace(/^\s*/g, '').replace(/\s*$/g, ''))
    {
      siteConfig.hostName = configValue;
    }
    else
    {
      console.error(`${TERMINAL_ERROR_STRING}: Site configuration:  hostname cannot be empty.`);
      soFarSoGood = false;
    }
  }
  else
  {
    checkForUndefinedConfigValue(configKeyName, configValue, requiredKeysNotFound, 'Site configuration:  Invalid hostname.  String value expected.');
    soFarSoGood = false;
  }

  return soFarSoGood;
}

function parseCanUpload(processedConfigJSON, siteConfig, requiredKeysNotFound)
{
  let soFarSoGood = true;
  const configKeyName = 'canupload';
  const configValue = processedConfigJSON[configKeyName];

  if (typeof(configValue) === 'boolean')
  {
    siteConfig.canUpload = configValue;
  }
  else
  {
    checkForUndefinedConfigValue(configKeyName, configValue, requiredKeysNotFound, 'Site configuration:  Invalid canupload.  Boolean expected.');
    soFarSoGood = false;
  }

  return soFarSoGood;
}

function parseMaxPayLoadSizeBytes(processedConfigJSON, siteConfig, requiredKeysNotFound)
{
  let soFarSoGood = true;
  const configKeyName = 'maxpayloadsizebytes';
  const configValue = processedConfigJSON[configKeyName];

  if ((typeof(configValue) !== 'string') || configValue.replace(/^\s*/g, '').replace(/\s*$/g, ''))
  {
    const uploadSize = parseFloat(configValue, 10);
    if (!isNaN(uploadSize) && (uploadSize === Math.floor(uploadSize)))
    {
      siteConfig.maxPayloadSizeBytes = uploadSize;
    }
    else
    {
      console.error(`${TERMINAL_ERROR_STRING}: Site configuration:  Missing or invalid maxpayloadsizebytes.  Integer number expected.`);
      soFarSoGood = false;
    }
  }
  else
  {
    checkForUndefinedConfigValue(configKeyName, configValue, requiredKeysNotFound, 'Site configuration:  maxpayloadsizebytes cannot be empty.');
    soFarSoGood = false;
  }

  return soFarSoGood;
}

function parseMimeTypes(processedConfigJSON, siteConfig, requiredKeysNotFound)
{
  let soFarSoGood = true;
  const configKeyName = 'mimetypes';
  const configValue = processedConfigJSON[configKeyName];

  if (typeof(configValue) === 'object')
  {
    siteConfig.mimeTypes.list = Object.assign({}, MIME_TYPES);
    Object.keys(configValue).every((rawValueName) =>
    {
      const valueName = rawValueName.toLowerCase();
      const mimeTypeList = configValue[valueName];
      const allowdNames = ['include', 'exclude'];
      if (allowdNames.indexOf(valueName) === -1)
      {
        console.error(`${TERMINAL_ERROR_STRING}: Site configuration:  mimetype has an invalid '${valueName}' name.  Expected: ${allowdNames.map(name=>`'${name}'`).join(', ')}.`);
        soFarSoGood = false;
      }
      else if ((valueName === 'include') && (Array.isArray(mimeTypeList)) || (typeof(mimeTypeList) !== 'object'))
      {
        console.error(`${TERMINAL_ERROR_STRING}: Site configuration:  mimetype has an invalid 'include' attribute value. Object (key, value) expected.`);
        soFarSoGood = false;
      }
      else if ((valueName === 'exclude') && (!Array.isArray(mimeTypeList)))
      {
        console.error(`${TERMINAL_ERROR_STRING}: Site configuration:  mimetype has an invalid 'exclude' attribute value. Array expected.`);
        soFarSoGood = false;
      }
      else
      {
        (Array.isArray(mimeTypeList) ? mimeTypeList : Object.keys(mimeTypeList)).every((mimeTypeName) => {
          if (typeof(mimeTypeName) === 'string')
          {
            if (mimeTypeName)
            {
              const includeValue = (valueName === 'include') ? mimeTypeList[mimeTypeName.toLowerCase()] : '';
              if (typeof(includeValue) === 'string')
              {
                if (!includeValue && (valueName === 'include'))
                {
                  console.warn(`${TERMINAL_INFO_WARNING}: Site configuration: ${mimeTypeName} mimetype value is empty.  Assumed application/octet-stream.`);
                }

                switch(valueName)
                {
                  case 'include':
                    siteConfig.mimeTypes.list[`.${mimeTypeName}`] = includeValue.toLowerCase();
                    break;

                  case 'exclude':
                    delete siteConfig.mimeTypes.list[`.${mimeTypeName}`];
                    break;
                }
              }
              else
              {
                console.error(`${TERMINAL_ERROR_STRING}: Site configuration:  mimetype has an invalid ${valueName} value for ${mimeTypeName}.  String expected.`);
                soFarSoGood = false;
              }
            }
            else
            {
              console.error(`${TERMINAL_ERROR_STRING}: Site configuration:  mimetype name cannot be empty.`);
              soFarSoGood = false;
            }
          }
          else
          {
            console.error(`${TERMINAL_ERROR_STRING}: Site configuration:  mimetype has an invalid ${valueName} name.  String expected.`);
            soFarSoGood = false;
          }
          return soFarSoGood;
        });
      }
      return soFarSoGood;
    });
  }
  else
  {
    checkForUndefinedConfigValue(configKeyName, configValue, requiredKeysNotFound, 'Site configuration:  Invalid mimetypes.  Object expected.');
    soFarSoGood = false;
  }

  return soFarSoGood;
}

function parseTempWorkDirectory(processedConfigJSON, siteConfig, requiredKeysNotFound)
{
  let soFarSoGood = true;
  const configKeyName = 'tempworkdirectory';
  const configValue = processedConfigJSON[configKeyName];

  if (typeof(configValue) === 'string')
  {
    const dirName = configValue.replace(/^\s*/g, '').replace(/\s*$/g, '');
    if (dirName)
    {
      siteConfig.tempWorkDirectory = dirName;
    }
    else
    {
      console.error(`${TERMINAL_ERROR_STRING}: Site configuration:  tempworkdirectory cannot be empty.`);
      soFarSoGood = false;
    }
  }
  else
  {
    checkForUndefinedConfigValue(configKeyName, configValue, requiredKeysNotFound, 'Site configuration:  Invalid tempworkdirectory.  String value expected.');
    soFarSoGood = false;
  }

  return soFarSoGood;
}

function parseJscpExtensionRequired(processedConfigJSON, siteConfig, requiredKeysNotFound)
{
  let soFarSoGood = true;
  const configKeyName = 'jscpextensionrequired';
  const configValue = processedConfigJSON[configKeyName];

  if (typeof(configValue) === 'string')
  {
    if (configValue)
    {
      const finalValue = configValue.toLowerCase();
      switch(finalValue)
      {
        case 'never':
        case 'optional':
        case 'always':
          siteConfig.jscpExtensionRequired = finalValue;
          break;
        default:
          console.error(`${TERMINAL_ERROR_STRING}: Site configuration:  invalid jscpextensionrequired value.  Use 'never' (recommended), 'optional' or 'always'.`);
          soFarSoGood = false;
      }
    }
    else
    {
      console.error(`${TERMINAL_ERROR_STRING}: Site configuration:  jscpextensionrequired cannot be empty.  Use 'never' (recommended), 'optional' or 'always'.`);
      soFarSoGood = false;
    }
  }
  else
  {
    checkForUndefinedConfigValue(configKeyName, configValue, requiredKeysNotFound, 'Site configuration:  Invalid jscpextensionrequired.  String value expected.');
    soFarSoGood = false;
  }

  return soFarSoGood;
}

function parseHttpPoweredByHeader(processedConfigJSON, siteConfig, requiredKeysNotFound)
{
  let soFarSoGood = true;
  const configKeyName = 'httppoweredbyheader';
  const configValue = processedConfigJSON[configKeyName];

  if (typeof(configValue) === 'string')
  {
    if (configValue)
    {
      const finalValue = configValue.toLowerCase();
      switch(finalValue)
      {
        case 'include':
        case 'exclude':
          siteConfig.includeHttpPoweredByHeader = (finalValue === 'include');
          break;
        default:
          console.error(`${TERMINAL_ERROR_STRING}: Site configuration:  invalid httppoweredbyheader value.  Use 'include' or 'exclude'.`);
          soFarSoGood = false;
      }
    }
    else
    {
      console.error(`${TERMINAL_ERROR_STRING}: Site configuration:  httppoweredbyheader cannot be empty.  Use 'include' or 'exclude'.`);
      soFarSoGood = false;
    }
  }
  else
  {
    checkForUndefinedConfigValue(configKeyName, configValue, requiredKeysNotFound, 'Site configuration:  Invalid httppoweredbyheader.  String value expected.');
    soFarSoGood = false;
  }

  return soFarSoGood;
}

function parseHttpsCertFile(processedConfigJSON, siteConfig, requiredKeysNotFound)
{
  let soFarSoGood = true;
  const configKeyName = 'httpscertfile';
  const configValue = processedConfigJSON[configKeyName];

  if (typeof(configValue) === 'string')
  {
    if (configValue)
    {
      siteConfig.httpsCertFile = configValue;
    }
    else
    {
      console.error(`${TERMINAL_ERROR_STRING}: Site configuration:  httpscertfile cannot be empty.`);
      soFarSoGood = false;
    }
  }
  else
  {
    checkForUndefinedConfigValue(configKeyName, configValue, requiredKeysNotFound, 'Site configuration:  Invalid httpscertfile.  String value expected.');
    soFarSoGood = false;
  }

  return soFarSoGood;
}

function parseHttpsKeyFile(processedConfigJSON, siteConfig, requiredKeysNotFound)
{
  let soFarSoGood = true;
  const configKeyName = 'httpskeyfile';
  const configValue = processedConfigJSON[configKeyName];

  if (typeof(configValue) === 'string')
  {
    if (configValue)
    {
      siteConfig.httpsKeyFile = configValue;
    }
    else
    {
      console.error(`${TERMINAL_ERROR_STRING}: Site configuration:  httpskeyfile cannot be empty.`);
      soFarSoGood = false;
    }
  }
  else
  {
    checkForUndefinedConfigValue(configKeyName, configValue, requiredKeysNotFound, 'Site configuration:  Invalid httpskeyfile.  String value expected.');
    soFarSoGood = false;
  }

  return soFarSoGood;
}

function analyzeSymbolicLinkStats(state, siteConfig, fileName, currentDirectoryPath, allFiles, fullPath, currentDirectoryElements)
{
  let { soFarSoGood, directoriesToProcess, pushedFiles } = state;
  const { name: siteName } = siteConfig;

  let linkStats;
  const symlinkList = [];
  do
  {
    const linkedFileName = fs.readlinkSync(fullPath);
    const linkIsFullPath = fsPath.isAbsolute(linkedFileName);
    let linkedPath;
    if (linkIsFullPath)
    {
      linkedPath = linkedFileName;
    }
    else
    {
      linkedPath = fsPath.join(currentDirectoryPath, linkedFileName);
    }

    try
    {
      linkStats = fs.lstatSync(linkedPath);
    }
    catch (e)
    {
      soFarSoGood = false;
      console.error(`${TERMINAL_ERROR_STRING}: Site ${getSiteNameOrNoName(siteName)}: Cannot find link:`);
      console.error(`${TERMINAL_ERROR_STRING}: - ${fullPath} --> ${linkedFileName}`);
      console.error(e);
    }

    if (soFarSoGood)
    {
      if (linkStats.isDirectory())
      {
        const simlinkSourceDirElements = [...currentDirectoryElements, fileName];
        const dirElements = (linkIsFullPath) ? [linkedPath] : simlinkSourceDirElements;
        directoriesToProcess.push({ simlinkSourceDirElements, dirElements });
      }
      else if (linkStats.isSymbolicLink())
      {
        if (symlinkList.indexOf(linkedPath) === -1)
        {
          symlinkList.push(linkedPath);
          fullPath = linkedPath;
        }
        else
        {
          console.error(`${TERMINAL_ERROR_STRING}: Site ${getSiteNameOrNoName(siteName)}: Circular symbolic link reference:`);
          symlinkList.forEach(symlinkPath =>
          {
            console.error(`${TERMINAL_ERROR_STRING}: - ${symlinkPath}`);
          });
          soFarSoGood = false;
        }
      }
      else
      {
        if (pushedFiles < MAX_FILES_OR_DIRS_IN_DIRECTORY)
        {
          allFiles.push({ fileName, simlinkTarget: linkedPath });
          pushedFiles++;
        }
        else
        {
          console.error(`${TERMINAL_ERROR_STRING}: Site ${getSiteNameOrNoName(siteName)}: Too many files and/or directories (> ${MAX_FILES_OR_DIRS_IN_DIRECTORY}) in directory (circular reference?):`);
          console.error(`${TERMINAL_ERROR_STRING}: - ${currentDirectoryPath}`);
          soFarSoGood = false;
        }
      }
    }
  }
  while(soFarSoGood && linkStats.isSymbolicLink());

  return { soFarSoGood, directoriesToProcess, pushedFiles };
}

function processStaticFile(state, siteConfig, fileEntry, fileName, stats, fullPath)
{
  const { name: siteName } = siteConfig;
  let { soFarSoGood, cachedStaticFilesSoFar } = state;
  fileEntry.fileType = 'static';

  const extName = String(fsPath.extname(fileName)).toLowerCase();

  const fileContentType = siteConfig.mimeTypes.list[extName] || 'application/octet-stream';

  let fileContents;

  const fileSize = stats.size;

  if (fileSize <= MAX_CACHEABLE_FILE_SIZE_BYTES)
  {
    cachedStaticFilesSoFar++;
    if (cachedStaticFilesSoFar < MAX_CACHED_FILES_PER_SITE)
    {
      try
      {
        fileContents = fs.readFileSync(fullPath);
      }
      catch(e)
      {
        console.error(`${TERMINAL_ERROR_STRING}: Site ${getSiteNameOrNoName(siteName)}: Cannot load ${fullPath} file.`);
        console.error(e);
        soFarSoGood = false;
      }
    }
    else
    {
      if (cachedStaticFilesSoFar === MAX_CACHED_FILES_PER_SITE)
      {
        console.warn(`${TERMINAL_INFO_WARNING}: Site ${getSiteNameOrNoName(siteName)}: Reached the maximum amount of cached static files (${MAX_CACHED_FILES_PER_SITE}). The rest of static files will be loaded and served upon request.`);
      }
    }
  }

  if (soFarSoGood)
  {
    Object.assign(fileEntry, { fileContents, fileContentType, fullPath, fileSize });
  }

  return { soFarSoGood, cachedStaticFilesSoFar }
}

function prepareStatFileEntry(fileEntry, fileName, currentDirectoryElements, currentSimlinkSourceDirectoryElements)
{
  fileEntry.filePath = [...currentDirectoryElements, fileName];
  if (currentSimlinkSourceDirectoryElements)
  {
    fileEntry.simlinkSourceFilePath = [...currentSimlinkSourceDirectoryElements, fileName];
  }
}

function analyzeFileStats(state, siteConfig, fileName, currentDirectoryPath, allFiles, fullPath, stats, filePathsList, jscmFilesList, currentDirectoryElements, currentSimlinkSourceDirectoryElements)
{
  let
    {
      directoriesProcessedSoFar, soFarSoGood, directoriesToProcess,
      pushedFiles, cachedStaticFilesSoFar
    } = state;
  if (stats.isDirectory())
  {
    if (directoriesProcessedSoFar >= MAX_DIRECTORIES_TO_PROCESS)
    {
      soFarSoGood = false;
      console.error(`${TERMINAL_ERROR_STRING}: Too many processed so far (> ${MAX_DIRECTORIES_TO_PROCESS}) (circular reference?):`);
      console.error(`${TERMINAL_ERROR_STRING}: - ${fullPath}`);
    }
    else if ((directoriesProcessedSoFar - directoriesToProcess.length) > MAX_PROCESSED_DIRECTORIES_THRESHOLD)
    {
      soFarSoGood = false;
      console.error(`${TERMINAL_ERROR_STRING}: Too many directories left to process (> ${MAX_PROCESSED_DIRECTORIES_THRESHOLD}) (circular reference?):`);
      console.error(`${TERMINAL_ERROR_STRING}: - ${fullPath}`);
    }
    else
    {
      const dirElements = [...currentDirectoryElements, fileName];
      directoriesToProcess.push({ dirElements });
      directoriesProcessedSoFar++;
    }
  }
  else if (stats.isSymbolicLink())
  {
    Object.assign(state, analyzeSymbolicLinkStats(state, siteConfig, fileName, currentDirectoryPath, allFiles, fullPath, currentDirectoryElements));
  }
  else if (fileName.match(/\.jscm$/)) // Ignore jscm files.
  {
    // But let's process them in case they have compile-time errors.
    let fileEntry = {};
    prepareStatFileEntry(fileEntry, fileName, currentDirectoryElements, currentSimlinkSourceDirectoryElements);
    jscmFilesList.push(fileEntry);
  }
  else
  {
    let fileEntry = {};
    if (fileName.match(/\.jscp$/))
    {
      fileEntry.fileType = 'jscp';
    }
    else
    {
      // Static files.
      Object.assign(state, processStaticFile(state, siteConfig, fileEntry, fileName, stats, fullPath));
    }

    if (soFarSoGood)
    {
      prepareStatFileEntry(fileEntry, fileName, currentDirectoryElements, currentSimlinkSourceDirectoryElements);
      filePathsList.push(fileEntry);
    }
  }

  return {
    directoriesProcessedSoFar, soFarSoGood, directoriesToProcess,
    pushedFiles, cachedStaticFilesSoFar
  };
}

function getDirectoryPathAndCheckIfWritable(directoryName, errorMsgPrefix = '')
{
  let finalDirectoryPath;
  let stats;
  let readSuccess = true;

  if (typeof(directoryName) === 'string')
  {
    try
    {
      stats = fs.statSync(directoryName);
    }
    catch (e)
    {
      console.error(`${TERMINAL_ERROR_STRING}: ${errorMsgPrefix} Cannot find directory: ${directoryName}`);
      console.error(e);
      readSuccess = false;
    }
  
    let linkedPath;
    if (readSuccess && stats.isSymbolicLink())
    {
      linkedPath = fs.readlinkSync(directoryName);
      try
      {
        stats = fs.lstatSync(linkedPath);
      }
      catch (e)
      {
        console.error(`${TERMINAL_ERROR_STRING}: ${errorMsgPrefix} Cannot find link:`);
        console.error(`${TERMINAL_ERROR_STRING}: - ${directoryName} --> ${linkedPath}`);
        console.error(e);
        readSuccess = false;
      }
    }
  
    if (readSuccess)
    {
      if (stats.isDirectory())
      {
        finalDirectoryPath = linkedPath || directoryName;
      }
      else
      {
        console.error(`${TERMINAL_ERROR_STRING}: ${errorMsgPrefix} ${directoryName}${(linkedPath) ? ` --> ${linkedPath}` : ''} is not a directory.`);
        readSuccess = false;
      }
    }
  
    if (readSuccess)
    {
      try
      {
        fs.accessSync(finalDirectoryPath, fs.constants.W_OK);
      }
      catch (e)
      {
        console.error(`${TERMINAL_ERROR_STRING}: ${errorMsgPrefix} ${directoryName}${(linkedPath) ? ` --> ${linkedPath}` : ''} is not writeable.`);
        readSuccess = false;
      }
    }

    if (!readSuccess)
    {
      finalDirectoryPath = undefined;
    }
  }
  else
  {
    console.error(`${TERMINAL_ERROR_STRING}: ${errorMsgPrefix} ${directoryName} is not of a valid type.  String expected.`);
  }

  return finalDirectoryPath;
}

function parseSitesConfigJSON(processedConfigJSON, { requiredKeysNotFound })
{
  let allSitesInServer;
  const configValue = processedConfigJSON.sites;

  if (Array.isArray(configValue))
  {
    if (Array.isArray(configValue))
    {
      if  (configValue.length)
      {
        allSitesInServer = configValue;
      }
      else
      {
        console.error(`${TERMINAL_ERROR_STRING}: Configuration:  sites cannot be empty.`);
      }
    }
    else
    {
      console.error(`${TERMINAL_ERROR_STRING}: Server configuration:  sites must be an array.`);
    }
  }
  else
  {
    checkForUndefinedConfigValue('sites', configValue, requiredKeysNotFound, 'Server configuration:  Expected an array of sites.');
  }

  return allSitesInServer;
}

function parseLoggingConfigJSON(processedConfigJSON)
{
  let loggingInfo = {};
  let result = true;
  const configValue = processedConfigJSON.logging;

  if ((typeof(configValue) === 'object') && !Array.isArray(configValue))
  {
    Object.keys(configValue).every((configKey) =>
    {
      const keyValue = configValue[configKey];
      const configKeyLowerCase = configKey.toLowerCase();
      switch(configKeyLowerCase)
      {
        case 'general':
        case 'persite':
          Object.assign(loggingInfo, { [configKeyLowerCase]: {} });
          if ((typeof(keyValue) === 'object') && !Array.isArray(keyValue))
          {
            Object.keys(keyValue).every((attributeKey) =>
            {
              const attributeKeyLowerCase = attributeKey.toLowerCase();
              switch(attributeKeyLowerCase)
              {
                case 'fileoutput':
                case 'directoryname':
                case 'consoleoutput':
                  Object.assign(loggingInfo[configKeyLowerCase], { [attributeKeyLowerCase]: keyValue[attributeKey] });
                  break;
                default:
                  console.error(`${TERMINAL_ERROR_STRING}: Configuration: logging: ${configKey}: ${attributeKey} is not a valid configuration key.`);
                  result = false;
              }

              return result;
            });
          }
          else
          {
            console.error(`${TERMINAL_ERROR_STRING}: Configuration: logging:  Invalid value for general.`);
            result = false;
          }
          break;
        default:
          console.error(`${TERMINAL_ERROR_STRING}: Configuration: logging:  ${configKey} is not a valid configuration key.`);
          result = false;
      }
      return result;
    });
  }
  else
  {
    if (typeof(configValue) !== 'undefined')
    {
      console.error(`${TERMINAL_ERROR_STRING}: Server configuration:  Expected a valid logging configuration value.`);
      result = false;
    }
  }

  return result && loggingInfo;
}

function validateLoggingConfigSection(loggingInfo, { serverWide = true, perSite = false } = {})
{
  let readSuccess;
  let loggingConfig;

  let directoryPath;
  let fileOutputEnabled;
  let consoleOutputEnabled;

  // Let's check the specified directory.
  let {
    directoryname: directoryName,
    fileoutput: fileOutput = 'enabled',
    consoleoutput: consoleOutput = 'enabled'
  } = loggingInfo || {};
  let perSiteFileOutputEnabled;
  let perSiteConsoleOutputEnabled;

  if (serverWide)
  {
    if (perSite)
    {
      readSuccess = (typeof(directoryName) === 'undefined');

      if (!readSuccess)
      {
        console.error(`${TERMINAL_ERROR_STRING}: Site configuration: Logging: 'perSite' section must not have a 'directoryName' configuration key.`);
        readSuccess = false;
      }
    }
    else
    {
      directoryName = directoryName || 'logs';
      directoryPath = getDirectoryPathAndCheckIfWritable(directoryName, 'Server configuration: Logging: directoryName: ');
      readSuccess = (typeof(directoryPath) !== 'undefined');
    }
  }

  if (readSuccess)
  {
    readSuccess = false;
    // Let's check if there is a fileOutput configuration value.
    if (typeof(fileOutput) === 'string')
    {
      const fileOutputLowerCase = fileOutput.toLowerCase();

      if (serverWide && perSite && (fileOutputLowerCase === 'per site'))
      {
        fileOutputEnabled = false;
        perSiteFileOutputEnabled = true;
        readSuccess = true;
      }
      else
      {
        fileOutputEnabled = (fileOutputLowerCase === 'enabled');
        readSuccess = (fileOutputEnabled || (fileOutputLowerCase === 'disabled'));
      }
    }

    if (!readSuccess)
    {
      console.error(`${TERMINAL_ERROR_STRING}: Site configuration: Logging: fileOutput must be either 'enabled' or 'disabled'.`);
    }
  }
  
  if (readSuccess)
  {
    readSuccess = false;
    // Let's check if there is a consoleOutput configuration value.
    if (typeof(consoleOutput) === 'string')
    {
      const consoleOutputLowerCase = consoleOutput.toLowerCase();

      if (serverWide && perSite && (consoleOutputLowerCase === 'per site'))
      {
        consoleOutputEnabled = false;
        perSiteConsoleOutputEnabled = true;
        readSuccess = true;
      }
      else
      {
        consoleOutputEnabled = (consoleOutputLowerCase === 'enabled');
        readSuccess = (consoleOutputEnabled || (consoleOutputLowerCase === 'disabled'));
      }
    }

    if (!readSuccess)
    {
      console.error(`${TERMINAL_ERROR_STRING}: Site configuration: Logging: consoleOutput must be either 'enabled' or 'disabled'.`);
    }
  }
  
  if (readSuccess)
  {
    loggingConfig =
    {
      fileOutputEnabled,
      consoleOutputEnabled
    };

    if (serverWide && !perSite)
    {
      loggingConfig.directoryPath = directoryPath;
    }

    if (typeof(perSiteFileOutputEnabled) !== 'undefined')
    {
      loggingConfig.perSiteFileOutputEnabled = perSiteFileOutputEnabled;
    }

    if (typeof(perSiteConsoleOutputEnabled) !== 'undefined')
    {
      loggingConfig.perSiteConsoleOutputEnabled = perSiteConsoleOutputEnabled;
    }
  }

  console.log('loggingConfig parsed:');//__RP
  console.log(loggingConfig);//__RP

  return loggingConfig;
}

/* *****************************************************
 *
 * Reading and processing the server configuration file
 *
 *******************************************************/
const VENDOR_TEMPLATE_FILENAME = 'jscvendor/vendor_template.jsctpl';
let templateFile;
let allVendorModulesLoaded = true;

const cookies = vendor_require('./jscvendor/cookies');
allVendorModulesLoaded = allVendorModulesLoaded && !!cookies;

const formidable = vendor_require('./jscvendor/formidable');
allVendorModulesLoaded = allVendorModulesLoaded && !!formidable;

const sanitizeFilename = vendor_require('./jscvendor/node-sanitize-filename');
allVendorModulesLoaded = allVendorModulesLoaded && !!sanitizeFilename;

if (!allVendorModulesLoaded)
{
  console.error(`${TERMINAL_ERROR_STRING}: CRITICAL: One or more vendor modules did not load.  JSCause will now terminate.`);
  process.exit(1);
}

templateFile = undefined; // Done with all the vendor module loading.

const RUNTIME_ROOT_DIR = process.cwd();

console.log(`*** JSCause Server version ${JSCAUSE_APPLICATION_VERSION}`);

const runningServers = {};
let atLeastOneSiteStarted = false;
let readSuccess = false;
let allSitesInServer;
let serverWideLoggingInfo;
const serverConfig = {};

const globalConfigJSON = readAndProcessJSONFile(JSCAUSE_CONF_FILENAME);

if (globalConfigJSON)
{
  const allAllowedKeys =
  [
    'sites',
    'logging'
  ];

  const requiredKeysNotFound = [];

  let processedConfigJSON = prepareConfiguration(globalConfigJSON, allAllowedKeys, JSCAUSE_CONF_FILENAME);

  let soFarSoGood = !!processedConfigJSON;
  
  // sites
  if (soFarSoGood)
  {
    allSitesInServer = parseSitesConfigJSON(processedConfigJSON, { requiredKeysNotFound });
    soFarSoGood = !!allSitesInServer;
  }

  // logging
  if (soFarSoGood)
  {
    serverWideLoggingInfo = parseLoggingConfigJSON(processedConfigJSON);
    soFarSoGood = !!serverWideLoggingInfo;
  }

  const allRequiredKeys = checkForRequiredKeysNotFound(requiredKeysNotFound, 'Server configuration');

  readSuccess = soFarSoGood && allRequiredKeys;
}

/* *****************************************************
 *
 * Processing the server's logging configuration
 *
 *******************************************************/
if (readSuccess)
{
  console.log(serverWideLoggingInfo);//__RP

  readSuccess = false;
  const generalLogging = validateLoggingConfigSection(serverWideLoggingInfo.general);
  const perSiteLogging = generalLogging && validateLoggingConfigSection(serverWideLoggingInfo.persite, { perSite: true });
  
  if (generalLogging && perSiteLogging)
  {
    serverConfig.logging =
    {
      general: generalLogging,
      perSite: perSiteLogging
    };
    readSuccess = true;
  }
}

/* *****************************************************
 *
 * Reading and processing the sites' configuration files
 *
 *******************************************************/

const allSiteConfigs = [];
let allReadySiteNames = [];
let allFailedSiteNames = [];
let allSiteNames = [];
let allConfigCombos = [];

if (readSuccess)
{
  const allAllowedSiteKeys =
  [
    'name',
    'port',
    'rootdirectoryname',
    'enablehttps'
  ];
  
  const allSitesInServerLength = allSitesInServer.length;

  for (let i = 0; i < allSitesInServerLength; i++)
  {
    readSuccess = true;

    const thisUnprocessedServerSite = allSitesInServer[i];

    let thisServerSite = prepareConfiguration(thisUnprocessedServerSite, allAllowedSiteKeys, JSCAUSE_CONF_FILENAME);

    if (thisServerSite)
    {
      const siteConfig = createInitialSiteConfig(thisServerSite);

      const { name: siteName, port: sitePort, rootDirectoryName: siteRootDirectoryName } = siteConfig;

      if (siteName)
      {
        if (allSiteNames.indexOf(siteName) === -1)
        {
          allSiteNames.push(siteName);
        }
        else
        {
          console.error(`${TERMINAL_ERROR_STRING}: Site configuration: Site name '${siteName}' is not unique.`);
          readSuccess = false;
        }
      }
      else
      {
        console.error(`${TERMINAL_ERROR_STRING}: Site configuration: Missing name.`);
        readSuccess = false;
      }

      if (readSuccess)
      {
        if (typeof(sitePort) !== 'undefined')
        {
          const portNumber = parseFloat(sitePort, 10);
          if (!isNaN(portNumber) && (portNumber === Math.floor(portNumber)))
          {
            siteConfig.port = portNumber;
          }
          else
          {
            console.error(`${TERMINAL_ERROR_STRING}: Site configuration:  Site name ${getSiteNameOrNoName(siteName)} has an invalid port.  Integer number expected.`);
            readSuccess = false;
          }
        }
        else
        {
          console.error(`${TERMINAL_ERROR_STRING}: Site configuration: Site name ${getSiteNameOrNoName(siteName)} is missing port.`);
          readSuccess = false;
        }
      }

      let siteJSONFilePath;
      if (readSuccess && siteRootDirectoryName)
      {
        siteJSONFilePath = getDirectoryPathAndCheckIfWritable(fsPath.join(JSCAUSE_SITES_PATH, siteRootDirectoryName));
        readSuccess = (typeof(siteJSONFilePath) !== 'undefined');
      }

      if (readSuccess)
      {
        siteConfig.fullSitePath = fsPath.join(RUNTIME_ROOT_DIR, siteJSONFilePath);

        console.log(`${TERMINAL_INFO_STRING}: Reading configuration for site '${siteName}' from '${siteJSONFilePath}'`);
        const siteConfigJSON = readAndProcessJSONFile(JSCAUSE_SITECONF_FILENAME, siteJSONFilePath);
        
        readSuccess = !!siteConfigJSON;

        if (readSuccess)
        {
          const allAllowedKeys =
          [
            'hostname',
            'tempworkdirectory',
            'canupload',
            'maxpayloadsizebytes',
            'mimetypes',
            'jscpextensionrequired',
            'httppoweredbyheader',
            'httpscertfile',
            'httpskeyfile'
          ];

          const requiredKeysNotFound = [];

          let processedConfigJSON = prepareConfiguration(siteConfigJSON, allAllowedKeys, JSCAUSE_SITECONF_FILENAME);

          let soFarSoGood = !!processedConfigJSON;
          let parseHttpsCertResult = false;
          let parseHttpsKeyResult = false;

          if (soFarSoGood)
          {
            soFarSoGood = parseHostName(processedConfigJSON, siteConfig, requiredKeysNotFound);
            soFarSoGood = parseCanUpload(processedConfigJSON, siteConfig, requiredKeysNotFound) && soFarSoGood;
            soFarSoGood = parseMaxPayLoadSizeBytes(processedConfigJSON, siteConfig, requiredKeysNotFound) && soFarSoGood;
            soFarSoGood = parseMimeTypes(processedConfigJSON, siteConfig, requiredKeysNotFound) && soFarSoGood;
            soFarSoGood = parseTempWorkDirectory(processedConfigJSON, siteConfig, requiredKeysNotFound) && soFarSoGood;
            soFarSoGood = parseJscpExtensionRequired(processedConfigJSON, siteConfig, requiredKeysNotFound) && soFarSoGood;
            soFarSoGood = parseHttpPoweredByHeader(processedConfigJSON, siteConfig, requiredKeysNotFound) && soFarSoGood;
            
            parseHttpsCertResult = parseHttpsCertFile(processedConfigJSON, siteConfig, requiredKeysNotFound);
            parseHttpsKeyResult = parseHttpsKeyFile(processedConfigJSON, siteConfig, requiredKeysNotFound);
          }

          let fileMissingIndex = requiredKeysNotFound.indexOf('httpscertfile');
          if (siteConfig.enableHTTPS || (fileMissingIndex === -1))
          {
            soFarSoGood = soFarSoGood && parseHttpsCertResult;
          }
          else
          {
            // Certs file entry does not exist, let's ignore this since https is not enabled.
            requiredKeysNotFound.splice(fileMissingIndex, 1);
          }

          fileMissingIndex = requiredKeysNotFound.indexOf('httpskeyfile');
          if (siteConfig.enableHTTPS || (fileMissingIndex === -1))
          {
            soFarSoGood = soFarSoGood && parseHttpsKeyResult;
          }
          else
          {
            // Key file entry does not exist, let's ignore this since https is not enabled.
            requiredKeysNotFound.splice(fileMissingIndex, 1);
          }

          const allRequiredKeys = checkForRequiredKeysNotFound(requiredKeysNotFound, 'Site configuration');

          readSuccess = soFarSoGood && allRequiredKeys;
        }

        if (readSuccess)
        {
          const
            {
              name: currentSiteName,
              port: currentSitePort,
              enableHTTPS: currentEnableHTTPS,
              hostName,
              rootDirectoryName
            } = siteConfig;
          const currentSiteHostName = hostName.toLowerCase();
          const currentRootDirectoryName = rootDirectoryName.toLowerCase();
          allConfigCombos.forEach((combo) =>
          {
            if (currentSitePort === combo.port)
            {
              if (currentEnableHTTPS)
              {
                readSuccess = combo.enableHTTPS;
                if (readSuccess)
                {
                  console.warn(`${TERMINAL_INFO_WARNING}: Site configuration: Site ${getSiteNameOrNoName(currentSiteName)} is HTTPS, and would be sharing HTTPS port ${currentSitePort} with ${getSiteNameOrNoName(combo.name)}`);
                }
                else
                {
                  console.error(`${TERMINAL_ERROR_STRING}: Site configuration: Site ${getSiteNameOrNoName(currentSiteName)} is HTTPS, and would be sharing HTTP port ${currentSitePort} with ${getSiteNameOrNoName(combo.name)}`);
                }
              }
              else if (combo.enableHTTPS)
              {
                console.warn(`${TERMINAL_INFO_WARNING}: Site configuration: Site ${getSiteNameOrNoName(currentSiteName)} is HTTP, and is sharing HTTPS port ${currentSitePort} with ${getSiteNameOrNoName(combo.name)}`);
              }
              
              if (currentSiteHostName === combo.hostName.toLowerCase())
              {
                console.error(`${TERMINAL_ERROR_STRING}: Site configuration: Both sites ${getSiteNameOrNoName(combo.name)} and ${getSiteNameOrNoName(currentSiteName)} have the same hostName and port combination - '${currentSiteHostName}', ${currentSitePort}`);
                readSuccess = false;
              }
              
              if (currentRootDirectoryName === combo.rootDirectoryName.toLowerCase())
              {
                console.error(`${TERMINAL_ERROR_STRING}: Site configuration: Both sites ${getSiteNameOrNoName(combo.name)} and ${getSiteNameOrNoName(currentSiteName)} have the same root directory and port combination - '${currentRootDirectoryName}', ${currentSitePort}`);
                readSuccess = false;
              }
            }
          });

          if (readSuccess)
          {
            allConfigCombos.push({
              hostName: siteConfig.hostName,
              port: siteConfig.port,
              name: siteConfig.name,
              rootDirectoryName: siteConfig.rootDirectoryName,
              tempWorkDirectory: siteConfig.tempWorkDirectory,
              enableHTTPS: siteConfig.enableHTTPS
            });
          }
        }

        let filePathsList;
        let jscmFilesList;
        if (readSuccess)
        {
          let state =
          {
            directoriesProcessedSoFar: 0,
            cachedStaticFilesSoFar: 0,
            directoriesToProcess: [ { dirElements: [''] } ],
            siteConfig,
            pushedFiles: 0,
            soFarSoGood: true
          };

          // Let's read the files.
          readSuccess = false;
          filePathsList = [];
          jscmFilesList = [];

          const websiteRoot = fsPath.join(siteJSONFilePath, JSCAUSE_WEBSITE_PATH);

          do
          {
            let currentDirectoryPath;
            const { simlinkSourceDirElements: currentSimlinkSourceDirectoryElements, dirElements: currentDirectoryElements } = state.directoriesToProcess.shift();
            const directoryPath = fsPath.join(...currentDirectoryElements);
            if (fsPath.isAbsolute(directoryPath)) // It can happen if more directories were inserted during this iteration.
            {
              currentDirectoryPath = directoryPath;
            }
            else
            {
              currentDirectoryPath = fsPath.join(siteJSONFilePath, JSCAUSE_WEBSITE_PATH, directoryPath);
            }

            state.soFarSoGood = false;
            let allFiles;
            const isWebsiteRoot = (websiteRoot === currentDirectoryPath);
            try
            {
              allFiles = fs.readdirSync(currentDirectoryPath);
              state.soFarSoGood = true;
            }
            catch(e)
            {
              console.error(`${TERMINAL_ERROR_STRING}: Site ${getSiteNameOrNoName(siteName)}: could not read directory: ${currentDirectoryPath}`);
              console.error(e);
            }

            if (state.soFarSoGood)
            {
              if (Array.isArray(allFiles))
              {
                allFiles = allFiles.map(fileName => ({ fileName }));
              }


              let stats;
              state.pushedFiles = 0;
              let fullPath;
              while (allFiles.length)
              {
                const { fileName, simlinkTarget } = allFiles.shift();
                if (fileName.substr(0, 1) === '.')
                {
                  // Assumed hidden file.  Skip it.
                  continue;
                }

                if (!isWebsiteRoot && ((fileName === 'error4xx.jscp') ||
                  (fileName === 'error4xx.html') ||
                  (fileName === 'error5xx.jscp') ||
                  (fileName === 'error5xx.html')))
                {
                  console.warn(`${TERMINAL_INFO_WARNING}: Site ${getSiteNameOrNoName(siteName)}: ${fileName} detected in ${currentDirectoryPath} subdirectory. Only error files in the root directory will be used to display custom errors.`);
                }
          
                if (simlinkTarget)
                {
                  fullPath = simlinkTarget;
                }
                else
                {
                  fullPath = fsPath.join(currentDirectoryPath, fileName);
                }

                try
                {
                  stats = fs.lstatSync(fullPath);
                }
                catch (e)
                {
                  state.soFarSoGood = false;
                  console.error(`${TERMINAL_ERROR_STRING}: Site ${getSiteNameOrNoName(siteName)}: Cannot find ${fullPath}`);
                  console.error(e);
                }

                if (state.soFarSoGood)
                {
                  Object.assign(state, analyzeFileStats(state, siteConfig, fileName, currentDirectoryPath, allFiles, fullPath, stats, filePathsList, jscmFilesList, currentDirectoryElements, currentSimlinkSourceDirectoryElements));
                }
                else
                {
                  break;
                }
              }
            }
          }
          while(state.directoriesToProcess.length && state.soFarSoGood);

          readSuccess = state.soFarSoGood;
        }

        if (readSuccess)
        {
          siteConfig.staticFiles = {};
          siteConfig.compiledFiles = {};

          // Make sure that modules compile. If we don't do this, then 
          // the user would get a runtime error.  Better to fail as soon as possible instead.
          jscmFilesList.every(({ filePath }) =>
          {
            readSuccess = (typeof(processSourceFile(filePath, siteJSONFilePath)) !== 'undefined');
            return readSuccess;
          });

          if (readSuccess)
          {
            filePathsList.every((fileEntry) =>
            {
              const { filePath, simlinkSourceFilePath, fileType, fileContentType, fileContents, fullPath, fileSize } = fileEntry;
  
              const webPath = encodeURI((simlinkSourceFilePath || filePath).join('/').normalize('NFD'));
              if (fileType === 'jscp')
              {
                const processedSourceFile = processSourceFile(filePath, siteJSONFilePath);
                if (typeof(processedSourceFile) === 'undefined')
                {
                  readSuccess = false;
                }
                else{
                  siteConfig.compiledFiles[webPath] = processedSourceFile;
                }
              }
              else
              {
                // fileType assumed 'static'
                siteConfig.staticFiles[webPath] = { fileContentType, fileContents, fullPath, fileSize };
              }
  
              return readSuccess;
            });
          }
        }

        if (readSuccess)
        {
          if (setTempWorkDirectory(siteConfig))
          {
            // All is well so far.
            if ((siteConfig.maxPayloadSizeBytes || 0) < 0)
            {
              siteConfig.canUpload = false;
            }

            allSiteConfigs.push(siteConfig);
          }
          else
          {
            readSuccess = false;
          }
        }
      }
      else if (readSuccess)
      {
        console.error(`${TERMINAL_ERROR_STRING}: Site configuration: invalid or missing rootDirectoryName.`);
        readSuccess = false;
      }

      if (readSuccess)
      {
        allReadySiteNames.push(siteName);
      }
      else
      {
        console.error(`${TERMINAL_ERROR_STRING}: Site ${getSiteNameOrNoName(siteName)} not started.`);
        allFailedSiteNames.push(siteName);
      }
    }
    else
    {
      break;
    }
  }
}

allSiteNames = null;

serverConfig.sites = allSiteConfigs || [];
serverConfig.sites.forEach((site) =>
{
  if (startServer(site))
  {
    atLeastOneSiteStarted = true;
  }
  else
  {
    const { name: siteName } = site;
    allReadySiteNames.splice(allReadySiteNames.indexOf(siteName), 1);

    console.error(`${TERMINAL_ERROR_STRING}: Site ${getSiteNameOrNoName(siteName)} not started.`);
    allFailedSiteNames.push(siteName);
  }
});

console.log(`${TERMINAL_INFO_STRING}: ************ All sites' configuration read at this point ********************`);

if (allReadySiteNames.length)
{
  console.log(`${TERMINAL_INFO_STRING}: The following sites were set up successfully:`);
  allReadySiteNames.forEach((name) =>
  {
    console.log(`${TERMINAL_INFO_STRING}: - ${getSiteNameOrNoName(name)}`);
  });
}

if (allFailedSiteNames.length)
{
  console.error(`${TERMINAL_ERROR_STRING}: The following sites failed to run:`);
  allFailedSiteNames.forEach((name) =>
  {
    console.error(`${TERMINAL_ERROR_STRING}: - ${getSiteNameOrNoName(name)}`);
  });
}

if (atLeastOneSiteStarted)
{
  console.log(`${TERMINAL_INFO_STRING}: Will start listening.`);
}
else
{
  console.error(`${TERMINAL_ERROR_STRING}: Server not started.  No sites are running.`);
}
