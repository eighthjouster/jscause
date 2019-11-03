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

const test_017_001_UserFilesReading_Error4XX_StaticFile_InRootDir = Object.assign(testUtils.makeFromBaseTest('User files; error files; 4xx in root dir'),
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
      
      this.createFile(['sites', 'mysite', 'website', 'error4xx.html'], '');
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
      this.deleteFile(['sites', 'mysite', 'website', 'error4xx.html']);
    }
  }
);

const test_017_002_UserFilesReading_Error4XX_StaticFile_InWrongDir = Object.assign(testUtils.makeFromBaseTest('User files; error files; static 4xx in wrong dir'),
  {
    // only: true,
    onTestBeforeStart()
    {
      this.doCreateDirectoryFromPathList(['sites', 'mysite', 'website', 'someDir']);

      this.createFile(['sites', 'mysite', 'website', 'someDir', 'error4xx.html'], '');
    },
    expectedLogMessages:
    [
      [ 'warning' , 'Site \'My Site\': error4xx.html detected in', 'prefix' ],
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

const test_017_003_UserFilesReading_Error4XX_DynamicFile_InWrongDir = Object.assign(testUtils.makeFromBaseTest('User files; error files; dynamic 4xx in wrong dir'),
  {
    // only: true,
    onTestBeforeStart()
    {
      this.doEmptyTestDirectory(['sites', 'mysite', 'website', 'someDir'], { preserveDirectory: true });

      this.createFile(['sites', 'mysite', 'website', 'someDir', 'error4xx.jscp'], '');
    },
    expectedLogMessages:
    [
      [ 'warning' , 'Site \'My Site\': error4xx.jscp detected in', 'prefix' ],
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

const test_017_004_UserFilesReading_Error4XX_StaticAndDynamicFile_InWrongDir = Object.assign(testUtils.makeFromBaseTest('User files; error files; static and dynamic 4xx in wrong dir'),
  {
    // only: true,
    onTestBeforeStart()
    {
      this.doEmptyTestDirectory(['sites', 'mysite', 'website', 'someDir'], { preserveDirectory: true });

      this.createFile(['sites', 'mysite', 'website', 'someDir', 'error4xx.jscp'], '');
      this.createFile(['sites', 'mysite', 'website', 'someDir', 'error4xx.html'], '');
    },
    expectedLogMessages:
    [
      [ 'warning' , 'Site \'My Site\': error4xx.html detected in', 'prefix' ],
      [ 'warning' , 'Site \'My Site\': error4xx.jscp detected in', 'prefix' ],
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
      this.doEmptyTestDirectory(['sites', 'mysite', 'website', 'someDir'], { preserveDirectory: true });
    }
  }
);

const test_017_005_UserFilesReading_Error4XX_DynamicFile_InRootDir = Object.assign(testUtils.makeFromBaseTest('User files; error files; dynamic 4xx in root dir'),
  {
    // only: true,
    onTestBeforeStart()
    {
      this.createFile(['sites', 'mysite', 'website', 'error4xx.jscp'], '');
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
      this.deleteFile(['sites', 'mysite', 'website', 'error4xx.jscp']);
    }
  }
);

const test_017_006_UserFilesReading_Error4XX_StaticAndDynamicFile_InRootDir = Object.assign(testUtils.makeFromBaseTest('User files; error files; static and dynamic 4xx in root dir'),
  {
    // only: true,
    onTestBeforeStart()
    {
      this.createFile(['sites', 'mysite', 'website', 'error4xx.jscp'], '');
      this.createFile(['sites', 'mysite', 'website', 'error4xx.html'], '');
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
      this.deleteFile(['sites', 'mysite', 'website', 'error4xx.jscp']);
      this.deleteFile(['sites', 'mysite', 'website', 'error4xx.html']);
    }
  }
);

const test_017_007_UserFilesReading_Error5XX_StaticFile_InRootDir = Object.assign(testUtils.makeFromBaseTest('User files; error files; 5xx in root dir'),
  {
    // only: true,
    onTestBeforeStart()
    {
      this.createFile(['sites', 'mysite', 'website', 'error5xx.html'], '');
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
      this.deleteFile(['sites', 'mysite', 'website', 'error5xx.html']);
    }
  }
);

const test_017_008_UserFilesReading_Error5XX_StaticFile_InWrongDir = Object.assign(testUtils.makeFromBaseTest('User files; error files; static 5xx in wrong dir'),
  {
    // only: true,
    onTestBeforeStart()
    {
      this.doEmptyTestDirectory(['sites', 'mysite', 'website', 'someDir'], { preserveDirectory: true });

      this.createFile(['sites', 'mysite', 'website', 'someDir', 'error5xx.html'], '');
    },
    expectedLogMessages:
    [
      [ 'warning' , 'Site \'My Site\': error5xx.html detected in', 'prefix' ],
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

const test_017_009_UserFilesReading_Error5XX_DynamicFile_InWrongDir = Object.assign(testUtils.makeFromBaseTest('User files; error files; dynamic 5xx in wrong dir'),
  {
    // only: true,
    onTestBeforeStart()
    {
      this.doEmptyTestDirectory(['sites', 'mysite', 'website', 'someDir'], { preserveDirectory: true });
      
      this.createFile(['sites', 'mysite', 'website', 'someDir', 'error5xx.jscp'], '');
    },
    expectedLogMessages:
    [
      [ 'warning' , 'Site \'My Site\': error5xx.jscp detected in', 'prefix' ],
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

const test_017_010_UserFilesReading_Error5XX_StaticAndDynamicFile_InWrongDir = Object.assign(testUtils.makeFromBaseTest('User files; error files; static and dynamic 5xx in wrong dir'),
  {
    // only: true,
    onTestBeforeStart()
    {
      this.doEmptyTestDirectory(['sites', 'mysite', 'website', 'someDir'], { preserveDirectory: true });

      this.createFile(['sites', 'mysite', 'website', 'someDir', 'error5xx.jscp'], '');
      this.createFile(['sites', 'mysite', 'website', 'someDir', 'error5xx.html'], '');
    },
    expectedLogMessages:
    [
      [ 'warning' , 'Site \'My Site\': error5xx.html detected in', 'prefix' ],
      [ 'warning' , 'Site \'My Site\': error5xx.jscp detected in', 'prefix' ],
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

const test_017_011_UserFilesReading_Error5XX_DynamicFile_InRootDir = Object.assign(testUtils.makeFromBaseTest('User files; error files; dynamic 5xx in root dir'),
  {
    // only: true,
    onTestBeforeStart()
    {
      this.doEmptyTestDirectory(['sites', 'mysite', 'website', 'someDir'], { preserveDirectory: true });

      this.createFile(['sites', 'mysite', 'website', 'error5xx.jscp'], '');
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
      this.deleteFile(['sites', 'mysite', 'website', 'error5xx.jscp']);
    }
  }
);

const test_017_012_UserFilesReading_Error5XX_StaticAndDynamicFile_InRootDir = Object.assign(testUtils.makeFromBaseTest('User files; error files; static and dynamic 5xx in root dir'),
  {
    // only: true,
    onTestBeforeStart()
    {
      this.doEmptyTestDirectory(['sites', 'mysite', 'website', 'someDir'], { preserveDirectory: true });

      this.createFile(['sites', 'mysite', 'website', 'error5xx.jscp'], '');
      this.createFile(['sites', 'mysite', 'website', 'error5xx.html'], '');
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

module.exports =
[
  test_017_001_UserFilesReading_Error4XX_StaticFile_InRootDir,
  test_017_002_UserFilesReading_Error4XX_StaticFile_InWrongDir,
  test_017_003_UserFilesReading_Error4XX_DynamicFile_InWrongDir,
  test_017_004_UserFilesReading_Error4XX_StaticAndDynamicFile_InWrongDir,
  test_017_005_UserFilesReading_Error4XX_DynamicFile_InRootDir,
  test_017_006_UserFilesReading_Error4XX_StaticAndDynamicFile_InRootDir,
  test_017_007_UserFilesReading_Error5XX_StaticFile_InRootDir,
  test_017_008_UserFilesReading_Error5XX_StaticFile_InWrongDir,
  test_017_009_UserFilesReading_Error5XX_DynamicFile_InWrongDir,
  test_017_010_UserFilesReading_Error5XX_StaticAndDynamicFile_InWrongDir,
  test_017_011_UserFilesReading_Error5XX_DynamicFile_InRootDir,
  test_017_012_UserFilesReading_Error5XX_StaticAndDynamicFile_InRootDir
];
