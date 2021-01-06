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

const test_contents_001_copyFile_src_txt_dest_txt_allowexeextensionsinopr_unset = Object.assign(makeFromBaseTest('Contents; copyFile; source is txt; destination is txt; allowexeextensionsinopr is unset (default false)'),
  makeTestEndBoilerplate.call(this),
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

      const sourceFile = `source_test_file_${Math.floor(Math.random() * 100000)}.txt`;
      const destFile = `website/dest_test_file_${Math.floor(Math.random() * 100000)}.txt`;
      this.tempTestData = { sourceFile, destFile };

      this.createFile(['sites', 'mysite', sourceFile], 'Some contents.');
      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], `rt.copyFile('${sourceFile}', '${destFile}')`);
      
      initConsoleLogCapture();

      this.isRequestsTest = true;
    },
    onReadyForRequests()
    {
      const { destFile } = this.tempTestData;
      processResponse(this, makeBaseRequest(), ({ statusCode, dataReceived, consoleLogOutput }) =>
      {
        this.testPassed = this.contentReqExpectedSiteResponded &&
          (statusCode === 200) && !dataReceived.length &&
          (consoleLogOutput.status === 'captured') &&
          this.fileExists(['sites', 'mysite', destFile]);
      });
    },
    onTestEnd()
    {
      const { sourceFile, destFile } = this.tempTestData;
      //__RP this.deleteFile(['sites', 'mysite', sourceFile]);
      //__RP this.deleteFile(['sites', 'mysite', destFile]);
    }
  }
);

const test_contents_002_copyFile_src_txt_dest_txt_allowexeextensionsinopr_false = Object.assign(makeFromBaseTest('Contents; copyFile; source is txt; destination is txt; allowexeextensionsinopr is false'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      const jsCauseConfContents = makeBaseJsCauseConfContents({
        'sites':
        [
          makeBaseSite({
            allowExeExtensionsInOpr: true
          })
        ],
      });

      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));

      const siteConfContents = makeBaseSiteConfContents();
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));

      const sourceFile = `source_test_file_${Math.floor(Math.random() * 100000)}.txt`;
      const destFile = `website/dest_test_file_${Math.floor(Math.random() * 100000)}.txt`;
      this.tempTestData = { sourceFile, destFile };

      this.createFile(['sites', 'mysite', sourceFile], 'Some contents.');
      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], `rt.copyFile('${sourceFile}', '${destFile}')`);
      
      initConsoleLogCapture();

      this.isRequestsTest = true;
    },
    onReadyForRequests()
    {
      const { destFile } = this.tempTestData;
      processResponse(this, makeBaseRequest(), ({ statusCode, dataReceived, consoleLogOutput }) =>
      {
        this.testPassed = this.contentReqExpectedSiteResponded &&
          (statusCode === 200) && !dataReceived.length &&
          (consoleLogOutput.status === 'captured') &&
          this.fileExists(['sites', 'mysite', destFile]);
      });
    },
    onTestEnd()
    {
      const { sourceFile, destFile } = this.tempTestData;
      //__RP this.deleteFile(['sites', 'mysite', sourceFile]);
      //__RP this.deleteFile(['sites', 'mysite', destFile]);
    }
  }
);

const test_contents_003_copyFile_src_txt_dest_txt_allowexeextensionsinopr_true = Object.assign(makeFromBaseTest('Contents; copyFile; source is txt; destination is txt; allowexeextensionsinopr is true'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      const jsCauseConfContents = makeBaseJsCauseConfContents({
        'sites':
        [
          makeBaseSite({
            allowExeExtensionsInOpr: true
          })
        ],
      });

      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));

      const siteConfContents = makeBaseSiteConfContents();
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));

      const sourceFile = `source_test_file_${Math.floor(Math.random() * 100000)}.txt`;
      const destFile = `website/dest_test_file_${Math.floor(Math.random() * 100000)}.txt`;
      this.tempTestData = { sourceFile, destFile };

      this.createFile(['sites', 'mysite', sourceFile], 'Some contents.');
      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], `rt.copyFile('${sourceFile}', '${destFile}')`);
      
      initConsoleLogCapture();

      this.isRequestsTest = true;
    },
    onReadyForRequests()
    {
      const { destFile } = this.tempTestData;
      processResponse(this, makeBaseRequest(), ({ statusCode, dataReceived, consoleLogOutput }) =>
      {
        this.testPassed = this.contentReqExpectedSiteResponded &&
          (statusCode === 200) && !dataReceived.length &&
          (consoleLogOutput.status === 'captured') &&
          this.fileExists(['sites', 'mysite', destFile]);
      });
    },
    onTestEnd()
    {
      const { sourceFile, destFile } = this.tempTestData;
      //__RP this.deleteFile(['sites', 'mysite', sourceFile]);
      //__RP this.deleteFile(['sites', 'mysite', destFile]);
    }
  }
);

const test_contents_004_copyFile_src_txt_dest_jscp_allowexeextensionsinopr_unset = Object.assign(makeFromBaseTest('Contents; copyFile; source is txt; destination is jscp; allowexeextensionsinopr is unset (default false)'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      const jsCauseConfContents = makeBaseJsCauseConfContents();

      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));

      const siteConfContents = makeBaseSiteConfContents();
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));

      const sourceFile = `source_test_file_${Math.floor(Math.random() * 100000)}.txt`;
      const destFile = `website/dest_test_file_${Math.floor(Math.random() * 100000)}.jscp`;
      this.tempTestData = { sourceFile, destFile };

      this.createFile(['sites', 'mysite', sourceFile], 'Some contents.');
      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], `rt.copyFile('${sourceFile}', '${destFile}')`);
      
      initConsoleLogCapture();

      this.isRequestsTest = true;
    },
    expectedLogMessages:
    [
      [ 'error', 'Site: My Site: Runtime error on file /index.jscp: allowExeExtensionsInOpr server configuration disallows copy file operation involving', 'prefix' ]
    ],
    onReadyForRequests()
    {
      const { destFile } = this.tempTestData;
      processResponse(this, makeBaseRequest(), ({ statusCode, dataReceived, consoleLogOutput }) =>
      {
        this.testPassed = this.contentReqExpectedSiteResponded &&
          (statusCode === 500) && !dataReceived.length &&
          this.gotAllExpectedLogMsgs &&
          (consoleLogOutput.status === 'captured') &&
          !this.fileExists(['sites', 'mysite', destFile]);
      });
    },
    onTestEnd()
    {
      const { sourceFile, destFile } = this.tempTestData;
      //__RP this.deleteFile(['sites', 'mysite', sourceFile]);
      //__RP this.deleteFile(['sites', 'mysite', destFile]);
    }
  }
);

const test_contents_005_copyFile_src_txt_dest_jscp_allowexeextensionsinopr_false = Object.assign(makeFromBaseTest('Contents; copyFile; source is txt; destination is jscp; allowexeextensionsinopr is false'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      const jsCauseConfContents = makeBaseJsCauseConfContents({
        'sites':
        [
          makeBaseSite({
            allowExeExtensionsInOpr: false
          })
        ],
      });

      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));

      const siteConfContents = makeBaseSiteConfContents();
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));

      const sourceFile = `source_test_file_${Math.floor(Math.random() * 100000)}.txt`;
      const destFile = `website/dest_test_file_${Math.floor(Math.random() * 100000)}.jscp`;
      this.tempTestData = { sourceFile, destFile };

      this.createFile(['sites', 'mysite', sourceFile], 'Some contents.');
      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], `rt.copyFile('${sourceFile}', '${destFile}')`);
      
      initConsoleLogCapture();

      this.isRequestsTest = true;
    },
    expectedLogMessages:
    [
      [ 'error', 'Site: My Site: Runtime error on file /index.jscp: allowExeExtensionsInOpr server configuration disallows copy file operation involving', 'prefix' ]
    ],
    onReadyForRequests()
    {
      const { destFile } = this.tempTestData;
      processResponse(this, makeBaseRequest(), ({ statusCode, dataReceived, consoleLogOutput }) =>
      {
        this.testPassed = this.contentReqExpectedSiteResponded &&
          (statusCode === 500) && !dataReceived.length &&
          this.gotAllExpectedLogMsgs &&
          (consoleLogOutput.status === 'captured') &&
          !this.fileExists(['sites', 'mysite', destFile]);
      });
    },
    onTestEnd()
    {
      const { sourceFile, destFile } = this.tempTestData;
      //__RP this.deleteFile(['sites', 'mysite', sourceFile]);
      //__RP this.deleteFile(['sites', 'mysite', destFile]);
    }
  }
);

const test_contents_006_copyFile_src_txt_dest_jscp_allowexeextensionsinopr_true = Object.assign(makeFromBaseTest('Contents; copyFile; source is txt; destination is jscp; allowexeextensionsinopr is true'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      const jsCauseConfContents = makeBaseJsCauseConfContents({
        'sites':
        [
          makeBaseSite({
            allowExeExtensionsInOpr: true
          })
        ],
      });

      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));

      const siteConfContents = makeBaseSiteConfContents();
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));

      const sourceFile = `source_test_file_${Math.floor(Math.random() * 100000)}.txt`;
      const destFile = `website/dest_test_file_${Math.floor(Math.random() * 100000)}.jscp`;
      this.tempTestData = { sourceFile, destFile };

      this.createFile(['sites', 'mysite', sourceFile], 'Some contents.');
      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], `rt.copyFile('${sourceFile}', '${destFile}')`);
      
      initConsoleLogCapture();

      this.isRequestsTest = true;
    },
    onReadyForRequests()
    {
      const { destFile } = this.tempTestData;
      processResponse(this, makeBaseRequest(), ({ statusCode, dataReceived, consoleLogOutput }) =>
      {
        this.testPassed = this.contentReqExpectedSiteResponded &&
          (statusCode === 200) && !dataReceived.length &&
          (consoleLogOutput.status === 'captured') &&
          this.fileExists(['sites', 'mysite', destFile]);
      });
    },
    onTestEnd()
    {
      const { sourceFile, destFile } = this.tempTestData;
      this.deleteFile(['sites', 'mysite', sourceFile]);
      //__RP this.deleteFile(['sites', 'mysite', destFile]);
    }
  }
);

const test_contents_007_copyFile_src_txt_dest_JSCP_allowexeextensionsinopr_unset = Object.assign(makeFromBaseTest('Contents; copyFile; source is txt; destination is JSCP; allowexeextensionsinopr is unset (default false)'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      const jsCauseConfContents = makeBaseJsCauseConfContents();

      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));

      const siteConfContents = makeBaseSiteConfContents();
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));

      const sourceFile = `source_test_file_${Math.floor(Math.random() * 100000)}.txt`;
      const destFile = `website/dest_test_file_${Math.floor(Math.random() * 100000)}.JSCP`;
      this.tempTestData = { sourceFile, destFile };

      this.createFile(['sites', 'mysite', sourceFile], 'Some contents.');
      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], `rt.copyFile('${sourceFile}', '${destFile}')`);
      
      initConsoleLogCapture();

      this.isRequestsTest = true;
    },
    expectedLogMessages:
    [
      [ 'error', 'Site: My Site: Runtime error on file /index.jscp: allowExeExtensionsInOpr server configuration disallows copy file operation involving', 'prefix' ]
    ],
    onReadyForRequests()
    {
      const { destFile } = this.tempTestData;
      processResponse(this, makeBaseRequest(), ({ statusCode, dataReceived, consoleLogOutput }) =>
      {
        this.testPassed = this.contentReqExpectedSiteResponded &&
          (statusCode === 500) && !dataReceived.length &&
          this.gotAllExpectedLogMsgs &&
          (consoleLogOutput.status === 'captured') &&
          !this.fileExists(['sites', 'mysite', destFile]);
      });
    },
    onTestEnd()
    {
      const { sourceFile, destFile } = this.tempTestData;
      //__RP this.deleteFile(['sites', 'mysite', sourceFile]);
      //__RP this.deleteFile(['sites', 'mysite', destFile]);
    }
  }
);

module.exports =
[
  test_contents_001_copyFile_src_txt_dest_txt_allowexeextensionsinopr_unset,
  // test_contents_002_copyFile_src_txt_dest_txt_allowexeextensionsinopr_false,
  // test_contents_003_copyFile_src_txt_dest_txt_allowexeextensionsinopr_true,
  // test_contents_004_copyFile_src_txt_dest_jscp_allowexeextensionsinopr_unset,
  //__RP test_contents_005_copyFile_src_txt_dest_jscp_allowexeextensionsinopr_false,
  test_contents_006_copyFile_src_txt_dest_jscp_allowexeextensionsinopr_true,
  test_contents_007_copyFile_src_txt_dest_JSCP_allowexeextensionsinopr_unset
];
