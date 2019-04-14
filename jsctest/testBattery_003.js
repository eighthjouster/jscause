'use strict';

const testUtils = require('./testBatteryUtils');

const test_003_001_siteDirJsonMissing = Object.assign(testUtils.makeFromBaseTest('Site dir exists, json missing'),
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
      this.doCreateDirectoryFromPathList(['sites', 'mysite', 'workbench']);
    },
    expectedLogMessages:
    [
      [ 'error', 'Cannot find configuration/site.json file.' ],
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

const test_003_002_emptySiteConf = Object.assign(testUtils.makeFromBaseTest('Empty site config'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);

      this.doCreateDirectoryFromPathList(['sites', 'mysite', 'configuration']);

      this.createFile('jscause.conf', '{\n  "sites": [\n    {\n      "name": "My Site",\n      "port": 3000,\n      "rootDirectoryName": "mysite"\n    }\n  ],\n  "logging": {}\n}\n');
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], '');
    },
    expectedLogMessages:
    [
      [ 'error', 'Site configuration: Site \'My Site\': site.json is invalid.' ],
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

const test_003_003_emptySiteConfBrackets = Object.assign(testUtils.makeFromBaseTest('Empty site config, with brackets'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);

      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], '{}');
    },
    expectedLogMessages:
    [
      [ 'error', 'Site configuration:  The following configuration attributes were not found:' ],
      [ 'error', '- logging' ],
      [ 'error', '- hostname' ],
      [ 'error', '- canupload' ],
      [ 'error', '- maxpayloadsizebytes' ],
      [ 'error', '- mimetypes' ],
      [ 'error', '- tempworkdirectory' ],
      [ 'error', '- jscpextensionrequired' ],
      [ 'error', '- httppoweredbyheader' ],
      [ 'error', 'Site \'My Site\' not started.' ],
      [ 'error', 'Server not started.  No sites are running.' ],
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
  test_003_001_siteDirJsonMissing,
  test_003_002_emptySiteConf,
  test_003_003_emptySiteConfBrackets
];
