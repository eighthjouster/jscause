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
        'general':
        {
          'fileOutput': 'disabled',
          'consoleOutput': 'disabled',
          'directoryName': './logs'
        },
        'perSite':
        {
          'fileOutput': 'disabled',
          'consoleOutput': 'disabled'
        },
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
      'tempWorkDirectory': './workbench',
      'mimeTypes': {},
      'logging':
      {
        'consoleOutput': 'disabled',
        'fileOutput': 'disabled',
        'directoryName': './localLogs'
      }
    }, extra
  );

const test_013_001_generalLoggingFileOutputOccurs = Object.assign(testUtils.makeFromBaseTest('Check that general file logging output actually occurs in the file system'),
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
      let waitForContinueTestingCall = false;
      this.testPassed = false;
      if (this.serverDidStart && this.logOutputToServerDirOccurred && !this.logOutputToSiteDirOccurred)
      {
        waitForContinueTestingCall = true;
        const { jscLib: { JSCLOG_DATA, getCurrentLogFileName, formatLogMessage } } = this;
        const { info: { messagePrefix: infoPrefix } } = JSCLOG_DATA;
        this.pendingCallbackTrackingEnabled = false; // Required so signalTestEnd() doesn't get triggered twice.
        getCurrentLogFileName(this.getTestFilePath(['logs']), 0)
          .then((fileName) =>
          {
            const actualLogFileContents = this.readFile(['logs', fileName]).toString();

            const expectedLogFileContents =
              [
                formatLogMessage(infoPrefix, 'Reading configuration for site \'My Site\' from \'jsctest/testrootdir/sites/mysite\''),
                formatLogMessage(infoPrefix, 'Site \'My Site\' at http://jscausesite1:3000/ assigned to server 0'),
                formatLogMessage(infoPrefix, '************ All sites\' configuration read at this point ********************'),
                formatLogMessage(infoPrefix, 'The following sites were set up successfully:'),
                formatLogMessage(infoPrefix, '\'My Site\''),
                formatLogMessage(infoPrefix, 'Will start listening.'),
                formatLogMessage(infoPrefix, 'Server 0 listening on port 3000'),
                ''
              ].join('\n');

            this.testPassed = (actualLogFileContents === expectedLogFileContents);
            this.continueTesting();
          })
          .catch(e =>
          {
            console.error('An error ocurred while retrieving log file name:');
            console.error(e);
            this.testPassed = false;
            this.continueTesting();
          });

        this.waitForContinueTestingCall = waitForContinueTestingCall;
      }
      else
      {
        this.testPassed = false;
      }
    }
  }
);

const test_013_002_siteLoggingFileOutputOccurs = Object.assign(testUtils.makeFromBaseTest('Check that site file logging output actually occurs in the file system'),
  {
    // only: true,
    onTestBeforeStart()
    {
      this.doEmptyTestDirectory(['logs'], { preserveDirectory: true });
      this.doEmptyTestDirectory(['sites', 'mysite', 'localLogs'], { preserveDirectory: true });

      const jsCauseConfContents = makeBaseJsCauseConfContents();
      jsCauseConfContents.logging.perSite.fileOutput = 'per site';
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));

      const siteConfContents = makeBaseSiteConfContents();
      siteConfContents.logging.fileOutput = 'enabled';
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
    },
    onServerStarted()
    {
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    },
    onBeforeTestEnd()
    {
      let waitForContinueTestingCall = false;
      this.testPassed = false;
      if (this.serverDidStart && !this.logOutputToServerDirOccurred && this.logOutputToSiteDirOccurred)
      {
        waitForContinueTestingCall = true;
        const { jscLib: { JSCLOG_DATA, getCurrentLogFileName, formatLogMessage } } = this;
        const { info: { messagePrefix: infoPrefix } } = JSCLOG_DATA;
        this.pendingCallbackTrackingEnabled = false; // Required so signalTestEnd() doesn't get triggered twice.
        getCurrentLogFileName(this.getTestFilePath(['sites', 'mysite', 'localLogs']), 0)
          .then((fileName) =>
          {
            const actualLogFileContents = this.readFile(['sites', 'mysite', 'localLogs', fileName]).toString();

            const expectedLogFileContents =
              [
                formatLogMessage(infoPrefix, 'Site \'My Site\' at http://jscausesite1:3000/ assigned to server 0'),
                formatLogMessage(infoPrefix, 'Server 0 listening on port 3000'),
                ''
              ].join('\n');

            this.testPassed = (actualLogFileContents === expectedLogFileContents);
            this.continueTesting();
          })
          .catch(() =>
          {
            this.testPassed = false;
          });

        this.waitForContinueTestingCall = waitForContinueTestingCall;
      }
      else
      {
        this.testPassed = false;
      }
    }
  }
);

const test_013_003_generalSiteLoggingFileOutputDoesNotOccur = Object.assign(testUtils.makeFromBaseTest('Check that general and site file logging output does NOT occur in the file system'),
  {
    // only: true,
    onTestBeforeStart()
    {
      this.doEmptyTestDirectory(['logs'], { preserveDirectory: true });
      this.doEmptyTestDirectory(['sites', 'mysite', 'localLogs'], { preserveDirectory: true });

      const jsCauseConfContents = makeBaseJsCauseConfContents();
      jsCauseConfContents.logging.perSite.fileOutput = 'per site';
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));

      const siteConfContents = makeBaseSiteConfContents();
      siteConfContents.logging.fileOutput = 'disabled';
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
    },
    onServerStarted()
    {
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    },
    onBeforeTestEnd()
    {
      this.testPassed = this.isDirectoryEmpty(['logs']) &&
        this.isDirectoryEmpty(['sites', 'mysite', 'localLogs']);
    }
  }
);

const test_013_004_generalSiteLoggingFileAppendingOccurs = Object.assign(testUtils.makeFromBaseTest('Check that site file logging appending actually occurs in the file system'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const { jscLib: { dateToYYYMMDD_HH0000 } } = this;

      this.doEmptyTestDirectory(['logs'], { preserveDirectory: true });
      this.doEmptyTestDirectory(['sites', 'mysite', 'localLogs'], { preserveDirectory: true });

      const jsCauseConfContents = makeBaseJsCauseConfContents();
      jsCauseConfContents.logging.general.fileOutput = 'enabled';
      jsCauseConfContents.logging.perSite.fileOutput = 'per site';
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));

      const siteConfContents = makeBaseSiteConfContents();
      siteConfContents.logging.fileOutput = 'enabled';
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));

      this.tempTestData =
      {
        lineGeneral: `Some random text for general logging - ${Math.random()}`,
        lineSite: `Some random text for site logging - ${Math.random()}`,
      };

      this.tempTestData.existingFileName = `jsc_${dateToYYYMMDD_HH0000()}.log`;
      this.createFile(['logs', this.tempTestData.existingFileName], `${this.tempTestData.lineGeneral}\n`);
      this.createFile(['sites', 'mysite', 'localLogs', this.tempTestData.existingFileName], `${this.tempTestData.lineSite}\n`);

    },
    onServerStarted()
    {
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    },
    onBeforeTestEnd()
    {
      const { jscLib: { JSCLOG_DATA, formatLogMessage } } = this;
      const { info: { messagePrefix: infoPrefix } } = JSCLOG_DATA;
      this.testPassed = false;
      if (this.serverDidStart && this.logOutputToServerDirOccurred && this.logOutputToSiteDirOccurred)
      {
        const actualLogFileContentsServer = this.readFile(['logs', this.tempTestData.existingFileName]).toString();

        const expectedLogFileContentsServer =
          [
            this.tempTestData.lineGeneral,
            formatLogMessage(infoPrefix, 'Reading configuration for site \'My Site\' from \'jsctest/testrootdir/sites/mysite\''),
            formatLogMessage(infoPrefix, 'Site \'My Site\' at http://jscausesite1:3000/ assigned to server 0'),
            formatLogMessage(infoPrefix, '************ All sites\' configuration read at this point ********************'),
            formatLogMessage(infoPrefix, 'The following sites were set up successfully:'),
            formatLogMessage(infoPrefix, '\'My Site\''),
            formatLogMessage(infoPrefix, 'Will start listening.'),
            formatLogMessage(infoPrefix, 'Server 0 listening on port 3000'),
            ''
          ].join('\n');

        const actualLogFileContentsSite = this.readFile(['sites', 'mysite', 'localLogs', this.tempTestData.existingFileName]).toString();

        const expectedLogFileContentsSite =
          [
            this.tempTestData.lineSite,
            formatLogMessage(infoPrefix, 'Site \'My Site\' at http://jscausesite1:3000/ assigned to server 0'),
            formatLogMessage(infoPrefix, 'Server 0 listening on port 3000'),
            ''
          ].join('\n');

        this.testPassed = ((actualLogFileContentsServer === expectedLogFileContentsServer) &&
                           (actualLogFileContentsSite === expectedLogFileContentsSite));
      }
      else
      {
        this.testPassed = false;
      }
    }
  }
);

const test_013_005_generalSiteLoggingFileCreationOccurs = Object.assign(testUtils.makeFromBaseTest('Check that site file creation occurs in the file system when gz and log above threshold exists'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const { jscLib: { dateToYYYMMDD_HH0000 } } = this;
      const sizeThreshold = 10000;
      const aboveThreshold = sizeThreshold + 1;
      
      this.doEmptyTestDirectory(['logs'], { preserveDirectory: true });
      this.doEmptyTestDirectory(['sites', 'mysite', 'localLogs'], { preserveDirectory: true });

      const jsCauseConfContents = makeBaseJsCauseConfContents();
      jsCauseConfContents.logging.general.fileOutput = 'enabled';
      jsCauseConfContents.logging.general.logFileSizeThreshold = sizeThreshold;

      jsCauseConfContents.logging.perSite.fileOutput = 'per site';
      
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));

      const siteConfContents = makeBaseSiteConfContents();
      siteConfContents.logging.fileOutput = 'enabled';
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));

      this.tempTestData = {};

      // Let's create the general logging files first.

      // Compressed file.
      const fileNameDateComponent = dateToYYYMMDD_HH0000();
      const existingCompressedFileName = `jsc_${fileNameDateComponent}.log.gz`;
      this.createFile(['logs', existingCompressedFileName], 'Some compressed contents.');

      // Log file which recently crossed the threshold.
      const existingLogAboveThresholdFileName = `jsc_${fileNameDateComponent}--1.log`;
      this.createFile(['logs', existingLogAboveThresholdFileName], 'A'.repeat(aboveThreshold));

      // And now the site logging files.

      // Compressed file.
      this.createFile(['sites', 'mysite', 'localLogs', existingCompressedFileName], 'Some compressed contents.');

      // Log file which recently crossed the threshold.
      this.createFile(['sites', 'mysite', 'localLogs', existingLogAboveThresholdFileName], 'A'.repeat(aboveThreshold));

      // This is the file that must be created in both ./logs and ./sites/mysite/localLogs when the server is invoked.
      this.tempTestData.newLogFileName = `jsc_${fileNameDateComponent}--2.log`;
    },
    onServerStarted()
    {
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    },
    onBeforeTestEnd()
    {
      const { jscLib: { JSCLOG_DATA, formatLogMessage } } = this;
      const { info: { messagePrefix: infoPrefix } } = JSCLOG_DATA;
      this.testPassed = false;
      if (this.serverDidStart && this.logOutputToServerDirOccurred && this.logOutputToSiteDirOccurred)
      {
        const serverLogFileContents = this.readFile(['logs', this.tempTestData.newLogFileName]);
        const siteLogFileContents = this.readFile(['sites', 'mysite', 'localLogs', this.tempTestData.newLogFileName]);

        if ((serverLogFileContents !== null) && (siteLogFileContents !== null))
        {
          const actualLogFileContentsServer = serverLogFileContents.toString();
          const actualLogFileContentsSite = siteLogFileContents.toString();

          const expectedLogFileContentsServer =
            [
              formatLogMessage(infoPrefix, 'Reading configuration for site \'My Site\' from \'jsctest/testrootdir/sites/mysite\''),
              formatLogMessage(infoPrefix, 'Site \'My Site\' at http://jscausesite1:3000/ assigned to server 0'),
              formatLogMessage(infoPrefix, '************ All sites\' configuration read at this point ********************'),
              formatLogMessage(infoPrefix, 'The following sites were set up successfully:'),
              formatLogMessage(infoPrefix, '\'My Site\''),
              formatLogMessage(infoPrefix, 'Will start listening.'),
              formatLogMessage(infoPrefix, 'Server 0 listening on port 3000'),
              ''
            ].join('\n');

          const expectedLogFileContentsSite =
            [
              formatLogMessage(infoPrefix, 'Site \'My Site\' at http://jscausesite1:3000/ assigned to server 0'),
              formatLogMessage(infoPrefix, 'Server 0 listening on port 3000'),
              ''
            ].join('\n');

          this.testPassed = ((actualLogFileContentsServer === expectedLogFileContentsServer) &&
                             (actualLogFileContentsSite === expectedLogFileContentsSite));
        }
      }
      else
      {
        this.testPassed = false;
      }
    }
  }
);

module.exports = [
  test_013_001_generalLoggingFileOutputOccurs,
  test_013_002_siteLoggingFileOutputOccurs,
  test_013_003_generalSiteLoggingFileOutputDoesNotOccur,
  test_013_004_generalSiteLoggingFileAppendingOccurs,
  test_013_005_generalSiteLoggingFileCreationOccurs
];
