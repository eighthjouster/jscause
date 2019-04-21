'use strict';

const testUtils = require('./testBatteryUtils');

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

      const siteConfContents =
      {
        'hostName': 'jscausesite1',
        'canUpload': false,
        'maxPayloadSizeBytes': 0,
        'jscpExtensionRequired': 'optional',
        'httpPoweredByHeader': 'include',
        'httpsCertFile': 'jscause-cert.pem',
        'httpsKeyFile': 'jscause-key.pem',
        'mimeTypes': {},
        'logging':
        {
          'directoryName': './localLogs'
        },
        'tempWorkDirectory': './workbench_MISSING',
      };
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
      const siteConfContents =
      {
        'hostName': 'jscausesite1',
        'canUpload': false,
        'maxPayloadSizeBytes': 0,
        'jscpExtensionRequired': 'optional',
        'httpPoweredByHeader': 'include',
        'httpsCertFile': 'jscause-cert.pem',
        'httpsKeyFile': 'jscause-key.pem',
        'mimeTypes': {},
        'logging':
        {
          'directoryName': './localLogs'
        },
        'tempWorkDirectory': '/workbench',
      };
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

module.exports = [
  test_008_001_siteConfMissingTempWorkDirectoryInFs,
  test_008_002_siteConfAbsoluteTempWorkDirectoryPath
];
