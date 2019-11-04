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
    initConsoleLogCapture
  } = testUtils;

/* This is test will always pass because, by the time the test request delays the transfer,
   NodeJS (and thus JSCause) has already sent the response to be handled by the OS.
   We can probably make this code worthy if we ever implement res.setTimeout().
*/
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
      const chunkTriggeringLength = 150000;
      const chunkTriggeringLengthMinusNewLines = chunkTriggeringLength - 6; // 6 represents the newline+space characters at the beginning and at the end of the response.

      for (let i = 0; i < chunkTriggeringLengthMinusNewLines; i++)
      {
        longArray.push(`${Math.floor(Math.random() * 10)}`);
      }

      const largeContent = longArray.join('');

      this.tempTestData = { chunkTriggeringLength, largeContent };
      this.createFile(['sites', 'mysite', 'website', 'index.jscp'],
        [
          '<html/>',
          largeContent
        ].join('\n'));
      this.isRequestsTest = true;
    },
    onReadyForRequests()
    {
      const resReceiveHandler = (res) =>
      {
        res.pause();
        setTimeout(() => res.read(), 1000);
      };

      processResponse(this, makeBaseRequest(), ({ dataReceived }) =>
      {
        const { chunkTriggeringLength, largeContent } = this.tempTestData;
        const bufferDataReceived = Buffer.concat(dataReceived);

        const crAndSpace = Buffer.from([32, 10, 32]);
        const largeContentAsMustBeReceived = Buffer.concat([crAndSpace, Buffer.from(largeContent), crAndSpace], chunkTriggeringLength);
        const dataSetsAreEqual = (Buffer.compare(bufferDataReceived, largeContentAsMustBeReceived) === 0);

        this.testPassed = (dataReceived.length > 1) && // There have to be at least 2 chunks.
          (bufferDataReceived.byteLength === chunkTriggeringLength) &&
          dataSetsAreEqual;
      }, { resReceiveHandler });
    }
  }
);

module.exports =
[
  test_contents_001_jscp_index_large_response_slow
];
