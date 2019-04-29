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
          'consoleOutput': 'disabled'
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
        'fileOutput': 'disabled'
      }
    }, extra
  );

// Legend: D = disabled. E = enabled. P = per site.
// G = General (Server).  GP = general per site.  S = Site.
const test_010_001_GD_GPD_SD_noConsoleOutput = Object.assign(testUtils.makeFromBaseTest('Console: General disabled, general per site disabled, site disabled; no output'),
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

      const siteConfContents = makeBaseSiteConfContents();
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));

      const jsCauseConfContents = makeBaseJsCauseConfContents();
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));
    },
    onServerStarted()
    {
      this.testPassed = !this.logOutputToConsoleOccurred;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_010_005_GD_GPE_SD_consoleOutput = Object.assign(testUtils.makeFromBaseTest('Console: General disabled, general per site enabled, site disabled; output'),
  {
    only: true,
    onTestBeforeStart()
    {
      const siteConfContents = makeBaseSiteConfContents();
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));

      const jsCauseConfContents = makeBaseJsCauseConfContents();
      jsCauseConfContents.logging.perSite.consoleOutput = 'enabled';
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));
    },
    onServerStarted()
    {
      this.testPassed = this.logOutputToConsoleOccurred;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_010_007_GE_GPD_SD_consoleOutput = Object.assign(testUtils.makeFromBaseTest('Console: General enabled, general per site disabled, site disabled; output'),
  {
    only: true,
    onTestBeforeStart()
    {
      const siteConfContents = makeBaseSiteConfContents();
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));

      const jsCauseConfContents = makeBaseJsCauseConfContents();
      jsCauseConfContents.logging.general.consoleOutput = 'enabled';
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));
    },
    onServerStarted()
    {
      this.testPassed = this.logOutputToConsoleOccurred;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

module.exports = [ //__RP SORT THIS, IF NEEDED, AND THE ORDER ABOVE MUST MATCH!
  test_010_001_GD_GPD_SD_noConsoleOutput,
  test_010_005_GD_GPE_SD_consoleOutput,
  test_010_007_GE_GPD_SD_consoleOutput
];
