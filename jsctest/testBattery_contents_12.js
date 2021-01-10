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

const makeBaseRequest = (extra = {}) =>
  Object.assign(
    {
      hostname: 'jscausesite1',
      port: 3000,
      path: '/',
      method: 'GET'
    }, extra
  );

const
  {
    makeFromBaseTest,
    makeTestEndBoilerplate,
    processResponse,
    initConsoleLogCapture,
    areFlatArraysEqual
  } = testUtils;

const expectedExistsFailErrorLogMessages = [ 'error', 'Site: My Site: Runtime error on file /index.jscp: allowExeExtensionsInOpr server configuration disallows fileExists operation involving', 'prefix' ];

const fileExistsSuccessTestChecker = (test, { statusCode, dataReceived, consoleLogOutput, sourceFile }) =>
  (
    test.contentReqExpectedSiteResponded &&
    (statusCode === 200) && !dataReceived.length &&
    (consoleLogOutput.status === 'captured') &&
    areFlatArraysEqual(consoleLogOutput.lines, [ 'File does exist!' ])
  );

const fileExistsFailTestChecker = (test, { statusCode, dataReceived, consoleLogOutput, sourceFile }) =>
  (
    test.contentReqExpectedSiteResponded &&
    (statusCode === 500) && !dataReceived.length &&
    test.gotAllExpectedLogMsgs &&
    (consoleLogOutput.status === 'captured')
  );

const makeAllowexeextensionsinoprExistsTest = (siteExtraConf, srcPathInfo, expectedLogMessage, testCheckerFn, nukeTestDir = false) =>
  (
    {
      // only: true,
      onTestBeforeStart()
      {
        if (nukeTestDir)
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
        }

        const { srcDir = '.', srcExtension = '.txt' } = srcPathInfo;
        const jsCauseConfContents = makeBaseJsCauseConfContents({
          'sites':
          [
            makeBaseSite(siteExtraConf)
          ],
        });

        this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));

        const siteConfContents = makeBaseSiteConfContents();
        this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));

        const sourceFile = `${srcDir}/source_test_file_${Math.floor(Math.random() * 100000)}${srcExtension}`;
        this.tempTestData = { sourceFile };

        this.createFile(['sites', 'mysite', sourceFile], '<html /><html>Some contents.</html>');
        this.createFile(['sites', 'mysite', 'website', 'index.jscp'], `rt.fileExists('${sourceFile}').rtOnSuccess(() => console.log('File does exist!'))`);
        
        initConsoleLogCapture();

        this.isRequestsTest = true;
      },
      expectedLogMessages: (expectedLogMessage) ? [ expectedLogMessage ] : undefined,
      onReadyForRequests()
      {
        const { sourceFile } = this.tempTestData;
        processResponse(this, makeBaseRequest(), ({ statusCode, dataReceived, consoleLogOutput }) =>
        {
          this.testPassed = testCheckerFn(this, { statusCode, dataReceived, consoleLogOutput, sourceFile });
        });
      },
      onTestEnd()
      {
        const { sourceFile } = this.tempTestData;
        this.fileExists(['sites', 'mysite', sourceFile]);
      }
    } 
  );

const test_contents_001_fileExists_src_txt_allowexeextensionsinopr_unset = Object.assign(makeFromBaseTest('Contents; fileExists; source is txt; allowexeextensionsinopr is unset (default false)'),
  makeTestEndBoilerplate.call(this),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprExistsTest(
    {},
    {},
    undefined,
    fileExistsSuccessTestChecker,
    true
  )
);

const test_contents_002_fileExists_src_txt_allowexeextensionsinopr_false = Object.assign(makeFromBaseTest('Contents; fileExists; source is txt; allowexeextensionsinopr is false'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprExistsTest(
    { allowExeExtensionsInOpr: false },
    {},
    undefined,
    fileExistsSuccessTestChecker
  )
);

const test_contents_003_fileExists_src_txt_allowexeextensionsinopr_true = Object.assign(makeFromBaseTest('Contents; fileExists; source is txt; allowexeextensionsinopr is true'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprExistsTest(
    { allowExeExtensionsInOpr: true },
    {},
    undefined,
    fileExistsSuccessTestChecker
  )
);

const test_contents_004_fileExists_src_jscp_allowexeextensionsinopr_unset = Object.assign(makeFromBaseTest('Contents; fileExists; source is jscp; allowexeextensionsinopr is unset (default false)'),
  makeTestEndBoilerplate.call(this),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprExistsTest(
    {},
    { srcDir: 'website', srcExtension: '.jscp' },
    expectedExistsFailErrorLogMessages,
    fileExistsFailTestChecker
  )
);

const test_contents_005_fileExists_src_jscp_allowexeextensionsinopr_false = Object.assign(makeFromBaseTest('Contents; fileExists; source is jscp; allowexeextensionsinopr is false'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprExistsTest(
    { allowExeExtensionsInOpr: false },
    { srcDir: 'website', srcExtension: '.jscp' },
    expectedExistsFailErrorLogMessages,
    fileExistsFailTestChecker
  )
);

const test_contents_006_fileExists_src_jscp_allowexeextensionsinopr_true = Object.assign(makeFromBaseTest('Contents; fileExists; source is jscp; allowexeextensionsinopr is true'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprExistsTest(
    { allowExeExtensionsInOpr: true },
    { srcDir: 'website', srcExtension: '.jscp' },
    undefined,
    fileExistsSuccessTestChecker
  )
);

const test_contents_007_fileExists_src_JSCP_allowexeextensionsinopr_unset = Object.assign(makeFromBaseTest('Contents; fileExists; source is JSCP; allowexeextensionsinopr is unset (default false)'),
  makeTestEndBoilerplate.call(this),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprExistsTest(
    {},
    { srcDir: 'website', srcExtension: '.JSCP' },
    expectedExistsFailErrorLogMessages,
    fileExistsFailTestChecker
  )
);

const test_contents_008_fileExists_src_JSCP_allowexeextensionsinopr_false = Object.assign(makeFromBaseTest('Contents; fileExists; source is JSCP; allowexeextensionsinopr is false'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprExistsTest(
    { allowExeExtensionsInOpr: false },
    { srcDir: 'website', srcExtension: '.JSCP' },
    expectedExistsFailErrorLogMessages,
    fileExistsFailTestChecker
  )
);

const test_contents_009_fileExists_src_JSCP_allowexeextensionsinopr_true = Object.assign(makeFromBaseTest('Contents; fileExists; source is JSCP; allowexeextensionsinopr is true'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprExistsTest(
    { allowExeExtensionsInOpr: true },
    { srcDir: 'website', srcExtension: '.JSCP' },
    undefined,
    fileExistsSuccessTestChecker
  )
);

const test_contents_010_fileExists_src_jscm_allowexeextensionsinopr_unset = Object.assign(makeFromBaseTest('Contents; fileExists; source is jscm; allowexeextensionsinopr is unset (default false)'),
  makeTestEndBoilerplate.call(this),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprExistsTest(
    {},
    { srcDir: 'website', srcExtension: '.jscm' },
    expectedExistsFailErrorLogMessages,
    fileExistsFailTestChecker
  )
);

const test_contents_011_fileExists_src_jscm_allowexeextensionsinopr_false = Object.assign(makeFromBaseTest('Contents; fileExists; source is jscm; allowexeextensionsinopr is false'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprExistsTest(
    { allowExeExtensionsInOpr: false },
    { srcDir: 'website', srcExtension: '.jscm' },
    expectedExistsFailErrorLogMessages,
    fileExistsFailTestChecker
  )
);

const test_contents_012_fileExists_src_jscm_allowexeextensionsinopr_true = Object.assign(makeFromBaseTest('Contents; fileExists; source is jscm; allowexeextensionsinopr is true'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprExistsTest(
    { allowExeExtensionsInOpr: true },
    { srcDir: 'website', srcExtension: '.jscm' },
    undefined,
    fileExistsSuccessTestChecker
  )
);

const test_contents_013_fileExists_src_JSCM_allowexeextensionsinopr_unset = Object.assign(makeFromBaseTest('Contents; fileExists; source is JSCM; allowexeextensionsinopr is unset (default false)'),
  makeTestEndBoilerplate.call(this),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprExistsTest(
    {},
    { srcDir: 'website', srcExtension: '.JSCM' },
    expectedExistsFailErrorLogMessages,
    fileExistsFailTestChecker
  )
);

const test_contents_014_fileExists_src_JSCM_allowexeextensionsinopr_false = Object.assign(makeFromBaseTest('Contents; fileExists; source is JSCM; allowexeextensionsinopr is false'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprExistsTest(
    { allowExeExtensionsInOpr: false },
    { srcDir: 'website', srcExtension: '.JSCM' },
    expectedExistsFailErrorLogMessages,
    fileExistsFailTestChecker
  )
);

const test_contents_015_fileExists_src_JSCM_allowexeextensionsinopr_true = Object.assign(makeFromBaseTest('Contents; fileExists; source is JSCM; allowexeextensionsinopr is true'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprExistsTest(
    { allowExeExtensionsInOpr: true },
    { srcDir: 'website', srcExtension: '.JSCM' },
    undefined,
    fileExistsSuccessTestChecker
  )
);

const test_contents_016_fileExists_src_jscp_outside_website_allowexeextensionsinopr_false = Object.assign(makeFromBaseTest('Contents; fileExists; source is jscp but outside of website; allowexeextensionsinopr is false'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprExistsTest(
    { allowExeExtensionsInOpr: false },
    { sourceExtension: '.jscp' },
    undefined,
    fileExistsSuccessTestChecker
  )
);

const test_contents_017_fileExists_src_JSCP_outside_website_allowexeextensionsinopr_false = Object.assign(makeFromBaseTest('Contents; fileExists; source is JSCP but outside of website; allowexeextensionsinopr is false'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprExistsTest(
    { allowExeExtensionsInOpr: false },
    { sourceExtension: '.JSCP' },
    undefined,
    fileExistsSuccessTestChecker
  )
);

const test_contents_018_fileExists_src_jscm_outside_website_allowexeextensionsinopr_false = Object.assign(makeFromBaseTest('Contents; fileExists; source is jscm but outside of website; allowexeextensionsinopr is false'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprExistsTest(
    { allowExeExtensionsInOpr: false },
    { sourceExtension: '.jscm' },
    undefined,
    fileExistsSuccessTestChecker
  )
);

const test_contents_019_fileExists_src_JSCM_outside_website_allowexeextensionsinopr_false = Object.assign(makeFromBaseTest('Contents; fileExists; source is JSCM but outside of website; allowexeextensionsinopr is false'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprExistsTest(
    { allowExeExtensionsInOpr: false },
    { sourceExtension: '.JSCM' },
    undefined,
    fileExistsSuccessTestChecker
  )
);

module.exports =
[
  test_contents_001_fileExists_src_txt_allowexeextensionsinopr_unset,
  test_contents_002_fileExists_src_txt_allowexeextensionsinopr_false,
  test_contents_003_fileExists_src_txt_allowexeextensionsinopr_true,

  test_contents_004_fileExists_src_jscp_allowexeextensionsinopr_unset,
  test_contents_005_fileExists_src_jscp_allowexeextensionsinopr_false,
  test_contents_006_fileExists_src_jscp_allowexeextensionsinopr_true,

  test_contents_007_fileExists_src_JSCP_allowexeextensionsinopr_unset,
  test_contents_008_fileExists_src_JSCP_allowexeextensionsinopr_false,
  test_contents_009_fileExists_src_JSCP_allowexeextensionsinopr_true,

  test_contents_010_fileExists_src_jscm_allowexeextensionsinopr_unset,
  test_contents_011_fileExists_src_jscm_allowexeextensionsinopr_false,
  test_contents_012_fileExists_src_jscm_allowexeextensionsinopr_true,

  test_contents_013_fileExists_src_JSCM_allowexeextensionsinopr_unset,
  test_contents_014_fileExists_src_JSCM_allowexeextensionsinopr_false,
  test_contents_015_fileExists_src_JSCM_allowexeextensionsinopr_true,

  test_contents_016_fileExists_src_jscp_outside_website_allowexeextensionsinopr_false,
  test_contents_017_fileExists_src_JSCP_outside_website_allowexeextensionsinopr_false,
  test_contents_018_fileExists_src_jscm_outside_website_allowexeextensionsinopr_false,
  test_contents_019_fileExists_src_JSCM_outside_website_allowexeextensionsinopr_false
];
