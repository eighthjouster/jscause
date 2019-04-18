'use strict';

const testUtils = require('./testBatteryUtils');

const test_005_001_configFileInvalidEnableHTTPS = Object.assign(testUtils.makeFromBaseTest('Config file with invalid enableHTTPS'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);
      this.doEmptyTestDirectory();

      const jsCauseConfContents =
      {
        'sites':
        [
          {
            'name': 'My Site',
            'port': 3000,
            'rootDirectoryName': 'mysite',
            'enableHTTPS': 0
          }
        ],
        'logging': {}
      };
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));

      this.doCreateDirectoryFromPathList(['logs']);
      this.doCreateDirectoryFromPathList(['sites']);
      this.doCreateDirectoryFromPathList(['sites', 'mysite']);
      this.doCreateDirectoryFromPathList(['sites', 'mysite', 'configuration']);
      this.doCreateDirectoryFromPathList(['sites', 'mysite', 'workbench']);
      this.doCreateDirectoryFromPathList(['sites', 'mysite', 'localLogs']);
      this.doCreateDirectoryFromPathList(['sites', 'mysite', 'website']);

      const siteConfContents =
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
          'fileOutput': 'enabled',
          'directoryName': './localLogs',
          'consoleOutput': 'enabled'
        }
      };
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
    },
    expectedLogMessages:
    [
      [ 'error', 'Site configuration: Site name \'My Site\' has an invalid \'enablehttps\' value.  Boolean expected.' ],
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

const test_005_002_configFileInvalidLoggingGeneral = Object.assign(testUtils.makeFromBaseTest('Config file with invalid logging general section'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);

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
        'logging':
        {
          'general': ''
        }
      };
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));
    },
    expectedLogMessages:
    [
      [ 'error', 'Configuration: logging:  Invalid value for general.  Object expected.' ],
      [ 'error', 'Server not started.  No sites are running.' ]
    ],
    onServerStarted()
    {
      this.testPassed = false;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_005_003_configFileInvalidLoggingLogFileSizeThreshold = Object.assign(testUtils.makeFromBaseTest('Config file with invalid logging logFileSizeThreshold'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);

      const jsCauseConfContents =
      {
        'sites':
        [
          {
            'name': 'My Site',
            'port': 3000,
            'rootDirectoryName': 'mysite',
            'enableHTTPS': false
          }
        ],
        'logging':
        {
          'general':
          {
            'fileOutput': 'enabled',
            'directoryName': 'logs',
            'consoleOutput': 'enabled',
            'logFileSizeThreshold': ''
          }
        }
      };
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));
    },
    expectedLogMessages:
    [
      [ 'error', 'Site configuration: Logging: \'logfilesizethreshold\' is invalid.  Integer number expected.' ],
      [ 'error', 'Server not started.  No sites are running.' ]
    ],
    onServerStarted()
    {
      this.testPassed = false;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_005_004_configFilePositiveLoggingLogFileSizeThreshold = Object.assign(testUtils.makeFromBaseTest('Config file with positive logging logFileSizeThreshold'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);

      const jsCauseConfContents =
      {
        'sites':
        [
          {
            'name': 'My Site',
            'port': 3000,
            'rootDirectoryName': 'mysite',
            'enableHTTPS': false
          }
        ],
        'logging':
        {
          'general':
          {
            'fileOutput': 'enabled',
            'directoryName': 'logs',
            'consoleOutput': 'enabled',
            'logFileSizeThreshold': -1
          }
        }
      };
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));
    },
    expectedLogMessages:
    [
      [ 'error', 'Site configuration: Logging: \'logfilesizethreshold\' must be 0 or greater.' ],
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
  test_005_001_configFileInvalidEnableHTTPS,
  test_005_002_configFileInvalidLoggingGeneral,
  test_005_003_configFileInvalidLoggingLogFileSizeThreshold,
  test_005_004_configFilePositiveLoggingLogFileSizeThreshold
];
