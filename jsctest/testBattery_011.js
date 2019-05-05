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

// Legend: C = console.  F = file output.
// D = disabled. E = enabled. P = per site.
// G = General (Server).  GP = general per site.  S = Site.
const test_011_001_generalLoggingFileOutputOccurs = Object.assign(testUtils.makeFromBaseTest('Check that general file logging output actually occurs in the file system'),
  {
    only: true,
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
    onBeforeTestEnd()
    {
      let waitForContinueTestingSignal = false;
      this.testPassed = false;
      if (this.serverDidStart && this.logOutputToServerDirOccurred && !this.logOutputToSiteDirOccurred)
      {
        waitForContinueTestingSignal = true;
        const { jscLib: { JSCLOG_DATA, getCurrentLogFileName, formatLogMessage } } = this;
        const { messagePrefix: infoPrefix } = JSCLOG_DATA['info'];
        this.pendingCallbackTrackingEnabled = false; // Required so signalTestEnd() doesn't get triggered twice.
        getCurrentLogFileName('./logs', 0)
          .then((fileName) =>
          {
            const actualLogFileContents = this.readFile(['logs', fileName]).toString();

            const expectedLogFileContents =
              [
                formatLogMessage(infoPrefix, 'Reading configuration for site \'My Site\' from \'jsctest/testrootdir/sites/mysite\''),
                formatLogMessage(infoPrefix, '************ All sites\' configuration read at this point ********************'),
                formatLogMessage(infoPrefix, '\'My Site\''),
                formatLogMessage(infoPrefix, 'Will start listening.'),
                formatLogMessage(infoPrefix, 'The following sites were set up successfully:'),
                formatLogMessage(infoPrefix, 'Server 0 listening on port 3000'),
                formatLogMessage(infoPrefix, 'Site \'My Site\' at http://jscausesite1:3000/ assigned to server 0'),
                ''
              ].join('\n');


              console.log(actualLogFileContents);//__RP
              console.log(expectedLogFileContents);//__RP
            this.testPassed = (actualLogFileContents === expectedLogFileContents);
            console.log('TEST PASSED?');//__RP
            console.log(this.testPassed);//__RP
            this.continueTesting();
          })
          .catch(() =>
          {
            this.testPassed = false;
          });
        return { waitForContinueTestingSignal };
      }
      else
      {
        console.log('___FAILED?!');//__RP
        this.testPassed = false;
        this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
      }
    }
  }
);

//__RP MAKE SURE THAT EACH TEST CLEANS THE LOG DIRECTORIES!!!!
//__RP Use doEmptyTestDirectory() with a parameter for the log directories.

module.exports = [
  test_011_001_generalLoggingFileOutputOccurs
];
