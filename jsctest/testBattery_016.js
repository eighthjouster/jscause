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

const test_016_001_UserFilesReading_UserModules_CompileOk = Object.assign(testUtils.makeFromBaseTest('User files; user modules; compile okay'),
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
      
      this.createFile(['sites', 'mysite', 'website', 'file_01.jscm'], 'const valid_javascript = true;');
    },
    expectedLogMessages:
    [
      [ 'info' , 'Server 0 listening on port 3000' ]
    ],
    onServerStarted()
    {
      this.terminateApplication();
    },
    onBeforeTestEnd()
    {
      this.testPassed = this.serverDidStart && this.gotAllExpectedLogMsgs;
    },
    onTestEnd()
    {
      this.deleteFile(['sites', 'mysite', 'website', 'file_01.jscm']);
    }
  }
);

const test_016_002_UserFilesReading_UserModules_CompileError = Object.assign(testUtils.makeFromBaseTest('User files; user modules; compile error'),
  {
    // only: true,
    onTestBeforeStart()
    {
      this.createFile(['sites', 'mysite', 'website', 'file_01.jscm'], 'const valid_javascript; // false');
    },
    expectedLogMessages:
    [
      [ 'error' , 'Site: Compile error:', 'prefix' ]
    ],
    onServerStarted()
    {
      this.terminateApplication();
    },
    onBeforeTestEnd()
    {
      this.testPassed = !this.serverDidStart && this.gotAllExpectedLogMsgs;
    },
    onTestEnd()
    {
      this.deleteFile(['sites', 'mysite', 'website', 'file_01.jscm']);
    }
  }
);

module.exports =
[
  test_016_001_UserFilesReading_UserModules_CompileOk,
  test_016_002_UserFilesReading_UserModules_CompileError
];
