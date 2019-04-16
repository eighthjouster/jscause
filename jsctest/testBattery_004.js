'use strict';

const testUtils = require('./testBatteryUtils');

const test_004_001_siteConfInvalidLoggingKey = Object.assign(testUtils.makeFromBaseTest('Site config, invalid logging key'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);
      this.doEmptyTestDirectory();

      this.createFile('jscause.conf', '{\n  "sites": [\n    {\n      "name": "My Site",\n      "port": 3000,\n      "rootDirectoryName": "mysite"\n    }\n  ],\n  "logging": {}\n}\n');

      this.doCreateDirectoryFromPathList(['logs']);
      this.doCreateDirectoryFromPathList(['sites']);
      this.doCreateDirectoryFromPathList(['sites', 'mysite']);
      this.doCreateDirectoryFromPathList(['sites', 'mysite', 'configuration']);
      this.doCreateDirectoryFromPathList(['sites', 'mysite', 'workbench']);

      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], '{\n  "hostName": "jscausesite1",\n  "canUpload": false,\n  "maxPayloadSizeBytes": 0,\n  "jscpExtensionRequired": "optional",\n  "httpPoweredByHeader": "include",\n  "httpsCertFile": "jscause-cert.pem",\n  "httpsKeyFile": "jscause-key.pem",\n  "tempWorkDirectory": "./workbench",\n  "mimeTypes": {},\n  "logging": {\n    "random": "random"\n  }\n}\n');
    },
    expectedLogMessages:
    [
      [ 'error', 'Site configuration: Logging: \'random\' is not a valid configuration key.' ],
      [ 'error', 'Site \'My Site\' not started.' ],
      [ 'error', 'Server not started.  No sites are running.' ]
    ],
    onServerStarted()
    {
      this.testPassed = false;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_004_002_siteConfInvalidLoggingFileOutputKey = Object.assign(testUtils.makeFromBaseTest('Site config, invalid logging fileOutput key'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);

      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], '{\n  "hostName": "jscausesite1",\n  "canUpload": false,\n  "maxPayloadSizeBytes": 0,\n  "jscpExtensionRequired": "optional",\n  "httpPoweredByHeader": "include",\n  "tempWorkDirectory": "./workbench",\n  "mimeTypes": {},\n  "logging": {\n    "fileOutput": 1\n  }\n}\n');
    },
    expectedLogMessages:
    [
      [ 'error', 'Site configuration: Logging: fileoutput must be either \'enabled\' or \'disabled\'.' ],
      [ 'error', 'Site \'My Site\' not started.' ],
      [ 'error', 'Server not started.  No sites are running.' ]
    ],
    onServerStarted()
    {
      this.testPassed = false;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_004_003_siteConfInvalidLoggingConsoleOutputKey = Object.assign(testUtils.makeFromBaseTest('Site config, invalid logging consoleOutput key'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);

      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], '{\n  "hostName": "jscausesite1",\n  "canUpload": false,\n  "maxPayloadSizeBytes": 0,\n  "jscpExtensionRequired": "optional",\n  "httpPoweredByHeader": "include",\n  "tempWorkDirectory": "./workbench",\n  "mimeTypes": {},\n  "logging": {\n    "fileOutput": "disabled",\n    "consoleOutput": 1\n  }\n}\n');
    },
    expectedLogMessages:
    [
      [ 'error', 'Site configuration: Logging: consoleOutput must be either \'enabled\' or \'disabled\'.' ],
      [ 'error', 'Site \'My Site\' not started.' ],
      [ 'error', 'Server not started.  No sites are running.' ]
    ],
    onServerStarted()
    {
      this.testPassed = false;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_004_004_siteConfInvalidLoggingDirectoryNameKey = Object.assign(testUtils.makeFromBaseTest('Site config, invalid logging directoryName key'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);

      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], '{\n  "hostName": "jscausesite1",\n  "canUpload": false,\n  "maxPayloadSizeBytes": 0,\n  "jscpExtensionRequired": "optional",\n  "httpPoweredByHeader": "include",\n  "tempWorkDirectory": "./workbench",\n  "mimeTypes": {},\n  "logging": {\n    "directoryName": 1\n  }\n}\n');
    },
    expectedLogMessages:
    [
      [ 'error', 'Site configuration: \'My Site\' site logging: invalid directoryname.  String expected.' ],
      [ 'error', 'Site \'My Site\' not started.' ],
      [ 'error', 'Server not started.  No sites are running.' ]
    ],
    onServerStarted()
    {
      this.testPassed = false;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_004_005_siteConfEmptyLoggingDirectoryName = Object.assign(testUtils.makeFromBaseTest('Site config, empty logging directoryName'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);

      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], '{\n  "hostName": "jscausesite1",\n  "canUpload": false,\n  "maxPayloadSizeBytes": 0,\n  "jscpExtensionRequired": "optional",\n  "httpPoweredByHeader": "include",\n  "httpsCertFile": "jscause-cert.pem",\n  "httpsKeyFile": "jscause-key.pem",\n  "tempWorkDirectory": "./workbench",\n  "mimeTypes": {},\n  "logging": {\n    "directoryName": ""\n  }\n}\n');
    },
    expectedLogMessages:
    [
      [ 'error', 'Site configuration: Site \'My Site\': logging directoryname cannot be empty.' ],
      [ 'error', 'Site \'My Site\' not started.' ],
      [ 'error', 'Server not started.  No sites are running.' ]
    ],
    onServerStarted()
    {
      this.testPassed = false;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_004_006_siteConfMissingLoggingDirectory = Object.assign(testUtils.makeFromBaseTest('Site config, missing logging directory'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);

      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], '{\n  "hostName": "jscausesite1",\n  "canUpload": false,\n  "maxPayloadSizeBytes": 0,\n  "jscpExtensionRequired": "optional",\n  "httpPoweredByHeader": "include",\n  "httpsCertFile": "jscause-cert.pem",\n  "httpsKeyFile": "jscause-key.pem",\n  "tempWorkDirectory": "./workbench",\n  "mimeTypes": {},\n  "logging": {\n    "directoryName": "random"\n  }\n}\n');
    },
    expectedLogMessages:
    [
      [ 'error', 'Site configuration: \'My Site\' logging: directoryName: Cannot find directory:', 'prefix' ],
      [ 'error', 'Site \'My Site\' not started.' ],
      [ 'error', 'Server not started.  No sites are running.' ]
    ],
    onServerStarted()
    {
      this.testPassed = false;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_004_007_siteConfLoggingDirectoryAbsolutePath = Object.assign(testUtils.makeFromBaseTest('Site config, logging directory, absolute path'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);

      this.doCreateDirectoryFromPathList(['sites', 'mysite', 'localLogs']);

      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], '{\n  "logging": {\n    "directoryName": "/localLogs"\n  }\n}\n');
    },
    expectedLogMessages:
    [
      [ 'error', 'Site configuration: \'My Site\' site logging: directoryname must be a relative path.' ],
      [ 'error', 'Site \'My Site\' not started.' ],
      [ 'error', 'Server not started.  No sites are running.' ]
    ],
    onServerStarted()
    {
      this.testPassed = false;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_004_008_siteConfLoggingDirectoryRandomPath = Object.assign(testUtils.makeFromBaseTest('Site config, logging directory, random path'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);

      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], '{\n  "logging": {\n    "directoryName": "./randomDirectory"\n  }\n}\n');
    },
    expectedLogMessages:
    [
      [ 'error', 'Site configuration: \'My Site\' logging: directoryName: Cannot find directory:', 'prefix' ],
      [ 'error', 'Site \'My Site\' not started.' ],
      [ 'error', 'Server not started.  No sites are running.' ]
    ],
    onServerStarted()
    {
      this.testPassed = false;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_004_009_siteConfMissingWebsiteDirectory = Object.assign(testUtils.makeFromBaseTest('Site config, missing website directory'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);

      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], '{\n  "hostName": "jscausesite1",\n  "canUpload": false,\n  "maxPayloadSizeBytes": 0,\n  "jscpExtensionRequired": "optional",\n  "httpPoweredByHeader": "include",\n  "httpsCertFile": "jscause-cert.pem",\n  "httpsKeyFile": "jscause-key.pem",\n  "tempWorkDirectory": "./workbench",\n  "mimeTypes": {},\n  "logging": {\n    "fileOutput": "enabled",\n    "directoryName": "./localLogs",\n    "consoleOutput": "enabled"\n  }\n}\n');
    },
    expectedLogMessages:
    [
      [ 'error', 'Site \'My Site\': could not read directory: jsctest/testrootdir/sites/mysite/website' ],
      [ 'error', 'Site \'My Site\' not started.' ],
      [ 'error', 'Server not started.  No sites are running.' ]
    ],
    onServerStarted()
    {
      this.testPassed = false;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_004_010_siteConfNoLogFileSizeThresholdOnPerSite = Object.assign(testUtils.makeFromBaseTest('Site config, no logFileSizeThreshold on perSite logging section'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);

      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], '{\n  "hostName": "jscausesite1",\n  "canUpload": false,\n  "maxPayloadSizeBytes": 0,\n  "jscpExtensionRequired": "optional",\n  "httpPoweredByHeader": "include",\n  "httpsCertFile": "jscause-cert.pem",\n  "httpsKeyFile": "jscause-key.pem",\n  "tempWorkDirectory": "./workbench",\n  "mimeTypes": {},\n  "logging": {\n    "fileOutput": "enabled",\n    "directoryName": "./localLogs",\n    "consoleOutput": "enabled",\n    "logFileSizeThreshold": 0\n  }\n}\n');
    },
    expectedLogMessages:
    [
      [ 'error', 'Site configuration: \'My Site\' site logging: \'perSite\' section must not have a \'logfilesizethreshold\' configuration key.' ],
      [ 'error', 'Site \'My Site\' not started.' ],
      [ 'error', 'Server not started.  No sites are running.' ]
    ],
    onServerStarted()
    {
      this.testPassed = false;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_004_011_siteConfEmptyWebsite = Object.assign(testUtils.makeFromBaseTest('Site config, empty site, server runs'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);

      this.doCreateDirectoryFromPathList(['sites', 'mysite', 'website']);

      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], '{\n  "hostName": "jscausesite1",\n  "canUpload": false,\n  "maxPayloadSizeBytes": 0,\n  "jscpExtensionRequired": "optional",\n  "httpPoweredByHeader": "include",\n  "httpsCertFile": "jscause-cert.pem",\n  "httpsKeyFile": "jscause-key.pem",\n  "tempWorkDirectory": "./workbench",\n  "mimeTypes": {},\n  "logging": {\n    "fileOutput": "enabled",\n    "directoryName": "./localLogs",\n    "consoleOutput": "enabled"\n  }\n}\n');

      this.gotAllExpectedLogMsgs = false;
      this.serverDidStart = false;
    },
    expectedLogMessages:
    [
      [ 'info', 'Reading configuration for site \'My Site\' from \'jsctest/testrootdir/sites/mysite\'' ],
      [ 'info', 'Site \'My Site\' at http://jscausesite1:3000/ assigned to server 0' ],
      [ 'info', 'The following sites were set up successfully:' ],
      [ 'info', '\'My Site\'' ],
      [ 'info', 'Will start listening.' ],
      [ 'info', 'Server 0 listening on port 3000' ]
    ],
    expectedLogMessagesPass()
    {
      // We must override this because the default passes the test.
      // In this case, the test must pass if the server starts.
      this.gotAllExpectedLogMsgs = true;
      this.testPassed = !!this.serverDidStart && !!this.gotAllExpectedLogMsgs;
    },
    onServerStarted()
    {
      this.serverDidStart = true;
      this.testPassed = !!this.serverDidStart && !!this.gotAllExpectedLogMsgs;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

module.exports = [
  test_004_001_siteConfInvalidLoggingKey,
  test_004_002_siteConfInvalidLoggingFileOutputKey,
  test_004_003_siteConfInvalidLoggingConsoleOutputKey,
  test_004_004_siteConfInvalidLoggingDirectoryNameKey,
  test_004_005_siteConfEmptyLoggingDirectoryName,
  test_004_006_siteConfMissingLoggingDirectory,
  test_004_007_siteConfLoggingDirectoryAbsolutePath,
  test_004_008_siteConfLoggingDirectoryRandomPath,
  test_004_009_siteConfMissingWebsiteDirectory,
  test_004_010_siteConfNoLogFileSizeThresholdOnPerSite,
  test_004_011_siteConfEmptyWebsite
];
