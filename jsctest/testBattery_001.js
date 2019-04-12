'use strict';

function makeTest(testName)
{
  return {
    only: false,
    testName,
    onTestBeforeStart()
    {
      // Here we set up the test.  Config files, sample files, etc.
      // Announcing that we are about to start this particular test might
      // help with debugging.
  
      console.log(`Starting test: ${this.testName}`);
    },
    expectedLogMessagesPass()
    {
      // We got all the sequence of log messages we were expecting.
      // It's generally a good thing.  But it will depened on the test.
      this.testPassed = true;
    },
    expectedLogMessagesFail()
    {
      // We never got the sequence of log messages we were expecting.
      // It's generally a bad thing.  But it will depened on the test.
      this.testPassed = false;
    },
    onServerStarted()
    {
      // The server started okay.  It might be good or bad, depending on the test.
    },
    onServerError()
    {
      // return 'The server emitted an error.  It might be good or bad, depending on the test.';
    },
    onTestEnd()
    {
      // Here we tear down the test.  Config files, sample files, etc
      // that are no longer needed.
      // Announcing that we are finishing this particular test might
      // help with debugging.
      //
      console.log(`Finished test: ${this.testName}`);
    }
  };
}

const test_001_emptyDir = Object.assign(makeTest('Empty app dir'),
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

const test_002_emptyConfigFile = Object.assign(makeTest('Empty config file'),
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

const test_003_configFileWithBrackets = Object.assign(makeTest('Config file with brackets'),
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

const test_004_emptyConfigFileSingleSpace = Object.assign(makeTest('Empty config file with just one single space'),
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

const test_005_emptyConfigFileSingleNewLine = Object.assign(makeTest('Empty config file with just one single new line'),
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

const test_006_configFile_p = Object.assign(makeTest('Config file with just the p letter'),
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

const test_007_configFile_openingBracket = Object.assign(makeTest('Config file with just the opening curly bracket'),
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

const test_008_configFile_arrayOf1 = Object.assign(makeTest('Config file with just an array [1]'),
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

const test_009_configFile_singleInvalidKey = Object.assign(makeTest('Config file with just an unknown key'),
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

const test_010_configFile_singleKeyInvalidVal = Object.assign(makeTest('Config file with unknown key and invalid value'),
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

const test_011_configFile_singleUnknownKey = Object.assign(makeTest('Config file with unknown key'),
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

const test_012_configFile_invalidSitesKey = Object.assign(makeTest('Config file with invalid sites key'),
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

const test_013_configFile_emptySitesValue = Object.assign(makeTest('Config file with an empty sites value'),
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

const test_014_configFile_invalidSitesArray = Object.assign(makeTest('Config file with an invalid array value'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);
      this.createFile('jscause.conf', '{\n  "sites": [1]\n}\n');
    },
    expectedLogMessages:
    [
      [ 'error', 'Site configuration: Missing name.' ],
      [ 'error', 'Site (no name) not started.' ],
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
  test_014_configFile_invalidSitesArray
];
