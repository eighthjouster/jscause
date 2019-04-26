'use strict';

const testUtils = require('./testBatteryUtils');

const makeBaseSite = (extra = {}) =>
  Object.assign(
    {
      'name': 'My Site',
      'port': 3000,
      'rootDirectoryName': 'mysite'
    }, extra
  );

const makeBaseSite2 = (extra = {}) =>
  Object.assign(
    {
      'name': 'My Site 2',
      'port': 3001,
      'rootDirectoryName': 'mysite2'
    }, extra
  );

const makeBaseJsCauseConfContents = (extra = {}) =>
  Object.assign(
    {
      'sites':
        [
          Object.assign({}, makeBaseSite()),
          Object.assign({}, makeBaseSite2())
        ],
      'logging': {}
    }, extra
  );
  
const makeBaseSiteConfContents = (extra = {}) =>
  Object.assign(
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
      'logging':
      {
        'directoryName': './localLogs'
      }
    }, extra
  );

const test_006_001_configFileTwoHttpSitesRunning = Object.assign(testUtils.makeFromBaseTest('Config file with two http sites running'),
  {
    // only: true,
    onTestBeforeStart()
    {
      this.doEmptyTestDirectory();

      this.doCreateDirectoryFromPathList(['logs']);
      this.doCreateDirectoryFromPathList(['sites']);
      this.doCreateDirectoryFromPathList(['sites', 'mysite']);
      this.doCreateDirectoryFromPathList(['sites', 'mysite', 'configuration']);
      this.doCreateDirectoryFromPathList(['sites', 'mysite', 'configuration', 'certs']);
      this.doCreateDirectoryFromPathList(['sites', 'mysite', 'workbench']);
      this.doCreateDirectoryFromPathList(['sites', 'mysite', 'localLogs']);
      this.doCreateDirectoryFromPathList(['sites', 'mysite', 'website']);

      const siteConfContents = makeBaseSiteConfContents();

      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));

      this.createFile(['sites', 'mysite', 'configuration', 'certs', 'jscause-cert.pem'], testUtils.jsCauseCertPemFileContents);
      this.createFile(['sites', 'mysite', 'configuration', 'certs', 'jscause-key.pem'], testUtils.jsCauseKeyFileContents);

      this.doCreateDirectoryFromPathList(['sites', 'mysite2']);
      this.doCreateDirectoryFromPathList(['sites', 'mysite2', 'configuration']);
      this.doCreateDirectoryFromPathList(['sites', 'mysite2', 'configuration', 'certs']);
      this.doCreateDirectoryFromPathList(['sites', 'mysite2', 'workbench']);
      this.doCreateDirectoryFromPathList(['sites', 'mysite2', 'localLogs2']);
      this.doCreateDirectoryFromPathList(['sites', 'mysite2', 'website']);

      const siteConfContents2 = makeBaseSiteConfContents(
        {
          'hostName': 'jscausesite2',
          'logging':
          {
            'directoryName': './localLogs2'
          }
        }
      );
      this.createFile(['sites', 'mysite2', 'configuration', 'site.json'], JSON.stringify(siteConfContents2));

      this.createFile(['sites', 'mysite2', 'configuration', 'certs', 'jscause-cert.pem'], testUtils.jsCauseCertPemFileContents);
      this.createFile(['sites', 'mysite2', 'configuration', 'certs', 'jscause-key.pem'], testUtils.jsCauseKeyFileContents);

      const jsCauseConfContents = makeBaseJsCauseConfContents();

      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));
    },
    expectedLogMessages:
    [
      [ 'info' , 'Site \'My Site\' at http://jscausesite1:3000/ assigned to server 0' ],
      [ 'info' , 'Site \'My Site 2\' at http://jscausesite2:3001/ assigned to server 1' ],
      [ 'info' , 'The following sites were set up successfully:' ],
      [ 'info' , '\'My Site\'' ],
      [ 'info' , '\'My Site 2\'' ],
      [ 'info' , 'Will start listening.' ],
      [ 'info' , 'Server 0 listening on port 3000' ],
      [ 'info' , 'Server 1 listening on port 3001' ],
    ],
    expectedLogMessagesPass()
    {
      // We must override this because the default passes the test.
      // In this case, the test must pass if the server starts.
      this.testPassed = !!this.serverDidStart && !!this.gotAllExpectedLogMsgs;
    },
    onServerStarted()
    {
      this.testPassed = !!this.serverDidStart && !!this.gotAllExpectedLogMsgs;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_006_002_configFileTwoSitesSameRootDirAndPort = Object.assign(testUtils.makeFromBaseTest('Config file with two sites with same root dir and port'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const jsCauseConfContents = makeBaseJsCauseConfContents();
      jsCauseConfContents.sites[1].port = 3000;
      jsCauseConfContents.sites[1].rootDirectoryName = 'mysite';
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));
    },
    expectedLogMessages:
    [
      [ 'error', 'Site configuration: Both sites \'My Site\' and \'My Site 2\' have the same root directory and port combination - \'mysite\', 3000' ],
      [ 'error', 'Site configuration: \'My Site 2\' is attempting to use an already existing root directory and port combination - \'mysite\', 3000' ],
      [ 'error', 'Site \'My Site 2\' not started.' ],
      [ 'info' , 'Server 0 listening on port 3000' ],
    ],
    expectedLogMessagesPass()
    {
      // We must override this because the default passes the test.
      // In this case, the test must pass if the server starts.
      this.testPassed = !!this.serverDidStart && !!this.gotAllExpectedLogMsgs;
    },
    onServerStarted()
    {
      this.testPassed = !!this.serverDidStart && !!this.gotAllExpectedLogMsgs;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_006_003_configFileTwoSitesSameName = Object.assign(testUtils.makeFromBaseTest('Config file with two sites with same name'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const jsCauseConfContents = makeBaseJsCauseConfContents();
      jsCauseConfContents.sites[0].enableHTTPS = false;
      jsCauseConfContents.sites[1].name = 'My Site';
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));
    },
    expectedLogMessages:
    [
      [ 'error', 'Site configuration: Site name \'My Site\' is not unique.' ],
      [ 'error', 'Site \'My Site\' not started.' ],
      [ 'info' , 'Server 0 listening on port 3000' ],
    ],
    expectedLogMessagesPass()
    {
      // We must override this because the default passes the test.
      // In this case, the test must pass if the server starts.
      this.testPassed = !!this.serverDidStart && !!this.gotAllExpectedLogMsgs;
    },
    onServerStarted()
    {
      this.testPassed = !!this.serverDidStart && !!this.gotAllExpectedLogMsgs;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_006_004_configFileTwoSitesDifferentProtocolSamePort = Object.assign(testUtils.makeFromBaseTest('Config file with two sites with different http/https protocols and same port'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const jsCauseConfContents =
      {
        'sites':
        [
          {
            'name': 'My Site',
            'port': 3000,
            'rootDirectoryName': 'mysite',
            'enableHTTPS': true
          },
          {
            'name': 'My Site 2',
            'port': 3000,
            'rootDirectoryName': 'mysite2'
          }
        ],
        'logging': {}
      };
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));
    },
    expectedLogMessages:
    [
      [ 'warning', 'Site configuration: Site \'My Site 2\' is HTTP, and is sharing HTTPS port 3000 with \'My Site\'' ],
      [ 'warning', 'Site configuration: Site \'My Site 2\' is using HTTP in an already assigned HTTPS port, 3000' ],
      [ 'info' , 'Server 0 listening on port 3000' ],
    ],
    expectedLogMessagesPass()
    {
      // We must override this because the default passes the test.
      // In this case, the test must pass if the server starts.
      this.testPassed = !!this.serverDidStart && !!this.gotAllExpectedLogMsgs;
    },
    onServerStarted()
    {
      this.testPassed = !!this.serverDidStart && !!this.gotAllExpectedLogMsgs;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_006_005_configFileTwoHttpsSitesSamePort = Object.assign(testUtils.makeFromBaseTest('Config file with two HTTPS sites with same port'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const jsCauseConfContents =
      {
        'sites':
        [
          {
            'name': 'My Site',
            'port': 3000,
            'rootDirectoryName': 'mysite',
            'enableHTTPS': true
          },
          {
            'name': 'My Site 2',
            'port': 3000,
            'rootDirectoryName': 'mysite2',
            'enableHTTPS': true
          }
        ],
        'logging': {}
      };
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));
    },
    expectedLogMessages:
    [
      [ 'warning', 'Site configuration: Site \'My Site 2\' is HTTPS, and would be sharing HTTPS port 3000 with \'My Site\'' ],
      [ 'warning', 'Site configuration: Site \'My Site 2\' is using HTTPS in an already assigned HTTPS port, 3000' ],
      [ 'info' , 'Server 0 listening on port 3000' ],
    ],
    expectedLogMessagesPass()
    {
      // We must override this because the default passes the test.
      // In this case, the test must pass if the server starts.
      this.testPassed = !!this.serverDidStart && !!this.gotAllExpectedLogMsgs;
    },
    onServerStarted()
    {
      this.testPassed = !!this.serverDidStart && !!this.gotAllExpectedLogMsgs;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_006_006_configFileTwoSitesDifferentProtocolSamePort2 = Object.assign(testUtils.makeFromBaseTest('Config file with two sites with different http/https protocols and same port, inverted'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const jsCauseConfContents =
      {
        'sites':
        [
          {
            'name': 'My Site',
            'port': 3000,
            'rootDirectoryName': 'mysite'
          },
          {
            'name': 'My Site 2',
            'port': 3000,
            'rootDirectoryName': 'mysite2',
            'enableHTTPS': true
          }
        ],
        'logging': {}
      };
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));
    },
    expectedLogMessages:
    [
      [ 'error', 'Site configuration: Site \'My Site 2\' is HTTPS, and would be sharing HTTP port 3000 with \'My Site\'' ],
      [ 'error', 'Site configuration: Site \'My Site 2\' is attempting to use HTTPS in an already assigned HTTP port, 3000' ],
      [ 'info' , 'Server 0 listening on port 3000' ],
    ],
    expectedLogMessagesPass()
    {
      // We must override this because the default passes the test.
      // In this case, the test must pass if the server starts.
      this.testPassed = !!this.serverDidStart && !!this.gotAllExpectedLogMsgs;
    },
    onServerStarted()
    {
      this.testPassed = !!this.serverDidStart && !!this.gotAllExpectedLogMsgs;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_006_007_configFileTwoSitesSamePortAndHostname = Object.assign(testUtils.makeFromBaseTest('Config file with two sites with same hostname and port'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const jsCauseConfContents =
      {
        'sites':
        [
          {
            'name': 'My Site',
            'port': 3000,
            'rootDirectoryName': 'mysite'
          },
          {
            'name': 'My Site 2',
            'port': 3000,
            'rootDirectoryName': 'mysite2'
          }
        ],
        'logging': {}
      };
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));

      const siteConfContents =
      {
        'hostName': 'jscausesite1',
        'canUpload': false,
        'maxPayloadSizeBytes': 0,
        'jscpExtensionRequired': 'optional',
        'httpPoweredByHeader': 'include',
        'tempWorkDirectory': './workbench',
        'mimeTypes': {},
        'logging':
        {
          'directoryName': './localLogs'
        }
      };
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));

      const siteConfContents2 =
      {
        'hostName': 'jscausesite1',
        'canUpload': false,
        'maxPayloadSizeBytes': 0,
        'jscpExtensionRequired': 'optional',
        'httpPoweredByHeader': 'include',
        'tempWorkDirectory': './workbench',
        'mimeTypes': {},
        'logging':
        {
          'directoryName': './localLogs2'
        }
      };
      this.createFile(['sites', 'mysite2', 'configuration', 'site.json'], JSON.stringify(siteConfContents2));
    },
    expectedLogMessages:
    [
      [ 'error', 'Site configuration: Both sites \'My Site\' and \'My Site 2\' have the same host name and port combination - \'jscausesite1\', 3000' ],
      [ 'error', 'Site configuration: \'My Site 2\', 3000 is already in use' ],
      [ 'info' , 'Server 0 listening on port 3000' ],
    ],
    expectedLogMessagesPass()
    {
      // We must override this because the default passes the test.
      // In this case, the test must pass if the server starts.
      this.testPassed = !!this.serverDidStart && !!this.gotAllExpectedLogMsgs;
    },
    onServerStarted()
    {
      this.testPassed = !!this.serverDidStart && !!this.gotAllExpectedLogMsgs;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

module.exports = [
  test_006_001_configFileTwoHttpSitesRunning,
  test_006_002_configFileTwoSitesSameRootDirAndPort,
  test_006_003_configFileTwoSitesSameName,
  test_006_004_configFileTwoSitesDifferentProtocolSamePort,
  test_006_005_configFileTwoHttpsSitesSamePort,
  test_006_006_configFileTwoSitesDifferentProtocolSamePort2,
  test_006_007_configFileTwoSitesSamePortAndHostname
];
