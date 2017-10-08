const http = require('http');
const util = require('util');
const fs = require('fs');

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
      indexRun(res.end.bind(res));
    }
  });
});

server.listen(port, hostname, () =>
{
  console.log(`Server 0.1.001 running at http://${hostname}:${port}/`);
});

/**************************************
*
* Setup
*
***************************************/

fs.stat('index.jsse', (err, stats) =>
{
  if (err)
  {
    console.log(err);
    res.end('Oops 1');
  }
  else
  {
    let indexExists = false;
    try
    {
      require.resolve('./index.jsse');
      indexExists = true;
    }
    catch (e)
    {
      res.end('Oops 2');
    }

    let index;

    if (indexExists)
    {
      try {
        index = require('./index.jsse');
      }
      catch(e)
      {
        res.end('Oops 3');
      }

      if (index) {
        if (typeof(index.run) === 'function')
        {
          indexRun = index.run;
        }
        else
        {
          res.end('Oops 4');
        }
      }
    }
  }
});
