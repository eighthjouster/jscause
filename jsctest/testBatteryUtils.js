'use strict';

const http = require('http');

// If there is only one test, then there will be no need to put it in an array.
const testUtils =
{
  makeFromBaseTest: (testName) =>
  {
    return {
      only: false,
      testName,
      onTestBeforeStart()
      {
        // Here we set up the test.  Config files, sample files, etc.
      },
      onExpectedLogMessagesPass()
      {
        // We got all the sequence of log messages we were expecting.
        // It's generally a good thing.  But it will depened on the test.
        this.testPassed = true;
      },
      onMonitoredLogMessageFound()
      {
        // We got one of the log messages found in the monitoredLogMessages array.
        // Typically useful when testing server requests and want to make sure that
        // no errors appear in the server console.
      },
      onServerStarted()
      {
        // The server started okay.  It might be good or bad, depending on the test.
      },
      onServerError(/* errorMessage = '' */)
      {
        // return return `The server emitted an error.  It might be good or bad, depending on the test. Error returned: '${errorMessage}'`;
      },
      onServerStartedOrError()
      {
        // Useful call for when dealing with more than one server and some cleanup needs to happen when all have been invoked.
        // Usually combined with this.numberOfServersInvokedSofar
      },
      onUnitTestStarted()
      {
        // Called when this.isUnitTest is assigned a value of true - usually in onTestBeforeStart()
        // Here we can individually test application functions and set this.testPassed accordingly.
      },
      onReadyForRequests()
      {
        // Called when this.isRequestsTest is set to true in onTestBeforeStart, when the server
        // has finished starting up, setting up all sites and is ready to take client requests.
        // You can use http.request() and/or https.request() here.
        // When you get a response and you're done with the request (either on a pass or fail capacity),
        // call this.doneRequestsTesting()
      },
      onAllRequestsEnded()
      {
        // Called when all requests and responses invoked in onReadyForRequests() have completed.
        // this.terminateApplication({ onComplete: this.waitForDoneSignal() });
        // waitForDoneSignal() is crucial above so that application terminates before we move on to the next test.
      },
      onBeforeTestEnd()
      {
        // Called just before checking whether the test passed or failed.
        // It's for last-minute checks.
        // For example, after the server has been terminated and all messages have been logged.
        // Happens after onExpectedLogMessagesPass(), onServerStarted(), onServerError()
        // Do not call functions here that may trigger signalTestEnd() (e.g. this.terminateApplication())
        // Do use this.waitForDoneSignal() here.
        //
        // this.testPassed = true;
      },
      onTestEnd()
      {
        // Here we tear down the test.  Config files, sample files, etc
        // that are no longer needed.
      }
    };
  },
  jsCauseCertPemFileContents:
    [
      '-----BEGIN CERTIFICATE-----',
      'MIIDvDCCAqQCCQDYObH0cDTljDANBgkqhkiG9w0BAQUFADCBnzELMAkGA1UEBhMC',
      'VVMxDzANBgNVBAgMBk5ldmFkYTESMBAGA1UEBwwJTGFzIFZlZ2FzMRQwEgYDVQQK',
      'DAtKU0NhdXNlLm9yZzEQMA4GA1UECwwHSlNDYXVzZTEcMBoGA1UEAwwTaHR0cHM6',
      'Ly9qc2NhdXNlLm9yZzElMCMGCSqGSIb3DQEJARYWc2l0ZS1jZXJ0c0Bqc2NhdXNl',
      'Lm9yZzAeFw0yMTAxMjkwNTM4MDlaFw0zMTAxMjcwNTM4MDlaMIGfMQswCQYDVQQG',
      'EwJVUzEPMA0GA1UECAwGTmV2YWRhMRIwEAYDVQQHDAlMYXMgVmVnYXMxFDASBgNV',
      'BAoMC0pTQ2F1c2Uub3JnMRAwDgYDVQQLDAdKU0NhdXNlMRwwGgYDVQQDDBNodHRw',
      'czovL2pzY2F1c2Uub3JnMSUwIwYJKoZIhvcNAQkBFhZzaXRlLWNlcnRzQGpzY2F1',
      'c2Uub3JnMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAsGmZltt99lDR',
      'HuUl0aXluUNfTBeG3jRjzfCmAL63VQ+bfhoov2e2/ALWz1DxHqGr8EXC3xdc6usq',
      'KO4XDMGfVrRNem0J/zGGUeBpLs5kqnA0aw13GnQocpiXr4jTcCZVlT+mxPOxXCqP',
      'VDnIxVssPAZ+N0sq4A43ExRIhV638XwZGl2fzsfsLjImX3tyQZlvYlpb0lGkqHoK',
      'tlPBSrD9A7LOvtmMP8J70inQZuco4J2RjZMzn9pD8KuKsJ4I99FWTWQ7bEFqMg3v',
      'iZSpJjvgBCvMVVS0GTXq1w730ExuRi0UUtLmM1l+TDVd7q8a+WkjXzZ0b2hyzISJ',
      'UbZQmh/jiwIDAQABMA0GCSqGSIb3DQEBBQUAA4IBAQBTvHDL4BnVw/juZ5mHY6ha',
      '2bkhqaWM5WuECpnZAjMIpvqb1uJJOOqAc6aJa4SeztnWHCXTWB9wFnURKJwkU3aX',
      'DYwbhe1mbPax9fXaiqaH6A4oDEpTNktuEv1d6xoQaKyDpcv3FNd90Ft030wZCte1',
      'V9t2iRAXoFAenIueVd3wE5RlOb/gsGyrypygmHx0zevf6k7TR9oVKrey5V0kWRAg',
      'dLurm+H8bwRI4I2nMJdouAtWCb2G3f4lNdlje/NDdtfsRAYQ6MNx3exrvtOM6GXX',
      'qmrAazSJ7i0S1Bx6YuJq/SoSUcACxTcsQw16wzzDQ/f1rl2Wk21w5XLINEpQ6mIZ',
      '-----END CERTIFICATE-----',
      ''
    ].join('\n'),
  jsCauseKeyFileContents:
    [
      '-----BEGIN PRIVATE KEY-----',
      'MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCwaZmW2332UNEe',
      '5SXRpeW5Q19MF4beNGPN8KYAvrdVD5t+Gii/Z7b8AtbPUPEeoavwRcLfF1zq6yoo',
      '7hcMwZ9WtE16bQn/MYZR4GkuzmSqcDRrDXcadChymJeviNNwJlWVP6bE87FcKo9U',
      'OcjFWyw8Bn43SyrgDjcTFEiFXrfxfBkaXZ/Ox+wuMiZfe3JBmW9iWlvSUaSoegq2',
      'U8FKsP0Dss6+2Yw/wnvSKdBm5yjgnZGNkzOf2kPwq4qwngj30VZNZDtsQWoyDe+J',
      'lKkmO+AEK8xVVLQZNerXDvfQTG5GLRRS0uYzWX5MNV3urxr5aSNfNnRvaHLMhIlR',
      'tlCaH+OLAgMBAAECggEALoGYQOHaQh4qEwf7wVoHxqBRNiEZp+iNyxO+34FnmWAE',
      '8Oh6h4MTBTrGYF8JQbcDOdNaPS/Oigu20JV7tBwzIktkBXtLYGAw9dLAR9uXRCtS',
      'Vkp1dJ7cruE1U8wxWWZxt2fRUiigQBjkMiMNn6GadrSLf44sXmbA9CGrwKUovts1',
      'BznqsdFu2ladXcuARe8j6DTP6zV5ofQt2WD4pQcpSp7zpfpoG+XrFCdUAF5g0X0L',
      'q3qfJcOQH7yKr5bi5LzLE+rL+niCtaW/YqM/LtdiVI6Kg3wc/cmTtTPEVLv7Pqfc',
      '4GKfwKgG04V5UOTXG28Ghiq5k+E/43KPc8HAArlLkQKBgQDipiuD9Uj7LownPr8c',
      'q6xVhnu4M1lf7/mZYiGLUMTNJQ6A5AsumDXZWY9QQFhlbtKDW3JPyydoQ3v/VLEE',
      'ouyvbg0MDbLtCc7ybkB0fSilU40pftD0iJBflO33aHTGDxquDp2X8Az5DSmy3irC',
      'Nn4xO6EpfVFligBybUmWRhWokwKBgQDHQf7IU/HifuxADTVVBCG8FtyjDr8PlEao',
      'ZZgrP5yVUBC4DU2Ol4BwtpfriWYaDdoXvskeByBj0HD09e3mGEtxWzc9hBi7gaW7',
      'YsxzkuKUy5qiZJ5xMoSoJ85jAgcLHJs+txR7sFfkoerlAobsyHUeXbVFwChzalal',
      'Xx/fndsMKQKBgQCp2zTDeSDPtcutYbXiK7pEgjvYCQuS/YqGa+eNu+MxhvL+n2jN',
      '6553nEnuL7rPkaVMck0SBcMrvV+BNBxRyDQvKP+4J9APGwmv3/aIFoBOnnYtQfAh',
      'QvNH3poUj4DsKcep6CQtCOcAAuBcP2m2ERazmOen61YEDc9V8hdy+mUi5wKBgFnN',
      'y6e79btwGsgva8b6Sr37y8sNnVzHJiVFTJTJYagF4tMg48CNVYz3LncwgLzjW1Ty',
      'XrBS4+04h4BPyr22W2ImizoFbCQuJWTT/XNlUwtezD2+fY5lB1bGQgVrZ4NBjFJy',
      'rx+j9akMtNIsFmVnXymlcEqUdWa3GYAE5FejTJMpAoGAWJ+giCEA9icOEXlNxXl3',
      'tUoD+xdCTptzMUvDmQsd4D4D/aZI3RHbw0mQVWwCLmZRvQVJ3zq70kCXOx9kbCvY',
      'gbhVReUPshtarcnS/gL+JKeVD1L7N6tO5P+PLtp4vJLhtI2kcmgF4OXeGgZHNTkQ',
      'yRt6saV3f0JLMfQkYaLXjPk=',
      '-----END PRIVATE KEY-----',
      ''
    ].join('\n'),
  jsCauseCertPemFileBadContents:
    [
      '-----BEGIN CERTIFICATE-----',
      'BAD CONTENTS',
      '-----END CERTIFICATE-----',
      ''
    ].join('\n'),
  jsCauseKeyFileBadContents:
    [
      '-----BEGIN RSA PRIVATE KEY-----',
      'BAD CONTENTS',
      '-----END RSA PRIVATE KEY-----',
      ''
    ].join('\n'),

  initConsoleLogCapture(options = {})
  {
    const { prefixInputWithConsoleTag } = options;

    const originalConsoleLog = console.log;
    const originalConsoleWarn = console.warn;
    const originalConsoleError = console.error;

    if (prefixInputWithConsoleTag)
    {
      console.log = function() { console.log.output.push(`LOG: ${Object.values(arguments).reduce((a,b)=> `${a} ${b}`)}`) };
      // Yes, we're pushing to console.log.output[].
      console.warn = function() { console.log.output.push(`WARN: ${Object.values(arguments).reduce((a,b)=> `${a} ${b}`)}`) };
      // Yes, we're pushing to console.log.output[].
      console.error = function() { console.log.output.push(`ERROR: ${Object.values(arguments).reduce((a,b)=> `${a} ${b}`)}`) };
    }
    else
    {
      console.log = function() { console.log.output.push(Object.values(arguments).reduce((a,b)=> `${a} ${b}`)); };
      // Yes, we're pushing to console.log.output[].
      console.warn = function() { console.log.output.push(Object.values(arguments).reduce((a,b)=> `${a} ${b}`)); };
      // Yes, we're pushing to console.log.output[].
      console.error = function() { console.log.output.push(Object.values(arguments).reduce((a,b)=> `${a} ${b}`)); };
    }

    console.log.original = originalConsoleLog;
    console.warn.original = originalConsoleWarn;
    console.error.original = originalConsoleError;

    console.log.output = [];
  },
    
  endConsoleLogCapture()
  {
    let consoleLogOutput;
    if (console.log.original)
    {
      consoleLogOutput = { lines: console.log.output, status: 'captured' };
      console.log = console.log.original;
      console.warn = console.warn.original;
      console.error = console.error.original;
    }
    else
    {
      consoleLogOutput = { lines: [], status: 'No console output.  Call initConsoleLogCapture() inside onTestBeforeStart() to capture.' };
    }
    return consoleLogOutput;
  },

  areFlatArraysEqual(a, b)
  {
    return (a.length === b.length) && a.every((line, i) => line === b[i]);
  },

  performTestRequestAndOutput({ onResponseEnd: onResponseEndCb, request, context: testContext, postData, reqSendHandler, resReceiveHandler } = {})
  {
    const requestContext =
    {
      dataReceived: [],
      consoleLogOutput: undefined,
      statusCode: undefined
    }

    request.headers = Object.assign({},
      request.headers || {},
      { 'x-jsc-tst-hostn': request.hostname }
    );
    request.hostname = 'localhost';

    if ((request.method === 'POST') && (typeof(postData) === 'undefined'))
    {
      console.warn('WARNING: The request method is POST, and postData is undefined; in case this is not deliberate.');
    }

    const { dataReceived } = requestContext;
    const req = http.request(request, (res) =>
    {
      const reqHeaderTestHostName = request.headers && request.headers['x-jsc-tst-hostn'] || '';
      const resHeaderTestHostName = res.headers && res.headers['x-jsc-tst-hostn-re'] || '';
      testContext.contentReqExpectedSiteResponded = (reqHeaderTestHostName === resHeaderTestHostName);

      res.on('readable', () =>
      {
        try
        {
          if (resReceiveHandler)
          {
            console.info('INFO: Received chunk of data, ready to be processed...');
            resReceiveHandler(res);
          }
          else
          {
            res.read();
          }
        }
        catch(e)
        {
          console.error('ERROR: An error occurred when executing processResponse/resReceiveHandler:');
          console.error(e);
        }
      });

      res.on('data', (data) =>
      {
        dataReceived.push(data);
      });

      res.on('end', () =>
      {
        requestContext.consoleLogOutput = testUtils.endConsoleLogCapture();
        requestContext.statusCode = res.statusCode;
        try
        {
          onResponseEndCb && onResponseEndCb(requestContext);
        }
        catch(e)
        {
          console.error('ERROR: An error occurred when executing processResponse/onResponseEnd:');
          console.error(e);
        }
        testContext.doneRequestsTesting();
      });
    });

    req.on('error', (error) =>
    {
      console.error('ERROR: An error occurred during the request.');
      console.error(error);
      testContext.doneRequestsTesting();
    });

    if (typeof(reqSendHandler) !== 'undefined')
    {
      try
      {
        reqSendHandler(req, postData);
      }
      catch(e)
      {
        console.error('ERROR: An error occurred when executing processResponse/reqSendHandler:');
        console.error(e);
      }
    }
    else
    {
      if (typeof(postData) !== 'undefined')
      {
        req.write(postData);
      }
      req.end();
    }
  },

  makeTestEndBoilerplate()
  {
    return {
      onServerError(errorMessage = '')
      {
        this.testPassed = false;
        return `ERROR:  The server did not start.  This should have not happened. Check the test configuration and website contents. Error returned: '${errorMessage || ''}'`;
      },
      onAllRequestsEnded()
      {
        this.terminateApplication({ onComplete: this.waitForDoneSignal() });
      },
      onBeforeTestEnd()
      {
        this.testPassed = this.testPassed && this.serverDidTerminate;
      },
      onTestEnd()
      {
        if (!this.deleteFile(['sites', 'mysite', 'website', 'index.jscp']))
        {
          console.warn('WARNING: Could not delete index.jscp because it was not found.');
        }
      }
    };
  },

  processResponse(context, request, onResponseEndCb, { postData, reqSendHandler, resReceiveHandler } = {})
  {
    context.testPassed = false;
    if (context.serverDidStart)
    {
      testUtils.performTestRequestAndOutput(
        {
          onResponseEnd: onResponseEndCb,
          request,
          doneRequestsTesting: context.doneRequestsTesting,
          context,
          postData,
          reqSendHandler,
          resReceiveHandler
        });
    }
    else
    {
      context.doneRequestsTesting();
    }
  },

  buildFileUploadEntry: (boundary, fieldName, fieldValue, fileName) =>
  {
    let entries;
    const binaryValue = (typeof(fieldValue) !== 'string') ? fieldValue : Buffer.from(fieldValue);
    if (typeof(fileName) === 'undefined')
    {
      entries =
      [
        `--${boundary}`,
        `Content-Disposition: form-data; name="${fieldName}"`,
        'Content-Type: text/plain',
        '',
        ''
      ];
    }
    else
    {
      entries =
      [
        `--${boundary}`,
        `Content-Disposition: form-data; name="${fieldName}"; filename="${fileName}"`,
        'Content-Type: application/octet-stream',
        '',
        ''
      ];
    }
    return (
      [
        Buffer.from(entries.join('\r\n')), // \r\n is required by HTTP specs.
        binaryValue,
        Buffer.from('\r\n')
      ]
    );
  },

  makeBinaryPostData: (boundary, entries) =>
  {
    // [].concat(...entries) flattens array.
    const postDataArray = [].concat(...entries);
    const postDataArrayWithEnding = postDataArray.concat(Buffer.from(`--${boundary}`))
    return Buffer.concat(
      postDataArrayWithEnding,
      postDataArrayWithEnding.map(b => Buffer.byteLength(b)).reduce((a, b) => a + b)
    );
  },

  getFormFieldBoundary: (binaryValues) => // Not perfect, but will do the job for now.
  {
    let formBoundary;
    let attempts = 0;
    while (attempts < 100)
    {
      const randomOctet2Length = 32;
      const randomOctets2Array = [...Array(randomOctet2Length)].map(() => Math.floor(Math.random() * 10) + 48);
      const binaryValue2 = Buffer.from(randomOctets2Array);
      if (binaryValues.every((value)=> !(value.includes(binaryValue2))))
      {
        formBoundary = `some_form_boundary_${binaryValue2.toString()}`;
        break;
      }
      attempts++;
    }

    return formBoundary;
  },

  makeTimeChunkSender: (req, payload, totalTime, testContext) =>
  {
    const testName = testContext.testName;
    const payloadLength = Buffer.byteLength(payload);
    let bufferSliceStart = 0;
    const length = Math.floor(payloadLength * 0.2);
    const timeoutInSecs = Math.floor(totalTime * 0.2);
    
    const timeChunkSender = () =>
    {
      if (testName !== testContext.testName)
      {
        return;
      }

      const bufferSliceEnd = bufferSliceStart + length;
  
      console.info(`INFO: Sending payload part - ${Math.min(bufferSliceEnd, payloadLength)} / ${payloadLength} ...`);
  
      req.write(payload.subarray(bufferSliceStart, bufferSliceEnd));
      bufferSliceStart = bufferSliceEnd;
  
      if (bufferSliceStart < payloadLength)
      {
        setTimeout(timeChunkSender, timeoutInSecs);
      }
      else
      {
        req.end();
      }
    };
  
    return timeChunkSender;
}
};

module.exports = testUtils;
