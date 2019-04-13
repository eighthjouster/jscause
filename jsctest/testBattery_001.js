'use strict';

const testUtils = require('./testBatteryUtils');

const test_001_emptyDir = Object.assign(testUtils.makeFromBaseTest('Empty app dir'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);

      // In theory, the following function must be called right before
      // and right after all battery of tests are performed.
      this.doEmptyTestDirectory();
    },
    expectedLogMessages:
    [
      [ 'error', 'Cannot find jscause.conf file.' ],
      [ 'error', 'Server not started.  No sites are running.' ]
    ],
    endOfExpectLogMessages:
    [
      [ 'error', 'Server not started.  No sites are running.' ]
    ],
    onServerStarted()
    {
      this.testPassed = false;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_002_emptyConfigFile = Object.assign(testUtils.makeFromBaseTest('Empty config file'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);
      this.createFile('jscause.conf', '');
    },
    expectedLogMessages:
    [
      [ 'error', 'Server not started.  No sites are running.' ]
    ],
    endOfExpectLogMessages:
    [
      [ 'error', 'Server not started.  No sites are running.' ]
    ],
    onServerStarted()
    {
      this.testPassed = false;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_003_configFileWithBrackets = Object.assign(testUtils.makeFromBaseTest('Config file with brackets'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);
      this.createFile('jscause.conf', '{}');
    },
    expectedLogMessages:
    [
      [ 'error', 'Server configuration:  The following configuration attribute was not found:' ],
      [ 'error', '- sites' ],
      [ 'error', 'Server not started.  No sites are running.' ]
    ],
    endOfExpectLogMessages:
    [
      [ 'error', 'Server not started.  No sites are running.' ]
    ],
    onServerStarted()
    {
      this.testPassed = false;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_004_emptyConfigFileSingleSpace = Object.assign(testUtils.makeFromBaseTest('Empty config file with just one single space'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);
      this.createFile('jscause.conf', ' ');
    },
    expectedLogMessages:
    [
      [ 'error', 'Invalid jscause.conf file format.' ],
      [ 'error', 'Unexpected end of JSON input' ],
      [ 'error', 'Server not started.  No sites are running.' ]
    ],
    endOfExpectLogMessages:
    [
      [ 'error', 'Server not started.  No sites are running.' ]
    ],
    onServerStarted()
    {
      this.testPassed = false;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_005_emptyConfigFileSingleNewLine = Object.assign(testUtils.makeFromBaseTest('Empty config file with just one single new line'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);
      this.createFile('jscause.conf', '\n');
    },
    expectedLogMessages:
    [
      [ 'error', 'Invalid jscause.conf file format.' ],
      [ 'error', 'Unexpected end of JSON input' ],
      [ 'error', 'Server not started.  No sites are running.' ]
    ],
    endOfExpectLogMessages:
    [
      [ 'error', 'Server not started.  No sites are running.' ]
    ],
    onServerStarted()
    {
      this.testPassed = false;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_006_configFile_p = Object.assign(testUtils.makeFromBaseTest('Config file with just the p letter'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);
      this.createFile('jscause.conf', 'p');
    },
    expectedLogMessages:
    [
      [ 'error', 'Invalid jscause.conf file format.' ],
      [ 'error', 'Unexpected token p in JSON at position 0' ],
      [ 'error', 'Server not started.  No sites are running.' ]
    ],
    endOfExpectLogMessages:
    [
      [ 'error', 'Server not started.  No sites are running.' ]
    ],
    onServerStarted()
    {
      this.testPassed = false;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_007_configFile_openingBracket = Object.assign(testUtils.makeFromBaseTest('Config file with just the opening curly bracket'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);
      this.createFile('jscause.conf', '{');
    },
    expectedLogMessages:
    [
      [ 'error', 'Invalid jscause.conf file format.' ],
      [ 'error', 'Unexpected end of JSON input' ],
      [ 'error', 'Server not started.  No sites are running.' ]
    ],
    endOfExpectLogMessages:
    [
      [ 'error', 'Server not started.  No sites are running.' ]
    ],
    onServerStarted()
    {
      this.testPassed = false;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_008_configFile_arrayOf1 = Object.assign(testUtils.makeFromBaseTest('Config file with just an array [1]'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);
      this.createFile('jscause.conf', '[1]');
    },
    expectedLogMessages:
    [
      [ 'error', '"0" is not a valid configuration key.' ],
      [ 'error', 'Server not started.  No sites are running.' ]
    ],
    endOfExpectLogMessages:
    [
      [ 'error', 'Server not started.  No sites are running.' ]
    ],
    onServerStarted()
    {
      this.testPassed = false;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_009_configFile_singleInvalidKey = Object.assign(testUtils.makeFromBaseTest('Config file with just an unknown key'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);
      this.createFile('jscause.conf', '{\n  unknown: ""\n}\n');
    },
    expectedLogMessages:
    [
      [ 'error', 'Unexpected token u in JSON at position 2' ],
      [ 'error', 'Server not started.  No sites are running.' ]
    ],
    endOfExpectLogMessages:
    [
      [ 'error', 'Server not started.  No sites are running.' ]
    ],
    onServerStarted()
    {
      this.testPassed = false;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_010_configFile_singleKeyInvalidVal = Object.assign(testUtils.makeFromBaseTest('Config file with unknown key and invalid value'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);
      this.createFile('jscause.conf', '{\n  "unknown": unknown\n}\n');
    },
    expectedLogMessages:
    [
      [ 'error', 'Unexpected token u in JSON at position 13' ],
      [ 'error', 'Server not started.  No sites are running.' ]
    ],
    endOfExpectLogMessages:
    [
      [ 'error', 'Server not started.  No sites are running.' ]
    ],
    onServerStarted()
    {
      this.testPassed = false;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_011_configFile_singleUnknownKey = Object.assign(testUtils.makeFromBaseTest('Config file with unknown key'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);
      this.createFile('jscause.conf', '{\n  "unknown": ""\n}\n');
    },
    expectedLogMessages:
    [
      [ 'error', '"unknown" is not a valid configuration key.' ],
      [ 'error', 'Check that all the keys and values in jscause.conf are valid.' ],
      [ 'error', 'Server not started.  No sites are running.' ]
    ],
    endOfExpectLogMessages:
    [
      [ 'error', 'Server not started.  No sites are running.' ]
    ],
    onServerStarted()
    {
      this.testPassed = false;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    },
  }
);

const test_012_configFile_invalidSitesKey = Object.assign(testUtils.makeFromBaseTest('Config file with invalid sites key'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);
      this.createFile('jscause.conf', '{\n  "sites": ""\n}\n');
    },
    expectedLogMessages:
    [
      [ 'error', 'Server configuration:  Expected an array of sites.' ],
      [ 'error', 'Server not started.  No sites are running.' ]
    ],
    endOfExpectLogMessages:
    [
      [ 'error', 'Server not started.  No sites are running.' ]
    ],
    onServerStarted()
    {
      this.testPassed = false;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    },
  }
);

const test_013_configFile_emptySitesValue = Object.assign(testUtils.makeFromBaseTest('Config file with an empty sites value'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);
      this.createFile('jscause.conf', '{\n  "sites": []\n}\n');
    },
    expectedLogMessages:
    [
      [ 'error', 'Configuration:  sites cannot be empty.' ],
      [ 'error', 'Server not started.  No sites are running.' ]
    ],
    endOfExpectLogMessages:
    [
      [ 'error', 'Server not started.  No sites are running.' ]
    ],
    onServerStarted()
    {
      this.testPassed = false;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    },
  }
);

const test_014_configFile_invalidSitesArray = Object.assign(testUtils.makeFromBaseTest('Config file with an invalid array value'),
  {
    /// only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);
      this.createFile('jscause.conf', '{\n  "sites": [1]\n}\n');
    },
    expectedLogMessages:
    [
      [ 'error', 'Server configuration: Logging: directoryName: Cannot find directory:', 'prefix' ],
      [ 'error', 'Server not started.  No sites are running.' ]
    ],
    endOfExpectLogMessages:
    [
      [ 'error', 'Server not started.  No sites are running.' ]
    ],
    onServerStarted()
    {
      this.testPassed = false;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    },
  }
);

const test_015_configFile_sitesWithUnexpectedP = Object.assign(testUtils.makeFromBaseTest('Config file with an unexpected p'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);
      this.createFile('jscause.conf', '{\n  "sites": [1]p\n}\n');
    },
    expectedLogMessages:
    [
      [ 'error', 'Invalid jscause.conf file format.' ],
      [ 'error', 'Unexpected token p in JSON at position 14' ],
      [ 'error', 'Server not started.  No sites are running.' ]
    ],
    endOfExpectLogMessages:
    [
      [ 'error', 'Server not started.  No sites are running.' ]
    ],
    onServerStarted()
    {
      this.testPassed = false;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    },
  }
);

const test_016_configFile_sitesWithUnexpectedComma = Object.assign(testUtils.makeFromBaseTest('Config file with an unexpected comma'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);
      this.createFile('jscause.conf', '{\n  "sites": [1],\n}\n');
    },
    expectedLogMessages:
    [
      [ 'error', 'Invalid jscause.conf file format.' ],
      [ 'error', 'Unexpected token } in JSON at position 16' ],
      [ 'error', 'Server not started.  No sites are running.' ]
    ],
    endOfExpectLogMessages:
    [
      [ 'error', 'Server not started.  No sites are running.' ]
    ],
    onServerStarted()
    {
      this.testPassed = false;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    },
  }
);

const test_017_configFile_sitesWithUnknown = Object.assign(testUtils.makeFromBaseTest('Config file with a second invalid key'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);
      this.createFile('jscause.conf', '{\n  "sites": [1],\n  "unknown": 1\n}\n');
    },
    expectedLogMessages:
    [
      [ 'error', '"unknown" is not a valid configuration key.' ],
      [ 'error', 'Check that all the keys and values in jscause.conf are valid.' ],
      [ 'error', 'Server not started.  No sites are running.' ]
    ],
    endOfExpectLogMessages:
    [
      [ 'error', 'Server not started.  No sites are running.' ]
    ],
    onServerStarted()
    {
      this.testPassed = false;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    },
  }
);

const test_018_configFile_invalidLoggingValue = Object.assign(testUtils.makeFromBaseTest('Config file with invalid logging value'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);
      this.createFile('jscause.conf', '{\n  "sites": [1],\n  "logging": 1\n}\n');
    },
    expectedLogMessages:
    [
      [ 'error', 'Server configuration:  Expected a valid logging configuration value.' ],
      [ 'error', 'Server not started.  No sites are running.' ]
    ],
    endOfExpectLogMessages:
    [
      [ 'error', 'Server not started.  No sites are running.' ]
    ],
    onServerStarted()
    {
      this.testPassed = false;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    },
  }
);

const test_019_configFile_emptyLogging = Object.assign(testUtils.makeFromBaseTest('Config file with empty logging'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);
      this.createFile('jscause.conf', '{\n  "sites": [1],\n  "logging": {}\n}\n');
    },
    expectedLogMessages:
    [
      [ 'error', 'Server configuration: Logging: directoryName: Cannot find directory:', 'prefix' ],
      [ 'error', 'Server not started.  No sites are running.' ]
    ],
    endOfExpectLogMessages:
    [
      [ 'error', 'Server not started.  No sites are running.' ]
    ],
    onServerStarted()
    {
      this.testPassed = false;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    },
  }
);

// If there is only one test, then there will be no need to put it in an array.
module.exports = [
  test_001_emptyDir,
  test_002_emptyConfigFile,
  test_003_configFileWithBrackets,
  test_004_emptyConfigFileSingleSpace,
  test_005_emptyConfigFileSingleNewLine,
  test_006_configFile_p,
  test_007_configFile_openingBracket,
  test_008_configFile_arrayOf1,
  test_009_configFile_singleInvalidKey,
  test_010_configFile_singleKeyInvalidVal,
  test_011_configFile_singleUnknownKey,
  test_012_configFile_invalidSitesKey,
  test_013_configFile_emptySitesValue,
  test_014_configFile_invalidSitesArray,
  test_015_configFile_sitesWithUnexpectedP,
  test_016_configFile_sitesWithUnexpectedComma,
  test_017_configFile_sitesWithUnknown,
  test_018_configFile_invalidLoggingValue,
  test_019_configFile_emptyLogging
];
