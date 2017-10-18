'use strict';

const http = require('http');
const util = require('util');
const fs = require('fs');
const path = require('path');

const hostname = '127.0.0.1';
const port = 3000;

let indexRun;

function extractErrorFromCompileObject(e)
{
  const lineNumberInfo = (e.stack || ':(unknown)').toString().split('\n')[0];
  const lineNumber = lineNumberInfo.split(/.*\:([^\:]*)$/)[1] || '(unknown)';
  return `${e.message} at line ${lineNumber}`;
}

function extractErrorFromRuntimeObject(e)
{
  const lineNumberInfo = e.stack || '<anonymous>::(unknown)';
  const lineNumber = (lineNumberInfo.match(/\<anonymous\>\:(\d*)\:\d*/i) || [])[1] || '(unknown)';
  return `${e.message} at line ${lineNumber}`;
}


const server = http.createServer();

server.on('request', (req, res) => {
  const { headers, method, url } = req;
  let bodyChunks = [];
  req.on('error', (err) =>
  {
    console.log('ERROR: Request related error.');
    console.log(err);
  })
  .on('data', (chunk) =>
  {
    bodyChunks.push(chunk);
  })
  .on('end', () =>
  {
    const body = Buffer.concat(bodyChunks).toString();

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html');

    if (indexRun)
    {
      printInit();
      try
      {
        indexRun(runTime);
      }
      catch (e)
      {
        runTime.print('<br />Runtime error!<br />');
        console.log(`ERROR: Runtime error: ${extractErrorFromRuntimeObject(e)}`);
        console.log(e);
      }
      res.end(printQueue());
    }
    else {
      res.end('Application is in error state.');
    }
  });
});

server.listen(port, hostname, () =>
{
  console.log(`Server 0.1.003 running at http://${hostname}:${port}/`);
});
  
/* *************************************
   *
   * Setup
   *
   ************************************** */

let outputQueue;
const printInit = () => { outputQueue = []; };
const printQueue = () => outputQueue.join('');

const runTime = {
  print: (output = '') => outputQueue.push(output),
};

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

          let unprocessedData = data
                                  .replace(/^[\s\n]*\<html\s*\/\>/i, '<js/js>')
                                  .replace(/([^\\])\<js/gi,'$1 <js')
                                  .replace(/^\<js/i,' <js')
                                  .replace(/([^\\])\/js\>/gi, '$1 /js>')
                                  .replace(/^\/js\>/i, ' /js>');

          const processedDataArray = [];

          const $firstOpeningTag = unprocessedData.indexOf(' <js');
          const $firstClosingTag = unprocessedData.indexOf(' /js>');

          let processingContext = (($firstOpeningTag === -1) && ($firstClosingTag === -1) || ($firstClosingTag < $firstOpeningTag) && ($firstClosingTag > -1)) ?
                                   CONTEXT_JAVASCRIPT :
                                   CONTEXT_HTML;

          do
          {
            if (processingContext === CONTEXT_HTML) {
              // Matches the first '<js' or '<JS'.
              // But not '\<js' or '\<JS'.
              // Adds a prefixing space to distinguish from '\<js', for easy splitting.
              // (Otherwise, it would delete whatever character is right before.)
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

              // Matches the first '/js>' or '/JS>'.
              // But not '\/js>' or '\/JS>'.
              // Adds a prefixing space to distinguish from 'js>', for easy splitting
              // (Otherwise, it would delete whatever character is right before.)
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
