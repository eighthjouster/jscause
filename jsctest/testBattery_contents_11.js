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

const expectedDeleteFailErrorLogMessages = [ 'error', 'Site: My Site: Runtime error on file /index.jscp: allowExeExtensionsInOpr server configuration disallows delete file operation involving', 'prefix' ];

const deleteFileSuccessTestChecker = (test, { statusCode, dataReceived, consoleLogOutput, sourceFile }) =>
  (
    test.contentReqExpectedSiteResponded &&
    (statusCode === 200) && !dataReceived.length &&
    (consoleLogOutput.status === 'captured') &&
    !test.fileExists(['sites', 'mysite', sourceFile])
  );

const deleteFileFailTestChecker = (test, { statusCode, dataReceived, consoleLogOutput, sourceFile }) =>
  (
    test.contentReqExpectedSiteResponded &&
    (statusCode === 500) && !dataReceived.length &&
    test.gotAllExpectedLogMsgs &&
    (consoleLogOutput.status === 'captured') &&
    test.fileExists(['sites', 'mysite', sourceFile])
  );

const makeAllowexeextensionsinoprDeleteTest = (siteExtraConf, srcPathInfo, expectedLogMessage, testCheckerFn, nukeTestDir = false) =>
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
        this.createFile(['sites', 'mysite', 'website', 'index.jscp'], `rt.deleteFile('${sourceFile}')`);
        
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
        this.deleteFile(['sites', 'mysite', sourceFile]);
      }
    } 
  );

const test_contents_001_deleteFile_src_txt_allowexeextensionsinopr_unset = Object.assign(makeFromBaseTest('Contents; deleteFile; source is txt; allowexeextensionsinopr is unset (default false)'),
  makeTestEndBoilerplate.call(this),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprDeleteTest(
    {},
    {},
    undefined,
    deleteFileSuccessTestChecker,
    true
  )
);

const test_contents_002_deleteFile_src_txt_allowexeextensionsinopr_false = Object.assign(makeFromBaseTest('Contents; deleteFile; source is txt; allowexeextensionsinopr is false'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprDeleteTest(
    { allowExeExtensionsInOpr: false },
    {},
    undefined,
    deleteFileSuccessTestChecker
  )
);

const test_contents_003_deleteFile_src_txt_allowexeextensionsinopr_true = Object.assign(makeFromBaseTest('Contents; deleteFile; source is txt; allowexeextensionsinopr is true'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprDeleteTest(
    { allowExeExtensionsInOpr: true },
    {},
    undefined,
    deleteFileSuccessTestChecker
  )
);

const test_contents_004_deleteFile_src_jscp_allowexeextensionsinopr_unset = Object.assign(makeFromBaseTest('Contents; deleteFile; source is jscp; allowexeextensionsinopr is unset (default false)'),
  makeTestEndBoilerplate.call(this),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprDeleteTest(
    {},
    { srcDir: 'website', srcExtension: '.jscp' },
    expectedDeleteFailErrorLogMessages,
    deleteFileFailTestChecker
  )
);

const test_contents_005_deleteFile_src_jscp_allowexeextensionsinopr_false = Object.assign(makeFromBaseTest('Contents; deleteFile; source is jscp; allowexeextensionsinopr is false'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprDeleteTest(
    { allowExeExtensionsInOpr: false },
    { srcDir: 'website', srcExtension: '.jscp' },
    expectedDeleteFailErrorLogMessages,
    deleteFileFailTestChecker
  )
);

const test_contents_006_deleteFile_src_jscp_allowexeextensionsinopr_true = Object.assign(makeFromBaseTest('Contents; deleteFile; source is jscp; allowexeextensionsinopr is true'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprDeleteTest(
    { allowExeExtensionsInOpr: true },
    { srcDir: 'website', srcExtension: '.jscp' },
    undefined,
    deleteFileSuccessTestChecker
  )
);

const test_contents_007_deleteFile_src_JSCP_allowexeextensionsinopr_unset = Object.assign(makeFromBaseTest('Contents; deleteFile; source is JSCP; allowexeextensionsinopr is unset (default false)'),
  makeTestEndBoilerplate.call(this),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprDeleteTest(
    {},
    { srcDir: 'website', srcExtension: '.JSCP' },
    expectedDeleteFailErrorLogMessages,
    deleteFileFailTestChecker
  )
);

const test_contents_008_deleteFile_src_JSCP_allowexeextensionsinopr_false = Object.assign(makeFromBaseTest('Contents; deleteFile; source is JSCP; allowexeextensionsinopr is false'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprDeleteTest(
    { allowExeExtensionsInOpr: false },
    { srcDir: 'website', srcExtension: '.JSCP' },
    expectedDeleteFailErrorLogMessages,
    deleteFileFailTestChecker
  )
);

const test_contents_009_deleteFile_src_JSCP_allowexeextensionsinopr_true = Object.assign(makeFromBaseTest('Contents; deleteFile; source is JSCP; allowexeextensionsinopr is true'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprDeleteTest(
    { allowExeExtensionsInOpr: true },
    { srcDir: 'website', srcExtension: '.JSCP' },
    undefined,
    deleteFileSuccessTestChecker
  )
);

const test_contents_010_deleteFile_src_jscm_allowexeextensionsinopr_unset = Object.assign(makeFromBaseTest('Contents; deleteFile; source is jscm; allowexeextensionsinopr is unset (default false)'),
  makeTestEndBoilerplate.call(this),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprDeleteTest(
    {},
    { srcDir: 'website', srcExtension: '.jscm' },
    expectedDeleteFailErrorLogMessages,
    deleteFileFailTestChecker
  )
);

const test_contents_011_deleteFile_src_jscm_allowexeextensionsinopr_false = Object.assign(makeFromBaseTest('Contents; deleteFile; source is jscm; allowexeextensionsinopr is false'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprDeleteTest(
    { allowExeExtensionsInOpr: false },
    { srcDir: 'website', srcExtension: '.jscm' },
    expectedDeleteFailErrorLogMessages,
    deleteFileFailTestChecker
  )
);

const test_contents_012_deleteFile_src_jscm_allowexeextensionsinopr_true = Object.assign(makeFromBaseTest('Contents; deleteFile; source is jscm; allowexeextensionsinopr is true'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprDeleteTest(
    { allowExeExtensionsInOpr: true },
    { srcDir: 'website', srcExtension: '.jscm' },
    undefined,
    deleteFileSuccessTestChecker
  )
);

const test_contents_013_deleteFile_src_JSCM_allowexeextensionsinopr_unset = Object.assign(makeFromBaseTest('Contents; deleteFile; source is JSCM; allowexeextensionsinopr is unset (default false)'),
  makeTestEndBoilerplate.call(this),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprDeleteTest(
    {},
    { srcDir: 'website', srcExtension: '.JSCM' },
    expectedDeleteFailErrorLogMessages,
    deleteFileFailTestChecker
  )
);

const test_contents_014_deleteFile_src_JSCM_allowexeextensionsinopr_false = Object.assign(makeFromBaseTest('Contents; deleteFile; source is JSCM; allowexeextensionsinopr is false'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprDeleteTest(
    { allowExeExtensionsInOpr: false },
    { srcDir: 'website', srcExtension: '.JSCM' },
    expectedDeleteFailErrorLogMessages,
    deleteFileFailTestChecker
  )
);

const test_contents_015_deleteFile_src_JSCM_allowexeextensionsinopr_true = Object.assign(makeFromBaseTest('Contents; deleteFile; source is JSCM; allowexeextensionsinopr is true'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprDeleteTest(
    { allowExeExtensionsInOpr: true },
    { srcDir: 'website', srcExtension: '.JSCM' },
    undefined,
    deleteFileSuccessTestChecker
  )
);

const test_contents_016_deleteFile_src_jscp_outside_website_allowexeextensionsinopr_false = Object.assign(makeFromBaseTest('Contents; deleteFile; source is jscp but outside of website; allowexeextensionsinopr is false'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprDeleteTest(
    { allowExeExtensionsInOpr: false },
    { sourceExtension: '.jscp' },
    undefined,
    deleteFileSuccessTestChecker
  )
);

const test_contents_017_deleteFile_src_JSCP_outside_website_allowexeextensionsinopr_false = Object.assign(makeFromBaseTest('Contents; deleteFile; source is JSCP but outside of website; allowexeextensionsinopr is false'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprDeleteTest(
    { allowExeExtensionsInOpr: false },
    { sourceExtension: '.JSCP' },
    undefined,
    deleteFileSuccessTestChecker
  )
);

const test_contents_018_deleteFile_src_jscm_outside_website_allowexeextensionsinopr_false = Object.assign(makeFromBaseTest('Contents; deleteFile; source is jscm but outside of website; allowexeextensionsinopr is false'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprDeleteTest(
    { allowExeExtensionsInOpr: false },
    { sourceExtension: '.jscm' },
    undefined,
    deleteFileSuccessTestChecker
  )
);

const test_contents_019_deleteFile_src_JSCM_outside_website_allowexeextensionsinopr_false = Object.assign(makeFromBaseTest('Contents; deleteFile; source is JSCM but outside of website; allowexeextensionsinopr is false'),
  makeTestEndBoilerplate.call(this),
  makeAllowexeextensionsinoprDeleteTest(
    { allowExeExtensionsInOpr: false },
    { sourceExtension: '.JSCM' },
    undefined,
    deleteFileSuccessTestChecker
  )
);

module.exports =
[
  test_contents_001_deleteFile_src_txt_allowexeextensionsinopr_unset,
  test_contents_002_deleteFile_src_txt_allowexeextensionsinopr_false,
  test_contents_003_deleteFile_src_txt_allowexeextensionsinopr_true,

  test_contents_004_deleteFile_src_jscp_allowexeextensionsinopr_unset,
  test_contents_005_deleteFile_src_jscp_allowexeextensionsinopr_false,
  test_contents_006_deleteFile_src_jscp_allowexeextensionsinopr_true,

  test_contents_007_deleteFile_src_JSCP_allowexeextensionsinopr_unset,
  test_contents_008_deleteFile_src_JSCP_allowexeextensionsinopr_false,
  test_contents_009_deleteFile_src_JSCP_allowexeextensionsinopr_true,

  test_contents_010_deleteFile_src_jscm_allowexeextensionsinopr_unset,
  test_contents_011_deleteFile_src_jscm_allowexeextensionsinopr_false,
  test_contents_012_deleteFile_src_jscm_allowexeextensionsinopr_true,

  test_contents_013_deleteFile_src_JSCM_allowexeextensionsinopr_unset,
  test_contents_014_deleteFile_src_JSCM_allowexeextensionsinopr_false,
  test_contents_015_deleteFile_src_JSCM_allowexeextensionsinopr_true,

  test_contents_016_deleteFile_src_jscp_outside_website_allowexeextensionsinopr_false,
  test_contents_017_deleteFile_src_JSCP_outside_website_allowexeextensionsinopr_false,
  test_contents_018_deleteFile_src_jscm_outside_website_allowexeextensionsinopr_false,
  test_contents_019_deleteFile_src_JSCM_outside_website_allowexeextensionsinopr_false
];
