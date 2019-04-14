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

const test_003_004_siteConfInvalidHostname = Object.assign(testUtils.makeFromBaseTest('Site config: Invalid host name'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);

      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], '{\n  "hostName": 1\n}\n');
    },
    expectedLogMessages:
    [
      [ 'error', 'Site configuration:  Invalid hostname.  String value expected.' ],
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

const test_003_005_siteConfEmptyHostname = Object.assign(testUtils.makeFromBaseTest('Site config: Empty host name'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);

      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], '{\n  "hostName": ""\n}\n');
    },
    expectedLogMessages:
    [
      [ 'error', 'Site configuration:  hostname cannot be empty.' ],
      [ 'error', 'Site configuration:  The following configuration attributes were not found:' ],
      [ 'error', '- logging' ],
      [ 'error', '- canupload' ],
      [ 'error', '- maxpayloadsizebytes' ],
      [ 'error', '- mimetypes' ],
      [ 'error', '- tempworkdirectory' ],
      [ 'error', '- jscpextensionrequired' ],
      [ 'error', '- httppoweredbyheader' ],
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

const test_003_006_siteConfNotfoundCanUpload = Object.assign(testUtils.makeFromBaseTest('Site config: canupload not found'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);

      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], '{\n  "hostName": "jscausesite1"\n}\n');
    },
    expectedLogMessages:
    [
      [ 'error', 'Site configuration:  The following configuration attributes were not found:' ],
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

const test_003_007_siteConfInvalidCanUpload = Object.assign(testUtils.makeFromBaseTest('Site config: invalid canupload'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);

      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], '{\n  "hostName": "jscausesite1",\n  "canUpload": ""\n}\n');
    },
    expectedLogMessages:
    [
      [ 'error', 'Site configuration:  Invalid canupload.  Boolean expected.' ],
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

const test_003_008_siteConfInvalidMaxPayloadSizeBytes = Object.assign(testUtils.makeFromBaseTest('Site config: invalid maxPayLoadSizeBytes'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);

      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], '{\n  "hostName": "jscausesite1",\n  "canUpload": false,\n  "maxPayloadSizeBytes": ""\n}\n');
    },
    expectedLogMessages:
    [
      [ 'error', 'Site configuration:  Invalid maxpayloadsizebytes.  Integer number expected.' ],
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

const test_003_009_siteConfInvalidJscpExtensionRequired = Object.assign(testUtils.makeFromBaseTest('Site config: invalid jscpExtensionRequired'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);

      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], '{\n  "hostName": "jscausesite1",\n  "canUpload": false,\n  "maxPayloadSizeBytes": 0,\n  "jscpExtensionRequired": 1\n}\n');
    },
    expectedLogMessages:
    [
      [ 'error', 'Site configuration:  Invalid jscpextensionrequired.  String value expected.' ],
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

const test_003_010_siteConfEmptyJscpExtensionRequired = Object.assign(testUtils.makeFromBaseTest('Site config: empty jscpExtensionRequired'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);

      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], '{\n  "hostName": "jscausesite1",\n  "canUpload": false,\n  "maxPayloadSizeBytes": 0,\n  "jscpExtensionRequired": ""\n}\n');
    },
    expectedLogMessages:
    [
      [ 'error', 'Site configuration:  jscpextensionrequired cannot be empty.  Use \'never\' (recommended), \'optional\' or \'always\'.' ],
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

const test_003_011_siteConfInvalidJscpExtensionRequiredValue = Object.assign(testUtils.makeFromBaseTest('Site config: invalid jscpExtensionRequired value'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);

      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], '{\n  "hostName": "jscausesite1",\n  "canUpload": false,\n  "maxPayloadSizeBytes": 0,\n  "jscpExtensionRequired": "random"\n}\n');
    },
    expectedLogMessages:
    [
      [ 'error', 'Site configuration:  invalid jscpextensionrequired value.  Use \'never\' (recommended), \'optional\' or \'always\'.' ],
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

const test_003_012_siteConfInvalidhttpPoweredByHeader = Object.assign(testUtils.makeFromBaseTest('Site config: invalid httpPoweredByHeader'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);

      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], '{\n  "hostName": "jscausesite1",\n  "canUpload": false,\n  "maxPayloadSizeBytes": 0,\n  "jscpExtensionRequired": "optional",\n  "httpPoweredByHeader": 1\n}\n');
    },
    expectedLogMessages:
    [
      [ 'error', 'Site configuration:  Invalid httppoweredbyheader.  String value expected.' ],
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
  test_003_003_emptySiteConfBrackets,
  test_003_004_siteConfInvalidHostname,
  test_003_005_siteConfEmptyHostname,
  test_003_006_siteConfNotfoundCanUpload,
  test_003_007_siteConfInvalidCanUpload,
  test_003_008_siteConfInvalidMaxPayloadSizeBytes,
  test_003_009_siteConfInvalidJscpExtensionRequired,
  test_003_010_siteConfEmptyJscpExtensionRequired,
  test_003_011_siteConfInvalidJscpExtensionRequiredValue,
  test_003_012_siteConfInvalidhttpPoweredByHeader
];
