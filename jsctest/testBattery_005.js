'use strict';

const testUtils = require('./testBatteryUtils');

const test_005_001_configFileInvalidEnableHTTPS = Object.assign(testUtils.makeFromBaseTest('Config file with invalid enableHTTPS'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);
      this.doEmptyTestDirectory();

      this.createFile('jscause.conf', '{\n  "sites": [\n    {\n      "name": "My Site",\n      "port": 3000,\n      "rootDirectoryName": "mysite",\n      "enableHTTPS": 0\n    }\n  ],\n  "logging": {}\n}\n');

      this.doCreateDirectoryFromPathList(['logs']);
      this.doCreateDirectoryFromPathList(['sites']);
      this.doCreateDirectoryFromPathList(['sites', 'mysite']);
      this.doCreateDirectoryFromPathList(['sites', 'mysite', 'configuration']);
      this.doCreateDirectoryFromPathList(['sites', 'mysite', 'workbench']);
      this.doCreateDirectoryFromPathList(['sites', 'mysite', 'localLogs']);
      this.doCreateDirectoryFromPathList(['sites', 'mysite', 'website']);

      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], '{\n  "hostName": "jscausesite1",\n  "canUpload": false,\n  "maxPayloadSizeBytes": 0,\n  "jscpExtensionRequired": "optional",\n  "httpPoweredByHeader": "include",\n  "httpsCertFile": "jscause-cert.pem",\n  "httpsKeyFile": "jscause-key.pem",\n  "tempWorkDirectory": "./workbench",\n  "mimeTypes": {},\n  "logging": {\n    "fileOutput": "enabled",\n    "directoryName": "./localLogs",\n    "consoleOutput": "enabled"\n  }\n}\n');
    },
    expectedLogMessages:
    [
      [ 'error', 'Site configuration: Site name \'My Site\' has an invalid \'enablehttps\' value.  Boolean expected.' ],
      [ 'error', 'Site \'My Site\' not started.' ],
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

const test_005_002_configFileInvalidLoggingGeneral = Object.assign(testUtils.makeFromBaseTest('Config file with invalid logging general section'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);

      this.createFile('jscause.conf', '{\n  "sites": [\n    {\n      "name": "My Site",\n      "port": 3000,\n      "rootDirectoryName": "mysite"\n    }\n  ],\n  "logging": {\n    "general": ""\n  }\n}\n');
    },
    expectedLogMessages:
    [
      [ 'error', 'Configuration: logging:  Invalid value for general.  Object expected.' ],
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

const test_005_003_configFileInvalidLoggingLogFileSizeThreshold = Object.assign(testUtils.makeFromBaseTest('Config file with invalid logging logFileSizeThreshold'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);

      this.createFile('jscause.conf', '{\n  "sites": [\n    {\n      "name": "My Site",\n      "port": 3000,\n      "rootDirectoryName": "mysite",\n      "enableHTTPS": false\n    }\n  ],\n  "logging": {\n    "general": {\n      "fileOutput": "enabled",\n      "directoryName": "logs",\n      "consoleOutput": "enabled",\n      "logFileSizeThreshold": ""\n    }\n  }\n}\n');
    },
    expectedLogMessages:
    [
      [ 'error', 'Site configuration: Logging: \'logfilesizethreshold\' is invalid.  Integer number expected.' ],
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

const test_005_004_configFilePositiveLoggingLogFileSizeThreshold = Object.assign(testUtils.makeFromBaseTest('Config file with positive logging logFileSizeThreshold'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);

      this.createFile('jscause.conf', '{\n  "sites": [\n    {\n      "name": "My Site",\n      "port": 3000,\n      "rootDirectoryName": "mysite",\n      "enableHTTPS": false\n    }\n  ],\n  "logging": {\n    "general": {\n      "fileOutput": "enabled",\n      "directoryName": "logs",\n      "consoleOutput": "enabled",\n      "logFileSizeThreshold": -1\n    }\n  }\n}\n');
    },
    expectedLogMessages:
    [
      [ 'error', 'Site configuration: Logging: \'logfilesizethreshold\' must be 0 or greater.' ],
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
  test_005_001_configFileInvalidEnableHTTPS,
  test_005_002_configFileInvalidLoggingGeneral,
  test_005_003_configFileInvalidLoggingLogFileSizeThreshold,
  test_005_004_configFilePositiveLoggingLogFileSizeThreshold
];
