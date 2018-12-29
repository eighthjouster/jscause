'use strict';

/* *************************************
   *
   * Setup
   *
   ************************************** */
const JSCAUSE_APPLICATION_VERSION = '0.2.0';

const http = require('http');
const fs = require('fs');
const fsPath = require('path');

const JSCAUSE_CONF_FILENAME = 'jscause.conf';
const JSCAUSE_CONF_PATH = 'configuration';
const JSCAUSE_SITES_PATH = 'sites';
const JSCAUSE_WEBSITE_PATH = 'website';
const JSCAUSE_SITECONF_FILENAME = fsPath.join(JSCAUSE_CONF_PATH, 'site.json');
const urlUtils = require('url');
const crypto = require('crypto');
const formidable = require('./jscvendor/formidable');
const sanitizeFilename = require('./jscvendor/sanitize-filename');
const FORMDATA_MULTIPART_RE = /^multipart\/form-data/i;
const FORMDATA_URLENCODED_RE = /^application\/x-www-form-urlencoded/i;

const PROMISE_ACTOR_TYPE_SUCCESS = 1;
const PROMISE_ACTOR_TYPE_ERROR = 2;

const TERMINAL_ERROR_STRING = '\x1b[31mERROR\x1b[0m';
const TERMINAL_INFO_STRING = '\x1b[32mINFO\x1b[0m';
const TERMINAL_INFO_WARNING = '\x1b[33mWARNING\x1b[0m';

const MAX_FILES_OR_DIRS_IN_DIRECTORY = 2048;
const MAX_DIRECTORIES_TO_PROCESS = 2048
const MAX_PROCESSED_DIRECTORIES_THRESHOLD = 1024;

const RUNTIME_ROOT_DIR = process.cwd();

console.log(`*** JSCause Server version ${JSCAUSE_APPLICATION_VERSION}`);
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
    console.error(`${TERMINAL_ERROR_STRING}: Error parsing ${fileName}`);
    console.error(`${TERMINAL_ERROR_STRING}: ${parseErrorDescription}`);
  }

  return !parseError;
}

const defaultSiteConfig =
{
  server: null,
  name: '',
  rootDirectoryName: '',
  fullSitePath: '',
  compiledFiles: {},
  hostName: undefined,
  port: undefined,
  tempWorkDirectory: null,
  canUpload: true,
  maxPayloadSizeBytes: undefined
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
    if (fs.existsSync(tempWorkDirectory))
    {
      try
      {
        fs.accessSync(tempWorkDirectory, fs.constants.W_OK);
        setupSuccess = true;
      }
      catch (e)
      {
        console.error(`${TERMINAL_ERROR_STRING}: Temporary work directory ${tempWorkDirectory} is not writeable`);
      }
    }
    else
    {
      console.error(`${TERMINAL_ERROR_STRING}: Temporary work directory ${tempWorkDirectory} not found`);
    }

    if (setupSuccess)
    {
      siteConfig.tempWorkDirectory = tempWorkDirectory.replace(/\/?$/,'');
    }
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

function doMoveToTempWorkDir(thisFile, tempWorkDirectory, { responder, req, res, compiledCode, runFileName, formContext, pendingWork, fullSitePath })
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
      responder(req, res, compiledCode, runFileName, fullSitePath, formContext);
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

      const { runtimeException, runFileName } = ctx;
      if (runtimeException)
      {
        ctx.outputQueue = ['<br />Runtime error!<br />'];
        console.error(`${TERMINAL_ERROR_STRING}: Runtime error on file ${runFileName}: ${extractErrorFromRuntimeObject(runtimeException)}`);
        console.error(runtimeException);
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
    try
    {
      cb.call({}, ...params);
    }
    catch(e)
    {
      rtContext.runtimeException = e;
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
  const promiseContext = {
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
  const { getParams, postParams, contentType,
    requestMethod, uploadedFiles, additional } = rtContext;

  return {
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

const runningServers = {};

function responder(req, res, compiledCode, runFileName, fullSitePath,
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
    outputQueue: undefined,
    runAfterQueue: undefined,
    appHeaders: {},
    resObject: res,
    waitForNextId: 1,
    waitForQueue: {},
    getParams: urlUtils.parse(req.url, true).query,
    postParams,
    runFileName,
    requestMethod,
    contentType,
    uploadedFiles,
    additional,
    fullSitePath,
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
  console.error(`${TERMINAL_ERROR_STRING}: Payload exceeded limit of ${maxPayloadSizeBytes} bytes`);
  res.statusCode = 413;
  res.setHeader('Connection', 'close');
  res.end('Request size exceeded!');
}

function sendUploadIsForbidden(res)
{
  console.error(`${TERMINAL_ERROR_STRING}: Uploading is forbidden.`);
  res.statusCode = 403;
  res.setHeader('Connection', 'close');
  res.end('Forbidden!');
}

function incomingRequestHandler(req, res)
{
  const { headers = {}, headers: { host: hostHeader = '' }, url, method } = req;
  const [/* Deliberately left blank. */, reqHostName, preparsedReqPort] = hostHeader.match(/(.+):(\d+)$/);
  const requestMethod = (method || '').toLowerCase();
  const reqMethodIsValid = ((requestMethod === 'get') || (requestMethod === 'post'));
  const reqPort = parseInt(preparsedReqPort, 10);
  const runningServer = runningServers[reqPort];

  let identifiedSite;

  if (runningServer)
  {
    identifiedSite = runningServer.sites[reqHostName];
  }

  if (!identifiedSite || !reqMethodIsValid)
  {
    res.statusCode = 405;
    res.end('Not Allowed.');
    return;
  }

  let { pathname: resourceName } = urlUtils.parse(url, true);
  if (resourceName.match(/\/$/))
  {
    resourceName += 'index.jscp';
  }

  const [ /* Deliberately empty */ , /* Deliberately empty */ , resourceFileExtension ] = resourceName.match(/(.*)\.([^./]+)$/) || [];

  let runFileName = `${resourceName}${(resourceFileExtension) ? '' : '.jscp' }`;

  const { canUpload, maxPayloadSizeBytes, tempWorkDirectory, compiledFiles, fullSitePath } = identifiedSite;
  
  let compiledCode = compiledFiles[runFileName];

  if (typeof(compiledCode) === 'undefined')
  {
    runFileName = `${resourceName}/index.jscp`;
    compiledCode = compiledFiles[runFileName];
  }

  if (typeof(compiledCode) === 'undefined')
  {
    res.statusCode = 404;
    res.end('Not Found.');
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
                doMoveToTempWorkDir(thisActualFile, tempWorkDirectory, { responder, req, res, compiledCode, runFileName, formContext, pendingWork, fullSitePath });
              });
            }
            else
            {
              doMoveToTempWorkDir(thisFile, tempWorkDirectory, { responder, req, res, compiledCode, runFileName, formContext, pendingWork, fullSitePath });
            }
          });
        }
      }

      if (!isUpload || !formFilesKeys)
      {
        responder(req, res, compiledCode, runFileName, fullSitePath, formContext);
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
      responder(req, res, compiledCode, runFileName, fullSitePath, postContext);
    });
  }

  req.on('error', (err) =>
  {
    console.error(`${TERMINAL_ERROR_STRING}: Request related error.`);
    console.error(err);
  })
}

function startServer(siteConfig)
{
  const serverPort = siteConfig.port;

  let runningServer = runningServers[serverPort];
  let httpServer;
  let serverName;

  if (runningServer)
  {
    serverName  = runningServer.serverName;
  }
  else
  {
    serverName = Object.keys(runningServers).length.toString();

    httpServer = http.createServer();

    runningServer =
    {
      serverName,
      server: httpServer,
      sites: {}
    };

    httpServer.on('request', incomingRequestHandler);

    httpServer.on('error', (e) =>
    {
      console.error(`${TERMINAL_ERROR_STRING}: Server ${serverName} could not start listening on port ${serverPort}.`)
      console.error(`${TERMINAL_ERROR_STRING}: Error returned by the server follows:`)
      console.error(`${TERMINAL_ERROR_STRING}: ${e.message}`);
      console.error(`${TERMINAL_ERROR_STRING}: Server ${serverName} (port: ${serverPort}) not started.`);
      Object.values(runningServer.sites).forEach((site) =>
      {
        console.error(`${TERMINAL_ERROR_STRING}: - Site ${getSiteNameOrNoName(site.name)} not started.`);
      });
    });

    httpServer.listen(serverPort, () =>
    {
      console.log(`${TERMINAL_INFO_STRING}: Server ${serverName} listening on port ${serverPort}`);
    });

    runningServers[serverPort] = runningServer;
  }

  runningServer.sites[siteConfig.hostName] = siteConfig;

  console.log(`${TERMINAL_INFO_STRING}: Site ${getSiteNameOrNoName(siteConfig.name)} at http://${siteConfig.hostName}:${serverPort}/ assigned to server ${serverName}`);
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
  const { name, port, rootdirectoryname: rootDirectoryName } = siteInfo;
  return Object.assign({}, defaultSiteConfig, { name, port, rootDirectoryName });
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
      console.error(`${TERMINAL_ERROR_STRING}: Site: Could not compile code for ${sourceFileName}.`);
    }
  }

  return compiledSource;
}

let atLeastOneSiteStarted = false;
let readSuccess = false;

let allSitesInServer;
/* *****************************************************
 *
 * Reading and processing the server configuration file
 *
 *******************************************************/
const globalConfigJSON = readAndProcessJSONFile(JSCAUSE_CONF_FILENAME);

if (globalConfigJSON)
{
  const allAllowedKeys =
  [
    'sites'
  ];

  const requiredKeysNotFound = [];

  let soFarSoGood = true;
  
  let processedConfigJSON = prepareConfiguration(globalConfigJSON, allAllowedKeys, JSCAUSE_CONF_FILENAME);
  let configValue;
  let configKeyName;

  // sites
  if (processedConfigJSON)
  {
    configKeyName = 'sites';
    configValue = processedConfigJSON[configKeyName];

    if (Array.isArray(configValue))
    {
      allSitesInServer = configValue;
      if (Array.isArray(allSitesInServer))
      {
        if  (!allSitesInServer.length)
        {
          console.error(`${TERMINAL_ERROR_STRING}: Configuration:  sites cannot be empty.`);
          soFarSoGood = false;
        }
      }
      else
      {
        console.error(`${TERMINAL_ERROR_STRING}: Server configuration:  sites must be an array.`);
        soFarSoGood = false;
      }
    }
    else
    {
      checkForUndefinedConfigValue(configKeyName, configValue, requiredKeysNotFound, 'Server configuration:  Expected an array of sites.');
      soFarSoGood = false;
    }
  }
  else {
    soFarSoGood = false;
  }

  const allRequiredKeys = checkForRequiredKeysNotFound(requiredKeysNotFound, 'Server configuration');

  readSuccess = soFarSoGood && allRequiredKeys;
}

/* ***************************************************
 *
 * Reading and processing the site configuration file
 *
 *****************************************************/
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
    'rootdirectoryname'
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

      if (readSuccess && siteRootDirectoryName)
      {
        let siteJSONFilePath = fsPath.join(JSCAUSE_SITES_PATH, siteRootDirectoryName);

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
            'maxpayloadsizebytes'
          ];

          const requiredKeysNotFound = [];

          let soFarSoGood = true;
          
          let processedConfigJSON = prepareConfiguration(siteConfigJSON, allAllowedKeys, JSCAUSE_SITECONF_FILENAME);
          let configValue;
          let configKeyName;

          soFarSoGood = !!processedConfigJSON;

          // hostname
          if (soFarSoGood)
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
                console.error(`${TERMINAL_ERROR_STRING}: Site configuration:  hostname cannot be empty.`);
                soFarSoGood = false;
              }
            }
            else
            {
              checkForUndefinedConfigValue(configKeyName, configValue, requiredKeysNotFound, 'Site configuration:  Invalid hostname.  String value expected.');
              soFarSoGood = false;
            }

            configKeyName = 'canupload';
            configValue = processedConfigJSON[configKeyName];

            if (typeof(configValue) === 'boolean')
            {
              siteConfig.canUpload = configValue;
            }
            else
            {
              checkForUndefinedConfigValue(configKeyName, configValue, requiredKeysNotFound, 'Site configuration:  Invalid canupload.  Boolean expected.');
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
                console.error(`${TERMINAL_ERROR_STRING}: Site configuration:  Missing or invalid maxpayloadsizebytes.  Integer number expected.`);
                soFarSoGood = false;
              }
            }
            else
            {
              checkForUndefinedConfigValue(configKeyName, configValue, requiredKeysNotFound, 'Site configuration:  maxpayloadsizebytes cannot be empty.');
              soFarSoGood = false;
            }

            configKeyName = 'tempworkdirectory';
            configValue = processedConfigJSON[configKeyName];

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
          }

          const allRequiredKeys = checkForRequiredKeysNotFound(requiredKeysNotFound, 'Site configuration');

          readSuccess = soFarSoGood && allRequiredKeys;
        }

        if (readSuccess)
        {
          const currentSiteName = siteConfig.name;
          const currentSiteHostName = siteConfig.hostName.toLowerCase();
          const currentSitePort = siteConfig.port;
          const currentRootDirectoryName = siteConfig.rootDirectoryName.toLowerCase();
          const currentTempWorkDirectory = siteConfig.tempWorkDirectory;
          
          allConfigCombos.every((combo) =>
          {
            if (currentSitePort === combo.port)
            {
              if (currentSiteHostName === combo.hostName.toLowerCase())
              {
                console.error(`${TERMINAL_ERROR_STRING}: Site configuration: Both sites ${getSiteNameOrNoName(combo.name)} and ${getSiteNameOrNoName(currentSiteName)} have the same hostName and port combination - '${currentSiteHostName}', ${currentSitePort}`);
                readSuccess = false;
              }
              else if (currentRootDirectoryName === combo.rootDirectoryName.toLowerCase())
              {
                console.error(`${TERMINAL_ERROR_STRING}: Site configuration: Both sites ${getSiteNameOrNoName(combo.name)} and ${getSiteNameOrNoName(currentSiteName)} have the same root directory and port combination - '${currentRootDirectoryName}', ${currentSitePort}`);
                readSuccess = false;
              }
            }

            if ((currentTempWorkDirectory === combo.tempWorkDirectory) &&
                (currentSiteHostName !== combo.hostName))
            {
              console.warn(`${TERMINAL_INFO_WARNING}: Site configuration: Both sites ${getSiteNameOrNoName(combo.name)} and ${getSiteNameOrNoName(currentSiteName)} share the same upload directory:`);
              console.warn(`${TERMINAL_INFO_WARNING}: - ${currentTempWorkDirectory}`);
            }

            return readSuccess;
          });

          if (readSuccess)
          {
            allConfigCombos.push({
              hostName: siteConfig.hostName,
              port: siteConfig.port,
              name: siteConfig.name,
              rootDirectoryName: siteConfig.rootDirectoryName,
              tempWorkDirectory: siteConfig.tempWorkDirectory
            });
          }
        }

        let filePathsList;
        if (readSuccess)
        {
          // Let's read the files.
          filePathsList = [];

          readSuccess = false;
          let soFarSoGood;

          const directoriesToProcess = [ { id: '', dirElements: [''] } ];
          let directoriesProcessedSoFar = 0;

          do
          {
            const { id: currentDirectoryId, simlinkSourceDirElements: currentSimlinkSourceDirectoryElements, dirElements: currentDirectoryElements } = directoriesToProcess.shift(); // __RP will we use currentDirectoryId at some point?
            const directoryPath = fsPath.join(...currentDirectoryElements);
            let currentDirectoryPath;
            if (fsPath.isAbsolute(directoryPath)) // It can happen if more directories were inserted during this iteration.
            {
              currentDirectoryPath = directoryPath;
            }
            else
            {
              currentDirectoryPath = fsPath.join(siteJSONFilePath, JSCAUSE_WEBSITE_PATH, directoryPath);
            }

            let allFiles;
            
            soFarSoGood = false;
            try
            {
              allFiles = fs.readdirSync(currentDirectoryPath);
              soFarSoGood = true;
            }
            catch(e)
            {
              console.error(`${TERMINAL_ERROR_STRING}: Site ${getSiteNameOrNoName(siteName)}: could not read directory: ${currentDirectoryPath}`);
              console.error(e);
            }

            if (soFarSoGood)
            {
              if (Array.isArray(allFiles))
              {
                allFiles = allFiles.map(fileName => ({ fileName }));
              }

              let stats;
              let pushedFiles = 0;
              while (allFiles.length)
              {
                const { fileName, simlinkTarget } = allFiles.shift();

                let fullPath;

                if (simlinkTarget)
                {
                  fullPath = simlinkTarget;
                }
                else if (fsPath.isAbsolute(fileName)) // It can happen if more directories were inserted during this iteration.
                {
                  fullPath = fileName;
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
                  soFarSoGood = false;
                  console.error(`${TERMINAL_ERROR_STRING}: Site ${getSiteNameOrNoName(siteName)}: Cannot find ${fullPath}`);
                  console.error(e);
                }

                if (soFarSoGood)
                {
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
                      directoriesToProcess.push({ id: dirElements.join('_'), dirElements });
                      directoriesProcessedSoFar++;
                    }
                  }
                  else if (stats.isSymbolicLink())
                  {
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
                          directoriesToProcess.push({ id: simlinkSourceDirElements.join('_'), simlinkSourceDirElements, dirElements });
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
                  }
                  else
                  {
                    if (fileName.match(/\.jscp$/))
                    {
                      const fileEntry =
                      {
                        filePath: [...currentDirectoryElements, fileName]
                      };

                      if (simlinkTarget)
                      {
                        fileEntry.isFileSymlink = true;
                      }

                      if (currentSimlinkSourceDirectoryElements)
                      {
                        fileEntry.simlinkSourceFilePath = [...currentSimlinkSourceDirectoryElements, fileName];
                      }

                      filePathsList.push(fileEntry);
                    }
                  }
                }
                else
                {
                  break;
                }
              }
            }
          }
          while(directoriesToProcess.length && soFarSoGood);

          readSuccess = soFarSoGood;
        }

        if (readSuccess)
        {
          siteConfig.compiledFiles = {};

          filePathsList.forEach(({ filePath, simlinkSourceFilePath, isFileSymlink }) =>
          {
            const webPath = (simlinkSourceFilePath || filePath).join('/');
            const processedSourceFile = processSourceFile(filePath, siteJSONFilePath);
            if (typeof(processedSourceFile) === 'undefined')
            {
              readSuccess = false;
            }
            else{
              siteConfig.compiledFiles[webPath] = processedSourceFile;
            }
          });
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
            readSuccess = true;
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

const serverConfig = {};

serverConfig.sites = allSiteConfigs || [];
serverConfig.sites.forEach((site) =>
{
  startServer(site);
  atLeastOneSiteStarted = true;
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
