'use strict';

const testHttp = require('http');

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

const test_015_001_UserFilesReading_MaxFiles_noThresholdPassed = Object.assign(testUtils.makeFromBaseTest('User files; max number of files; no threshold passed.'),
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
      
      this.maxUserFilesOrDirs = 3;
      this.createFile(['sites', 'mysite', 'website', 'file_01'], '');
      this.createFile(['sites', 'mysite', 'website', 'file_02'], '');
      this.createFile(['sites', 'mysite', 'website', 'file_03'], '');
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
    }
  }
);

const test_015_002_UserFilesReading_MaxFiles_thresholdPassed = Object.assign(testUtils.makeFromBaseTest('User files; max number of files; no threshold passed.'),
  {
    // only: true,
    onTestBeforeStart()
    {
      this.doEmptyTestDirectory(['sites', 'mysite', 'website'], { preserveDirectory: true });

      this.maxUserFilesOrDirs = 3;
      this.createFile(['sites', 'mysite', 'website', 'file_01'], '');
      this.createFile(['sites', 'mysite', 'website', 'file_02'], '');
      this.createFile(['sites', 'mysite', 'website', 'file_03'], '');
      this.createFile(['sites', 'mysite', 'website', 'file_04'], '');
    },
    expectedLogMessages:
    [
      [ 'error' , 'Site \'My Site\': Too many files and/or directories (> 3) in directory:' ]
    ],
    onServerStarted()
    {
      this.terminateApplication();
    },
    onBeforeTestEnd()
    {
      this.testPassed = !this.serverDidStart && this.gotAllExpectedLogMsgs;
    }
  }
);

module.exports = [
  test_015_001_UserFilesReading_MaxFiles_noThresholdPassed,
  test_015_002_UserFilesReading_MaxFiles_thresholdPassed
];
