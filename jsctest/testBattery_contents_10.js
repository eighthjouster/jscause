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

const expectedMoveFailErrorLogMessages = [ 'error', 'Site: My Site: Runtime error on file /index.jscp: allowExeExtensionsInOpr server configuration disallows move file operation involving', 'prefix' ];

const moveFileSuccessTestChecker = (test, { statusCode, dataReceived, consoleLogOutput, sourceFile, destFile }) =>
  (
    test.contentReqExpectedSiteResponded &&
    (statusCode === 200) && !dataReceived.length &&
    (consoleLogOutput.status === 'captured') &&
    !test.fileExists(['sites', 'mysite', sourceFile]) &&
    test.fileExists(['sites', 'mysite', destFile])
  );

const moveFileFailTestChecker = (test, { statusCode, dataReceived, consoleLogOutput, sourceFile, destFile }) =>
  (
    test.contentReqExpectedSiteResponded &&
    (statusCode === 500) && !dataReceived.length &&
    test.gotAllExpectedLogMsgs &&
    (consoleLogOutput.status === 'captured') &&
    test.fileExists(['sites', 'mysite', sourceFile]) &&
    !test.fileExists(['sites', 'mysite', destFile])
  );

const makeAllowexeextensionsinoprMoveTest = (siteExtraConf, srcPathInfo, destPathInfo, expectedLogMessage, testCheckerFn, nukeTestDir = false) =>
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
        this.createFile(['sites', 'mysite', 'website', 'index.jscp'], `rt.moveFile('${sourceFile}', '${destFile}')`);
        
        initConsoleLogCapture();

        this.isRequestsTest = true;
      },
      expectedLogMessages: (expectedLogMessage) ? [ expectedLogMessage ] : undefined,
      onReadyForRequests()
      {
        const { sourceFile, destFile } = this.tempTestData;
        processResponse(this, makeBaseRequest(), ({ statusCode, dataReceived, consoleLogOutput }) =>
        {
          this.testPassed = testCheckerFn(this, { statusCode, dataReceived, consoleLogOutput, sourceFile, destFile });
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

const test_contents_001_moveFile_src_txt_dest_txt_allowexeextensionsinopr_unset = Object.assign(makeFromBaseTest('Contents; moveFile; source is txt; destination is txt; allowexeextensionsinopr is unset (default false)'),
  makeTestEndBoilerplate.call(this),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprMoveTest(
    {},
    {},
    {},
    undefined,
    moveFileSuccessTestChecker,
    true
  )
);

const test_contents_002_moveFile_src_txt_dest_txt_allowexeextensionsinopr_false = Object.assign(makeFromBaseTest('Contents; moveFile; source is txt; destination is txt; allowexeextensionsinopr is false'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprMoveTest(
    { allowExeExtensionsInOpr: false },
    {},
    {},
    undefined,
    moveFileSuccessTestChecker
  )
);

const test_contents_003_moveFile_src_txt_dest_txt_allowexeextensionsinopr_true = Object.assign(makeFromBaseTest('Contents; moveFile; source is txt; destination is txt; allowexeextensionsinopr is true'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprMoveTest(
    { allowExeExtensionsInOpr: true },
    {},
    {},
    undefined,
    moveFileSuccessTestChecker
  )
);

const test_contents_004_moveFile_src_txt_dest_jscp_allowexeextensionsinopr_unset = Object.assign(makeFromBaseTest('Contents; moveFile; source is txt; destination is jscp; allowexeextensionsinopr is unset (default false)'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprMoveTest(
    {},
    {},
    { destDir: 'website', destExtension: '.jscp' },
    expectedMoveFailErrorLogMessages,
    moveFileFailTestChecker
  )
);

const test_contents_005_moveFile_src_txt_dest_jscp_allowexeextensionsinopr_false = Object.assign(makeFromBaseTest('Contents; moveFile; source is txt; destination is jscp; allowexeextensionsinopr is false'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprMoveTest(
    { allowExeExtensionsInOpr: false },
    {},
    { destDir: 'website', destExtension: '.jscp' },
    expectedMoveFailErrorLogMessages,
    moveFileFailTestChecker
  )
);

const test_contents_006_moveFile_src_txt_dest_jscp_allowexeextensionsinopr_true = Object.assign(makeFromBaseTest('Contents; moveFile; source is txt; destination is jscp; allowexeextensionsinopr is true'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprMoveTest(
    { allowExeExtensionsInOpr: true },
    {},
    { destDir: 'website', destExtension: '.jscp' },
    undefined,
    moveFileSuccessTestChecker
  )
);

const test_contents_007_moveFile_src_txt_dest_JSCP_allowexeextensionsinopr_unset = Object.assign(makeFromBaseTest('Contents; moveFile; source is txt; destination is JSCP; allowexeextensionsinopr is unset (default false)'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprMoveTest(
    {},
    {},
    { destDir: 'website', destExtension: '.JSCP' },
    expectedMoveFailErrorLogMessages,
    moveFileFailTestChecker
  )
);

const test_contents_008_moveFile_src_txt_dest_JSCP_allowexeextensionsinopr_false = Object.assign(makeFromBaseTest('Contents; moveFile; source is txt; destination is JSCP; allowexeextensionsinopr is false'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprMoveTest(
    { allowExeExtensionsInOpr: false },
    {},
    { destDir: 'website', destExtension: '.JSCP' },
    expectedMoveFailErrorLogMessages,
    moveFileFailTestChecker
  )
);

const test_contents_009_moveFile_src_txt_dest_JSCP_allowexeextensionsinopr_true = Object.assign(makeFromBaseTest('Contents; moveFile; source is txt; destination is JSCP; allowexeextensionsinopr is true'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprMoveTest(
    { allowExeExtensionsInOpr: true },
    {},
    { destDir: 'website', destExtension: '.JSCP' },
    undefined,
    moveFileSuccessTestChecker
  )
);

const test_contents_010_moveFile_src_txt_dest_jscm_allowexeextensionsinopr_unset = Object.assign(makeFromBaseTest('Contents; moveFile; source is txt; destination is jscm; allowexeextensionsinopr is unset (default false)'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprMoveTest(
    {},
    {},
    { destDir: 'website', destExtension: '.jscm' },
    expectedMoveFailErrorLogMessages,
    moveFileFailTestChecker
  )
);

const test_contents_011_moveFile_src_txt_dest_jscm_allowexeextensionsinopr_false = Object.assign(makeFromBaseTest('Contents; moveFile; source is txt; destination is jscm; allowexeextensionsinopr is false'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprMoveTest(
    { allowExeExtensionsInOpr: false },
    {},
    { destDir: 'website', destExtension: '.jscm' },
    expectedMoveFailErrorLogMessages,
    moveFileFailTestChecker
  )
);

const test_contents_012_moveFile_src_txt_dest_jscm_allowexeextensionsinopr_true = Object.assign(makeFromBaseTest('Contents; moveFile; source is txt; destination is jscm; allowexeextensionsinopr is true'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprMoveTest(
    { allowExeExtensionsInOpr: true },
    {},
    { destDir: 'website', destExtension: '.jscm' },
    undefined,
    moveFileSuccessTestChecker
  )
);

const test_contents_013_moveFile_src_txt_dest_JSCM_allowexeextensionsinopr_unset = Object.assign(makeFromBaseTest('Contents; moveFile; source is txt; destination is JSCM; allowexeextensionsinopr is unset (default false)'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprMoveTest(
    {},
    {},
    { destDir: 'website', destExtension: '.JSCM' },
    expectedMoveFailErrorLogMessages,
    moveFileFailTestChecker
  )
);

const test_contents_014_moveFile_src_txt_dest_JSCM_allowexeextensionsinopr_false = Object.assign(makeFromBaseTest('Contents; moveFile; source is txt; destination is JSCM; allowexeextensionsinopr is false'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprMoveTest(
    { allowExeExtensionsInOpr: false },
    {},
    { destDir: 'website', destExtension: '.JSCM' },
    expectedMoveFailErrorLogMessages,
    moveFileFailTestChecker
  )
);

const test_contents_015_moveFile_src_txt_dest_JSCM_allowexeextensionsinopr_true = Object.assign(makeFromBaseTest('Contents; moveFile; source is txt; destination is JSCM; allowexeextensionsinopr is true'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprMoveTest(
    { allowExeExtensionsInOpr: true },
    {},
    { destDir: 'website', destExtension: '.JSCM' },
    undefined,
    moveFileSuccessTestChecker
  )
);

const test_contents_016_moveFile_src_jscp_dest_txt_allowexeextensionsinopr_unset = Object.assign(makeFromBaseTest('Contents; moveFile; source is jscp; destination is txt; allowexeextensionsinopr is unset (default false)'),
  makeTestEndBoilerplate.call(this),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprMoveTest(
    {},
    { srcDir: 'website', srcExtension: '.jscp' },
    {},
    expectedMoveFailErrorLogMessages,
    moveFileFailTestChecker
  )
);

const test_contents_017_moveFile_src_jscp_dest_txt_allowexeextensionsinopr_false = Object.assign(makeFromBaseTest('Contents; moveFile; source is jscp; destination is txt; allowexeextensionsinopr is false'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprMoveTest(
    { allowExeExtensionsInOpr: false },
    { srcDir: 'website', srcExtension: '.jscp' },
    {},
    expectedMoveFailErrorLogMessages,
    moveFileFailTestChecker
  )
);

const test_contents_018_moveFile_src_jscp_dest_txt_allowexeextensionsinopr_true = Object.assign(makeFromBaseTest('Contents; moveFile; source is jscp; destination is txt; allowexeextensionsinopr is true'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprMoveTest(
    { allowExeExtensionsInOpr: true },
    { srcDir: 'website', srcExtension: '.jscp' },
    {},
    undefined,
    moveFileSuccessTestChecker
  )
);

const test_contents_019_moveFile_src_JSCP_dest_txt_allowexeextensionsinopr_unset = Object.assign(makeFromBaseTest('Contents; moveFile; source is JSCP; destination is txt; allowexeextensionsinopr is unset (default false)'),
  makeTestEndBoilerplate.call(this),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprMoveTest(
    {},
    { srcDir: 'website', srcExtension: '.JSCP' },
    {},
    expectedMoveFailErrorLogMessages,
    moveFileFailTestChecker
  )
);

const test_contents_020_moveFile_src_JSCP_dest_txt_allowexeextensionsinopr_false = Object.assign(makeFromBaseTest('Contents; moveFile; source is JSCP; destination is txt; allowexeextensionsinopr is false'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprMoveTest(
    { allowExeExtensionsInOpr: false },
    { srcDir: 'website', srcExtension: '.JSCP' },
    {},
    expectedMoveFailErrorLogMessages,
    moveFileFailTestChecker
  )
);

const test_contents_021_moveFile_src_JSCP_dest_txt_allowexeextensionsinopr_true = Object.assign(makeFromBaseTest('Contents; moveFile; source is JSCP; destination is txt; allowexeextensionsinopr is true'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprMoveTest(
    { allowExeExtensionsInOpr: true },
    { srcDir: 'website', srcExtension: '.JSCP' },
    {},
    undefined,
    moveFileSuccessTestChecker
  )
);

const test_contents_022_moveFile_src_jscm_dest_txt_allowexeextensionsinopr_unset = Object.assign(makeFromBaseTest('Contents; moveFile; source is jscm; destination is txt; allowexeextensionsinopr is unset (default false)'),
  makeTestEndBoilerplate.call(this),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprMoveTest(
    {},
    { srcDir: 'website', srcExtension: '.jscm' },
    {},
    expectedMoveFailErrorLogMessages,
    moveFileFailTestChecker
  )
);

const test_contents_023_moveFile_src_jscm_dest_txt_allowexeextensionsinopr_false = Object.assign(makeFromBaseTest('Contents; moveFile; source is jscm; destination is txt; allowexeextensionsinopr is false'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprMoveTest(
    { allowExeExtensionsInOpr: false },
    { srcDir: 'website', srcExtension: '.jscm' },
    {},
    expectedMoveFailErrorLogMessages,
    moveFileFailTestChecker
  )
);

const test_contents_024_moveFile_src_jscm_dest_txt_allowexeextensionsinopr_true = Object.assign(makeFromBaseTest('Contents; moveFile; source is jscm; destination is txt; allowexeextensionsinopr is true'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprMoveTest(
    { allowExeExtensionsInOpr: true },
    { srcDir: 'website', srcExtension: '.jscm' },
    {},
    undefined,
    moveFileSuccessTestChecker
  )
);

const test_contents_025_moveFile_src_JSCM_dest_txt_allowexeextensionsinopr_unset = Object.assign(makeFromBaseTest('Contents; moveFile; source is JSCM; destination is txt; allowexeextensionsinopr is unset (default false)'),
  makeTestEndBoilerplate.call(this),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprMoveTest(
    {},
    { srcDir: 'website', srcExtension: '.JSCM' },
    {},
    expectedMoveFailErrorLogMessages,
    moveFileFailTestChecker
  )
);

const test_contents_026_moveFile_src_JSCM_dest_txt_allowexeextensionsinopr_false = Object.assign(makeFromBaseTest('Contents; moveFile; source is JSCM; destination is txt; allowexeextensionsinopr is false'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprMoveTest(
    { allowExeExtensionsInOpr: false },
    { srcDir: 'website', srcExtension: '.JSCM' },
    {},
    expectedMoveFailErrorLogMessages,
    moveFileFailTestChecker
  )
);

const test_contents_027_moveFile_src_JSCM_dest_txt_allowexeextensionsinopr_true = Object.assign(makeFromBaseTest('Contents; moveFile; source is JSCM; destination is txt; allowexeextensionsinopr is true'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprMoveTest(
    { allowExeExtensionsInOpr: true },
    { srcDir: 'website', srcExtension: '.JSCM' },
    {},
    undefined,
    moveFileSuccessTestChecker
  )
);

const test_contents_028_moveFile_src_txt_dest_jscp_outside_website_allowexeextensionsinopr_false = Object.assign(makeFromBaseTest('Contents; moveFile; source is txt; destination is jscp but outside of website; allowexeextensionsinopr is false'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprMoveTest(
    { allowExeExtensionsInOpr: false },
    {},
    { destExtension: '.jscp' },
    undefined,
    moveFileSuccessTestChecker
  )
);

const test_contents_029_moveFile_src_txt_dest_JSCP_outside_website_allowexeextensionsinopr_false = Object.assign(makeFromBaseTest('Contents; moveFile; source is txt; destination is JSCP but outside of website; allowexeextensionsinopr is false'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprMoveTest(
    { allowExeExtensionsInOpr: false },
    {},
    { destExtension: '.JSCP' },
    undefined,
    moveFileSuccessTestChecker
  )
);

const test_contents_030_moveFile_src_txt_dest_jscm_outside_website_allowexeextensionsinopr_false = Object.assign(makeFromBaseTest('Contents; moveFile; source is txt; destination is jscm but outside of website; allowexeextensionsinopr is false'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprMoveTest(
    { allowExeExtensionsInOpr: false },
    {},
    { destExtension: '.jscm' },
    undefined,
    moveFileSuccessTestChecker
  )
);

const test_contents_031_moveFile_src_txt_dest_JSCM_outside_website_allowexeextensionsinopr_false = Object.assign(makeFromBaseTest('Contents; moveFile; source is txt; destination is JSCM but outside of website; allowexeextensionsinopr is false'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprMoveTest(
    { allowExeExtensionsInOpr: false },
    {},
    { destExtension: '.JSCM' },
    undefined,
    moveFileSuccessTestChecker
  )
);

const test_contents_032_moveFile_src_jscp_outside_website_dest_txt_allowexeextensionsinopr_false = Object.assign(makeFromBaseTest('Contents; moveFile; source is jscp but outside of website; destination is txt; allowexeextensionsinopr is false'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprMoveTest(
    { allowExeExtensionsInOpr: false },
    { sourceExtension: '.jscp' },
    {},
    undefined,
    moveFileSuccessTestChecker
  )
);

const test_contents_033_moveFile_src_JSCP_outside_website_dest_txt_allowexeextensionsinopr_false = Object.assign(makeFromBaseTest('Contents; moveFile; source is JSCP but outside of website; destination is txt; allowexeextensionsinopr is false'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprMoveTest(
    { allowExeExtensionsInOpr: false },
    { sourceExtension: '.JSCP' },
    {},
    undefined,
    moveFileSuccessTestChecker
  )
);

const test_contents_034_moveFile_src_jscm_outside_website_dest_txt_allowexeextensionsinopr_false = Object.assign(makeFromBaseTest('Contents; moveFile; source is jscm but outside of website; destination is txt; allowexeextensionsinopr is false'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprMoveTest(
    { allowExeExtensionsInOpr: false },
    { sourceExtension: '.jscm' },
    {},
    undefined,
    moveFileSuccessTestChecker
  )
);

const test_contents_035_moveFile_src_JSCM_outside_website_dest_txt_allowexeextensionsinopr_false = Object.assign(makeFromBaseTest('Contents; moveFile; source is JSCM but outside of website; destination is txt; allowexeextensionsinopr is false'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprMoveTest(
    { allowExeExtensionsInOpr: false },
    { sourceExtension: '.JSCM' },
    {},
    undefined,
    moveFileSuccessTestChecker
  )
);

module.exports =
[
  test_contents_001_moveFile_src_txt_dest_txt_allowexeextensionsinopr_unset,
  test_contents_002_moveFile_src_txt_dest_txt_allowexeextensionsinopr_false,
  test_contents_003_moveFile_src_txt_dest_txt_allowexeextensionsinopr_true,
  test_contents_004_moveFile_src_txt_dest_jscp_allowexeextensionsinopr_unset,
  test_contents_005_moveFile_src_txt_dest_jscp_allowexeextensionsinopr_false,
  test_contents_006_moveFile_src_txt_dest_jscp_allowexeextensionsinopr_true,
  test_contents_007_moveFile_src_txt_dest_JSCP_allowexeextensionsinopr_unset,
  test_contents_008_moveFile_src_txt_dest_JSCP_allowexeextensionsinopr_false,
  test_contents_009_moveFile_src_txt_dest_JSCP_allowexeextensionsinopr_true,
  test_contents_010_moveFile_src_txt_dest_jscm_allowexeextensionsinopr_unset,
  test_contents_011_moveFile_src_txt_dest_jscm_allowexeextensionsinopr_false,
  test_contents_012_moveFile_src_txt_dest_jscm_allowexeextensionsinopr_true,
  test_contents_013_moveFile_src_txt_dest_JSCM_allowexeextensionsinopr_unset,
  test_contents_014_moveFile_src_txt_dest_JSCM_allowexeextensionsinopr_false,
  test_contents_015_moveFile_src_txt_dest_JSCM_allowexeextensionsinopr_true,

  test_contents_016_moveFile_src_jscp_dest_txt_allowexeextensionsinopr_unset,
  test_contents_017_moveFile_src_jscp_dest_txt_allowexeextensionsinopr_false,
  test_contents_018_moveFile_src_jscp_dest_txt_allowexeextensionsinopr_true,

  test_contents_019_moveFile_src_JSCP_dest_txt_allowexeextensionsinopr_unset,
  test_contents_020_moveFile_src_JSCP_dest_txt_allowexeextensionsinopr_false,
  test_contents_021_moveFile_src_JSCP_dest_txt_allowexeextensionsinopr_true,

  test_contents_022_moveFile_src_jscm_dest_txt_allowexeextensionsinopr_unset,
  test_contents_023_moveFile_src_jscm_dest_txt_allowexeextensionsinopr_false,
  test_contents_024_moveFile_src_jscm_dest_txt_allowexeextensionsinopr_true,

  test_contents_025_moveFile_src_JSCM_dest_txt_allowexeextensionsinopr_unset,
  test_contents_026_moveFile_src_JSCM_dest_txt_allowexeextensionsinopr_false,
  test_contents_027_moveFile_src_JSCM_dest_txt_allowexeextensionsinopr_true,

  test_contents_028_moveFile_src_txt_dest_jscp_outside_website_allowexeextensionsinopr_false,
  test_contents_029_moveFile_src_txt_dest_JSCP_outside_website_allowexeextensionsinopr_false,
  test_contents_030_moveFile_src_txt_dest_jscm_outside_website_allowexeextensionsinopr_false,
  test_contents_031_moveFile_src_txt_dest_JSCM_outside_website_allowexeextensionsinopr_false,

  test_contents_032_moveFile_src_jscp_outside_website_dest_txt_allowexeextensionsinopr_false,
  test_contents_033_moveFile_src_JSCP_outside_website_dest_txt_allowexeextensionsinopr_false,
  test_contents_034_moveFile_src_jscm_outside_website_dest_txt_allowexeextensionsinopr_false,
  test_contents_035_moveFile_src_JSCM_outside_website_dest_txt_allowexeextensionsinopr_false
];
