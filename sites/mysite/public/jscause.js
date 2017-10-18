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
        runTime.print('<br />Oops - runtime error!<br />');
        console.log('Oops - runtime error:');
        console.log(extractErrorFromRuntimeObject(e));
      }
      res.end(printQueue());
    }
    else {
      res.end('Oops 5');
    }
  });
});

server.listen(port, hostname, () =>
{
  console.log(`Server 0.1.001 running at http://${hostname}:${port}/`);
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
    console.log(err);
    console.log('Oops 1');
  }
  else
  {
    fs.readFile('index.jssp', 'utf-8', (err, data) =>
    {
      if (err)
      {
        console.log(err);
        console.log('Oops 1.1');
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

              console.log('THE CONTEXT IS HTML.');
              console.log('****** ProcessBefore is:');
              console.log(processBefore);
              console.log('****** ProcessAfter is:');
              console.log(processAfter);

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

              console.log('****** UnprocessedData is:');
              console.log(unprocessedData);
              console.log('******');

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

              console.log('THE CONTEXT IS JAVASCRIPT.');
              console.log('****** ProcessBefore is:');
              console.log(processBefore);
              console.log('****** ProcessAfter is:');
              console.log(processAfter);

              if (processBefore.match(/\<html\s*\//i))
              {
                console.log('WARNING: <html/> keyword found in the middle of code.  Did you mean to put it in the beginning of an HTML section?');
              }

              processedDataArray.push(processBefore);
              
              unprocessedData = processAfter;

              console.log('****** UnprocessedData is:');
              console.log(unprocessedData);
              console.log('******');

              processingContext = CONTEXT_HTML;
            }
          } while (unprocessedData);
          
          const processedData = processedDataArray.join('');
          console.log('======================'); //__RP
          console.log(processedData); //__RP
          console.log('======================'); //__RP
          try
          {
            compiledModule._compile(`module.exports = (rt) => {${processedData}};`, '');
            indexExists = true;
          }
          catch (e)
          {
            console.log('Oops - compile error:');
            console.log(extractErrorFromCompileObject(e));
          }
        }
        catch (e)
        {
          console.log('Oops 2');
        }

        if (indexExists)
        {
          indexRun = compiledModule.exports;

          if (typeof(indexRun) !== 'function')
          {
            if (typeof(indexRun.run) === 'function')
            {
              indexRun = indexRun.run;
            }
            else
            {
              indexRun = undefined;
              console.log('Oops 4');
            }
          }
        }
      }
    });
  }
});
