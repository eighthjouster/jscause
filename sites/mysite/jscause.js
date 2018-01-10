'use strict';

/* *************************************
   *
   * Setup
   *
   ************************************** */
const fs = require('fs');
const urlUtils = require('url');
const queryStringUtils = require('querystring');
const crypto = require('crypto');
const formidable = require('./jscvendor/formidable');
const FORMDATA_MULTIPART_RE = /^multipart\/form-data/i;
const FORMDATA_URLENCODED_RE = /^application\/x-www-form-urlencoded/i;

const printInit = (ctx) => { ctx.outputQueue = []; };
const assignAppHeaders = (ctx, headers) => { ctx.appHeaders = Object.assign(ctx.appHeaders, headers); };

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
  const newFilePath = './workbench/uploads/jscupload_' + crypto.randomBytes(16).toString('hex');
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
      Object.keys(formFiles).forEach((name) =>
      {
        const fileInfo = formFiles[name];
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
    }

    if (ctx.runtimeException)
    {
      ctx.outputQueue = ['<br />Runtime error!<br />'];
      console.log(`ERROR: Runtime error: ${extractErrorFromRuntimeObject(ctx.runtimeException)}`);
      console.log(ctx.runtimeException);
    }

    ctx.resObject.statusCode = ctx.statusCode;
    if (ctx.compileTimeError)
    {
      ctx.resObject.end('Compile time error!');
    }
    else
    {
      ctx.resObject.end(ctx.outputQueue.join(''));
    }
  }
};
const finishUpHeaders = (ctx) =>
{
  Object.keys(ctx.appHeaders).forEach((headerName) => ctx.resObject.setHeader(headerName, ctx.appHeaders[headerName]));
};

const createRunTime = (rtContext) =>
{
  return {
    print: (output = '') => rtContext.outputQueue.push(output),
    header: (nameOrObject, value) => { assignAppHeaders.apply(this, (typeof(nameOrObject) === 'string') ?  [rtContext, {[nameOrObject]: value}] : [].concat(rtContext, nameOrObject) );  },
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
    getParams: rtContext.getParams,
    postParams: rtContext.postParams,
    uploadedFiles: rtContext.uploadedFiles
  };
};

let indexRun;

fs.stat('./website/index.jssp', (err, stats) =>
{
  if (err)
  {
    console.log('ERROR: Cannot find index file');
    console.log(err);
  }
  else
  {
    fs.readFile('./website/index.jssp', 'utf-8', (err, data) =>
    {
      if (err)
      {
        console.log('ERROR: Cannot load index file.');
        console.log(err);
      }
      else
      {
        const Module = module.constructor;
        Module._nodeModulePaths(path.dirname(''))
        const compiledModule = new Module();
        let indexExists = false;
        try
        {
          const CONTEXT_HTML = 0;
          const CONTEXT_JAVASCRIPT = 1;

          // Matches '<js', '<JS', /js>' or '/JS>'
          // Adds a prefixing space to distinguish from 
          // '\<js', '\<JS', '/js>', '/JS>', for easy splitting
          // (Otherwise, it would delete whatever character is right before.)
          let unprocessedData = data
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
            if (processingContext === CONTEXT_HTML) {
              const [processBefore, processAfter] = unprocessedData
                                                     .split(/\s\<js([\s\S]*)/);

              unprocessedData = processAfter;

              const printedStuff = (processBefore) ?
                                    processBefore
                                      .replace(/\\(\<js)/gi,'$1') // Matches '\<js' or '\<JS' and gets rid of the '\'.
                                      .replace(/\\(\/js\>)/gi,'$1') // Matches '\/js>' or '\/JS>' and gets rid of the '\'.
                                      .replace(/\\/g,'\\\\')
                                      .replace(/\'/g,'\\\'')
                                      .replace(/\n{2,}/g, '\n')
                                      .replace(/\s{2,}/g, ' ')
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
            compiledModule._compile(`module.exports = (rt) => {${processedData}};`, '');
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

        if (indexExists)
        {
          indexRun = compiledModule.exports;

          if (typeof(indexRun) !== 'function')
          {
            indexRun = undefined;
            console.log('ERROR: Could not compile code.');
          }
        }
      }
    });
  }
});

const http = require('http');
const util = require('util');
const path = require('path');

const hostname = '127.0.0.1';
const port = 3000;

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

const server = http.createServer();

const responder = (req, res, { postType, requestBody, formData, formFiles }) =>
{
  let postParams;
  let uploadedFiles = {};
  if (postType === 'formWithUpload')
  {
    postParams = formData;
    uploadedFiles = formFiles;
  }
  else if (postType === 'formData')
  {
    postParams = formData;
  }
  else
  {
    const postBody = Buffer.concat(requestBody).toString();
    //console.log(postBody);//__RP
    postParams =  queryStringUtils.parse(postBody);
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
    uploadedFiles,
    statusCode: 200,
    compileTimeError: false,
    runtimeException: undefined
  };

  const runTime = createRunTime(resContext);

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
  
  doneWith(resContext);
};

server.on('request', (req, res) => {
  const { headers, method, url } = req;
  const contentType = req.headers['content-type'];
  const isUpload = FORMDATA_MULTIPART_RE.test(contentType);
  const postedForm = (((req.method || '').toLowerCase() === 'post') &&
                        (isUpload || FORMDATA_URLENCODED_RE.test(contentType))) ?
    new formidable.IncomingForm()
    :
    null;
  
  const postedFormData = { params: {}, files: {}, pendingWork: { pendingRenaming: 0 } };

  if (postedForm)
  {
    postedForm.keepExtensions = false;
    postedForm.parse(req);

    postedForm.on('field', (name, value) =>
    {
      postedFormData.params[name] = value;
    });

    postedForm.on('file', (name, file) =>
    {
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

    postedForm.on('end', () =>
    {
      const { params: formData, files: formFiles, pendingWork } = postedFormData;
      const formContext = { postType: (isUpload) ? 'formWithUpload' : 'formData', formData, formFiles };

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
    });
  }
  else
  {
    let requestBody = [];
    req.on('data', (chunk) =>
    {
      requestBody.push(chunk);
    })
    .on('end', () =>
    {
      const postContext = { postType: 'postData', requestBody };
      responder(req, res, postContext);
    });
  }

  req.on('error', (err) =>
  {
    console.log('ERROR: Request related error.');
    console.log(err);
  })
});

server.listen(port, hostname, () =>
{
  console.log(`Server 0.1.010 running at http://${hostname}:${port}/`);
});
