'use strict';

const testUtils = require('./testBatteryUtils');

const makeBase1SiteConfContents = (extra = {}) =>
  Object.assign(
    {
      'hostName': 'jscausesite1',
      'canUpload': false,
      'maxPayloadSizeBytes': 0,
      'jscpExtensionRequired': 'optional',
      'httpPoweredByHeader': 'include',
      'httpsCertFile': 'jscause-cert.pem',
      'httpsKeyFile': 'jscause-key.pem',
      'tempWorkDirectory': './workbench',
      'mimeTypes': {}
    }, extra
  );

const makeBase2SiteConfContents = (extra = {}) =>
  Object.assign(
    makeBase1SiteConfContents(
      {
        'logging':
        {
          'directoryName': './localLogs',
          'consoleOutput': 'enabled',
          'fileOutput': 'enabled'
        }
      }
    ), extra
  );

const test_004_001_siteConfInvalidLoggingKey = Object.assign(testUtils.makeFromBaseTest('Site config, invalid logging key'),
  {
    // only: true,
    onTestBeforeStart()
    {
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
        'logging':
        {
          'perSite':
          {
            'fileOutput': 'per site'
          }
        }
      };
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));

      this.doCreateDirectoryFromPathList(['logs']);
      this.doCreateDirectoryFromPathList(['sites']);
      this.doCreateDirectoryFromPathList(['sites', 'mysite']);
      this.doCreateDirectoryFromPathList(['sites', 'mysite', 'configuration']);
      this.doCreateDirectoryFromPathList(['sites', 'mysite', 'workbench']);

      const siteConfContents = makeBase1SiteConfContents(
        {
          'logging':
          {
            'random': 'random'
          }
        }
      );
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
    },
    expectedLogMessages:
    [
      [ 'error', 'Site configuration: Site name \'My Site\': "random" is not a valid configuration key.' ],
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
      const siteConfContents = makeBase1SiteConfContents(
        {
          'logging':
          {
            'fileOutput': 1
          }
        }
      );
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
      const siteConfContents = makeBase1SiteConfContents(
        {
          'logging':
          {
            'fileOutput': 'disabled',
            'consoleOutput': 1
          }
        }
      );
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
      const siteConfContents = makeBase1SiteConfContents(
        {
          'logging':
          {
            'directoryName': 1
          }
        }
      );
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
    },
    expectedLogMessages:
    [
      [ 'error', 'Site configuration: \'My Site\' site logging: Invalid directoryname.  String expected.' ],
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
      const siteConfContents = makeBase1SiteConfContents(
        {
          'logging':
          {
            'directoryName': ''
          }
        }
      );
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

const test_004_006_siteConfMissingLoggingDirectory = Object.assign(testUtils.makeFromBaseTest('Site config, missing logging directory'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const siteConfContents = makeBase1SiteConfContents(
        {
          'logging':
          {
            'directoryName': 'random'
          }
        }
      );
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
      this.doCreateDirectoryFromPathList(['sites', 'mysite', 'localLogs']);

      const siteConfContents = makeBase1SiteConfContents(
        {
          'logging':
          {
            'directoryName': '/localLogs'
          }
        });
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
      const siteConfContents = makeBase1SiteConfContents(
        {
          'logging':
          {
            'directoryName': './randomDirectory'
          }
        });
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
      const siteConfContents = makeBase2SiteConfContents();
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
      const siteConfContents = makeBase2SiteConfContents();
      siteConfContents.logging.logFileSizeThreshold = 0;
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
      this.doCreateDirectoryFromPathList(['sites', 'mysite', 'website']);

      const siteConfContents = makeBase2SiteConfContents();
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
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

module.exports =
[
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
