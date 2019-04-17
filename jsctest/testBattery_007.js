'use strict';

const testUtils = require('./testBatteryUtils');

const test_007_001_serverSiteLogDiscrepanciesFileOutput = Object.assign(testUtils.makeFromBaseTest('Server and site logging discrepancies, fileOutput'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);
      this.doEmptyTestDirectory();

      this.doCreateDirectoryFromPathList(['logs']);
      this.doCreateDirectoryFromPathList(['sites']);
      this.doCreateDirectoryFromPathList(['sites', 'mysite']);
      this.doCreateDirectoryFromPathList(['sites', 'mysite', 'configuration']);
      this.doCreateDirectoryFromPathList(['sites', 'mysite', 'configuration', 'certs']);
      this.doCreateDirectoryFromPathList(['sites', 'mysite', 'workbench']);
      this.doCreateDirectoryFromPathList(['sites', 'mysite', 'localLogs']);
      this.doCreateDirectoryFromPathList(['sites', 'mysite', 'website']);

      this.createFile('jscause.conf', '{\n  "sites": [\n    {\n      "name": "My Site",\n      "port": 3000,\n      "rootDirectoryName": "mysite"\n    }\n  ],\n  "logging": {\n    "general": {\n      "fileOutput": "enabled"\n    },\n    "perSite": {\n      "fileOutput": "disabled"\n    }\n  }\n}\n');

      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], '{\n  "hostName": "jscausesite1",\n  "canUpload": false,\n  "maxPayloadSizeBytes": 0,\n  "jscpExtensionRequired": "optional",\n  "httpPoweredByHeader": "include",\n  "httpsCertFile": "jscause-cert.pem",\n  "httpsKeyFile": "jscause-key.pem",\n  "tempWorkDirectory": "./workbench",\n  "mimeTypes": {},\n  "logging": {\n    "directoryName": "./localLogs"\n  }\n}\n');

      this.gotAllExpectedLogMsgs = false;
      this.serverDidStart = false;
    },
    expectedLogMessages:
    [
      [ 'warning' , 'Site configuration: Site \'My Site\' has file logging enabled while the server has per-site file logging disabled.' ],
      [ 'warning' , '- Server configuration prevails.' ],
      [ 'info' , 'Server 0 listening on port 3000' ]
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

const test_007_002_serverSiteLogDiscrepanciesFileOutput2 = Object.assign(testUtils.makeFromBaseTest('Server and site logging discrepancies, fileOutput 2'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);

      this.createFile('jscause.conf', '{\n  "sites": [\n    {\n      "name": "My Site",\n      "port": 3000,\n      "rootDirectoryName": "mysite"\n    }\n  ],\n  "logging": {\n    "general": {\n      "fileOutput": "disabled"\n    },\n    "perSite": {\n      "fileOutput": "enabled"\n    }\n  }\n}\n');

      this.gotAllExpectedLogMsgs = false;
      this.serverDidStart = false;
    },
    expectedLogMessages:
    [
      [ 'info' , 'The following sites were set up successfully:' ],
      [ 'info' , '\'My Site\'' ],
      [ 'info' , 'Server 0 listening on port 3000' ]
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

const test_007_003_serverSiteLogDiscrepanciesFileOutput3 = Object.assign(testUtils.makeFromBaseTest('Server and site logging discrepancies, fileOutput 3'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);

      this.createFile('jscause.conf', '{\n  "sites": [\n    {\n      "name": "My Site",\n      "port": 3000,\n      "rootDirectoryName": "mysite"\n    }\n  ],\n  "logging": {\n    "general": {\n      "fileOutput": "enabled"\n    },\n    "perSite": {\n      "fileOutput": "enabled"\n    }\n  }\n}\n');

      this.gotAllExpectedLogMsgs = false;
      this.serverDidStart = false;
    },
    expectedLogMessages:
    [
      [ 'info' , 'The following sites were set up successfully:' ],
      [ 'info' , '\'My Site\'' ],
      [ 'info' , 'Server 0 listening on port 3000' ]
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

const test_007_004_serverSiteLogDiscrepanciesFileOutput4 = Object.assign(testUtils.makeFromBaseTest('Server and site logging discrepancies, fileOutput 4'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);

      this.createFile('jscause.conf', '{\n  "sites": [\n    {\n      "name": "My Site",\n      "port": 3000,\n      "rootDirectoryName": "mysite"\n    }\n  ],\n  "logging": {\n    "general": {\n      "fileOutput": "disabled"\n    },\n    "perSite": {\n      "fileOutput": "disabled"\n    }\n  }\n}\n');

      this.gotAllExpectedLogMsgs = false;
      this.serverDidStart = false;
    },
    expectedLogMessages:
    [
      [ 'warning' , 'Site configuration: Site \'My Site\' has file logging enabled while the server has per-site file logging disabled.' ],
      [ 'warning' , '- Server configuration prevails.' ],
      [ 'info' , 'Server 0 listening on port 3000' ]
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

const test_007_005_serverSiteLogDiscrepanciesConsoleOutput = Object.assign(testUtils.makeFromBaseTest('Server and site logging discrepancies, consoleOutput'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);

      this.createFile('jscause.conf', '{\n  "sites": [\n    {\n      "name": "My Site",\n      "port": 3000,\n      "rootDirectoryName": "mysite"\n    }\n  ],\n  "logging": {\n    "general": {\n      "consoleOutput": "enabled"\n    },\n    "perSite": {\n      "consoleOutput": "disabled"\n    }\n  }\n}\n');

      this.gotAllExpectedLogMsgs = false;
      this.serverDidStart = false;
    },
    expectedLogMessages:
    [
      [ 'warning' , 'Site configuration: Site \'My Site\' has console logging enabled while the server has per-site console logging disabled.' ],
      [ 'warning' , '- Server configuration prevails.' ],
      [ 'info' , 'Server 0 listening on port 3000' ]
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

const test_007_006_serverSiteLogDiscrepanciesConsoleOutput2 = Object.assign(testUtils.makeFromBaseTest('Server and site logging discrepancies, consoleOutput 2'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);

      this.createFile('jscause.conf', '{\n  "sites": [\n    {\n      "name": "My Site",\n      "port": 3000,\n      "rootDirectoryName": "mysite"\n    }\n  ],\n  "logging": {\n    "general": {\n      "consoleOutput": "disabled"\n    },\n    "perSite": {\n      "consoleOutput": "enabled"\n    }\n  }\n}\n');

      this.gotAllExpectedLogMsgs = false;
      this.serverDidStart = false;
    },
    expectedLogMessages:
    [
      [ 'info' , 'The following sites were set up successfully:' ],
      [ 'info' , '\'My Site\'' ],
      [ 'info' , 'Server 0 listening on port 3000' ]
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

const test_007_007_serverSiteLogDiscrepanciesConsoleOutput3 = Object.assign(testUtils.makeFromBaseTest('Server and site logging discrepancies, consoleOutput 3'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);

      this.createFile('jscause.conf', '{\n  "sites": [\n    {\n      "name": "My Site",\n      "port": 3000,\n      "rootDirectoryName": "mysite"\n    }\n  ],\n  "logging": {\n    "general": {\n      "consoleOutput": "enabled"\n    },\n    "perSite": {\n      "consoleOutput": "enabled"\n    }\n  }\n}\n');

      this.gotAllExpectedLogMsgs = false;
      this.serverDidStart = false;
    },
    expectedLogMessages:
    [
      [ 'info' , 'The following sites were set up successfully:' ],
      [ 'info' , '\'My Site\'' ],
      [ 'info' , 'Server 0 listening on port 3000' ]
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

const test_007_008_serverSiteLogDiscrepanciesConsoleOutput4 = Object.assign(testUtils.makeFromBaseTest('Server and site logging discrepancies, consoleOutput 4'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);

      this.createFile('jscause.conf', '{\n  "sites": [\n    {\n      "name": "My Site",\n      "port": 3000,\n      "rootDirectoryName": "mysite"\n    }\n  ],\n  "logging": {\n    "general": {\n      "consoleOutput": "disabled"\n    },\n    "perSite": {\n      "consoleOutput": "disabled"\n    }\n  }\n}\n');

      this.gotAllExpectedLogMsgs = false;
      this.serverDidStart = false;
    },
    expectedLogMessages:
    [
      [ 'warning' , 'Site configuration: Site \'My Site\' has console logging enabled while the server has per-site console logging disabled.' ],
      [ 'warning' , '- Server configuration prevails.' ],
      [ 'info' , 'Server 0 listening on port 3000' ]
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

const test_007_009_serverSiteLogDiscrepanciesFileOutput5 = Object.assign(testUtils.makeFromBaseTest('Config file with logging discrepancies, fileOutput 5'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);

      this.createFile('jscause.conf', '{\n  "sites": [\n    {\n      "name": "My Site",\n      "port": 3000,\n      "rootDirectoryName": "mysite"\n    }\n  ],\n  "logging": {\n    "perSite": {\n      "fileOutput": "disabled"\n    }\n  }\n}\n');
      
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], '{\n  "hostName": "jscausesite1",\n  "canUpload": false,\n  "maxPayloadSizeBytes": 0,\n  "jscpExtensionRequired": "optional",\n  "httpPoweredByHeader": "include",\n  "httpsCertFile": "jscause-cert.pem",\n  "httpsKeyFile": "jscause-key.pem",\n  "tempWorkDirectory": "./workbench",\n  "mimeTypes": {},\n  "logging": {\n    "directoryName": "./localLogs",\n    "fileOutput": "disabled"\n  }\n}\n');

      this.gotAllExpectedLogMsgs = false;
      this.serverDidStart = false;
    },
    expectedLogMessages:
    [
      [ 'info' , 'The following sites were set up successfully:' ],
      [ 'info' , '\'My Site\'' ],
      [ 'info' , 'Server 0 listening on port 3000' ]
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

const test_007_010_serverSiteLogDiscrepanciesConsoleOutput5 = Object.assign(testUtils.makeFromBaseTest('Config file with logging discrepancies, consoleOutput 5'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);

      this.createFile('jscause.conf', '{\n  "hostName": "jscausesite1",\n  "canUpload": false,\n  "maxPayloadSizeBytes": 0,\n  "jscpExtensionRequired": "optional",\n  "httpPoweredByHeader": "include",\n  "httpsCertFile": "jscause-cert.pem",\n  "httpsKeyFile": "jscause-key.pem",\n  "tempWorkDirectory": "./workbench",\n  "mimeTypes": {},\n  "logging": {\n    "directoryName": "./localLogs",\n    "fileOutput": "disabled"\n  }\n}\n');
      
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], '{\n  "hostName": "jscausesite1",\n  "canUpload": false,\n  "maxPayloadSizeBytes": 0,\n  "jscpExtensionRequired": "optional",\n  "httpPoweredByHeader": "include",\n  "httpsCertFile": "jscause-cert.pem",\n  "httpsKeyFile": "jscause-key.pem",\n  "tempWorkDirectory": "./workbench",\n  "mimeTypes": {},\n  "logging": {\n    "directoryName": "./localLogs",\n    "consoleOutput": "disabled"\n  }\n}\n');

      this.gotAllExpectedLogMsgs = false;
      this.serverDidStart = false;
    },
    expectedLogMessages:
    [
      [ 'info' , 'The following sites were set up successfully:' ],
      [ 'info' , '\'My Site\'' ],
      [ 'info' , 'Server 0 listening on port 3000' ]
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

const test_007_011_serverSiteLogDiscrepanciesFileConsoleOutput = Object.assign(testUtils.makeFromBaseTest('Config file with logging discrepancies, fileOutput, consoleOutput'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);

      this.createFile('jscause.conf', '{\n  "sites": [\n    {\n      "name": "My Site",\n      "port": 3000,\n      "rootDirectoryName": "mysite"\n    }\n  ],\n  "logging": {\n    "perSite": {\n      "fileOutput": "disabled",\n      "consoleOutput": "disabled"\n    }\n  }\n}\n');
      
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], '{\n  "hostName": "jscausesite1",\n  "canUpload": false,\n  "maxPayloadSizeBytes": 0,\n  "jscpExtensionRequired": "optional",\n  "httpPoweredByHeader": "include",\n  "httpsCertFile": "jscause-cert.pem",\n  "httpsKeyFile": "jscause-key.pem",\n  "tempWorkDirectory": "./workbench",\n  "mimeTypes": {},\n  "logging": {\n    "directoryName": "./localLogs",\n    "fileOutput": "enabled",\n    "consoleOutput": "enabled"\n  }\n}\n');

      this.gotAllExpectedLogMsgs = false;
      this.serverDidStart = false;
    },
    expectedLogMessages:
    [
      [ 'warning' , 'Site configuration: Site \'My Site\' has file logging enabled while the server has per-site file logging disabled.' ],
      [ 'warning' , 'Site configuration: Site \'My Site\' has console logging enabled while the server has per-site console logging disabled.' ],
      [ 'warning' , '- Server configuration prevails.' ],
      [ 'info' , 'Server 0 listening on port 3000' ]
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
  test_007_001_serverSiteLogDiscrepanciesFileOutput,
  test_007_002_serverSiteLogDiscrepanciesFileOutput2,
  test_007_003_serverSiteLogDiscrepanciesFileOutput3,
  test_007_004_serverSiteLogDiscrepanciesFileOutput4,
  test_007_005_serverSiteLogDiscrepanciesConsoleOutput,
  test_007_006_serverSiteLogDiscrepanciesConsoleOutput2,
  test_007_007_serverSiteLogDiscrepanciesConsoleOutput3,
  test_007_008_serverSiteLogDiscrepanciesConsoleOutput4,
  test_007_009_serverSiteLogDiscrepanciesFileOutput5,
  test_007_010_serverSiteLogDiscrepanciesConsoleOutput5,
  test_007_011_serverSiteLogDiscrepanciesFileConsoleOutput
];
