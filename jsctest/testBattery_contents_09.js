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
    initConsoleLogCapture
  } = testUtils;

const expectedCopyFailErrorLogMessages = [ 'error', 'Site: My Site: Runtime error on file /index.jscp: allowExeExtensionsInOpr server configuration disallows copy file operation involving', 'prefix' ];

const copyFileSuccessTestChecker = (test, { statusCode, dataReceived, consoleLogOutput, destFile }) =>
  (
    test.contentReqExpectedSiteResponded &&
    (statusCode === 200) && !dataReceived.length &&
    (consoleLogOutput.status === 'captured') &&
    test.fileExists(['sites', 'mysite', destFile])
  );

const copyFileFailTestChecker = (test, { statusCode, dataReceived, consoleLogOutput, destFile }) =>
  (
    test.contentReqExpectedSiteResponded &&
    (statusCode === 500) && !dataReceived.length &&
    test.gotAllExpectedLogMsgs &&
    (consoleLogOutput.status === 'captured') &&
    !test.fileExists(['sites', 'mysite', destFile])
  );

const makeAllowexeextensionsinoprTest = (siteExtraConf, srcPathInfo, destPathInfo, expectedLogMessage, testCheckerFn, nukeTestDir = false) =>
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
        const { destDir = '.', destExtension = '.txt' } = destPathInfo;
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
        const destFile = `${destDir}/dest_test_file_${Math.floor(Math.random() * 100000)}${destExtension}`;
        this.tempTestData = { sourceFile, destFile };

        this.createFile(['sites', 'mysite', sourceFile], '<html /><html>Some contents.</html>');
        this.createFile(['sites', 'mysite', 'website', 'index.jscp'], `rt.copyFile('${sourceFile}', '${destFile}')`);
        
        initConsoleLogCapture();

        this.isRequestsTest = true;
      },
      expectedLogMessages: (expectedLogMessage) ? [ expectedLogMessage ] : undefined,
      onReadyForRequests()
      {
        const { srcFile, destFile } = this.tempTestData;
        processResponse(this, makeBaseRequest(), ({ statusCode, dataReceived, consoleLogOutput }) =>
        {
          this.testPassed = testCheckerFn(this, { statusCode, dataReceived, consoleLogOutput, srcFile, destFile });
        });
      },
      onTestEnd()
      {
        const { sourceFile, destFile } = this.tempTestData;
        this.deleteFile(['sites', 'mysite', sourceFile]);
        this.deleteFile(['sites', 'mysite', destFile]);
      }
    } 
  );

const test_contents_001_copyFile_src_txt_dest_txt_allowexeextensionsinopr_unset = Object.assign(makeFromBaseTest('Contents; copyFile; source is txt; destination is txt; allowexeextensionsinopr is unset (default false)'),
  makeTestEndBoilerplate.call(this),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprTest(
    {},
    {},
    {},
    undefined,
    copyFileSuccessTestChecker,
    true
  )
);

const test_contents_002_copyFile_src_txt_dest_txt_allowexeextensionsinopr_false = Object.assign(makeFromBaseTest('Contents; copyFile; source is txt; destination is txt; allowexeextensionsinopr is false'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprTest(
    { allowExeExtensionsInOpr: false },
    {},
    {},
    undefined,
    copyFileSuccessTestChecker
  )
);

const test_contents_003_copyFile_src_txt_dest_txt_allowexeextensionsinopr_true = Object.assign(makeFromBaseTest('Contents; copyFile; source is txt; destination is txt; allowexeextensionsinopr is true'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprTest(
    { allowExeExtensionsInOpr: true },
    {},
    {},
    undefined,
    copyFileSuccessTestChecker
  )
);

const test_contents_004_copyFile_src_txt_dest_jscp_allowexeextensionsinopr_unset = Object.assign(makeFromBaseTest('Contents; copyFile; source is txt; destination is jscp; allowexeextensionsinopr is unset (default false)'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprTest(
    {},
    {},
    { destDir: 'website', destExtension: '.jscp' },
    expectedCopyFailErrorLogMessages,
    copyFileFailTestChecker
  )
);

const test_contents_005_copyFile_src_txt_dest_jscp_allowexeextensionsinopr_false = Object.assign(makeFromBaseTest('Contents; copyFile; source is txt; destination is jscp; allowexeextensionsinopr is false'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprTest(
    { allowExeExtensionsInOpr: false },
    {},
    { destDir: 'website', destExtension: '.jscp' },
    expectedCopyFailErrorLogMessages,
    copyFileFailTestChecker
  )
);

const test_contents_006_copyFile_src_txt_dest_jscp_allowexeextensionsinopr_true = Object.assign(makeFromBaseTest('Contents; copyFile; source is txt; destination is jscp; allowexeextensionsinopr is true'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprTest(
    { allowExeExtensionsInOpr: true },
    {},
    { destDir: 'website', destExtension: '.jscp' },
    undefined,
    copyFileSuccessTestChecker
  )
);

const test_contents_007_copyFile_src_txt_dest_JSCP_allowexeextensionsinopr_unset = Object.assign(makeFromBaseTest('Contents; copyFile; source is txt; destination is JSCP; allowexeextensionsinopr is unset (default false)'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprTest(
    {},
    {},
    { destDir: 'website', destExtension: '.JSCP' },
    expectedCopyFailErrorLogMessages,
    copyFileFailTestChecker
  )
);

const test_contents_008_copyFile_src_txt_dest_JSCP_allowexeextensionsinopr_false = Object.assign(makeFromBaseTest('Contents; copyFile; source is txt; destination is JSCP; allowexeextensionsinopr is false'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprTest(
    { allowExeExtensionsInOpr: false },
    {},
    { destDir: 'website', destExtension: '.JSCP' },
    expectedCopyFailErrorLogMessages,
    copyFileFailTestChecker
  )
);

const test_contents_009_copyFile_src_txt_dest_JSCP_allowexeextensionsinopr_true = Object.assign(makeFromBaseTest('Contents; copyFile; source is txt; destination is JSCP; allowexeextensionsinopr is true'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprTest(
    { allowExeExtensionsInOpr: true },
    {},
    { destDir: 'website', destExtension: '.JSCP' },
    undefined,
    copyFileSuccessTestChecker
  )
);

const test_contents_010_copyFile_src_txt_dest_jscm_allowexeextensionsinopr_unset = Object.assign(makeFromBaseTest('Contents; copyFile; source is txt; destination is jscm; allowexeextensionsinopr is unset (default false)'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprTest(
    {},
    {},
    { destDir: 'website', destExtension: '.jscm' },
    expectedCopyFailErrorLogMessages,
    copyFileFailTestChecker
  )
);

const test_contents_011_copyFile_src_txt_dest_jscm_allowexeextensionsinopr_false = Object.assign(makeFromBaseTest('Contents; copyFile; source is txt; destination is jscm; allowexeextensionsinopr is false'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprTest(
    { allowExeExtensionsInOpr: false },
    {},
    { destDir: 'website', destExtension: '.jscm' },
    expectedCopyFailErrorLogMessages,
    copyFileFailTestChecker
  )
);

const test_contents_012_copyFile_src_txt_dest_jscm_allowexeextensionsinopr_true = Object.assign(makeFromBaseTest('Contents; copyFile; source is txt; destination is jscm; allowexeextensionsinopr is true'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprTest(
    { allowExeExtensionsInOpr: true },
    {},
    { destDir: 'website', destExtension: '.jscm' },
    undefined,
    copyFileSuccessTestChecker
  )
);

const test_contents_013_copyFile_src_txt_dest_JSCM_allowexeextensionsinopr_unset = Object.assign(makeFromBaseTest('Contents; copyFile; source is txt; destination is JSCM; allowexeextensionsinopr is unset (default false)'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprTest(
    {},
    {},
    { destDir: 'website', destExtension: '.JSCM' },
    expectedCopyFailErrorLogMessages,
    copyFileFailTestChecker
  )
);

const test_contents_014_copyFile_src_txt_dest_JSCM_allowexeextensionsinopr_false = Object.assign(makeFromBaseTest('Contents; copyFile; source is txt; destination is JSCM; allowexeextensionsinopr is false'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprTest(
    { allowExeExtensionsInOpr: false },
    {},
    { destDir: 'website', destExtension: '.JSCM' },
    expectedCopyFailErrorLogMessages,
    copyFileFailTestChecker
  )
);

const test_contents_015_copyFile_src_txt_dest_JSCM_allowexeextensionsinopr_true = Object.assign(makeFromBaseTest('Contents; copyFile; source is txt; destination is JSCM; allowexeextensionsinopr is true'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprTest(
    { allowExeExtensionsInOpr: true },
    {},
    { destDir: 'website', destExtension: '.JSCM' },
    undefined,
    copyFileSuccessTestChecker
  )
);

const test_contents_016_copyFile_src_jscp_dest_txt_allowexeextensionsinopr_unset = Object.assign(makeFromBaseTest('Contents; copyFile; source is jscp; destination is txt; allowexeextensionsinopr is unset (default false)'),
  makeTestEndBoilerplate.call(this),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprTest(
    {},
    { srcDir: 'website', srcExtension: '.jscp' },
    {},
    expectedCopyFailErrorLogMessages,
    copyFileFailTestChecker
  )
);

const test_contents_017_copyFile_src_jscp_dest_txt_allowexeextensionsinopr_false = Object.assign(makeFromBaseTest('Contents; copyFile; source is jscp; destination is txt; allowexeextensionsinopr is false'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprTest(
    { allowExeExtensionsInOpr: false },
    { srcDir: 'website', srcExtension: '.jscp' },
    {},
    expectedCopyFailErrorLogMessages,
    copyFileFailTestChecker
  )
);

const test_contents_018_copyFile_src_jscp_dest_txt_allowexeextensionsinopr_true = Object.assign(makeFromBaseTest('Contents; copyFile; source is jscp; destination is txt; allowexeextensionsinopr is true'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprTest(
    { allowExeExtensionsInOpr: true },
    { srcDir: 'website', srcExtension: '.jscp' },
    {},
    undefined,
    copyFileSuccessTestChecker
  )
);

const test_contents_019_copyFile_src_JSCP_dest_txt_allowexeextensionsinopr_unset = Object.assign(makeFromBaseTest('Contents; copyFile; source is JSCP; destination is txt; allowexeextensionsinopr is unset (default false)'),
  makeTestEndBoilerplate.call(this),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprTest(
    {},
    { srcDir: 'website', srcExtension: '.JSCP' },
    {},
    expectedCopyFailErrorLogMessages,
    copyFileFailTestChecker
  )
);

const test_contents_020_copyFile_src_JSCP_dest_txt_allowexeextensionsinopr_false = Object.assign(makeFromBaseTest('Contents; copyFile; source is JSCP; destination is txt; allowexeextensionsinopr is false'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprTest(
    { allowExeExtensionsInOpr: false },
    { srcDir: 'website', srcExtension: '.JSCP' },
    {},
    expectedCopyFailErrorLogMessages,
    copyFileFailTestChecker
  )
);

const test_contents_021_copyFile_src_JSCP_dest_txt_allowexeextensionsinopr_true = Object.assign(makeFromBaseTest('Contents; copyFile; source is JSCP; destination is txt; allowexeextensionsinopr is true'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprTest(
    { allowExeExtensionsInOpr: true },
    { srcDir: 'website', srcExtension: '.JSCP' },
    {},
    undefined,
    copyFileSuccessTestChecker
  )
);

const test_contents_022_copyFile_src_jscm_dest_txt_allowexeextensionsinopr_unset = Object.assign(makeFromBaseTest('Contents; copyFile; source is jscm; destination is txt; allowexeextensionsinopr is unset (default false)'),
  makeTestEndBoilerplate.call(this),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprTest(
    {},
    { srcDir: 'website', srcExtension: '.jscm' },
    {},
    expectedCopyFailErrorLogMessages,
    copyFileFailTestChecker
  )
);

const test_contents_023_copyFile_src_jscm_dest_txt_allowexeextensionsinopr_false = Object.assign(makeFromBaseTest('Contents; copyFile; source is jscm; destination is txt; allowexeextensionsinopr is false'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprTest(
    { allowExeExtensionsInOpr: false },
    { srcDir: 'website', srcExtension: '.jscm' },
    {},
    expectedCopyFailErrorLogMessages,
    copyFileFailTestChecker
  )
);

const test_contents_024_copyFile_src_jscm_dest_txt_allowexeextensionsinopr_true = Object.assign(makeFromBaseTest('Contents; copyFile; source is jscm; destination is txt; allowexeextensionsinopr is true'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprTest(
    { allowExeExtensionsInOpr: true },
    { srcDir: 'website', srcExtension: '.jscm' },
    {},
    undefined,
    copyFileSuccessTestChecker
  )
);

const test_contents_025_copyFile_src_JSCM_dest_txt_allowexeextensionsinopr_unset = Object.assign(makeFromBaseTest('Contents; copyFile; source is JSCM; destination is txt; allowexeextensionsinopr is unset (default false)'),
  makeTestEndBoilerplate.call(this),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprTest(
    {},
    { srcDir: 'website', srcExtension: '.JSCM' },
    {},
    expectedCopyFailErrorLogMessages,
    copyFileFailTestChecker
  )
);

const test_contents_026_copyFile_src_JSCM_dest_txt_allowexeextensionsinopr_false = Object.assign(makeFromBaseTest('Contents; copyFile; source is JSCM; destination is txt; allowexeextensionsinopr is false'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprTest(
    { allowExeExtensionsInOpr: false },
    { srcDir: 'website', srcExtension: '.JSCM' },
    {},
    expectedCopyFailErrorLogMessages,
    copyFileFailTestChecker
  )
);

const test_contents_027_copyFile_src_JSCM_dest_txt_allowexeextensionsinopr_true = Object.assign(makeFromBaseTest('Contents; copyFile; source is JSCM; destination is txt; allowexeextensionsinopr is true'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprTest(
    { allowExeExtensionsInOpr: true },
    { srcDir: 'website', srcExtension: '.JSCM' },
    {},
    undefined,
    copyFileSuccessTestChecker
  )
);

module.exports =
[
  test_contents_001_copyFile_src_txt_dest_txt_allowexeextensionsinopr_unset,
  test_contents_002_copyFile_src_txt_dest_txt_allowexeextensionsinopr_false,
  test_contents_003_copyFile_src_txt_dest_txt_allowexeextensionsinopr_true,
  test_contents_004_copyFile_src_txt_dest_jscp_allowexeextensionsinopr_unset,
  test_contents_005_copyFile_src_txt_dest_jscp_allowexeextensionsinopr_false,
  test_contents_006_copyFile_src_txt_dest_jscp_allowexeextensionsinopr_true,
  test_contents_007_copyFile_src_txt_dest_JSCP_allowexeextensionsinopr_unset,
  test_contents_008_copyFile_src_txt_dest_JSCP_allowexeextensionsinopr_false,
  test_contents_009_copyFile_src_txt_dest_JSCP_allowexeextensionsinopr_true,
  test_contents_010_copyFile_src_txt_dest_jscm_allowexeextensionsinopr_unset,
  test_contents_011_copyFile_src_txt_dest_jscm_allowexeextensionsinopr_false,
  test_contents_012_copyFile_src_txt_dest_jscm_allowexeextensionsinopr_true,
  test_contents_013_copyFile_src_txt_dest_JSCM_allowexeextensionsinopr_unset,
  test_contents_014_copyFile_src_txt_dest_JSCM_allowexeextensionsinopr_false,
  test_contents_015_copyFile_src_txt_dest_JSCM_allowexeextensionsinopr_true,

  test_contents_016_copyFile_src_jscp_dest_txt_allowexeextensionsinopr_unset,
  test_contents_017_copyFile_src_jscp_dest_txt_allowexeextensionsinopr_false,
  test_contents_018_copyFile_src_jscp_dest_txt_allowexeextensionsinopr_true,

  test_contents_019_copyFile_src_JSCP_dest_txt_allowexeextensionsinopr_unset,
  test_contents_020_copyFile_src_JSCP_dest_txt_allowexeextensionsinopr_false,
  test_contents_021_copyFile_src_JSCP_dest_txt_allowexeextensionsinopr_true,

  test_contents_022_copyFile_src_jscm_dest_txt_allowexeextensionsinopr_unset,
  test_contents_023_copyFile_src_jscm_dest_txt_allowexeextensionsinopr_false,
  test_contents_024_copyFile_src_jscm_dest_txt_allowexeextensionsinopr_true,

  test_contents_025_copyFile_src_JSCM_dest_txt_allowexeextensionsinopr_unset,
  test_contents_026_copyFile_src_JSCM_dest_txt_allowexeextensionsinopr_false,
  test_contents_027_copyFile_src_JSCM_dest_txt_allowexeextensionsinopr_true,
];
