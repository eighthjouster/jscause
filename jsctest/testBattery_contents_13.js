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

const expectedReadFailErrorLogMessages = [ 'error', 'Site: My Site: Runtime error on file /index.jscp: allowExeExtensionsInOpr server configuration configuration disallows read file operation involving', 'prefix' ];

const readFileSuccessTestChecker = (test, { statusCode, dataReceived, consoleLogOutput }) =>
  (
    test.contentReqExpectedSiteResponded &&
    (statusCode === 200) && !dataReceived.length &&
    (consoleLogOutput.status === 'captured') &&
    areFlatArraysEqual(consoleLogOutput.lines.map(l => l.toString()), [ '<html /><html>Contents line 1.\nContents line 2.</html>' ])
  );

const readFileFailTestChecker = (test, { statusCode, dataReceived }) =>
  (
    test.contentReqExpectedSiteResponded &&
    (statusCode === 500) && !dataReceived.length &&
    test.gotAllExpectedLogMsgs
  );

const makeAllowexeextensionsinoprReadTest = (siteExtraConf, srcPathInfo, expectedLogMessage, testCheckerFn, nukeTestDir = false) =>
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

        this.createFile(['sites', 'mysite', sourceFile], '<html /><html>Contents line 1.\nContents line 2.</html>');
        this.createFile(['sites', 'mysite', 'website', 'index.jscp'], `rt.readFile('${sourceFile}').rtOnSuccess((c) => console.log(c))`);
        
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
        this.readFile(['sites', 'mysite', sourceFile]);
      }
    } 
  );

const test_contents_001_readFile_src_txt_allowexeextensionsinopr_unset = Object.assign(makeFromBaseTest('Contents; readFile; source is txt; allowexeextensionsinopr is unset (default false)'),
  makeTestEndBoilerplate.call(this),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprReadTest(
    {},
    {},
    undefined,
    readFileSuccessTestChecker,
    true
  )
);

const test_contents_002_readFile_src_txt_allowexeextensionsinopr_false = Object.assign(makeFromBaseTest('Contents; readFile; source is txt; allowexeextensionsinopr is false'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprReadTest(
    { allowExeExtensionsInOpr: false },
    {},
    undefined,
    readFileSuccessTestChecker
  )
);

const test_contents_003_readFile_src_txt_allowexeextensionsinopr_true = Object.assign(makeFromBaseTest('Contents; readFile; source is txt; allowexeextensionsinopr is true'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprReadTest(
    { allowExeExtensionsInOpr: true },
    {},
    undefined,
    readFileSuccessTestChecker
  )
);

const test_contents_004_readFile_src_jscp_allowexeextensionsinopr_unset = Object.assign(makeFromBaseTest('Contents; readFile; source is jscp; allowexeextensionsinopr is unset (default false)'),
  makeTestEndBoilerplate.call(this),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprReadTest(
    {},
    { srcDir: 'website', srcExtension: '.jscp' },
    expectedReadFailErrorLogMessages,
    readFileFailTestChecker
  )
);

const test_contents_005_readFile_src_jscp_allowexeextensionsinopr_false = Object.assign(makeFromBaseTest('Contents; readFile; source is jscp; allowexeextensionsinopr is false'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprReadTest(
    { allowExeExtensionsInOpr: false },
    { srcDir: 'website', srcExtension: '.jscp' },
    expectedReadFailErrorLogMessages,
    readFileFailTestChecker
  )
);

const test_contents_006_readFile_src_jscp_allowexeextensionsinopr_true = Object.assign(makeFromBaseTest('Contents; readFile; source is jscp; allowexeextensionsinopr is true'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprReadTest(
    { allowExeExtensionsInOpr: true },
    { srcDir: 'website', srcExtension: '.jscp' },
    undefined,
    readFileSuccessTestChecker
  )
);

const test_contents_007_readFile_src_JSCP_allowexeextensionsinopr_unset = Object.assign(makeFromBaseTest('Contents; readFile; source is JSCP; allowexeextensionsinopr is unset (default false)'),
  makeTestEndBoilerplate.call(this),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprReadTest(
    {},
    { srcDir: 'website', srcExtension: '.JSCP' },
    expectedReadFailErrorLogMessages,
    readFileFailTestChecker
  )
);

const test_contents_008_readFile_src_JSCP_allowexeextensionsinopr_false = Object.assign(makeFromBaseTest('Contents; readFile; source is JSCP; allowexeextensionsinopr is false'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprReadTest(
    { allowExeExtensionsInOpr: false },
    { srcDir: 'website', srcExtension: '.JSCP' },
    expectedReadFailErrorLogMessages,
    readFileFailTestChecker
  )
);

const test_contents_009_readFile_src_JSCP_allowexeextensionsinopr_true = Object.assign(makeFromBaseTest('Contents; readFile; source is JSCP; allowexeextensionsinopr is true'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprReadTest(
    { allowExeExtensionsInOpr: true },
    { srcDir: 'website', srcExtension: '.JSCP' },
    undefined,
    readFileSuccessTestChecker
  )
);

const test_contents_010_readFile_src_jscm_allowexeextensionsinopr_unset = Object.assign(makeFromBaseTest('Contents; readFile; source is jscm; allowexeextensionsinopr is unset (default false)'),
  makeTestEndBoilerplate.call(this),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprReadTest(
    {},
    { srcDir: 'website', srcExtension: '.jscm' },
    expectedReadFailErrorLogMessages,
    readFileFailTestChecker
  )
);

const test_contents_011_readFile_src_jscm_allowexeextensionsinopr_false = Object.assign(makeFromBaseTest('Contents; readFile; source is jscm; allowexeextensionsinopr is false'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprReadTest(
    { allowExeExtensionsInOpr: false },
    { srcDir: 'website', srcExtension: '.jscm' },
    expectedReadFailErrorLogMessages,
    readFileFailTestChecker
  )
);

const test_contents_012_readFile_src_jscm_allowexeextensionsinopr_true = Object.assign(makeFromBaseTest('Contents; readFile; source is jscm; allowexeextensionsinopr is true'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprReadTest(
    { allowExeExtensionsInOpr: true },
    { srcDir: 'website', srcExtension: '.jscm' },
    undefined,
    readFileSuccessTestChecker
  )
);

const test_contents_013_readFile_src_JSCM_allowexeextensionsinopr_unset = Object.assign(makeFromBaseTest('Contents; readFile; source is JSCM; allowexeextensionsinopr is unset (default false)'),
  makeTestEndBoilerplate.call(this),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprReadTest(
    {},
    { srcDir: 'website', srcExtension: '.JSCM' },
    expectedReadFailErrorLogMessages,
    readFileFailTestChecker
  )
);

const test_contents_014_readFile_src_JSCM_allowexeextensionsinopr_false = Object.assign(makeFromBaseTest('Contents; readFile; source is JSCM; allowexeextensionsinopr is false'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprReadTest(
    { allowExeExtensionsInOpr: false },
    { srcDir: 'website', srcExtension: '.JSCM' },
    expectedReadFailErrorLogMessages,
    readFileFailTestChecker
  )
);

const test_contents_015_readFile_src_JSCM_allowexeextensionsinopr_true = Object.assign(makeFromBaseTest('Contents; readFile; source is JSCM; allowexeextensionsinopr is true'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprReadTest(
    { allowExeExtensionsInOpr: true },
    { srcDir: 'website', srcExtension: '.JSCM' },
    undefined,
    readFileSuccessTestChecker
  )
);

const test_contents_016_readFile_src_jscp_outside_website_allowexeextensionsinopr_false = Object.assign(makeFromBaseTest('Contents; readFile; source is jscp but outside of website; allowexeextensionsinopr is false'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprReadTest(
    { allowExeExtensionsInOpr: false },
    { sourceExtension: '.jscp' },
    undefined,
    readFileSuccessTestChecker
  )
);

const test_contents_017_readFile_src_JSCP_outside_website_allowexeextensionsinopr_false = Object.assign(makeFromBaseTest('Contents; readFile; source is JSCP but outside of website; allowexeextensionsinopr is false'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprReadTest(
    { allowExeExtensionsInOpr: false },
    { sourceExtension: '.JSCP' },
    undefined,
    readFileSuccessTestChecker
  )
);

const test_contents_018_readFile_src_jscm_outside_website_allowexeextensionsinopr_false = Object.assign(makeFromBaseTest('Contents; readFile; source is jscm but outside of website; allowexeextensionsinopr is false'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprReadTest(
    { allowExeExtensionsInOpr: false },
    { sourceExtension: '.jscm' },
    undefined,
    readFileSuccessTestChecker
  )
);

const test_contents_019_readFile_src_JSCM_outside_website_allowexeextensionsinopr_false = Object.assign(makeFromBaseTest('Contents; readFile; source is JSCM but outside of website; allowexeextensionsinopr is false'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprReadTest(
    { allowExeExtensionsInOpr: false },
    { sourceExtension: '.JSCM' },
    undefined,
    readFileSuccessTestChecker
  )
);

module.exports =
[
  test_contents_001_readFile_src_txt_allowexeextensionsinopr_unset,
  test_contents_002_readFile_src_txt_allowexeextensionsinopr_false,
  test_contents_003_readFile_src_txt_allowexeextensionsinopr_true,

  test_contents_004_readFile_src_jscp_allowexeextensionsinopr_unset,
  test_contents_005_readFile_src_jscp_allowexeextensionsinopr_false,
  test_contents_006_readFile_src_jscp_allowexeextensionsinopr_true,

  test_contents_007_readFile_src_JSCP_allowexeextensionsinopr_unset,
  test_contents_008_readFile_src_JSCP_allowexeextensionsinopr_false,
  test_contents_009_readFile_src_JSCP_allowexeextensionsinopr_true,

  test_contents_010_readFile_src_jscm_allowexeextensionsinopr_unset,
  test_contents_011_readFile_src_jscm_allowexeextensionsinopr_false,
  test_contents_012_readFile_src_jscm_allowexeextensionsinopr_true,

  test_contents_013_readFile_src_JSCM_allowexeextensionsinopr_unset,
  test_contents_014_readFile_src_JSCM_allowexeextensionsinopr_false,
  test_contents_015_readFile_src_JSCM_allowexeextensionsinopr_true,

  test_contents_016_readFile_src_jscp_outside_website_allowexeextensionsinopr_false,
  test_contents_017_readFile_src_JSCP_outside_website_allowexeextensionsinopr_false,
  test_contents_018_readFile_src_jscm_outside_website_allowexeextensionsinopr_false,
  test_contents_019_readFile_src_JSCM_outside_website_allowexeextensionsinopr_false
];
