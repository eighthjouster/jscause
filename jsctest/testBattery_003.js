'use strict';

const testUtils = require('./testBatteryUtils');

const test_003_001_siteDirJsonMissing = Object.assign(testUtils.makeFromBaseTest('Site dir exists, json missing'),
  {
    // only: true,
    onTestBeforeStart()
    {
      console.log(`Starting test: ${this.testName}`);
      this.doEmptyTestDirectory();

      const jsCauseConfContents =
      {
        'sites':
        [
          {
            'name': 'My Site',
            'port': 3000,
            'rootDirectoryName': 'mysite'
          }
        ],
        'logging': {}
      };
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));

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

      const jsCauseConfContents =
      {
        'sites':
        [
          {
            'name': 'My Site',
            'port': 3000,
            'rootDirectoryName': 'mysite'
          }
        ],
        'logging': {}
      };
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));

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

      const siteConfContents =
      {
        'hostName': 1
      };
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
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

      const siteConfContents =
      {
        'hostName': ''
      };
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
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

      const siteConfContents =
      {
        'hostName': 'jscausesite1'
      };
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
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

      const siteConfContents =
      {
        'hostName': 'jscausesite1',
        'canUpload': ''
      };
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
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

      const siteConfContents =
      {
        'hostName': 'jscausesite1',
        'canUpload': false,
        'maxPayloadSizeBytes': ''
      };
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
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

      const siteConfContents =
      {
        'hostName': 'jscausesite1',
        'canUpload': false,
        'maxPayloadSizeBytes': 0,
        'jscpExtensionRequired': 1
      };
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
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

      const siteConfContents =
      {
        'hostName': 'jscausesite1',
        'canUpload': false,
        'maxPayloadSizeBytes': 0,
        'jscpExtensionRequired': ''
      };
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
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

      const siteConfContents =
      {
        'hostName': 'jscausesite1',
        'canUpload': false,
        'maxPayloadSizeBytes': 0,
        'jscpExtensionRequired': 'random'
      };
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
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

      const siteConfContents =
      {
        'hostName': 'jscausesite1',
        'canUpload': false,
        'maxPayloadSizeBytes': 0,
        'jscpExtensionRequired': 'optional',
        'httpPoweredByHeader': 1
      };
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
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

      const siteConfContents =
      {
        'hostName': 'jscausesite1',
        'canUpload': false,
        'maxPayloadSizeBytes': 0,
        'jscpExtensionRequired': 'optional',
        'httpPoweredByHeader': ''
      };
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
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

      const siteConfContents =
      {
        'hostName': 'jscausesite1',
        'canUpload': false,
        'maxPayloadSizeBytes': 0,
        'jscpExtensionRequired': 'optional',
        'httpPoweredByHeader': 'random'
      };
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
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

      const siteConfContents =
      {
        'hostName': 'jscausesite1',
        'canUpload': false,
        'maxPayloadSizeBytes': 0,
        'jscpExtensionRequired': 'optional',
        'httpPoweredByHeader': 'include',
        'httpsCertFile': 1
      };
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
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

      const siteConfContents =
      {
        'hostName': 'jscausesite1',
        'canUpload': false,
        'maxPayloadSizeBytes': 0,
        'jscpExtensionRequired': 'optional',
        'httpPoweredByHeader': 'include',
        'httpsCertFile': ''
      };
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
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

      const siteConfContents =
      {
        'hostName': 'jscausesite1',
        'canUpload': false,
        'maxPayloadSizeBytes': 0,
        'jscpExtensionRequired': 'optional',
        'httpPoweredByHeader': 'include',
        'httpsCertFile': 'jscause-cert.pem',
        'httpsKeyFile': 1
      };
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
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

      const siteConfContents =
      {
        'hostName': 'jscausesite1',
        'canUpload': false,
        'maxPayloadSizeBytes': 0,
        'jscpExtensionRequired': 'optional',
        'httpPoweredByHeader': 'include',
        'httpsCertFile': 'jscause-cert.pem',
        'httpsKeyFile': ''
      };
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
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

      const siteConfContents =
      {
        'hostName': 'jscausesite1',
        'canUpload': false,
        'maxPayloadSizeBytes': 0,
        'jscpExtensionRequired': 'optional',
        'httpPoweredByHeader': 'include',
        'httpsCertFile': 'jscause-cert.pem',
        'httpsKeyFile': 'jscause-key.pem',
        'tempWorkDirectory': 1
      };
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
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

      const siteConfContents =
      {
        'hostName': 'jscausesite1',
        'canUpload': false,
        'maxPayloadSizeBytes': 0,
        'jscpExtensionRequired': 'optional',
        'httpPoweredByHeader': 'include',
        'httpsCertFile': 'jscause-cert.pem',
        'httpsKeyFile': 'jscause-key.pem',
        'tempWorkDirectory': ''
      };
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
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

      const siteConfContents =
      {
        'hostName': 'jscausesite1',
        'canUpload': false,
        'maxPayloadSizeBytes': 0,
        'jscpExtensionRequired': 'optional',
        'httpPoweredByHeader': 'include',
        'httpsCertFile': 'jscause-cert.pem',
        'httpsKeyFile': 'jscause-key.pem',
        'tempWorkDirectory': './workbench',
        'mimeTypes': 1
      };
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
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

      const siteConfContents =
      {
        'hostName': 'jscausesite1',
        'canUpload': false,
        'maxPayloadSizeBytes': 0,
        'jscpExtensionRequired': 'optional',
        'httpPoweredByHeader': 'include',
        'httpsCertFile': 'jscause-cert.pem',
        'httpsKeyFile': 'jscause-key.pem',
        'tempWorkDirectory': './workbench',
        'mimeTypes': {}
      };
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
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

      const siteConfContents =
      {
        'hostName': 'jscausesite1',
        'canUpload': false,
        'maxPayloadSizeBytes': 0,
        'jscpExtensionRequired': 'optional',
        'httpPoweredByHeader': 'include',
        'httpsCertFile': 'jscause-cert.pem',
        'httpsKeyFile': 'jscause-key.pem',
        'tempWorkDirectory': './workbench',
        'mimeTypes': {},
        'logging': {}
      };
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
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

      const siteConfContents =
      {
        'hostName': 'jscausesite1',
        'canUpload': false,
        'maxPayloadSizeBytes': 0,
        'jscpExtensionRequired': 'optional',
        'httpPoweredByHeader': 'include',
        'httpsCertFile': 'jscause-cert.pem',
        'httpsKeyFile': 'jscause-key.pem',
        'tempWorkDirectory': './workbench',
        'mimeTypes':
        {
          'random': {}
        }
      };
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
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

      const siteConfContents =
      {
        'hostName': 'jscausesite1',
        'canUpload': false,
        'maxPayloadSizeBytes': 0,
        'jscpExtensionRequired': 'optional',
        'httpPoweredByHeader': 'include',
        'httpsCertFile': 'jscause-cert.pem',
        'httpsKeyFile': 'jscause-key.pem',
        'tempWorkDirectory': './workbench',
        'mimeTypes':
        {
          'include': 1
        }
      };
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
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

      const siteConfContents =
      {
        'hostName': 'jscausesite1',
        'canUpload': false,
        'maxPayloadSizeBytes': 0,
        'jscpExtensionRequired': 'optional',
        'httpPoweredByHeader': 'include',
        'httpsCertFile': 'jscause-cert.pem',
        'httpsKeyFile': 'jscause-key.pem',
        'tempWorkDirectory': './workbench',
        'mimeTypes':
        {
          'include':
          {
            '': ''
          }
        }
      };
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
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

      const siteConfContents =
      {
        'hostName': 'jscausesite1',
        'canUpload': false,
        'maxPayloadSizeBytes': 0,
        'jscpExtensionRequired': 'optional',
        'httpPoweredByHeader': 'include',
        'httpsCertFile': 'jscause-cert.pem',
        'httpsKeyFile': 'jscause-key.pem',
        'tempWorkDirectory': './workbench',
        'mimeTypes':
        {
          'include':
          {
            'png': ''
          }
        }
      };
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
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

      const siteConfContents =
      {
        'hostName': 'jscausesite1',
        'canUpload': false,
        'maxPayloadSizeBytes': 0,
        'jscpExtensionRequired': 'optional',
        'httpPoweredByHeader': 'include',
        'httpsCertFile': 'jscause-cert.pem',
        'httpsKeyFile': 'jscause-key.pem',
        'tempWorkDirectory': './workbench',
        'mimeTypes':
        {
          'include': ['png']
        }
      };
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
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

      const siteConfContents =
      {
        'hostName': 'jscausesite1',
        'canUpload': false,
        'maxPayloadSizeBytes': 0,
        'jscpExtensionRequired': 'optional',
        'httpPoweredByHeader': 'include',
        'httpsCertFile': 'jscause-cert.pem',
        'httpsKeyFile': 'jscause-key.pem',
        'tempWorkDirectory': './workbench',
        'mimeTypes':
        {
          'exclude': {}
        }
      };
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
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

      const siteConfContents =
      {
        'hostName': 'jscausesite1',
        'canUpload': false,
        'maxPayloadSizeBytes': 0,
        'jscpExtensionRequired': 'optional',
        'httpPoweredByHeader': 'include',
        'httpsCertFile': 'jscause-cert.pem',
        'httpsKeyFile': 'jscause-key.pem',
        'tempWorkDirectory': './workbench',
        'mimeTypes':
        {
          'exclude': ['']
        }
      };
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
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
