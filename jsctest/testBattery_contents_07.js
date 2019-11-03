'use strict';

const testUtils = require('./testBatteryUtils');

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

const
  {
    makeFromBaseTest,
    makeTestEndBoilerplate,
    processResponse,
    initConsoleLogCapture,
    areFlatArraysEqual
  } = testUtils;

const test_contents_001_jscp_index_large_response_slow = Object.assign(makeFromBaseTest('Contents; JSCP file; index; large; slow'),
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
      
      initConsoleLogCapture();
      const longArray = [];
      const chunkTriggeringLength = 70000;
      const chunkTriggeringLengthPlusNewLines = chunkTriggeringLength - 6; // 6 represents the newline characters at the beginning and at the end of the response.
      this.tempTestData = { chunkTriggeringLength };
      for (let i = 0; i < chunkTriggeringLengthPlusNewLines; i++)
      {
        longArray.push(`${i % 10}`);
      }

      this.createFile(['sites', 'mysite', 'website', 'index.jscp'],
        [
          '<html/>',
          longArray.join('')
        ].join('\n'));
      this.isRequestsTest = true;
    },
    onReadyForRequests()
    {
      processResponse(this, makeBaseRequest(), ({ dataReceived }) =>
      {
        const { chunkTriggeringLength } = this.tempTestData;
        this.testPassed = (dataReceived.length > 1) && (Buffer.concat(dataReceived).byteLength === chunkTriggeringLength);
      });
    }
  }
);

module.exports =
[
  test_contents_001_jscp_index_large_response_slow
];
