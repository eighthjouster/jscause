'use strict';

const http = require('http');
const util = require('util');
const fs = require('fs');
const path = require('path');

const hostname = '127.0.0.1';
const port = 3000;

const server = http.createServer();

let indexRun;

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
        console.log(e);
        runTime.print('<br />Oops - runtime error!<br />');
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
        const m = new Module();
        let indexExists = false;
        try
        {
          let firstPass = true;
          let unprocessedData = data;
          const processedDataArray = [];
          let processBefore;
          let processAfter;
          do
          {
            // Matches the first '<js' or '<JS'.
            // But not '\<js' or '\<JS'.
            [processBefore, processAfter] = unprocessedData.split(/[^\\]\<js([\s\S]+)/i);

            if (processAfter || !firstPass)
            {
              unprocessedData = processAfter || '';

              const printedStuff = processBefore
                                   .replace(/^\\|([^\<])\\/g,'$1\\\\') // Matches '/' as first character or when it's not part of an HTML tag.
                                   .replace(/\\(<js)/gi,'$1') // Matches '\<js' or '\<JS' and gets rid of the '\'.
                                   .replace(/\\(\/js\>)/gi,'$1') // Matches '\js>' or '\JS>' and gets rid of the '\'.
                                   .split('\n')
                                   .map((line) => `${line} \\\n`)
                                   .join('');
            
              processedDataArray.push(`rt.print('${printedStuff}');\n`);

              if (unprocessedData)
              {
                // Matches the first '/js>' or '/JS>'.
                // But not '\/js>' or '\/JS>'.
                [processBefore, processAfter] = unprocessedData.split(/[^\\]\/js\>([\s\S]+)/i);

                if (processAfter)
                {
                  unprocessedData = processAfter;
                  processedDataArray.push(processBefore);
                }
                else
                {
                  processedDataArray.push(unprocessedData);
                }
              }
            }
            else
            {
              processedDataArray.push(unprocessedData);
            }

            firstPass = false;
          } while (processAfter);
          
          const processedData = processedDataArray.join('');
          
          m._compile(`module.exports = (rt) => {${processedData}};`, '');
          indexExists = true;
        }
        catch (e)
        {
          console.log(e);
          console.log('Oops 2');
        }

        if (indexExists)
        {
          indexRun = m.exports;

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
