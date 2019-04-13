'use strict';

const testUtils = require('./testBatteryUtils');

const test_002_001_emptyLogsDirectory = Object.assign(testUtils.makeFromBaseTest('Empty logs dir'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);
      this.doCreateDirectoryFromPathList(['logs']);
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
    }
  }
);


module.exports = [
  test_002_001_emptyLogsDirectory
];
