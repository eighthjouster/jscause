'use strict';

const testUtils = require('./testBatteryUtils');
const http = require('http');

const makeBaseSite = (extra = {}) =>
  Object.assign(
    {
      'name': 'My Site',
      'port': 3000,
      'rootDirectoryName': 'mysite'
    }, extra
  );

const makeBaseJsCauseConfContents = (extra = {}) =>
  Object.assign(
    {
      'sites':
      [
        makeBaseSite()
      ],
      'logging': {}
    }, extra
  );

const makeBaseSiteConfContents = (extra = {}) =>
  Object.assign(
    {
      'hostName': 'jscausesite1',
      'canUpload': false,
      'maxPayloadSizeBytes': 0,
      'jscpExtensionRequired': 'optional',
      'httpPoweredByHeader': 'include',
      'tempWorkDirectory': './workbench',
      'mimeTypes': {},
      'logging': {}
    }, extra
  );

const makeBaseRequest = (extra = {}) =>
  Object.assign(
    {
      hostname: 'jscausesite1',
      port: 3000,
      path: '/',
      method: 'GET'
    }, extra
  );

function makeTestEndBoilerplate()
{
  return {
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
      this.deleteFile(['sites', 'mysite', 'website', 'index.jscp']);
    }
  };
}

function performTestRequestAndOutput({ onResponseEnd: onResponseEndCb })
{
  const requestContext =
  {
    dataReceived: [],
    consoleLogOutput: undefined
  }

  const { dataReceived } = requestContext;
  const req = http.request(makeBaseRequest(),
    (res) =>
    {
      if (res.statusCode === 200)
      {
        res.on('data', (data) => dataReceived.push(data));

        res.on('end', () =>
        {
          requestContext.consoleLogOutput = endConsoleLogCapture();
          onResponseEndCb && onResponseEndCb(requestContext);
          this.doneRequestsTesting();
        });
      }
      else
      {
        console.error(`The response status code is not 200 OK.  It is ${res.statusCode} instead.`);
        this.doneRequestsTesting();
      }
    }
  );

  req.on('error', (error) =>
  {
    console.error('An error ocurred during the request.');
    console.error(error);
    this.doneRequestsTesting();
  });

  req.end();
}

function processResponse(onResponseEndCb)
{
  this.testPassed = false;
  if (this.serverDidStart)
  {
    performTestRequestAndOutput.call(this,
      {
        onResponseEnd: onResponseEndCb
      });
  }
  else
  {
    this.doneRequestsTesting();
  }
}

function initConsoleLogCapture()
{
  const originalConsoleLog = console.log;
  console.log = (message) => { console.log.output.push(message); };
  console.log.original = originalConsoleLog;
  console.log.output = [];
}

function endConsoleLogCapture()
{
  let consoleLogOutput;
  if (console.log.original)
  {
    consoleLogOutput = { lines: console.log.output, status: 'captured' };
    console.log = console.log.original;
  }
  else
  {
    consoleLogOutput = { lines: [], status: 'No console output.  Call initConsoleLogCapture() inside onTestBeforeStart() to capture.' };
  }
  return consoleLogOutput;
}

const test_contents_001_jscp_index_empty = Object.assign(testUtils.makeFromBaseTest('Contents; JSCP file; index; empty'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      this.doEmptyTestDirectory();

      this.doCreateDirectoryFromPathList(['logs']);
      this.doCreateDirectoryFromPathList(['sites']);
      this.doCreateDirectoryFromPathList(['sites', 'mysite']);
      this.doCreateDirectoryFromPathList(['sites', 'mysite', 'configuration']);
      this.doCreateDirectoryFromPathList(['sites', 'mysite', 'configuration', 'certs']);
      this.doCreateDirectoryFromPathList(['sites', 'mysite', 'workbench']);
      this.doCreateDirectoryFromPathList(['sites', 'mysite', 'localLogs']);
      this.doCreateDirectoryFromPathList(['sites', 'mysite', 'website']);

      const jsCauseConfContents = makeBaseJsCauseConfContents();
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));

      const siteConfContents = makeBaseSiteConfContents();
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
      
      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], '');
      this.isRequestsTest = true;
    },
    onReadyForRequests()
    {
      processResponse.call(this, ({ dataReceived }) =>
      {
        this.testPassed = !dataReceived.length;
      });
    }
  }
);

const test_contents_002_jscp_index_console_log = Object.assign(testUtils.makeFromBaseTest('Contents; JSCP file; index; console.log'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      initConsoleLogCapture();
      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], 'console.log(1);');
      this.isRequestsTest = true;
    },
    onReadyForRequests()
    {
      processResponse.call(this, ({ dataReceived, consoleLogOutput }) =>
      {
        this.testPassed = !dataReceived.length &&
          (consoleLogOutput.status === 'captured') &&
          (consoleLogOutput.lines.length === 1) &&
          (consoleLogOutput.lines.pop() === 1);
      });
    }
  }
);

module.exports = [
  test_contents_001_jscp_index_empty,
  test_contents_002_jscp_index_console_log
];
