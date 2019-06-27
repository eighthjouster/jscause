'use strict';

const testUtils = require('./testBatteryUtils');

const makeBaseSite = (extra = {}) =>
  Object.assign(
    {
      'name': 'My Site',
      'port': 3000,
      'rootDirectoryName': 'mysite',
      'enableHTTPS': true
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
        makeBaseSite()
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

const test_009_001_siteConfInvalidHTTPSCertFile = Object.assign(testUtils.makeFromBaseTest('Site config, invalid HTTPS cert file'),
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

      this.createFile(['sites', 'mysite', 'configuration', 'certs', 'jscause-cert.pem'], testUtils.jsCauseCertPemFileContents);
      this.createFile(['sites', 'mysite', 'configuration', 'certs', 'jscause-key.pem'], testUtils.jsCauseKeyFileContents);
      this.createFile(['sites', 'mysite', 'configuration', 'certs', 'jscause-cert_BAD.pem'], testUtils.jsCauseCertPemFileBadContents);
      this.createFile(['sites', 'mysite', 'configuration', 'certs', 'jscause-key_BAD.pem'], testUtils.jsCauseKeyFileBadContents);

      const jsCauseConfContents = makeBaseJsCauseConfContents();
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));

      const siteConfContents = makeBaseSiteConfContents();
      siteConfContents.httpsCertFile = 'jscause-cert_BAD.pem';
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
    },
    expectedLogMessages:
    [
      [ 'error' , 'Site \'My Site\': An error occurred while attempting to start HTTPS server.' ],
      [ 'error' , 'bad base64 decode', 'suffix' ],
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

const test_009_002_siteConfInvalidHTTPSKeyFile = Object.assign(testUtils.makeFromBaseTest('Site config, invalid HTTPS key file'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const jsCauseConfContents = makeBaseJsCauseConfContents();
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));

      const siteConfContents = makeBaseSiteConfContents();
      siteConfContents.httpsKeyFile = 'jscause-key_BAD.pem';
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
    },
    expectedLogMessages:
    [
      [ 'error' , 'Site \'My Site\': An error occurred while attempting to start HTTPS server.' ],
      [ 'error' , 'bad base64 decode', 'suffix' ],
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

const test_009_003_siteConfInvalidHTTPSKeyFilePt2 = Object.assign(testUtils.makeFromBaseTest('Site config, invalid HTTPS key file, second site is okay'),
  {
    // only: true,
    onTestBeforeStart()
    {
      this.doCreateDirectoryFromPathList(['sites', 'mysite2']);
      this.doCreateDirectoryFromPathList(['sites', 'mysite2', 'configuration']);
      this.doCreateDirectoryFromPathList(['sites', 'mysite2', 'configuration', 'certs']);
      this.doCreateDirectoryFromPathList(['sites', 'mysite2', 'workbench']);
      this.doCreateDirectoryFromPathList(['sites', 'mysite2', 'localLogs2']);
      this.doCreateDirectoryFromPathList(['sites', 'mysite2', 'website']);

      const jsCauseConfContents = makeBaseJsCauseConfContents();
      jsCauseConfContents.sites.push(makeBaseSite2());
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));

      const siteConf2Contents = makeBaseSiteConfContents(
        {
          'logging':
          {
            'directoryName': './localLogs2'
          }
        });
      this.createFile(['sites', 'mysite2', 'configuration', 'site.json'], JSON.stringify(siteConf2Contents));
    },
    expectedLogMessages:
    [
      [ 'error' , 'Site \'My Site\': An error occurred while attempting to start HTTPS server.' ],
      [ 'error' , 'bad base64 decode', 'suffix' ],
      [ 'error', 'Site \'My Site\' not started.' ],
      [ 'info', 'Site \'My Site 2\' at http://jscausesite1:3001/ assigned to server 0' ],
      [ 'info', 'The following sites were set up successfully:' ],
      [ 'info', '\'My Site 2\'' ],
      [ 'error', 'The following sites failed to run:' ],
      [ 'error', '- \'My Site\'' ],
      [ 'info', 'Server 0 listening on port 3001' ]
    ],
    onServerStartedOrError()
    {
      if (this.numberOfServersInvokedSofar === 2)
      {
        this.terminateApplication();
      }
    },
    onBeforeTestEnd()
    {
      this.testPassed = this.serverDidStart && this.gotAllExpectedLogMsgs;
    }
  }
);

module.exports = [
  test_009_001_siteConfInvalidHTTPSCertFile,
  test_009_002_siteConfInvalidHTTPSKeyFile,
  test_009_003_siteConfInvalidHTTPSKeyFilePt2
];
