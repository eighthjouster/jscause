'use strict';

const test_001_emptyDir =
{
  // only: true,
  testName: 'Empty app dir',
  onTestBeforeStart()
  {
    // Here we set up the test.  Config files, sample files, etc.
    // Announcing that we are about to start this particular test might
    // help with debugging.

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
    this.testPassed = false;
    this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
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

const test_002_emptyConfigFile =
{
  // only: true,
  testName: 'Empty config file',
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
  expectedLogMessagesPass()
  {
    this.testPassed = true;
  },
  expectedLogMessagesFail()
  {
    this.testPassed = false;
  },
  onServerStarted()
  {
    this.testPassed = false;
    this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
  },
  onServerError()
  {
  },
  onTestEnd()
  {
    console.log(`Finished test: ${this.testName}`);
  }
};

const test_003_configFileWithBrackets =
{
  // only: true,
  testName: 'Config file with brackets',
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
  expectedLogMessagesPass()
  {
    this.testPassed = true;
  },
  expectedLogMessagesFail()
  {
    this.testPassed = false;
  },
  onServerStarted()
  {
    this.testPassed = false;
    this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
  },
  onServerError()
  {
  },
  onTestEnd()
  {
    console.log(`Finished test: ${this.testName}`);
  }
};

const test_004_emptyConfigFileSingleSpace =
{
  // only: true,
  testName: 'Empty config file with just one single space',
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
  expectedLogMessagesPass()
  {
    this.testPassed = true;
  },
  expectedLogMessagesFail()
  {
    this.testPassed = false;
  },
  onServerStarted()
  {
    this.testPassed = false;
    this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
  },
  onServerError()
  {
  },
  onTestEnd()
  {
    console.log(`Finished test: ${this.testName}`);
  }
};

const test_005_emptyConfigFileSingleNewLine =
{
  // only: true,
  testName: 'Empty config file with just one single new line',
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
  expectedLogMessagesPass()
  {
    this.testPassed = true;
  },
  expectedLogMessagesFail()
  {
    this.testPassed = false;
  },
  onServerStarted()
  {
    this.testPassed = false;
    this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
  },
  onServerError()
  {
  },
  onTestEnd()
  {
    console.log(`Finished test: ${this.testName}`);
  }
};

const test_006_configFile_p =
{
  // only: true,
  testName: 'Config file with just the p letter',
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
  expectedLogMessagesPass()
  {
    this.testPassed = true;
  },
  expectedLogMessagesFail()
  {
    this.testPassed = false;
  },
  onServerStarted()
  {
    this.testPassed = false;
    this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
  },
  onServerError()
  {
  },
  onTestEnd()
  {
    console.log(`Finished test: ${this.testName}`);
  }
};

const test_007_configFile_openingBracket =
{
  // only: true,
  testName: 'Config file with just the opening curly bracket',
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
  expectedLogMessagesPass()
  {
    this.testPassed = true;
  },
  expectedLogMessagesFail()
  {
    this.testPassed = false;
  },
  onServerStarted()
  {
    this.testPassed = false;
    this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
  },
  onServerError()
  {
  },
  onTestEnd()
  {
    console.log(`Finished test: ${this.testName}`);
  }
};

const test_008_configFile_arrayOf1 =
{
  // only: true,
  testName: 'Config file with just an array [1]',
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
  expectedLogMessagesPass()
  {
    this.testPassed = true;
  },
  expectedLogMessagesFail()
  {
    this.testPassed = false;
  },
  onServerStarted()
  {
    this.testPassed = false;
    this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
  },
  onServerError()
  {
  },
  onTestEnd()
  {
    console.log(`Finished test: ${this.testName}`);
  }
};

const test_009_configFile_singleInvalidKey =
{
  // only: true,
  testName: 'Config file with just an unknown key',
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
  expectedLogMessagesPass()
  {
    this.testPassed = true;
  },
  expectedLogMessagesFail()
  {
    this.testPassed = false;
  },
  onServerStarted()
  {
    this.testPassed = false;
    this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
  },
  onServerError()
  {
  },
  onTestEnd()
  {
    console.log(`Finished test: ${this.testName}`);
  }
};

const test_010_configFile_singleKeyInvalidVal =
{
  // only: true,
  testName: 'Config file with unknown key and invalid value',
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
  expectedLogMessagesPass()
  {
    this.testPassed = true;
  },
  expectedLogMessagesFail()
  {
    this.testPassed = false;
  },
  onServerStarted()
  {
    this.testPassed = false;
    this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
  },
  onServerError()
  {
  },
  onTestEnd()
  {
    console.log(`Finished test: ${this.testName}`);
  }
};

const test_011_configFile_singleUnknownKey =
{
  // only: true,
  testName: 'Config file with unknown key',
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
  expectedLogMessagesPass()
  {
    this.testPassed = true;
  },
  expectedLogMessagesFail()
  {
    this.testPassed = false;
  },
  onServerStarted()
  {
    this.testPassed = false;
    this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
  },
  onServerError()
  {
  },
  onTestEnd()
  {
    console.log(`Finished test: ${this.testName}`);
  }
};

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
  test_011_configFile_singleUnknownKey
];
