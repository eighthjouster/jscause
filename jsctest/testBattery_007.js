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
      'logging':
      {
        'general': {},
        'perSite': {}
      }
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

const test_007_001_serverSiteLogDiscrepanciesFileOutput = Object.assign(testUtils.makeFromBaseTest('Server and site logging discrepancies, fileOutput, no warnings'),
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
      jsCauseConfContents.logging.general.fileOutput = 'enabled';
      jsCauseConfContents.logging.perSite.fileOutput = 'disabled';
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));

      const siteConfContents = makeBaseSiteConfContents();
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
    },
    onServerStarted()
    {
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    },
    onBeforeTestEnd()
    {
      this.testPassed = !!this.serverDidStart && !this.gotWarningMessages;
    }
  }
);

const test_007_002_serverSiteLogDiscrepanciesFileOutput2 = Object.assign(testUtils.makeFromBaseTest('Server and site logging discrepancies, fileOutput 2'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const jsCauseConfContents = makeBaseJsCauseConfContents();
      jsCauseConfContents.logging.general.fileOutput = 'disabled';
      jsCauseConfContents.logging.perSite.fileOutput = 'enabled';
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));
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
      this.testPassed = !!(this.serverDidStart && this.gotAllExpectedLogMsgs);
    }
  }
);

const test_007_003_serverSiteLogDiscrepanciesFileOutput3 = Object.assign(testUtils.makeFromBaseTest('Server and site logging discrepancies, fileOutput 3'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const jsCauseConfContents = makeBaseJsCauseConfContents();
      jsCauseConfContents.logging.general.fileOutput = 'enabled';
      jsCauseConfContents.logging.perSite.fileOutput = 'enabled';
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));
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
      this.testPassed = !!(this.serverDidStart && this.gotAllExpectedLogMsgs);
    }
  }
);

const test_007_004_serverSiteLogDiscrepanciesFileOutput4 = Object.assign(testUtils.makeFromBaseTest('Server and site logging discrepancies, fileOutput 4'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const jsCauseConfContents = makeBaseJsCauseConfContents();
      jsCauseConfContents.logging.general.fileOutput = 'disabled';
      jsCauseConfContents.logging.perSite.fileOutput = 'disabled';
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));
    },
    onServerStarted()
    {
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    },
    onBeforeTestEnd()
    {
      this.testPassed = !!this.serverDidStart && !this.gotWarningMessages;
    }
  }
);

const test_007_005_serverSiteLogDiscrepanciesConsoleOutput = Object.assign(testUtils.makeFromBaseTest('Server and site logging discrepancies, consoleOutput'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const jsCauseConfContents = makeBaseJsCauseConfContents();
      jsCauseConfContents.logging.general.consoleOutput = 'enabled';
      jsCauseConfContents.logging.perSite.consoleOutput = 'disabled';
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));
    },
    expectedLogMessages:
    [
      [ 'warning' , 'Site configuration: Site \'My Site\' has console logging enabled while the server has per-site console logging disabled.' ],
      [ 'warning' , '- Server configuration prevails.' ],
      [ 'info' , 'Server 0 listening on port 3000' ]
    ],
    onServerStarted()
    {
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    },
    onBeforeTestEnd()
    {
      this.testPassed = !!(this.serverDidStart && this.gotAllExpectedLogMsgs);
    }
  }
);

const test_007_006_serverSiteLogDiscrepanciesConsoleOutput2 = Object.assign(testUtils.makeFromBaseTest('Server and site logging discrepancies, consoleOutput 2'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const jsCauseConfContents = makeBaseJsCauseConfContents();
      jsCauseConfContents.logging.general.consoleOutput = 'disabled';
      jsCauseConfContents.logging.perSite.consoleOutput = 'enabled';
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));
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
      this.testPassed = !!(this.serverDidStart && this.gotAllExpectedLogMsgs);
    }
  }
);

const test_007_007_serverSiteLogDiscrepanciesConsoleOutput3 = Object.assign(testUtils.makeFromBaseTest('Server and site logging discrepancies, consoleOutput 3'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const jsCauseConfContents = makeBaseJsCauseConfContents();
      jsCauseConfContents.logging.general.consoleOutput = 'enabled';
      jsCauseConfContents.logging.perSite.consoleOutput = 'enabled';
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));
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
      this.testPassed = !!(this.serverDidStart && this.gotAllExpectedLogMsgs);
    }
  }
);

const test_007_008_serverSiteLogDiscrepanciesConsoleOutput4 = Object.assign(testUtils.makeFromBaseTest('Server and site logging discrepancies, consoleOutput 4'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const jsCauseConfContents = makeBaseJsCauseConfContents();
      jsCauseConfContents.logging.general.consoleOutput = 'disabled';
      jsCauseConfContents.logging.perSite.consoleOutput = 'disabled';
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));
    },
    expectedLogMessages:
    [
      [ 'warning' , 'Site configuration: Site \'My Site\' has console logging enabled while the server has per-site console logging disabled.' ],
      [ 'warning' , '- Server configuration prevails.' ],
      [ 'info' , 'Server 0 listening on port 3000' ]
    ],
    onServerStarted()
    {
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    },
    onBeforeTestEnd()
    {
      this.testPassed = !!(this.serverDidStart && this.gotAllExpectedLogMsgs);
    }
  }
);

const test_007_009_serverSiteLogDiscrepanciesFileOutput5 = Object.assign(testUtils.makeFromBaseTest('Config file with logging discrepancies, fileOutput 5'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const jsCauseConfContents = makeBaseJsCauseConfContents();
      jsCauseConfContents.logging.general = undefined;
      jsCauseConfContents.logging.perSite.fileOutput = 'disabled';
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));
      
      const siteConfContents = makeBaseSiteConfContents(
        {
          'logging':
          {
            'directoryName': './localLogs',
            'fileOutput': 'disabled'
          }
        }
      );
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
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
      this.testPassed = !!(this.serverDidStart && this.gotAllExpectedLogMsgs);
    }
  }
);

const test_007_010_serverSiteLogDiscrepanciesConsoleOutput5 = Object.assign(testUtils.makeFromBaseTest('Config file with logging discrepancies, consoleOutput 5'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const jsCauseConfContents = makeBaseJsCauseConfContents();
      jsCauseConfContents.logging.general = undefined;
      jsCauseConfContents.logging.perSite.consoleOutput = 'disabled';
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));
      
      const siteConfContents = makeBaseSiteConfContents(
        {
          'logging':
          {
            'directoryName': './localLogs',
            'consoleOutput': 'disabled'
          }
        }
      );
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
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
      this.testPassed = !!(this.serverDidStart && this.gotAllExpectedLogMsgs);
    }
  }
);

const test_007_011_serverSiteLogDiscrepanciesFileConsoleOutput = Object.assign(testUtils.makeFromBaseTest('Config file with logging discrepancies, fileOutput, consoleOutput'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const jsCauseConfContents = makeBaseJsCauseConfContents();
      jsCauseConfContents.logging.general = undefined;
      jsCauseConfContents.logging.perSite.fileOutput = 'disabled';
      jsCauseConfContents.logging.perSite.consoleOutput = 'disabled';
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));
      
      const siteConfContents = makeBaseSiteConfContents(
        {
          'logging':
          {
            'directoryName': './localLogs',
            'fileOutput': 'enabled',
            'consoleOutput': 'enabled'
          }
        }
      );
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
    },
    expectedLogMessages:
    [
      [ 'warning' , 'Site configuration: Site \'My Site\' has file logging enabled while the server has per-site file logging disabled.' ],
      [ 'warning' , 'Site configuration: Site \'My Site\' has console logging enabled while the server has per-site console logging disabled.' ],
      [ 'warning' , '- Server configuration prevails.' ],
      [ 'info' , 'Server 0 listening on port 3000' ]
    ],
    onServerStarted()
    {
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    },
    onBeforeTestEnd()
    {
      this.testPassed = !!(this.serverDidStart && this.gotAllExpectedLogMsgs);
    }
  }
);

module.exports = [
  test_007_001_serverSiteLogDiscrepanciesFileOutput,
  test_007_002_serverSiteLogDiscrepanciesFileOutput2,
  test_007_003_serverSiteLogDiscrepanciesFileOutput3,
  test_007_004_serverSiteLogDiscrepanciesFileOutput4,
  test_007_005_serverSiteLogDiscrepanciesConsoleOutput,
  test_007_006_serverSiteLogDiscrepanciesConsoleOutput2,
  test_007_007_serverSiteLogDiscrepanciesConsoleOutput3,
  test_007_008_serverSiteLogDiscrepanciesConsoleOutput4,
  test_007_009_serverSiteLogDiscrepanciesFileOutput5,
  test_007_010_serverSiteLogDiscrepanciesConsoleOutput5,
  test_007_011_serverSiteLogDiscrepanciesFileConsoleOutput
];
