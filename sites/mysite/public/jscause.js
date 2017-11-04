'use strict';

/* *************************************
   *
   * Setup
   *
   ************************************** */
const fs = require('fs');
const urlUtils = require('url');
const queryStringUtils = require('querystring');
const formidable = require('./jscvendor/formidable');

const printInit = (ctx) => { ctx.outputQueue = []; };
const registerResObject = (ctx, res) => { ctx.resObject = res; };
const assignAppHeaders = (ctx, headers) => { ctx.appHeaders = Object.assign(ctx.appHeaders, headers); };
const doneWith = (ctx, id) =>
{
  if (id)
  {
    delete ctx.waitForQueue[id];
  }

  if (Object.keys(ctx.waitForQueue).length === 0)
  {
    ctx.resObject.end(ctx.outputQueue.join(''));
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
    waitFor: (cb) => { const waitForId = rtContext.waitForNextId++; rtContext.waitForQueue[waitForId] = true; return () => { cb(); doneWith(rtContext, waitForId); } },
    getParams: rtContext.getParams,
    postParams: rtContext.postParams
  };
};

let indexRun;

fs.stat('index.jssp', (err, stats) =>
{
  if (err)
  {
    console.log('ERROR: Cannot find index file');
    console.log(err);
  }
  else
  {
    fs.readFile('index.jssp', 'utf-8', (err, data) =>
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

const responder = (req, res, postContext) =>
{
  let postParams = '';
  if (postContext.isUpload)
  {
    // WHAT DO DO WITH UPLOADING?
  }
  else
  {
    const body = Buffer.concat(bodyChunks).toString();
    //console.log(body);//__RP
    postParams =  queryStringUtils.parse(body)
  }

  let statusCode = 200;

  const resContext = 
  {
    outputQueue: undefined,
    appHeaders: {},
    resObject: undefined,
    waitForNextId: 1,
    waitForQueue: {},
    getParams: urlUtils.parse(req.url, true).query,
    postParams
  };

  const runTime = createRunTime(resContext);

  if (indexRun)
  {
    printInit(resContext);
    registerResObject(resContext, res);
    try
    {
      indexRun(runTime);
    }
    catch (e)
    {
      runTime.print('<br />Runtime error!<br />');
      console.log(`ERROR: Runtime error: ${extractErrorFromRuntimeObject(e)}`);
      console.log(e);

      statusCode = 500;
    }

    res.statusCode = statusCode;
    assignAppHeaders(resContext, {'Content-Type': 'text/html; charset=utf-8'});

    finishUpHeaders(resContext);
    doneWith(resContext);
  }
  else {
    res.statusCode = 500;
    res.end('Application is in an error state.');
  }
};

server.on('request', (req, res) => {
  const { headers, method, url } = req;

  const fileUploader = ((req.method || '').toLowerCase() === 'post') ?
    new formidable.IncomingForm()
    :
    null;

  if (fileUploader)
  {
    fileUploader.parse(req);

    fileUploader.on('end', () =>
    {
      const uploadContext = { isUpload: true };
      responder(req, res, uploadContext);
    });
  }
  else
  {
    let bodyChunks = [];
    req.on('data', (chunk) =>
    {
      bodyChunks.push(chunk);
      //console.log(chunk, chunk.length);
    })
    .on('end', () =>
    {
      const postContext = { budyChunks };
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
  
