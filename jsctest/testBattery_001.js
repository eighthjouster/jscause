'use strict';

const test_001_emptyDir =
{
  // only: true,
  testName: 'Empty app dir',
  expectedLogMessages:
  [
    [ 'error', 'Cannot find jscause.conf file.' ],
    [ 'error', 'Server not started.  No sites are running.' ]
  ],
  endOfExpectLogMessages:
  [
    [ 'error', 'Server not started.  No sites are running.' ]
  ],
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
  expectedLogMessages:
  [
    [ 'error', 'Server not started.  No sites are running.' ]
  ],
  endOfExpectLogMessages:
  [
    [ 'error', 'Server not started.  No sites are running.' ]
  ],
  onTestBeforeStart()
  {
    console.log(`Starting test: ${this.testName}`);
    this.createFile('jscause.conf', '');
  },
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

const test_003_emptyConfigFileWithBrackets =
{
  // only: true,
  testName: 'Empty config file with brackets',
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
  onTestBeforeStart()
  {
    console.log(`Starting test: ${this.testName}`);
    this.createFile('jscause.conf', '{}');
  },
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
  test_003_emptyConfigFileWithBrackets
];
