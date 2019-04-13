'use strict';

const testUtils = require('./testBatteryUtils');

// This battery depends on Test Batter 001 to pass in its entirety.

const test_002_001_emptyLogsDirectory = Object.assign(testUtils.makeFromBaseTest('Empty logs dir'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);
      this.doRemoveDirectoryFromPathList('logs', { ignoreIfMissing: true });
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

const test_002_002_emptySiteConfig = Object.assign(testUtils.makeFromBaseTest('Empty site config'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);
      this.createFile('jscause.conf', '{\n  "sites": [\n    {\n    },\n  ],\n  "logging": {}\n}\n');
    },
    expectedLogMessages:
    [
      [ 'error', 'Invalid jscause.conf file format.' ],
      [ 'error', 'Unexpected token ] in JSON at position 18' ],
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
  test_002_001_emptyLogsDirectory,
  test_002_002_emptySiteConfig
];
