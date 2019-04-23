'use strict';

const testUtils = require('./testBatteryUtils');

const baseSiteConfContents =
{
  'hostName': 'jscausesite1',
  'canUpload': false,
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
};

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

      const jsCauseConfContents =
      {
        'sites':
        [
          {
            'name': 'My Site',
            'port': 3000,
            'rootDirectoryName': 'mysite'
          }
        ],
        'logging': {}
      };
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));

      const siteConfContents = Object.assign({}, baseSiteConfContents,
        {
          'tempWorkDirectory': './workbench_MISSING'
        });
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));

      this.gotAllExpectedLogMsgs = false;
      this.serverDidStart = false;
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

const test_008_002_siteConfAbsoluteTempWorkDirectoryPath = Object.assign(testUtils.makeFromBaseTest('Site config, absolute temp work directory path'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const siteConfContents = Object.assign({}, baseSiteConfContents,
        {
          'tempWorkDirectory': '/workbench'
        });
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));

      this.gotAllExpectedLogMsgs = false;
      this.serverDidStart = false;
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

const test_008_003_siteConfTempWorkDirectoryIsFile = Object.assign(testUtils.makeFromBaseTest('Site config, temp work directory is a file'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const siteConfContents = Object.assign({}, baseSiteConfContents,
        {
          'tempWorkDirectory': './workbench_file'
        });
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
      this.createFile(['sites', 'mysite', 'workbench_file'], '');

      this.gotAllExpectedLogMsgs = false;
      this.serverDidStart = false;
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

const test_008_004_siteConfTempWorkDirectoryIsSymlinkToDir = Object.assign(testUtils.makeFromBaseTest('Site config, temp work directory is a symlink to a directory'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const siteConfContents = Object.assign({}, baseSiteConfContents,
        {
          'tempWorkDirectory': './workbench_dir_s'
        });
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
      this.createSymlink(['.', 'workbench'], [ 'sites', 'mysite', 'workbench_dir_s' ]);

      this.gotAllExpectedLogMsgs = false;
      this.serverDidStart = false;
    },
    expectedLogMessages:
    [
      [ 'info' , 'The following sites were set up successfully:' ],
      [ 'info' , '\'My Site\'' ],
      [ 'info' , 'Server 0 listening on port 3000' ]
    ],
    expectedLogMessagesPass()
    {
      // We must override this because the default passes the test.
      // In this case, the test must pass if the server starts.
      this.gotAllExpectedLogMsgs = true;
      this.testPassed = !!this.serverDidStart && !!this.gotAllExpectedLogMsgs;
    },
    onServerStarted()
    {
      this.serverDidStart = true;
      this.testPassed = !!this.serverDidStart && !!this.gotAllExpectedLogMsgs;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_008_005_siteConfTempWorkDirectoryIsSymlinkToFile = Object.assign(testUtils.makeFromBaseTest('Site config, temp work directory is a symlink to a file'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const siteConfContents = Object.assign({}, baseSiteConfContents,
        {
          'tempWorkDirectory': './workbench_file_s'
        });
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
      this.createSymlink(['.', 'workbench_file'], [ 'sites', 'mysite', 'workbench_file_s' ]);

      this.gotAllExpectedLogMsgs = false;
      this.serverDidStart = false;
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

const test_008_006_siteConfTempWorkDirectoryIsNonWriteable = Object.assign(testUtils.makeFromBaseTest('Site config, temp work directory is non-writeable'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const siteConfContents = Object.assign({}, baseSiteConfContents, {});
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
      this.chmodFileOrDir(['sites', 'mysite', 'workbench'], 0o444);

      this.gotAllExpectedLogMsgs = false;
      this.serverDidStart = false;
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
    }
  }
);

module.exports = [
  test_008_001_siteConfMissingTempWorkDirectoryInFs,
  test_008_002_siteConfAbsoluteTempWorkDirectoryPath,
  test_008_003_siteConfTempWorkDirectoryIsFile,
  test_008_004_siteConfTempWorkDirectoryIsSymlinkToDir,
  test_008_005_siteConfTempWorkDirectoryIsSymlinkToFile,
  test_008_006_siteConfTempWorkDirectoryIsNonWriteable
];
