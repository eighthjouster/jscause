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

const makeBaseJsCauseConfContents = (extra = {}) =>
  Object.assign(
    {
      'sites':
      [
        Object.assign({}, makeBaseSite())
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

module.exports = [
  test_009_001_siteConfInvalidHTTPSCertFile,
  test_009_002_siteConfInvalidHTTPSKeyFile
];
