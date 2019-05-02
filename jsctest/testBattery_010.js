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
const test_010_C_001_GD_GPD_SD_noConsoleOutput_noFileOutput = Object.assign(testUtils.makeFromBaseTest('Console: General disabled, general per site disabled, site disabled; no console output, no file output'),
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

      const siteConfContents = makeBaseSiteConfContents();
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
    },
    onServerStarted()
    {
      this.testPassed = !this.logOutputToConsoleOccurred &&
        !this.logOutputToServerDirOccurred &&
        !this.logOutputToSiteDirOccurred;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_010_C_002_GD_GPD_SE_noConsoleOutput_noFileOutput = Object.assign(testUtils.makeFromBaseTest('Console: General disabled, general per site disabled, site enabled; no console output, no file output'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const jsCauseConfContents = makeBaseJsCauseConfContents();
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));

      const siteConfContents = makeBaseSiteConfContents();
      siteConfContents.logging.consoleOutput = 'enabled';
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
    },
    onServerStarted()
    {
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    },
    onBeforeTestEnd()
    {
      this.testPassed = !this.logOutputToConsoleOccurred &&
        !this.logOutputToServerDirOccurred &&
        !this.logOutputToSiteDirOccurred;
    }
  }
);

const test_010_C_003_GD_GPP_SD_noConsoleOutput_noFileOutput = Object.assign(testUtils.makeFromBaseTest('Console: General disabled, general per site per site, site disabled; no console output, no file output'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const jsCauseConfContents = makeBaseJsCauseConfContents();
      jsCauseConfContents.logging.perSite.consoleOutput = 'per site';
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));

      const siteConfContents = makeBaseSiteConfContents();
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
    },
    onServerStarted()
    {
      this.testPassed = !this.logOutputToConsoleOccurred &&
        !this.logOutputToServerDirOccurred &&
        !this.logOutputToSiteDirOccurred;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_010_C_004_GD_GPP_SE_consoleOutput_noFileOutput = Object.assign(testUtils.makeFromBaseTest('Console: General disabled, general per site per site, site enabled; console output, no file output'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const jsCauseConfContents = makeBaseJsCauseConfContents();
      jsCauseConfContents.logging.perSite.consoleOutput = 'per site';
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));

      const siteConfContents = makeBaseSiteConfContents();
      siteConfContents.logging.consoleOutput = 'enabled';
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
    },
    onServerStarted()
    {
      this.testPassed = this.logOutputToConsoleOccurred &&
        !this.logOutputToServerDirOccurred &&
        !this.logOutputToSiteDirOccurred;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_010_C_005_GD_GPE_SD_consoleOutput_noFileOutput = Object.assign(testUtils.makeFromBaseTest('Console: General disabled, general per site enabled, site disabled; console output, no file output'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const jsCauseConfContents = makeBaseJsCauseConfContents();
      jsCauseConfContents.logging.perSite.consoleOutput = 'enabled';
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));

      const siteConfContents = makeBaseSiteConfContents();
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
    },
    onServerStarted()
    {
      this.testPassed = this.logOutputToConsoleOccurred &&
        !this.logOutputToServerDirOccurred &&
        !this.logOutputToSiteDirOccurred;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_010_C_006_GD_GPE_SE_consoleOutput_noFileOutput = Object.assign(testUtils.makeFromBaseTest('Console: General disabled, general per site enabled, site enabled; console output, no file output'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const jsCauseConfContents = makeBaseJsCauseConfContents();
      jsCauseConfContents.logging.perSite.consoleOutput = 'enabled';
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));

      const siteConfContents = makeBaseSiteConfContents();
      siteConfContents.logging.consoleOutput = 'enabled';
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
    },
    onServerStarted()
    {
      this.testPassed = this.logOutputToConsoleOccurred &&
        !this.logOutputToServerDirOccurred &&
        !this.logOutputToSiteDirOccurred;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_010_C_007_GE_GPD_SD_consoleOutput_noFileOutput = Object.assign(testUtils.makeFromBaseTest('Console: General enabled, general per site disabled, site disabled; console output, no file output'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const jsCauseConfContents = makeBaseJsCauseConfContents();
      jsCauseConfContents.logging.general.consoleOutput = 'enabled';
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));

      const siteConfContents = makeBaseSiteConfContents();
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
    },
    onServerStarted()
    {
      this.testPassed = this.logOutputToConsoleOccurred &&
        !this.logOutputToServerDirOccurred &&
        !this.logOutputToSiteDirOccurred;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_010_C_008_GE_GPD_SE_consoleOutput_noFileOutput = Object.assign(testUtils.makeFromBaseTest('Console: General enabled, general per site disabled, site enabled; console output, no file output'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const jsCauseConfContents = makeBaseJsCauseConfContents();
      jsCauseConfContents.logging.general.consoleOutput = 'enabled';
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));

      const siteConfContents = makeBaseSiteConfContents();
      siteConfContents.logging.consoleOutput = 'enabled';
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
    },
    onServerStarted()
    {
      this.testPassed = this.logOutputToConsoleOccurred &&
        !this.logOutputToServerDirOccurred &&
        !this.logOutputToSiteDirOccurred;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_010_C_009_GE_GPP_SD_consoleOutput_noFileOutput = Object.assign(testUtils.makeFromBaseTest('Console: General enabled, general per site per site, site disabled; console output, no file output'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const jsCauseConfContents = makeBaseJsCauseConfContents();
      jsCauseConfContents.logging.general.consoleOutput = 'enabled';
      jsCauseConfContents.logging.perSite.consoleOutput = 'per site';
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));

      const siteConfContents = makeBaseSiteConfContents();
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
    },
    onServerStarted()
    {
      this.testPassed = this.logOutputToConsoleOccurred &&
        !this.logOutputToServerDirOccurred &&
        !this.logOutputToSiteDirOccurred;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_010_C_010_GE_GPP_SE_consoleOutput_noFileOutput = Object.assign(testUtils.makeFromBaseTest('Console: General enabled, general per site per site, site enabled; console output, no file output'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const jsCauseConfContents = makeBaseJsCauseConfContents();
      jsCauseConfContents.logging.general.consoleOutput = 'enabled';
      jsCauseConfContents.logging.perSite.consoleOutput = 'per site';
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));

      const siteConfContents = makeBaseSiteConfContents();
      siteConfContents.logging.consoleOutput = 'enabled';
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
    },
    onServerStarted()
    {
      this.testPassed = this.logOutputToConsoleOccurred &&
        !this.logOutputToServerDirOccurred &&
        !this.logOutputToSiteDirOccurred;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_010_C_011_GE_GPE_SD_consoleOutput_noFileOutput = Object.assign(testUtils.makeFromBaseTest('Console: General enabled, general per site enabled, site disabled; console output, no file output'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const jsCauseConfContents = makeBaseJsCauseConfContents();
      jsCauseConfContents.logging.general.consoleOutput = 'enabled';
      jsCauseConfContents.logging.perSite.consoleOutput = 'enabled';
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));

      const siteConfContents = makeBaseSiteConfContents();
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
    },
    onServerStarted()
    {
      this.testPassed = this.logOutputToConsoleOccurred &&
        !this.logOutputToServerDirOccurred &&
        !this.logOutputToSiteDirOccurred;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_010_C_012_GE_GPE_SE_consoleOutput_noFileOutput = Object.assign(testUtils.makeFromBaseTest('Console: General enabled, general per site enabled, site enabled; console output, no file output'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const jsCauseConfContents = makeBaseJsCauseConfContents();
      jsCauseConfContents.logging.general.consoleOutput = 'enabled';
      jsCauseConfContents.logging.perSite.consoleOutput = 'enabled';
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));

      const siteConfContents = makeBaseSiteConfContents();
      siteConfContents.logging.consoleOutput = 'enabled';
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
    },
    onServerStarted()
    {
      this.testPassed = this.logOutputToConsoleOccurred &&
        !this.logOutputToServerDirOccurred &&
        !this.logOutputToSiteDirOccurred;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_010_F_013_GD_GPD_SE_noFileOutput_noConsoleOutput = Object.assign(testUtils.makeFromBaseTest('File: General disabled, general per site disabled, site enabled; no file output, no file output'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const jsCauseConfContents = makeBaseJsCauseConfContents();
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
      this.testPassed = !this.logOutputToServerDirOccurred && !this.logOutputToSiteDirOccurred &&
        !this.logOutputToConsoleOccurred;
    }
  }
);

const test_010_F_014_GD_GPP_SD_noFileOutput_noConsoleOutput = Object.assign(testUtils.makeFromBaseTest('File: General disabled, general per site per site, site disabled; no file output, no file output'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const jsCauseConfContents = makeBaseJsCauseConfContents();
      jsCauseConfContents.logging.perSite.fileOutput = 'per site';
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));

      const siteConfContents = makeBaseSiteConfContents();
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
    },
    onServerStarted()
    {
      this.testPassed = !this.logOutputToServerDirOccurred && !this.logOutputToSiteDirOccurred &&
        !this.logOutputToConsoleOccurred;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_010_F_015_GD_GPP_SE_fileOutput_noConsoleOutput = Object.assign(testUtils.makeFromBaseTest('File: General disabled, general per site per site, site enabled; file output, no file output'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const jsCauseConfContents = makeBaseJsCauseConfContents();
      jsCauseConfContents.logging.perSite.fileOutput = 'per site';
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));

      const siteConfContents = makeBaseSiteConfContents();
      siteConfContents.logging.fileOutput = 'enabled';
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
    },
    onServerStarted()
    {
      this.testPassed = !this.logOutputToServerDirOccurred && this.logOutputToSiteDirOccurred &&
        !this.logOutputToConsoleOccurred;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_010_F_016_GD_GPE_SD_fileOutput_noConsoleOutput = Object.assign(testUtils.makeFromBaseTest('File: General disabled, general per site enabled, site disabled; file output, no file output'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const jsCauseConfContents = makeBaseJsCauseConfContents();
      jsCauseConfContents.logging.perSite.fileOutput = 'enabled';
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));

      const siteConfContents = makeBaseSiteConfContents();
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
    },
    onServerStarted()
    {
      this.testPassed = !this.logOutputToServerDirOccurred && this.logOutputToSiteDirOccurred &&
        !this.logOutputToConsoleOccurred;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_010_F_017_GD_GPE_SE_fileOutput_noConsoleOutput = Object.assign(testUtils.makeFromBaseTest('File: General disabled, general per site enabled, site enabled; file output, no file output'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const jsCauseConfContents = makeBaseJsCauseConfContents();
      jsCauseConfContents.logging.perSite.fileOutput = 'enabled';
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));

      const siteConfContents = makeBaseSiteConfContents();
      siteConfContents.logging.fileOutput = 'enabled';
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
    },
    onServerStarted()
    {
      this.testPassed = !this.logOutputToServerDirOccurred && this.logOutputToSiteDirOccurred &&
        !this.logOutputToConsoleOccurred;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_010_F_018_GE_GPD_SD_fileOutput_noConsoleOutput = Object.assign(testUtils.makeFromBaseTest('File: General enabled, general per site disabled, site disabled; file output, no file output'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const jsCauseConfContents = makeBaseJsCauseConfContents();
      jsCauseConfContents.logging.general.fileOutput = 'enabled';
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));

      const siteConfContents = makeBaseSiteConfContents();
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
    },
    onServerStarted()
    {
      this.testPassed = this.logOutputToServerDirOccurred && !this.logOutputToSiteDirOccurred &&
        !this.logOutputToConsoleOccurred;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_010_F_019_GE_GPD_SE_fileOutput_noConsoleOutput = Object.assign(testUtils.makeFromBaseTest('File: General enabled, general per site disabled, site enabled; file output, no file output'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const jsCauseConfContents = makeBaseJsCauseConfContents();
      jsCauseConfContents.logging.general.fileOutput = 'enabled';
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));

      const siteConfContents = makeBaseSiteConfContents();
      siteConfContents.logging.fileOutput = 'enabled';
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
    },
    onServerStarted()
    {
      this.testPassed = this.logOutputToServerDirOccurred && !this.logOutputToSiteDirOccurred &&
        !this.logOutputToConsoleOccurred;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_010_F_020_GE_GPP_SD_fileOutput_noConsoleOutput = Object.assign(testUtils.makeFromBaseTest('File: General enabled, general per site per site, site disabled; file output, no file output'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const jsCauseConfContents = makeBaseJsCauseConfContents();
      jsCauseConfContents.logging.general.fileOutput = 'enabled';
      jsCauseConfContents.logging.perSite.fileOutput = 'per site';
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));

      const siteConfContents = makeBaseSiteConfContents();
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
    },
    onServerStarted()
    {
      this.testPassed = this.logOutputToServerDirOccurred && !this.logOutputToSiteDirOccurred &&
        !this.logOutputToConsoleOccurred;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_010_F_021_GE_GPP_SE_fileOutput_noConsoleOutput = Object.assign(testUtils.makeFromBaseTest('File: General enabled, general per site per site, site enabled; file output, no file output'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const jsCauseConfContents = makeBaseJsCauseConfContents();
      jsCauseConfContents.logging.general.fileOutput = 'enabled';
      jsCauseConfContents.logging.perSite.fileOutput = 'per site';
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));

      const siteConfContents = makeBaseSiteConfContents();
      siteConfContents.logging.fileOutput = 'enabled';
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
    },
    onServerStarted()
    {
      this.testPassed = this.logOutputToServerDirOccurred && this.logOutputToSiteDirOccurred &&
        !this.logOutputToConsoleOccurred;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_010_F_022_GE_GPE_SD_fileOutput_noConsoleOutput = Object.assign(testUtils.makeFromBaseTest('File: General enabled, general per site enabled, site disabled; file output, no file output'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const jsCauseConfContents = makeBaseJsCauseConfContents();
      jsCauseConfContents.logging.general.fileOutput = 'enabled';
      jsCauseConfContents.logging.perSite.fileOutput = 'enabled';
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));

      const siteConfContents = makeBaseSiteConfContents();
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
    },
    onServerStarted()
    {
      this.testPassed = this.logOutputToServerDirOccurred && this.logOutputToSiteDirOccurred &&
        !this.logOutputToConsoleOccurred;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_010_F_023_GE_GPE_SE_fileOutput_noConsoleOutput = Object.assign(testUtils.makeFromBaseTest('File: General enabled, general per site enabled, site enabled; file output, no file output'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const jsCauseConfContents = makeBaseJsCauseConfContents();
      jsCauseConfContents.logging.general.fileOutput = 'enabled';
      jsCauseConfContents.logging.perSite.fileOutput = 'enabled';
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));

      const siteConfContents = makeBaseSiteConfContents();
      siteConfContents.logging.fileOutput = 'enabled';
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
    },
    onServerStarted()
    {
      this.testPassed = this.logOutputToServerDirOccurred && this.logOutputToSiteDirOccurred &&
        !this.logOutputToConsoleOccurred;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

module.exports = [
  test_010_C_001_GD_GPD_SD_noConsoleOutput_noFileOutput,
  test_010_C_002_GD_GPD_SE_noConsoleOutput_noFileOutput,
  test_010_C_003_GD_GPP_SD_noConsoleOutput_noFileOutput,
  test_010_C_004_GD_GPP_SE_consoleOutput_noFileOutput,
  test_010_C_005_GD_GPE_SD_consoleOutput_noFileOutput,
  test_010_C_006_GD_GPE_SE_consoleOutput_noFileOutput,
  test_010_C_007_GE_GPD_SD_consoleOutput_noFileOutput,
  test_010_C_008_GE_GPD_SE_consoleOutput_noFileOutput,
  test_010_C_009_GE_GPP_SD_consoleOutput_noFileOutput,
  test_010_C_010_GE_GPP_SE_consoleOutput_noFileOutput,
  test_010_C_011_GE_GPE_SD_consoleOutput_noFileOutput,
  test_010_C_012_GE_GPE_SE_consoleOutput_noFileOutput,
  test_010_F_013_GD_GPD_SE_noFileOutput_noConsoleOutput,
  test_010_F_014_GD_GPP_SD_noFileOutput_noConsoleOutput,
  test_010_F_015_GD_GPP_SE_fileOutput_noConsoleOutput,
  test_010_F_016_GD_GPE_SD_fileOutput_noConsoleOutput,
  test_010_F_017_GD_GPE_SE_fileOutput_noConsoleOutput,
  test_010_F_018_GE_GPD_SD_fileOutput_noConsoleOutput,
  test_010_F_019_GE_GPD_SE_fileOutput_noConsoleOutput,
  test_010_F_020_GE_GPP_SD_fileOutput_noConsoleOutput,
  test_010_F_021_GE_GPP_SE_fileOutput_noConsoleOutput,
  test_010_F_022_GE_GPE_SD_fileOutput_noConsoleOutput,
  test_010_F_023_GE_GPE_SE_fileOutput_noConsoleOutput
];
