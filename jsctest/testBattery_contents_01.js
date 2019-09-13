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

function performTestRequestAndOutput({ onResponseEnd: onResponseEndCb })
{
  const requestContext =
  {
    dataReceived: []
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

const test_contents_001_jscp_index_empty = Object.assign(testUtils.makeFromBaseTest('Contents; JSCP file; index; empty'),
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
    },
    onReadyForRequests()
    {
      this.testPassed = false;
      performTestRequestAndOutput.call(this,
        {
          onResponseEnd: ({ dataReceived }) =>
          {
            this.testPassed = !dataReceived.length;
          }
        });
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
      this.deleteFile(['sites', 'mysite', 'website', 'index.jscp']);
    }
  }
);

module.exports = [
  test_contents_001_jscp_index_empty
];
