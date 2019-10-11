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

const test_015_002_UserFilesReading_MaxFiles_thresholdPassed = Object.assign(testUtils.makeFromBaseTest('User files; max number of files; threshold passed.'),
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

const test_015_003_UserFilesReading_MaxFiles_withModules_thresholdPassed = Object.assign(testUtils.makeFromBaseTest('User files; max number of files, including user modules; threshold passed.'),
  {
    // only: true,
    onTestBeforeStart()
    {
      this.doEmptyTestDirectory(['sites', 'mysite', 'website'], { preserveDirectory: true });

      this.maxUserFilesOrDirs = 3;
      this.createFile(['sites', 'mysite', 'website', 'file_01'], '');
      this.createFile(['sites', 'mysite', 'website', 'file_02'], '');
      this.createFile(['sites', 'mysite', 'website', 'file_03'], '');
      this.createFile(['sites', 'mysite', 'website', 'file_04.jscm'], '');
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

const test_015_004_UserFilesReading_MaxDirs_nothresholdPassed = Object.assign(testUtils.makeFromBaseTest('User files; max number of directories; no threshold passed.'),
  {
    // only: true,
    onTestBeforeStart()
    {
      this.doEmptyTestDirectory(['sites', 'mysite', 'website'], { preserveDirectory: true });

      this.maxUserFilesOrDirs = 3;
      this.doCreateDirectoryFromPathList(['sites', 'mysite', 'website', 'dir_01']);
      this.doCreateDirectoryFromPathList(['sites', 'mysite', 'website', 'dir_02']);
      this.doCreateDirectoryFromPathList(['sites', 'mysite', 'website', 'dir_03']);
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

const test_015_005_UserFilesReading_MaxDirs_thresholdPassed = Object.assign(testUtils.makeFromBaseTest('User files; max number of directories; threshold passed.'),
  {
    // only: true,
    onTestBeforeStart()
    {
      this.doEmptyTestDirectory(['sites', 'mysite', 'website'], { preserveDirectory: true });

      this.maxUserFilesOrDirs = 3;
      this.doCreateDirectoryFromPathList(['sites', 'mysite', 'website', 'dir_01']);
      this.doCreateDirectoryFromPathList(['sites', 'mysite', 'website', 'dir_02']);
      this.doCreateDirectoryFromPathList(['sites', 'mysite', 'website', 'dir_03']);
      this.doCreateDirectoryFromPathList(['sites', 'mysite', 'website', 'dir_04']);
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

const test_015_006_UserFilesReading_MaxDirsAndFiles_nothresholdPassed = Object.assign(testUtils.makeFromBaseTest('User files; max number of directories and files; no threshold passed.'),
  {
    // only: true,
    onTestBeforeStart()
    {
      this.doEmptyTestDirectory(['sites', 'mysite', 'website'], { preserveDirectory: true });

      this.maxUserFilesOrDirs = 3;
      this.doCreateDirectoryFromPathList(['sites', 'mysite', 'website', 'dir_01']);
      this.createFile(['sites', 'mysite', 'website', 'file_02'], '');
      this.doCreateDirectoryFromPathList(['sites', 'mysite', 'website', 'dir_03']);
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
      console.log(this.serverDidStart);//__RP
      console.log(this.gotAllExpectedLogMsgs);//__RP
      this.testPassed = this.serverDidStart && this.gotAllExpectedLogMsgs;
    }
  }
);

const test_015_007_UserFilesReading_MaxDirsAndFiles_thresholdPassed = Object.assign(testUtils.makeFromBaseTest('User files; max number of directories and files; threshold passed.'),
  {
    // only: true,
    onTestBeforeStart()
    {
      this.doEmptyTestDirectory(['sites', 'mysite', 'website'], { preserveDirectory: true });

      this.maxUserFilesOrDirs = 3;
      this.doCreateDirectoryFromPathList(['sites', 'mysite', 'website', 'dir_01']);
      this.createFile(['sites', 'mysite', 'website', 'file_02'], '');
      this.createFile(['sites', 'mysite', 'website', 'file_03'], '');
      this.doCreateDirectoryFromPathList(['sites', 'mysite', 'website', 'dir_04']);
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

const test_015_008_UserFilesReading_MaxDirsAndFiles_nesting_noThresholdPassed = Object.assign(testUtils.makeFromBaseTest('User files; max number of directories and files; nesting; no threshold passed.'),
  {
    // only: true,
    onTestBeforeStart()
    {
      this.doEmptyTestDirectory(['sites', 'mysite', 'website'], { preserveDirectory: true });

      this.maxUserFilesOrDirs = 5;
      this.doCreateDirectoryFromPathList(['sites', 'mysite', 'website', 'dir_01']);
      this.createFile(['sites', 'mysite', 'website', 'dir_01', 'file_02'], '');
      this.doCreateDirectoryFromPathList(['sites', 'mysite', 'website', 'dir_03']);
      this.doCreateDirectoryFromPathList(['sites', 'mysite', 'website', 'dir_03', 'dir_04']);
      this.createFile(['sites', 'mysite', 'website', 'dir_03', 'dir_04', 'file_05'], '');
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

const test_015_009_UserFilesReading_MaxDirsAndFiles_nesting_thresholdPassed = Object.assign(testUtils.makeFromBaseTest('User files; max number of directories and files; nesting; threshold passed.'),
  {
    // only: true,
    onTestBeforeStart()
    {
      this.doEmptyTestDirectory(['sites', 'mysite', 'website'], { preserveDirectory: true });

      this.maxUserFilesOrDirs = 5;
      this.doCreateDirectoryFromPathList(['sites', 'mysite', 'website', 'dir_01']);
      this.createFile(['sites', 'mysite', 'website', 'dir_01', 'file_02'], '');
      this.doCreateDirectoryFromPathList(['sites', 'mysite', 'website', 'dir_03']);
      this.doCreateDirectoryFromPathList(['sites', 'mysite', 'website', 'dir_03', 'dir_04']);
      this.createFile(['sites', 'mysite', 'website', 'dir_03', 'dir_04', 'file_05'], '');
      this.createFile(['sites', 'mysite', 'website', 'file_06'], '');
    },
    expectedLogMessages:
    [
      [ 'error' , 'Site \'My Site\': Too many files and/or directories (> 5) in directory:' ]
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

const test_015_010_UserFilesReading_MaxDirsAndFiles_symlinks_noThresholdPassed = Object.assign(testUtils.makeFromBaseTest('User files; max number of directories and files; symlinks; no threshold passed.'),
  {
    // only: true,
    onTestBeforeStart()
    {
      this.doEmptyTestDirectory(['sites', 'mysite', 'website'], { preserveDirectory: true });

      this.maxUserFilesOrDirs = 3;
      this.createFile(['sites', 'mysite', 'website', 'file_01'], '');
      this.createSymlink([ '.', 'file_01' ], [ 'sites', 'mysite', 'website', 'file_s_02' ]);
      this.createSymlink([ '.', 'file_s_02' ], [ 'sites', 'mysite', 'website', 'file_s_03' ]);
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

const test_015_011_UserFilesReading_MaxDirsAndFiles_symlinks_thresholdPassed = Object.assign(testUtils.makeFromBaseTest('User files; max number of directories and files; symlinks; threshold passed.'),
  {
    // only: true,
    onTestBeforeStart()
    {
      this.doEmptyTestDirectory(['sites', 'mysite', 'website'], { preserveDirectory: true });

      this.maxUserFilesOrDirs = 3;
      this.createFile(['sites', 'mysite', 'website', 'file_01'], '');
      this.createSymlink([ '.', 'file_01' ], [ 'sites', 'mysite', 'website', 'file_s_02' ]);
      this.createSymlink([ '.', 'file_s_02' ], [ 'sites', 'mysite', 'website', 'file_s_03' ]);
      this.createSymlink([ '.', 'file_s_03' ], [ 'sites', 'mysite', 'website', 'file_s_04' ]);
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

const test_015_012_UserFilesReading_MaxDirsAndFiles_circularSymlinks = Object.assign(testUtils.makeFromBaseTest('User files; max number of directories and files; circular symlinks.'),
  {
    // only: true,
    onTestBeforeStart()
    {
      this.doEmptyTestDirectory(['sites', 'mysite', 'website'], { preserveDirectory: true });

      this.createFile(['sites', 'mysite', 'website', 'file_s_01'], '');
      this.createSymlink([ '.', 'file_s_01' ], [ 'sites', 'mysite', 'website', 'file_s_02' ]);
      this.deleteFile([ 'sites', 'mysite', 'website', 'file_s_01' ]);
      this.createSymlink([ '.', 'file_s_02' ], [ 'sites', 'mysite', 'website', 'file_s_01' ]);
    },
    expectedLogMessages:
    [
      [ 'error' , 'Site \'My Site\': Circular symbolic link reference:' ]
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
  // test_015_002_UserFilesReading_MaxFiles_thresholdPassed,
  // test_015_003_UserFilesReading_MaxFiles_withModules_thresholdPassed,
  test_015_004_UserFilesReading_MaxDirs_nothresholdPassed,//__RP
  // test_015_005_UserFilesReading_MaxDirs_thresholdPassed,
  // test_015_006_UserFilesReading_MaxDirsAndFiles_nothresholdPassed,//__RP
  // test_015_007_UserFilesReading_MaxDirsAndFiles_thresholdPassed,
  // test_015_008_UserFilesReading_MaxDirsAndFiles_nesting_noThresholdPassed,//__RP
  // test_015_009_UserFilesReading_MaxDirsAndFiles_nesting_thresholdPassed,
  // test_015_010_UserFilesReading_MaxDirsAndFiles_symlinks_noThresholdPassed,//__RP
  // test_015_011_UserFilesReading_MaxDirsAndFiles_symlinks_thresholdPassed,
  // test_015_012_UserFilesReading_MaxDirsAndFiles_circularSymlinks
];
