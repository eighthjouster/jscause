'use strict';

const testHttp = require('http');

const testUtils = require('./testBatteryUtils');

const makeBaseSite = (extra = {}) =>
  Object.assign(
    {
      'name': 'My Site',
      'port': 3000,
      'rootDirectoryName': 'mysite'
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
      'tempWorkDirectory': './workbench',
      'mimeTypes': {},
      'logging': {}
    }, extra
  );

let testServer;
let testServer2;

const test_014_001_takenServerPortOneServerOneSite = Object.assign(testUtils.makeFromBaseTest('Check that the application gracefully fails when starting if a port is taken; one server, one site.'),
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

      const jsCauseConfContents = makeBaseJsCauseConfContents();
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));

      const siteConfContents = makeBaseSiteConfContents();
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));

      testServer = testHttp.createServer();

      testServer.listen(3000, this.waitForDoneSignal());
    },
    expectedLogMessages:
    [
      [ 'error' , 'Server 0 could not start listening on port 3000.' ]
    ],
    onServerStartedOrError()
    {
      this.terminateApplication();
    },
    onBeforeTestEnd()
    {
      this.testPassed = !this.serverDidStart && this.gotAllExpectedLogMsgs;
    },
    onTestEnd()
    {
      testServer.close(this.waitForDoneSignal());
    }
  }
);

const test_014_002_takenServerPortOneServerTwoSites = Object.assign(testUtils.makeFromBaseTest('Check that the application gracefully fails when starting if a port is taken; one server, two sites.'),
  {
    // only: true,
    onTestBeforeStart()
    {
      this.doCreateDirectoryFromPathList(['sites', 'mysite2']);
      this.doCreateDirectoryFromPathList(['sites', 'mysite2', 'configuration']);
      this.doCreateDirectoryFromPathList(['sites', 'mysite2', 'configuration', 'certs']);
      this.doCreateDirectoryFromPathList(['sites', 'mysite2', 'workbench']);
      this.doCreateDirectoryFromPathList(['sites', 'mysite2', 'localLogs']);
      this.doCreateDirectoryFromPathList(['sites', 'mysite2', 'website']);

      const jsCauseConfContents = makeBaseJsCauseConfContents();
      jsCauseConfContents.sites[0].port = 3100;
      jsCauseConfContents.sites.push(makeBaseSite(
        {
          'name': 'My Site 2',
          'port': 3100,
          'rootDirectoryName': 'mysite2',
        }));
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));

      const siteConfContents = makeBaseSiteConfContents();
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));

      const siteConfContents2 = makeBaseSiteConfContents(
        {
          'hostName': 'jscausesite2'
        });
      this.createFile(['sites', 'mysite2', 'configuration', 'site.json'], JSON.stringify(siteConfContents2));

      testServer = testHttp.createServer();

      testServer.listen(3100, this.waitForDoneSignal());
    },
    expectedLogMessages:
    [
      [ 'info' , 'The following sites were set up successfully:' ],
      [ 'info' , '\'My Site\'' ],
      [ 'info' , '\'My Site 2\'' ],
      [ 'error' , 'Server 0 could not start listening on port 3100.' ]
    ],
    onServerStartedOrError()
    {
      this.terminateApplication();
    },
    onBeforeTestEnd()
    {
      this.testPassed = !this.serverDidStart && this.gotAllExpectedLogMsgs;
    },
    onTestEnd()
    {
      testServer.close(this.waitForDoneSignal());
    }
  }
);


const test_014_003_takenServerPortTwoServersTwoSites_Pt1 = Object.assign(testUtils.makeFromBaseTest('Check that the application gracefully fails when starting if a port is taken; two servers, one site each; first port taken.'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const jsCauseConfContents = makeBaseJsCauseConfContents();
      jsCauseConfContents.sites[0].port = 3200;
      jsCauseConfContents.sites.push(makeBaseSite(
        {
          'name': 'My Site 2',
          'port': 3299,
          'rootDirectoryName': 'mysite2',
        }));
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));

      const siteConfContents = makeBaseSiteConfContents();
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));

      const siteConfContents2 = makeBaseSiteConfContents(
        {
          'hostName': 'jscausesite2'
        });
      this.createFile(['sites', 'mysite2', 'configuration', 'site.json'], JSON.stringify(siteConfContents2));

      testServer = testHttp.createServer();

      testServer.listen(3200, this.waitForDoneSignal());
    },
    expectedLogMessages:
    [
      [ 'error' , 'Server 0 could not start listening on port 3200.' ],
      [ 'info' , 'Server 1 listening on port 3299' ]
    ],
    onServerStartedOrError()
    {
      if (this.numberOfServersInvokedSofar === 1)
      {
        this.terminateApplication();
      }
    },
    onBeforeTestEnd()
    {
      this.testPassed = this.gotAllExpectedLogMsgs;
    },
    onTestEnd()
    {
      testServer.close(this.waitForDoneSignal());
    }
  }
);

const test_014_004_takenServerPortTwoServersTwoSites_Pt2 = Object.assign(testUtils.makeFromBaseTest('Check that the application gracefully fails when starting if a port is taken; two servers, one site each; second port taken.'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const jsCauseConfContents = makeBaseJsCauseConfContents();
      jsCauseConfContents.sites[0].port = 3300;
      jsCauseConfContents.sites.push(makeBaseSite(
        {
          'name': 'My Site 2',
          'port': 3399,
          'rootDirectoryName': 'mysite2',
        }));
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));

      const siteConfContents = makeBaseSiteConfContents();
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));

      const siteConfContents2 = makeBaseSiteConfContents(
        {
          'hostName': 'jscausesite2'
        });
      this.createFile(['sites', 'mysite2', 'configuration', 'site.json'], JSON.stringify(siteConfContents2));

      testServer = testHttp.createServer();

      testServer.listen(3399, this.waitForDoneSignal());
    },
    expectedLogMessages:
    [
      [ 'info' , 'Server 0 listening on port 3300' ],
      [ 'error' , 'Server 1 could not start listening on port 3399.' ]
    ],
    onServerStartedOrError()
    {
      if (this.numberOfServersInvokedSofar === 1)
      {
        this.terminateApplication();
      }
    },
    onBeforeTestEnd()
    {
      this.testPassed = this.gotAllExpectedLogMsgs;
    },
    onTestEnd()
    {
      testServer.close(this.waitForDoneSignal());
    }
  }
);

const test_014_005_takenServerPortTwoServersTwoSites_Pt3 = Object.assign(testUtils.makeFromBaseTest('Check that the application gracefully fails when starting if a port is taken; two servers, one site each; both ports taken.'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const jsCauseConfContents = makeBaseJsCauseConfContents();
      jsCauseConfContents.sites[0].port = 3400;
      jsCauseConfContents.sites.push(makeBaseSite(
        {
          'name': 'My Site 2',
          'port': 3499,
          'rootDirectoryName': 'mysite2',
        }));
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));

      const siteConfContents = makeBaseSiteConfContents();
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));

      const siteConfContents2 = makeBaseSiteConfContents(
        {
          'hostName': 'jscausesite2'
        });
      this.createFile(['sites', 'mysite2', 'configuration', 'site.json'], JSON.stringify(siteConfContents2));

      testServer = testHttp.createServer();
      testServer2 = testHttp.createServer();

      Promise.all(
        [
          new Promise((resolve) => { testServer.listen(3400, resolve); }),
          new Promise((resolve) => { testServer2.listen(3499, resolve); })
        ])
        .then(this.waitForDoneSignal());
    },
    expectedLogMessages:
    [
      [ 'error' , 'Server 0 could not start listening on port 3400.' ],
      [ 'error' , 'Server 1 could not start listening on port 3499.' ]
    ],
    onServerStartedOrError()
    {
      if (this.numberOfServersInvokedSofar === 1)
      {
        this.terminateApplication();
      }
    },
    onBeforeTestEnd()
    {
      this.testPassed = !this.serverDidStart && this.gotAllExpectedLogMsgs;
    },
    onTestEnd()
    {
      Promise.all(
        [
          new Promise((resolve) => { testServer.close(resolve); }),
          new Promise((resolve) => { testServer2.close(resolve); })
        ])
        .then(this.waitForDoneSignal());
    }
  }
);


const test_014_006_TwoServersTwoSitesAllGood = Object.assign(testUtils.makeFromBaseTest('Check that two servers, on site each, start up successfully.'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const jsCauseConfContents = makeBaseJsCauseConfContents();
      jsCauseConfContents.sites[0].port = 3400;
      jsCauseConfContents.sites.push(makeBaseSite(
        {
          'name': 'My Site 2',
          'port': 3499,
          'rootDirectoryName': 'mysite2',
        }));
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));

      const siteConfContents = makeBaseSiteConfContents();
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));

      const siteConfContents2 = makeBaseSiteConfContents(
        {
          'hostName': 'jscausesite2'
        });
      this.createFile(['sites', 'mysite2', 'configuration', 'site.json'], JSON.stringify(siteConfContents2));

    },
    expectedLogMessages:
    [
      [ 'info' , 'Server 0 listening on port 3400' ],
      [ 'info' , 'Server 1 listening on port 3499' ]
    ],
    onServerStartedOrError()
    {
      if (this.numberOfServersInvokedSofar === 1)
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
  test_014_001_takenServerPortOneServerOneSite,
  test_014_002_takenServerPortOneServerTwoSites,
  test_014_003_takenServerPortTwoServersTwoSites_Pt1,
  test_014_004_takenServerPortTwoServersTwoSites_Pt2,
  test_014_005_takenServerPortTwoServersTwoSites_Pt3,
  test_014_006_TwoServersTwoSitesAllGood
];
