'use strict';

const testUtils = require('./testBatteryUtils');

const test_004_001_siteConfInvalidLoggingKey = Object.assign(testUtils.makeFromBaseTest('Site config, invalid logging key'),
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
            'rootDirectoryName': 'mysite'
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
          'random': 'random'
        }
      };
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
    },
    expectedLogMessages:
    [
      [ 'error', 'Site configuration: Logging: \'random\' is not a valid configuration key.' ],
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

const test_004_002_siteConfInvalidLoggingFileOutputKey = Object.assign(testUtils.makeFromBaseTest('Site config, invalid logging fileOutput key'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);

      const siteConfContents =
      {
        'hostName': 'jscausesite1',
        'canUpload': false,
        'maxPayloadSizeBytes': 0,
        'jscpExtensionRequired': 'optional',
        'httpPoweredByHeader': 'include',
        'tempWorkDirectory': './workbench',
        'mimeTypes': {},
        'logging':
        {
          'fileOutput': 1
        }
      };
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
    },
    expectedLogMessages:
    [
      [ 'error', 'Site configuration: Logging: fileoutput must be either \'enabled\' or \'disabled\'.' ],
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

const test_004_003_siteConfInvalidLoggingConsoleOutputKey = Object.assign(testUtils.makeFromBaseTest('Site config, invalid logging consoleOutput key'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);

      const siteConfContents =
      {
        'hostName': 'jscausesite1',
        'canUpload': false,
        'maxPayloadSizeBytes': 0,
        'jscpExtensionRequired': 'optional',
        'httpPoweredByHeader': 'include',
        'tempWorkDirectory': './workbench',
        'mimeTypes': {},
        'logging':
        {
          'fileOutput': 'disabled',
          'consoleOutput': 1
        }
      };
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
    },
    expectedLogMessages:
    [
      [ 'error', 'Site configuration: Logging: consoleOutput must be either \'enabled\' or \'disabled\'.' ],
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

const test_004_004_siteConfInvalidLoggingDirectoryNameKey = Object.assign(testUtils.makeFromBaseTest('Site config, invalid logging directoryName key'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);

      const siteConfContents =
      {
        'hostName': 'jscausesite1',
        'canUpload': false,
        'maxPayloadSizeBytes': 0,
        'jscpExtensionRequired': 'optional',
        'httpPoweredByHeader': 'include',
        'tempWorkDirectory': './workbench',
        'mimeTypes': {},
        'logging':
        {
          'directoryName': 1
        }
      };
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
    },
    expectedLogMessages:
    [
      [ 'error', 'Site configuration: \'My Site\' site logging: invalid directoryname.  String expected.' ],
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

const test_004_005_siteConfEmptyLoggingDirectoryName = Object.assign(testUtils.makeFromBaseTest('Site config, empty logging directoryName'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);

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
          'directoryName': ''
        }
      };
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
    },
    expectedLogMessages:
    [
      [ 'error', 'Site configuration: Site \'My Site\': logging directoryname cannot be empty.' ],
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

const test_004_006_siteConfMissingLoggingDirectory = Object.assign(testUtils.makeFromBaseTest('Site config, missing logging directory'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);

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
          'directoryName': 'random'
        }
      };
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
    },
    expectedLogMessages:
    [
      [ 'error', 'Site configuration: \'My Site\' logging: directoryName: Cannot find directory:', 'prefix' ],
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

const test_004_007_siteConfLoggingDirectoryAbsolutePath = Object.assign(testUtils.makeFromBaseTest('Site config, logging directory, absolute path'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);

      this.doCreateDirectoryFromPathList(['sites', 'mysite', 'localLogs']);

      const siteConfContents =
      {
        'logging':
        {
          'directoryName': '/localLogs'
        }
      };
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
    },
    expectedLogMessages:
    [
      [ 'error', 'Site configuration: \'My Site\' site logging: directoryname must be a relative path.' ],
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

const test_004_008_siteConfLoggingDirectoryRandomPath = Object.assign(testUtils.makeFromBaseTest('Site config, logging directory, random path'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);

      const siteConfContents =
      {
        'logging':
        {
          'directoryName': './randomDirectory'
        }
      };
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
    },
    expectedLogMessages:
    [
      [ 'error', 'Site configuration: \'My Site\' logging: directoryName: Cannot find directory:', 'prefix' ],
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

const test_004_009_siteConfMissingWebsiteDirectory = Object.assign(testUtils.makeFromBaseTest('Site config, missing website directory'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);

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
      [ 'error', 'Site \'My Site\': could not read directory: jsctest/testrootdir/sites/mysite/website' ],
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

const test_004_010_siteConfNoLogFileSizeThresholdOnPerSite = Object.assign(testUtils.makeFromBaseTest('Site config, no logFileSizeThreshold on perSite logging section'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);

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
          'consoleOutput': 'enabled',
          'logFileSizeThreshold': 0
        }
      };
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
    },
    expectedLogMessages:
    [
      [ 'error', 'Site configuration: \'My Site\' site logging: \'perSite\' section must not have a \'logfilesizethreshold\' configuration key.' ],
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

const test_004_011_siteConfEmptyWebsite = Object.assign(testUtils.makeFromBaseTest('Site config, empty site, server runs'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);

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

      this.gotAllExpectedLogMsgs = false;
      this.serverDidStart = false;
    },
    expectedLogMessages:
    [
      [ 'info', 'Reading configuration for site \'My Site\' from \'jsctest/testrootdir/sites/mysite\'' ],
      [ 'info', 'Site \'My Site\' at http://jscausesite1:3000/ assigned to server 0' ],
      [ 'info', 'The following sites were set up successfully:' ],
      [ 'info', '\'My Site\'' ],
      [ 'info', 'Will start listening.' ],
      [ 'info', 'Server 0 listening on port 3000' ]
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

module.exports = [
  test_004_001_siteConfInvalidLoggingKey,
  test_004_002_siteConfInvalidLoggingFileOutputKey,
  test_004_003_siteConfInvalidLoggingConsoleOutputKey,
  test_004_004_siteConfInvalidLoggingDirectoryNameKey,
  test_004_005_siteConfEmptyLoggingDirectoryName,
  test_004_006_siteConfMissingLoggingDirectory,
  test_004_007_siteConfLoggingDirectoryAbsolutePath,
  test_004_008_siteConfLoggingDirectoryRandomPath,
  test_004_009_siteConfMissingWebsiteDirectory,
  test_004_010_siteConfNoLogFileSizeThresholdOnPerSite,
  test_004_011_siteConfEmptyWebsite
];
