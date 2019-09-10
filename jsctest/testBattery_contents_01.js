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
      
      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], '<html />p');
    },
    onBeforeTestEnd()
    {
      console.log('started!');
      this.pendingCallbackTrackingEnabled = false; // Required so signalTestEnd() doesn't get triggered twice.
      const req = http.request(
        {
          hostname: 'jscausesite1',
          port: 3000,
          path: '/',
          method: 'GET'
        },
        (res) =>
        {
          console.log('AHA');
          res.on('data', (data) =>
          {
            console.log('data?');
            console.log(data.toString());
          });

          res.on('end', () =>
          {
            console.log('end?');
            this.continueTesting();
          });

        }
      );

      req.on('error', (error) =>
      {
        console.log('error?');
        console.log(error);
      });
      req.end();
      //setTimeout(this.waitForDoneSignal(), 3000);
      
      this.waitForContinueTestingCall = true;

//      this.testPassed = this.serverDidStart && this.gotAllExpectedLogMsgs;
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
