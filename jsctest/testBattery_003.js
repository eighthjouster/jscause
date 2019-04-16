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
    onServerStarted()
    {
      this.testPassed = false;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_003_012_siteConfInvalidHttpPoweredByHeader = Object.assign(testUtils.makeFromBaseTest('Site config: invalid httpPoweredByHeader'),
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
    onServerStarted()
    {
      this.testPassed = false;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_003_013_siteConfEmptyHttpPoweredByHeader = Object.assign(testUtils.makeFromBaseTest('Site config: empty httpPoweredByHeader'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);

      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], '{\n  "hostName": "jscausesite1",\n  "canUpload": false,\n  "maxPayloadSizeBytes": 0,\n  "jscpExtensionRequired": "optional",\n  "httpPoweredByHeader": ""\n}\n');
    },
    expectedLogMessages:
    [
      [ 'error', 'Site configuration:  httppoweredbyheader cannot be empty.  Use \'include\' or \'exclude\'.' ],
      [ 'error', 'Site \'My Site\' not started.' ],
      [ 'error', 'Server not started.  No sites are running.' ],
    ],
    onServerStarted()
    {
      this.testPassed = false;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_003_014_siteConfInvalidHttpPoweredByHeaderValue = Object.assign(testUtils.makeFromBaseTest('Site config: invalid httpPoweredByHeader value'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);

      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], '{\n  "hostName": "jscausesite1",\n  "canUpload": false,\n  "maxPayloadSizeBytes": 0,\n  "jscpExtensionRequired": "optional",\n  "httpPoweredByHeader": "random"\n}\n');
    },
    expectedLogMessages:
    [
      [ 'error', 'Site configuration:  invalid httppoweredbyheader value.  Use \'include\' or \'exclude\'.' ],
      [ 'error', 'Site \'My Site\' not started.' ],
      [ 'error', 'Server not started.  No sites are running.' ],
    ],
    onServerStarted()
    {
      this.testPassed = false;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_003_015_siteConfInvalidHttpsCertFile = Object.assign(testUtils.makeFromBaseTest('Site config: invalid httpsCertFile'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);

      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], '{\n  "hostName": "jscausesite1",\n  "canUpload": false,\n  "maxPayloadSizeBytes": 0,\n  "jscpExtensionRequired": "optional",\n  "httpPoweredByHeader": "include",\n  "httpsCertFile": 1\n}\n');
    },
    expectedLogMessages:
    [
      [ 'error', 'Site configuration:  Invalid httpscertfile.  String value expected.' ],
      [ 'error', 'Site \'My Site\' not started.' ],
      [ 'error', 'Server not started.  No sites are running.' ],
    ],
    onServerStarted()
    {
      this.testPassed = false;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_003_016_siteConfEmptyHttpsCertFile = Object.assign(testUtils.makeFromBaseTest('Site config: empty httpsCertFile'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);

      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], '{\n  "hostName": "jscausesite1",\n  "canUpload": false,\n  "maxPayloadSizeBytes": 0,\n  "jscpExtensionRequired": "optional",\n  "httpPoweredByHeader": "include",\n  "httpsCertFile": ""\n}\n');
    },
    expectedLogMessages:
    [
      [ 'error', 'Site configuration:  httpscertfile cannot be empty.' ],
      [ 'error', 'Site \'My Site\' not started.' ],
      [ 'error', 'Server not started.  No sites are running.' ],
    ],
    onServerStarted()
    {
      this.testPassed = false;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_003_017_siteConfInvalidHttpsKeyFile = Object.assign(testUtils.makeFromBaseTest('Site config: invalid httpsKeyFile'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);

      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], '{\n  "hostName": "jscausesite1",\n  "canUpload": false,\n  "maxPayloadSizeBytes": 0,\n  "jscpExtensionRequired": "optional",\n  "httpPoweredByHeader": "include",\n  "httpsCertFile": "jscause-cert.pem",\n  "httpsKeyFile": 1\n}\n');
    },
    expectedLogMessages:
    [
      [ 'error', 'Site configuration:  Invalid httpskeyfile.  String value expected.' ],
      [ 'error', 'Site \'My Site\' not started.' ],
      [ 'error', 'Server not started.  No sites are running.' ],
    ],
    onServerStarted()
    {
      this.testPassed = false;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_003_018_siteConfEmptyHttpsKeyFile = Object.assign(testUtils.makeFromBaseTest('Site config: empty httpsKeyFile'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);

      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], '{\n  "hostName": "jscausesite1",\n  "canUpload": false,\n  "maxPayloadSizeBytes": 0,\n  "jscpExtensionRequired": "optional",\n  "httpPoweredByHeader": "include",\n  "httpsCertFile": "jscause-cert.pem",\n  "httpsKeyFile": ""\n}\n');
    },
    expectedLogMessages:
    [
      [ 'error', 'Site configuration:  httpskeyfile cannot be empty.' ],
      [ 'error', 'Site \'My Site\' not started.' ],
      [ 'error', 'Server not started.  No sites are running.' ],
    ],
    onServerStarted()
    {
      this.testPassed = false;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_003_019_siteConfInvalidTempWorkDirectory = Object.assign(testUtils.makeFromBaseTest('Site config: invalid tempWorkDirectory'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);

      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], '{\n  "hostName": "jscausesite1",\n  "canUpload": false,\n  "maxPayloadSizeBytes": 0,\n  "jscpExtensionRequired": "optional",\n  "httpPoweredByHeader": "include",\n  "httpsCertFile": "jscause-cert.pem",\n  "httpsKeyFile": "jscause-key.pem",\n  "tempWorkDirectory": 1\n}\n');
    },
    expectedLogMessages:
    [
      [ 'error', 'Site configuration:  Invalid tempworkdirectory.  String value expected.' ],
      [ 'error', 'Site \'My Site\' not started.' ],
      [ 'error', 'Server not started.  No sites are running.' ],
    ],
    onServerStarted()
    {
      this.testPassed = false;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_003_020_siteConfEmptyTempWorkDirectory = Object.assign(testUtils.makeFromBaseTest('Site config: empty tempWorkDirectory'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);

      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], '{\n  "hostName": "jscausesite1",\n  "canUpload": false,\n  "maxPayloadSizeBytes": 0,\n  "jscpExtensionRequired": "optional",\n  "httpPoweredByHeader": "include",\n  "httpsCertFile": "jscause-cert.pem",\n  "httpsKeyFile": "jscause-key.pem",\n  "tempWorkDirectory": ""\n}\n');
    },
    expectedLogMessages:
    [
      [ 'error', 'Site configuration:  tempworkdirectory cannot be empty.' ],
      [ 'error', 'Site \'My Site\' not started.' ],
      [ 'error', 'Server not started.  No sites are running.' ],
    ],
    onServerStarted()
    {
      this.testPassed = false;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_003_021_siteConfInvalidMimeTypes = Object.assign(testUtils.makeFromBaseTest('Site config: invalid mimeTypes'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);

      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], '{\n  "hostName": "jscausesite1",\n  "canUpload": false,\n  "maxPayloadSizeBytes": 0,\n  "jscpExtensionRequired": "optional",\n  "httpPoweredByHeader": "include",\n  "httpsCertFile": "jscause-cert.pem",\n  "httpsKeyFile": "jscause-key.pem",\n  "tempWorkDirectory": "./workbench",\n  "mimeTypes": 1\n}\n');
    },
    expectedLogMessages:
    [
      [ 'error', 'Site configuration:  Invalid mimetypes.  Object expected.' ],
      [ 'error', 'Site \'My Site\' not started.' ],
      [ 'error', 'Server not started.  No sites are running.' ],
    ],
    onServerStarted()
    {
      this.testPassed = false;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_003_022_siteConfMissingLogging = Object.assign(testUtils.makeFromBaseTest('Site config: missing logging'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);

      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], '{\n  "hostName": "jscausesite1",\n  "canUpload": false,\n  "maxPayloadSizeBytes": 0,\n  "jscpExtensionRequired": "optional",\n  "httpPoweredByHeader": "include",\n  "httpsCertFile": "jscause-cert.pem",\n  "httpsKeyFile": "jscause-key.pem",\n  "tempWorkDirectory": "./workbench",\n  "mimeTypes": {}\n}\n');
    },
    expectedLogMessages:
    [
      [ 'error', 'Site configuration:  The following configuration attribute was not found:' ],
      [ 'error', '- logging' ],
      [ 'error', 'Site \'My Site\' not started.' ],
      [ 'error', 'Server not started.  No sites are running.' ],
    ],
    onServerStarted()
    {
      this.testPassed = false;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_003_022_siteConfInvalidLoggindDirName = Object.assign(testUtils.makeFromBaseTest('Site config: invalid logging dir name'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);

      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], '{\n  "hostName": "jscausesite1",\n  "canUpload": false,\n  "maxPayloadSizeBytes": 0,\n  "jscpExtensionRequired": "optional",\n  "httpPoweredByHeader": "include",\n  "httpsCertFile": "jscause-cert.pem",\n  "httpsKeyFile": "jscause-key.pem",\n  "tempWorkDirectory": "./workbench",\n  "mimeTypes": {},\n  "logging": {}\n}\n');
    },
    expectedLogMessages:
    [
      [ 'error', 'Site configuration: Site \'My Site\': logging directoryname cannot be empty.' ],
      [ 'error', 'Site \'My Site\' not started.' ],
      [ 'error', 'Server not started.  No sites are running.' ],
    ],
    onServerStarted()
    {
      this.testPassed = false;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_003_023_siteConfInvalidMimeTypeEntry = Object.assign(testUtils.makeFromBaseTest('Site config: invalid mimetype entry'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);

      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], '{\n  "hostName": "jscausesite1",\n  "canUpload": false,\n  "maxPayloadSizeBytes": 0,\n  "jscpExtensionRequired": "optional",\n  "httpPoweredByHeader": "include",\n  "httpsCertFile": "jscause-cert.pem",\n  "httpsKeyFile": "jscause-key.pem",\n  "tempWorkDirectory": "./workbench",\n  "mimeTypes": {\n    "random": {}\n  }\n}\n');
    },
    expectedLogMessages:
    [
      [ 'error', 'Site configuration:  mimetype has an invalid \'random\' name.  Expected: \'include\', \'exclude\'.' ],
      [ 'error', 'Site \'My Site\' not started.' ],
      [ 'error', 'Server not started.  No sites are running.' ],
    ],
    onServerStarted()
    {
      this.testPassed = false;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_003_024_siteConfInvalidMimeTypeInclude = Object.assign(testUtils.makeFromBaseTest('Site config: invalid mimetype include'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);

      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], '{\n  "hostName": "jscausesite1",\n  "canUpload": false,\n  "maxPayloadSizeBytes": 0,\n  "jscpExtensionRequired": "optional",\n  "httpPoweredByHeader": "include",\n  "httpsCertFile": "jscause-cert.pem",\n  "httpsKeyFile": "jscause-key.pem",\n  "tempWorkDirectory": "./workbench",\n  "mimeTypes": {\n    "include": 1\n  }\n}\n');
    },
    expectedLogMessages:
    [
      [ 'error', 'Site configuration:  mimetype has an invalid \'include\' attribute value. Object (key, value) expected.' ],
      [ 'error', 'Site \'My Site\' not started.' ],
      [ 'error', 'Server not started.  No sites are running.' ],
    ],
    onServerStarted()
    {
      this.testPassed = false;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_003_025_siteConfEmptyMimeTypeName = Object.assign(testUtils.makeFromBaseTest('Site config: empty mimetype name'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);

      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], '{\n  "hostName": "jscausesite1",\n  "canUpload": false,\n  "maxPayloadSizeBytes": 0,\n  "jscpExtensionRequired": "optional",\n  "httpPoweredByHeader": "include",\n  "httpsCertFile": "jscause-cert.pem",\n  "httpsKeyFile": "jscause-key.pem",\n  "tempWorkDirectory": "./workbench",\n  "mimeTypes": {\n    "include": {\n      "": ""\n    }\n  }\n}\n');
    },
    expectedLogMessages:
    [
      [ 'error', 'Site configuration:  mimetype name cannot be empty.' ],
      [ 'error', 'Site \'My Site\' not started.' ],
      [ 'error', 'Server not started.  No sites are running.' ],
    ],
    onServerStarted()
    {
      this.testPassed = false;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_003_026_siteConfEmptyMimeType = Object.assign(testUtils.makeFromBaseTest('Site config: empty mimetype'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);

      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], '{\n  "hostName": "jscausesite1",\n  "canUpload": false,\n  "maxPayloadSizeBytes": 0,\n  "jscpExtensionRequired": "optional",\n  "httpPoweredByHeader": "include",\n  "httpsCertFile": "jscause-cert.pem",\n  "httpsKeyFile": "jscause-key.pem",\n  "tempWorkDirectory": "./workbench",\n  "mimeTypes": {\n    "include": {\n      "png": ""\n    }\n  }\n}\n');
    },
    expectedLogMessages:
    [
      [ 'warning', 'Site configuration: png mimetype value is empty.  Assumed application/octet-stream.' ],
      [ 'error', 'Server not started.  No sites are running.' ],
    ],
    onServerStarted()
    {
      this.testPassed = false;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_003_027_siteConfMimeTypeIncludeAsArray = Object.assign(testUtils.makeFromBaseTest('Site config: mimetype include as array'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);

      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], '{\n  "hostName": "jscausesite1",\n  "canUpload": false,\n  "maxPayloadSizeBytes": 0,\n  "jscpExtensionRequired": "optional",\n  "httpPoweredByHeader": "include",\n  "httpsCertFile": "jscause-cert.pem",\n  "httpsKeyFile": "jscause-key.pem",\n  "tempWorkDirectory": "./workbench",\n  "mimeTypes": {\n    "include": ["png"]\n  }\n}\n');
    },
    expectedLogMessages:
    [
      [ 'error', 'Site configuration:  mimetype has an invalid \'include\' attribute value. Object (key, value) expected.' ],
      [ 'error', 'Server not started.  No sites are running.' ],
    ],
    onServerStarted()
    {
      this.testPassed = false;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_003_028_siteConfMimeTypeExcludeAsObject = Object.assign(testUtils.makeFromBaseTest('Site config: mimetype exclude as object'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);

      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], '{\n  "hostName": "jscausesite1",\n  "canUpload": false,\n  "maxPayloadSizeBytes": 0,\n  "jscpExtensionRequired": "optional",\n  "httpPoweredByHeader": "include",\n  "httpsCertFile": "jscause-cert.pem",\n  "httpsKeyFile": "jscause-key.pem",\n  "tempWorkDirectory": "./workbench",\n  "mimeTypes": {\n    "exclude": {}\n  }\n}\n');
    },
    expectedLogMessages:
    [
      [ 'error', 'Site configuration:  mimetype has an invalid \'exclude\' attribute value. Array expected.' ],
      [ 'error', 'Server not started.  No sites are running.' ],
    ],
    onServerStarted()
    {
      this.testPassed = false;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_003_029_siteConfEmptyMimeTypeExcludeName = Object.assign(testUtils.makeFromBaseTest('Site config: empty mimetype exclude name'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);

      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], '{\n  "hostName": "jscausesite1",\n  "canUpload": false,\n  "maxPayloadSizeBytes": 0,\n  "jscpExtensionRequired": "optional",\n  "httpPoweredByHeader": "include",\n  "httpsCertFile": "jscause-cert.pem",\n  "httpsKeyFile": "jscause-key.pem",\n  "tempWorkDirectory": "./workbench",\n  "mimeTypes": {\n    "exclude": [""]\n  }\n}\n');
    },
    expectedLogMessages:
    [
      [ 'error', 'Site configuration:  mimetype name cannot be empty.' ],
      [ 'error', 'Server not started.  No sites are running.' ],
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
  test_003_012_siteConfInvalidHttpPoweredByHeader,
  test_003_013_siteConfEmptyHttpPoweredByHeader,
  test_003_014_siteConfInvalidHttpPoweredByHeaderValue,
  test_003_015_siteConfInvalidHttpsCertFile,
  test_003_016_siteConfEmptyHttpsCertFile,
  test_003_017_siteConfInvalidHttpsKeyFile,
  test_003_018_siteConfEmptyHttpsKeyFile,
  test_003_019_siteConfInvalidTempWorkDirectory,
  test_003_020_siteConfEmptyTempWorkDirectory,
  test_003_021_siteConfInvalidMimeTypes,
  test_003_022_siteConfMissingLogging,
  test_003_022_siteConfInvalidLoggindDirName,
  test_003_023_siteConfInvalidMimeTypeEntry,
  test_003_024_siteConfInvalidMimeTypeInclude,
  test_003_025_siteConfEmptyMimeTypeName,
  test_003_026_siteConfEmptyMimeType,
  test_003_027_siteConfMimeTypeIncludeAsArray,
  test_003_028_siteConfMimeTypeExcludeAsObject,
  test_003_029_siteConfEmptyMimeTypeExcludeName
];
