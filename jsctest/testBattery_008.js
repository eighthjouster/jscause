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
      'canUpload': true,
      'maxPayloadSizeBytes': 0,
      'jscpExtensionRequired': 'optional',
      'httpPoweredByHeader': 'include',
      'httpsCertFile': 'jscause-cert.pem',
      'httpsKeyFile': 'jscause-key.pem',
      'tempWorkDirectory': './workbench',
      'mimeTypes': {},
      'logging':
      {
        'directoryName': './localLogs'
      }
    }, extra
  );

const test_008_001_siteConfMissingTempWorkDirectoryInFs = Object.assign(testUtils.makeFromBaseTest('Site config, missing temp work directory path in file system'),
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

      const siteConfContents = makeBaseSiteConfContents(
        {
          'tempWorkDirectory': './workbench_MISSING'
        }
      );
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
    },
    expectedLogMessages:
    [
      [ 'error' , 'Cannot find directory:', 'prefix' ],
      [ 'error', 'Site \'My Site\' not started.' ],
      [ 'error', 'Server not started.  No sites are running.' ]
    ],
    onServerStarted()
    {
      this.testPassed = false;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_008_002_siteConfMissingTempWorkDirectoryInFs_pt2 = Object.assign(testUtils.makeFromBaseTest('Site config, missing temp work directory path in file system, pt. 2: canUpload is false'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const siteConfContents = makeBaseSiteConfContents(
        {
          'canUpload': false,
          'tempWorkDirectory': './workbench_MISSING'
        }
      );
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
    },
    onServerStarted()
    {
      this.testPassed = true;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_008_003_siteConfAbsoluteTempWorkDirectoryPath = Object.assign(testUtils.makeFromBaseTest('Site config, absolute temp work directory path'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const siteConfContents = makeBaseSiteConfContents(
        {
          'tempWorkDirectory': '/workbench'
        }
      );
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
    },
    expectedLogMessages:
    [
      [ 'error' , 'Temporary work directory path /workbench must be specified as relative to \'My Site\'.' ],
      [ 'error', 'Site \'My Site\' not started.' ],
      [ 'error', 'Server not started.  No sites are running.' ]
    ],
    onServerStarted()
    {
      this.testPassed = false;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_008_004_siteConfTempWorkDirectoryIsFile = Object.assign(testUtils.makeFromBaseTest('Site config, temp work directory is a file'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const siteConfContents = makeBaseSiteConfContents(
        {
          'tempWorkDirectory': './workbench_file'
        }
      );
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
      this.createFile(['sites', 'mysite', 'workbench_file'], '');
    },
    expectedLogMessages:
    [
      [ 'error' , 'workbench_file is not a directory.', 'suffix' ],
      [ 'error', 'Site \'My Site\' not started.' ],
      [ 'error', 'Server not started.  No sites are running.' ]
    ],
    onServerStarted()
    {
      this.testPassed = false;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_008_005_siteConfTempWorkDirectoryIsSymlinkToDir = Object.assign(testUtils.makeFromBaseTest('Site config, temp work directory is a symlink to a directory'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const siteConfContents = makeBaseSiteConfContents(
        {
          'tempWorkDirectory': './workbench_dir_s'
        }
      );
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
      this.createSymlink(['.', 'workbench'], [ 'sites', 'mysite', 'workbench_dir_s' ]);
    },
    expectedLogMessages:
    [
      [ 'info' , 'The following sites were set up successfully:' ],
      [ 'info' , '\'My Site\'' ],
      [ 'info' , 'Server 0 listening on port 3000' ]
    ],
    onServerStarted()
    {
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    },
    onBeforeTestEnd()
    {
      this.testPassed = this.serverDidStart && this.gotAllExpectedLogMsgs;
    }
  }
);

const test_008_006_siteConfTempWorkDirectoryIsCircularSymlink = Object.assign(testUtils.makeFromBaseTest('Site config, temp work directory is a circular symlink'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const siteConfContents = makeBaseSiteConfContents(
        {
          'tempWorkDirectory': './workbench_dir_s_2'
        }
      );
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
      
      this.createFile([ 'sites', 'mysite', 'workbench_dir_s_1' ], '');
      this.createSymlink([ '.', 'workbench_dir_s_1' ], [ 'sites', 'mysite', 'workbench_dir_s_2' ]);
      this.deleteFile([ 'sites', 'mysite', 'workbench_dir_s_1' ]);
      this.createSymlink([ '.', 'workbench_dir_s_2' ], [ 'sites', 'mysite', 'workbench_dir_s_1' ]);
    },
    expectedLogMessages:
    [
      [ 'error' , 'Cannot find directory:', 'prefix' ]
    ],
    onServerStarted()
    {
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    },
    onBeforeTestEnd()
    {
      this.testPassed = !this.serverDidStart && this.gotAllExpectedLogMsgs;
    }
  }
);

const test_008_007_siteConfTempWorkDirectoryIsSymlinkToFile = Object.assign(testUtils.makeFromBaseTest('Site config, temp work directory is a symlink to a file'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const siteConfContents = makeBaseSiteConfContents(
        {
          'tempWorkDirectory': './workbench_file_s'
        }
      );
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
      this.createSymlink(['.', 'workbench_file'], [ 'sites', 'mysite', 'workbench_file_s' ]);
    },
    expectedLogMessages:
    [
      [ 'error' , 'workbench_file_s is not a directory.', 'suffix' ],
      [ 'error', 'Site \'My Site\' not started.' ],
      [ 'error', 'Server not started.  No sites are running.' ]
    ],
    onServerStarted()
    {
      this.testPassed = false;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_008_008_siteConfTempWorkDirectoryIsNonWriteable = Object.assign(testUtils.makeFromBaseTest('Site config, temp work directory is non-writeable'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const siteConfContents = makeBaseSiteConfContents();
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
      this.chmodFileOrDir(['sites', 'mysite', 'workbench'], 0o444);
    },
    expectedLogMessages:
    [
      [ 'error' , 'workbench is not writeable.', 'suffix' ],
      [ 'error', 'Site \'My Site\' not started.' ],
      [ 'error', 'Server not started.  No sites are running.' ]
    ],
    onServerStarted()
    {
      this.testPassed = false;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    },
    onTestEnd()
    {
      this.chmodFileOrDir(['sites', 'mysite', 'workbench'], 0o755);
    }
  }
);

const test_008_009_siteConfAbsoluteSiteRootDirectoryPath = Object.assign(testUtils.makeFromBaseTest('Site config, absolute site root directory path'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const jsCauseConfContents = makeBaseJsCauseConfContents();
      jsCauseConfContents.sites[0].rootDirectoryName = '/mysite';
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));
    },
    expectedLogMessages:
    [
      [ 'error' , 'Site configuration: \'My Site\': Site root directory name /mysite cannot be specified as an absolute path.  Directory name expected.' ],
      [ 'error', 'Site \'My Site\' not started.' ],
      [ 'error', 'Server not started.  No sites are running.' ]
    ],
    onServerStarted()
    {
      this.testPassed = false;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_008_010_siteConfSiteRootDirectoryIsFile = Object.assign(testUtils.makeFromBaseTest('Site config, site root directory name is file'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const jsCauseConfContents = makeBaseJsCauseConfContents();
      jsCauseConfContents.sites[0].rootDirectoryName = 'mysite_file';
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));

      this.createFile(['sites', 'mysite_file'], '');
    },
    expectedLogMessages:
    [
      [ 'error' , 'jsctest/testrootdir/sites/mysite_file is not a directory.', 'suffix' ],
      [ 'error', 'Site \'My Site\' not started.' ],
      [ 'error', 'Server not started.  No sites are running.' ]
    ],
    onServerStarted()
    {
      this.testPassed = false;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_008_011_siteConfSiteRootDirectoryIsSymlinkToDir = Object.assign(testUtils.makeFromBaseTest('Site config, site root directory name is a symlink to a directory'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const jsCauseConfContents = makeBaseJsCauseConfContents();
      jsCauseConfContents.sites[0].rootDirectoryName = 'mysite_dir_s';
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));

      this.createSymlink(['.', 'mysite'], [ 'sites', 'mysite_dir_s' ]);
    },
    expectedLogMessages:
    [
      [ 'info' , 'The following sites were set up successfully:' ],
      [ 'info' , '\'My Site\'' ],
      [ 'info' , 'Server 0 listening on port 3000' ]
    ],
    onServerStarted()
    {
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    },
    onBeforeTestEnd()
    {
      this.testPassed = this.serverDidStart && this.gotAllExpectedLogMsgs;
    }
  }
);

const test_008_012_siteConfSiteRootDirectoryIsCircularSymlink = Object.assign(testUtils.makeFromBaseTest('Site config, site root directory name is a circular symlink'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const jsCauseConfContents = makeBaseJsCauseConfContents();
      jsCauseConfContents.sites[0].rootDirectoryName = 'mysite_dir_s_1';
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));

      this.createFile([ 'sites', 'mysite_dir_s_1' ], '');
      this.createSymlink([ '.', 'mysite_dir_s_1' ], [ 'sites', 'mysite_dir_s_2' ]);
      this.deleteFile([ 'sites', 'mysite_dir_s_1' ]);
      this.createSymlink([ '.', 'mysite_dir_s_2' ], [ 'sites', 'mysite_dir_s_1' ]);
    },
    expectedLogMessages:
    [
      [ 'error' , 'Cannot find directory:', 'prefix' ]
    ],
    onServerStarted()
    {
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    },
    onBeforeTestEnd()
    {
      this.testPassed = !this.serverDidStart && this.gotAllExpectedLogMsgs;
    }
  }
);

const test_008_013_siteConfSiteRootDirectoryIsSymlinkToFile = Object.assign(testUtils.makeFromBaseTest('Site config, site root directory name is a symlink to a file'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const jsCauseConfContents = makeBaseJsCauseConfContents();
      jsCauseConfContents.sites[0].rootDirectoryName = 'mysite_file_s';
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));

      this.createSymlink(['.', 'mysite_file'], [ 'sites', 'mysite_file_s' ]);
    },
    expectedLogMessages:
    [
      [ 'error' , 'mysite_file_s is not a directory.', 'suffix' ],
      [ 'error', 'Site \'My Site\' not started.' ],
      [ 'error', 'Server not started.  No sites are running.' ]
    ],
    onServerStarted()
    {
      this.testPassed = false;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_008_014_siteConfSiteRootDirectoryIsNonWriteable = Object.assign(testUtils.makeFromBaseTest('Site config, site root directory is non-writeable'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const jsCauseConfContents = makeBaseJsCauseConfContents();
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));

      this.chmodFileOrDir(['sites', 'mysite'], 0o444);
    },
    expectedLogMessages:
    [
      [ 'error' , 'jsctest/testrootdir/sites/mysite is not writeable.' ],
      [ 'error', 'Site \'My Site\' not started.' ],
      [ 'error', 'Server not started.  No sites are running.' ]
    ],
    onServerStarted()
    {
      this.testPassed = false;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    },
    onTestEnd()
    {
      this.chmodFileOrDir(['sites', 'mysite'], 0o755);
    }
  }
);

const test_008_015_serverLogDirectoryIsFile = Object.assign(testUtils.makeFromBaseTest('Server log directory is file'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const jsCauseConfContents = makeBaseJsCauseConfContents();
      jsCauseConfContents.logging =
      {
        general:
        {
          'directoryName': 'logs_file'
        }
      };
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));

      this.createFile(['.', 'logs_file'], '');
    },
    expectedLogMessages:
    [
      [ 'error' , 'logs_file is not a directory.', 'suffix' ],
      [ 'error', 'Server not started.  No sites are running.' ]
    ],
    onServerStarted()
    {
      this.testPassed = false;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_008_016_serverLogDirectoryIsSymlinkToDir = Object.assign(testUtils.makeFromBaseTest('Server log directory is a symlink to a directory'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const jsCauseConfContents = makeBaseJsCauseConfContents();
      jsCauseConfContents.logging =
      {
        general:
        {
          'directoryName': 'logs_dir_s'
        }
      };
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));

      this.createSymlink(['.', 'logs'], [ '.', 'logs_dir_s' ]);
    },
    expectedLogMessages:
    [
      [ 'info' , 'The following sites were set up successfully:' ],
      [ 'info' , '\'My Site\'' ],
      [ 'info' , 'Server 0 listening on port 3000' ]
    ],
    onServerStarted()
    {
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    },
    onBeforeTestEnd()
    {
      this.testPassed = this.serverDidStart && this.gotAllExpectedLogMsgs;
    }
  }
);

const test_008_017_serverLogDirectoryIsCircularSymlink = Object.assign(testUtils.makeFromBaseTest('Server log directory is a circular symlink'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const jsCauseConfContents = makeBaseJsCauseConfContents();
      jsCauseConfContents.logging =
      {
        general:
        {
          'directoryName': 'logs_dir_s_1'
        }
      };
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));

      this.createFile([ '.', 'logs_dir_s_1' ], '');
      this.createSymlink([ '.', 'logs_dir_s_1' ], [ '.', 'logs_dir_s_2' ]);
      this.deleteFile([ '.', 'logs_dir_s_1' ]);
      this.createSymlink([ '.', 'logs_dir_s_2' ], [ '.', 'logs_dir_s_1' ]);
    },
    expectedLogMessages:
    [
      [ 'error' , 'Server configuration: Logging: directoryName: Cannot find directory:', 'prefix' ]
    ],
    onServerStarted()
    {
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    },
    onBeforeTestEnd()
    {
      this.testPassed = !this.serverDidStart && this.gotAllExpectedLogMsgs;
    }
  }
);

const test_008_018_serverLogDirectoryIsSymlinkToFile = Object.assign(testUtils.makeFromBaseTest('Server log directory is a symlink to a file'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const jsCauseConfContents = makeBaseJsCauseConfContents();
      jsCauseConfContents.logging =
      {
        general:
        {
          'directoryName': 'logs_file_s'
        }
      };
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));

      this.createSymlink(['.', 'logs_file'], [ '.', 'logs_file_s' ]);
    },
    expectedLogMessages:
    [
      [ 'error' , 'logs_file_s is not a directory.', 'suffix' ],
      [ 'error', 'Server not started.  No sites are running.' ]
    ],
    onServerStarted()
    {
      this.testPassed = false;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_008_019_serverLogDirectoryIsNonWriteable = Object.assign(testUtils.makeFromBaseTest('Server log directory is non-writeable'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const jsCauseConfContents = makeBaseJsCauseConfContents();
      jsCauseConfContents.logging =
      {
        general:
        {
          'directoryName': 'logs'
        }
      };
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));

      this.chmodFileOrDir(['.', 'logs'], 0o444);
    },
    expectedLogMessages:
    [
      [ 'error' , 'jsctest/testrootdir/logs is not writeable.', 'suffix' ],
      [ 'error', 'Server not started.  No sites are running.' ]
    ],
    onServerStarted()
    {
      this.testPassed = false;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    },
    onTestEnd()
    {
      this.chmodFileOrDir(['.', 'logs'], 0o755);
    }
  }
);

const test_008_020_siteConfLogDirectoryIsFile = Object.assign(testUtils.makeFromBaseTest('Site config, site root directory name is file'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const jsCauseConfContents = makeBaseJsCauseConfContents();
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));

      const siteConfContents = makeBaseSiteConfContents(
        {
          logging:
          {
            'directoryName': './localLogs_file'
          }
        }
      );
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
      this.createFile(['sites', 'mysite', 'localLogs_file'], '');
    },
    expectedLogMessages:
    [
      [ 'error' , 'jsctest/testrootdir/sites/mysite/localLogs_file is not a directory.', 'suffix' ],
      [ 'error', 'Site \'My Site\' not started.' ],
      [ 'error', 'Server not started.  No sites are running.' ]
    ],
    onServerStarted()
    {
      this.testPassed = false;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_008_021_siteConfLogDirectoryIsSymlinkToDir = Object.assign(testUtils.makeFromBaseTest('Site config, site root directory name is a symlink to a directory'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const jsCauseConfContents = makeBaseJsCauseConfContents();
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));

      const siteConfContents = makeBaseSiteConfContents(
        {
          logging:
          {
            'directoryName': './localLogs_dir_s'
          }
        }
      );
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
      this.createSymlink(['.', 'localLogs'], [ 'sites', 'mysite', 'localLogs_dir_s' ]);
    },
    expectedLogMessages:
    [
      [ 'info' , 'The following sites were set up successfully:' ],
      [ 'info' , '\'My Site\'' ],
      [ 'info' , 'Server 0 listening on port 3000' ]
    ],
    onServerStarted()
    {
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    },
    onBeforeTestEnd()
    {
      this.testPassed = this.serverDidStart && this.gotAllExpectedLogMsgs;
    }
  }
);

const test_008_022_siteConfLogDirectoryIsCircularSymlink = Object.assign(testUtils.makeFromBaseTest('Site config, site root directory name is a circular symlink'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const jsCauseConfContents = makeBaseJsCauseConfContents();
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));

      const siteConfContents = makeBaseSiteConfContents(
        {
          logging:
          {
            'directoryName': './localLogs_dir_s_2'
          }
        }
      );
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
      
      this.createFile([ 'sites', 'mysite', 'localLogs_dir_s_1' ], '');
      this.createSymlink([ '.', 'localLogs_dir_s_1' ], [ 'sites', 'mysite', 'localLogs_dir_s_2' ]);
      this.deleteFile([ 'sites', 'mysite', 'localLogs_dir_s_1' ]);
      this.createSymlink([ '.', 'localLogs_dir_s_2' ], [ 'sites', 'mysite', 'localLogs_dir_s_1' ]);
    },
    expectedLogMessages:
    [
      [ 'error' , 'Site configuration: \'My Site\' logging: directoryName: Cannot find directory:', 'prefix' ]
    ],
    onServerStarted()
    {
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    },
    onBeforeTestEnd()
    {
      this.testPassed = !this.serverDidStart && this.gotAllExpectedLogMsgs;
    }
  }
);

const test_008_023_siteConfLogDirectoryIsSymlinkToFile = Object.assign(testUtils.makeFromBaseTest('Site config, site root directory name is a symlink to a file'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const jsCauseConfContents = makeBaseJsCauseConfContents();
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));

      const siteConfContents = makeBaseSiteConfContents(
        {
          logging:
          {
            'directoryName': './localLogs_file_s'
          }
        }
      );
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
      this.createSymlink(['.', 'localLogs_file'], [ 'sites', 'mysite', 'localLogs_file_s' ]);
    },
    expectedLogMessages:
    [
      [ 'error' , 'localLogs_file_s is not a directory.', 'suffix' ],
      [ 'error', 'Site \'My Site\' not started.' ],
      [ 'error', 'Server not started.  No sites are running.' ]
    ],
    onServerStarted()
    {
      this.testPassed = false;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_008_024_siteConfLogDirectoryIsNonWriteable = Object.assign(testUtils.makeFromBaseTest('Site config, site root directory is non-writeable'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const jsCauseConfContents = makeBaseJsCauseConfContents();
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));

      const siteConfContents = makeBaseSiteConfContents(
        {
          logging:
          {
            'directoryName': './localLogs'
          }
        }
      );
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
      this.chmodFileOrDir(['sites', 'mysite', 'localLogs'], 0o444);
    },
    expectedLogMessages:
    [
      [ 'error' , 'jsctest/testrootdir/sites/mysite/localLogs is not writeable.', 'suffix' ],
      [ 'error', 'Site \'My Site\' not started.' ],
      [ 'error', 'Server not started.  No sites are running.' ]
    ],
    onServerStarted()
    {
      this.testPassed = false;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    },
    onTestEnd()
    {
      this.chmodFileOrDir(['sites', 'mysite', 'localLogs'], 0o755);
    }
  }
);

module.exports = [
  test_008_001_siteConfMissingTempWorkDirectoryInFs,
  test_008_002_siteConfMissingTempWorkDirectoryInFs_pt2,
  test_008_003_siteConfAbsoluteTempWorkDirectoryPath,
  test_008_004_siteConfTempWorkDirectoryIsFile,
  test_008_005_siteConfTempWorkDirectoryIsSymlinkToDir,
  test_008_006_siteConfTempWorkDirectoryIsCircularSymlink,
  test_008_007_siteConfTempWorkDirectoryIsSymlinkToFile,
  test_008_008_siteConfTempWorkDirectoryIsNonWriteable,
  test_008_009_siteConfAbsoluteSiteRootDirectoryPath,
  test_008_010_siteConfSiteRootDirectoryIsFile,
  test_008_011_siteConfSiteRootDirectoryIsSymlinkToDir,
  test_008_012_siteConfSiteRootDirectoryIsCircularSymlink,
  test_008_013_siteConfSiteRootDirectoryIsSymlinkToFile,
  test_008_014_siteConfSiteRootDirectoryIsNonWriteable,
  test_008_015_serverLogDirectoryIsFile,
  test_008_016_serverLogDirectoryIsSymlinkToDir,
  test_008_017_serverLogDirectoryIsCircularSymlink,
  test_008_018_serverLogDirectoryIsSymlinkToFile,
  test_008_019_serverLogDirectoryIsNonWriteable,
  test_008_020_siteConfLogDirectoryIsFile,
  test_008_021_siteConfLogDirectoryIsSymlinkToDir,
  test_008_022_siteConfLogDirectoryIsCircularSymlink,
  test_008_023_siteConfLogDirectoryIsSymlinkToFile,
  test_008_024_siteConfLogDirectoryIsNonWriteable
];
