'use strict';

/* *************************************
   *
   * Setup
   *
   ************************************** */
const fs = require('fs');
const urlUtils = require('url');
const crypto = require('crypto');
const formidable = require('./jscvendor/formidable');
const http = require('http');
const util = require('util');
const path = require('path');
const sanitizeFilename = require('./jscvendor/sanitize-filename');
const FORMDATA_MULTIPART_RE = /^multipart\/form-data/i;
const FORMDATA_URLENCODED_RE = /^application\/x-www-form-urlencoded/i;

const DEFAULT_HOSTNAME = 'localhost';
const DEFAULT_PORT = 3000;
const DEFAULT_UPLOAD_DIR = './workbench/uploads';

const serverConfig = {
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
  "'": '&#39;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;'
};

const printInit = (ctx) => { ctx.outputQueue = []; };
const assignAppHeaders = (ctx, headers) => { ctx.appHeaders = Object.assign(ctx.appHeaders, headers); };
const sanitizeForHTMLOutput = (inputText) => String(inputText).replace(/[&<>"'`=\/]/g, (s) => symbolsToSanitize[s]);

const setUploadDirectory = (dirName, serverConfig) =>
{
  let setupSuccess = false;
  if (!serverConfig || !serverConfig.canUpload)
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
      serverConfig.uploadDirectory = dirName.replace(/\/?$/,'');
    }
  }

  return setupSuccess;
};

const doDeleteFile = (thisFile) =>
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
};

const doMoveToUploadDir = (thisFile, { responder, req, res, formContext, pendingWork }) =>
{
  pendingWork.pendingRenaming++;
  const oldFilePath = thisFile.path;
  const newFilePath = `${serverConfig.uploadDirectory}/jscupload_${crypto.randomBytes(16).toString('hex')}`;

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
      responder(req, res, formContext);
    }
  });
};

const deleteUnhandledFiles = (unhandledFiles) => {
  Object.keys(unhandledFiles).forEach((name) =>
  {
    const fileInfo = unhandledFiles[name];
    if (Array.isArray(fileInfo))
    {
      fileInfo.forEach((thisFile) => {
        doDeleteFile(thisFile);
      });

    }
    else
    {
      doDeleteFile(fileInfo);
    }
  });
};

const doneWith = (ctx, id) =>
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
};
const finishUpHeaders = (ctx) =>
{
  const { appHeaders, resObject } = ctx;
  Object.keys(appHeaders).forEach((headerName) => resObject.setHeader(headerName, appHeaders[headerName]));
};

const createRunTime = (rtContext) =>
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
};

function extractErrorFromCompileObject(e)
{
  const lineNumberInfo = (e.stack || ':(unknown)').toString().split('\n')[0];
  const lineNumber = lineNumberInfo.split(/.*\:([^\:]*)$/)[1] || '(unknown)';
  return `${e.message} at line ${lineNumber}`;
}

function extractErrorFromRuntimeObject(e)
{
  const lineNumberInfo = e.stack || '<anonymous>::(unknown)';
  const [matchDummy, fileName = '', potentialFileNumber] = lineNumberInfo.match(/^(.+)\:(\d+)\n/) || [];
  const atInfo = (potentialFileNumber) ?
    `at file ${fileName}, line ${potentialFileNumber}`
    :
    `at line ${((lineNumberInfo.match(/\<anonymous\>\:(\d*)\:\d*/i) || [])[1] || '(unknown)')}`
  return `${e.message} ${atInfo}`;
}

/* *************************************
   *
   * Server stuff
   *
   ************************************** */

const responder = (req, res,
                    { requestMethod, contentType, requestBody,
                      formData, formFiles, maxSizeExceeded,
                      forbiddenUploadAttempted
                    }) =>
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
  const { indexRun } = serverConfig;

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
    else {
      resContext.statusCode = 500;
      resContext.compileTimeError = true;
    }
  }
  
  doneWith(resContext);
};

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
  const { server, canUpload, hostName, port, maxPayloadSizeBytes } = serverConfig;

  server.on('request', (req, res) => {
    const { headers = {}, method, url } = req;
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
        console.log(file.name);//__RP
        console.log(sanitizeFilename(file.name));//__RP
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

      postedForm.on('progress', function(bytesReceived, bytesExpected)
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
                doMoveToUploadDir(thisActualFile, { responder, req, res, formContext, pendingWork });
              });
            }
            else
            {
              doMoveToUploadDir(thisFile, { responder, req, res, formContext, pendingWork });
            }
          });
        }
        else
        {
          responder(req, res, formContext);
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
      })
      .on('end', () =>
      {
        if (contentType === 'application/json')
        {
          contentType = 'jsonData';
        }

        const postContext = { requestMethod, contentType, requestBody, maxSizeExceeded, forbiddenUploadAttempted };
        responder(req, res, postContext);
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
    console.log(`Server 0.1.010 running at http://${hostName}:${port}/`);
  });
}

let stats;

const indexFile = './website/index.jssp';

let serverStarted = false;
let readSuccess = false;
let indexExists = false;

const compileContext = 
{
  data: null,
  compiledModule: null
};
  
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
                            .replace(/^[\s\n]*\<html\s*\/\>/i, '<js/js>')
                            .replace(/([^\\])\<js/gi,'$1 <js')
                            .replace(/^\<js/i,' <js')
                            .replace(/([^\\])\/js\>/gi, '$1 /js>')
                            .replace(/^\/js\>/i, ' /js>');

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
                                                .split(/\s\<js([\s\S]*)/);

        unprocessedData = processAfter;

        const printedStuff = (processBefore) ?
                              processBefore
                                .replace(/\\(\<js)/gi,'$1') // Matches '\<js' or '\<JS' and gets rid of the '\'.
                                .replace(/\\(\/js\>)/gi,'$1') // Matches '\/js>' or '\/JS>' and gets rid of the '\'.
                                .replace(/\\/g,'\\\\')
                                .replace(/\'/g,'\\\'')
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
                                                .split(/\s\/js\>([\s\S]*)/);

        if (processBefore.match(/\<html\s*\//i))
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
  serverConfig.indexRun = compileContext.compiledModule.exports;

  if (typeof(serverConfig.indexRun) !== 'function')
  {
    serverConfig.indexRun = undefined;
    console.log('ERROR: Could not compile code.');
  }
  else if (setUploadDirectory(serverConfig.uploadDirectory || DEFAULT_UPLOAD_DIR, serverConfig))
  {
    // All is well so far.
    serverConfig.server = http.createServer();

    if ((serverConfig.maxPayloadSizeBytes || 0) < 0)
    {
      serverConfig.canUpload = false;
    }
    
    startServer(serverConfig);
    serverStarted = true;
  }
}

if (!serverStarted)
{
  console.log('ERROR: Server not started.');
}
