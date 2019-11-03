'use strict';

const fs = require('fs');
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
      'canUpload': true,
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
      method: 'POST'
    }, extra
  );

const
  {
    makeFromBaseTest,
    makeTestEndBoilerplate,
    processResponse,
    initConsoleLogCapture,
    areFlatArraysEqual,
    buildFileUploadEntry,
    makeBinaryPostData,
    getFormFieldBoundary,
    makeTimeChunkSender
  } = testUtils;

const test_contents_001_post_params_form_uploading_slow = Object.assign(makeFromBaseTest('Contents; JSCP file; POST parameters; form uploading; binary value; slow'),
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
      
      initConsoleLogCapture();
      const testCode =
      [
        'rt.readFile(rt.uploadedFiles[\'file1\'].path).rtOnSuccess((response) => {',
        '  console.log(rt.uploadedFiles[\'file1\']);',
        '  console.log(rt.uploadedFiles[\'file1\'].name);',
        '  Buffer.from(response).forEach(c=>console.log(c));',
        '});',
      ].join('\n');
      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], testCode);

      this.isRequestsTest = true;
    },
    onReadyForRequests()
    {
      const octetListLength = 5;
      const randomOctetsArray = [...Array(octetListLength)].map(() => Math.floor(Math.random() * 256));
      const binaryValue = Buffer.from(randomOctetsArray);
      let formBoundary = getFormFieldBoundary([binaryValue]);

      if (!formBoundary)
      {
        console.error('Error: Could not find a suitable form field boundary.');
        this.testPassed = false;
        this.doneRequestsTesting();
        return;
      }

      const fileUploadEntries = [ buildFileUploadEntry(formBoundary, 'file1', binaryValue, 'filename1.bin') ];
      const binaryPostData = makeBinaryPostData(formBoundary, fileUploadEntries);

      const postRequest = makeBaseRequest(
        {
          headers:
          {
            'Content-Type': `multipart/form-data; boundary=${formBoundary}`,
            'Content-Length': Buffer.byteLength(binaryPostData)
          }
        }
      );

      const reqSendHandler = (req, postData) =>
      {
        if (typeof(postData) !== 'undefined')
        {
          const totalTime = 3 * 1000; // 3 seconds.
          const timeChunkSender = makeTimeChunkSender(req, postData, totalTime);
          timeChunkSender();
        }
        else
        {
          req.end();
        }
      };

      processResponse(this, postRequest, ({ statusCode, dataReceived, consoleLogOutput }) =>
      {
        if (!consoleLogOutput.lines.length)
        {
          this.testPassed = false;
        }
        else {
          const jsCauseUploadFilePath = consoleLogOutput.lines[0].path;
          const jsCauseUploadFileExistedAfter = fs.existsSync(jsCauseUploadFilePath);
          const consoleLogOutputLinesButFirst = consoleLogOutput.lines.slice(1);

          this.testPassed = !dataReceived.length &&
            (statusCode === 200) &&
            (consoleLogOutput.status === 'captured') &&
            !jsCauseUploadFileExistedAfter &&
            areFlatArraysEqual(consoleLogOutputLinesButFirst,
              [
                'filename1.bin',
                ...randomOctetsArray
              ]);
        }
      }, { postData: binaryPostData, reqSendHandler });
    }
  }
);

const test_contents_002_post_params_form_uploading_slow_maxtime = Object.assign(makeFromBaseTest('Contents; JSCP file; POST parameters; form uploading; binary value; slow; max upload time exceeded'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      const jsCauseConfContents = makeBaseJsCauseConfContents(
        {
          'requesttimeoutsecs': 2
        }
      );
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));

      initConsoleLogCapture();
      const testCode =
      [
        'rt.readFile(rt.uploadedFiles[\'file1\'].path).rtOnSuccess((response) => {',
        '  console.log(rt.uploadedFiles[\'file1\']);',
        '  console.log(rt.uploadedFiles[\'file1\'].name);',
        '  Buffer.from(response).forEach(c=>console.log(c));',
        '});',
      ].join('\n');
      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], testCode);

      this.tempTestData = { timeoutErrorMsgDisplayed: false, handleRequestTimeoutMonitoring: { reqMonCtx: null } };

      this.isRequestsTest = true;

      const { tempTestData } = this;

      this.functionCallListeners.handleRequestTimeoutMonitoring =
      {
        beforeCb(reqMonCtx)
        {
          tempTestData.handleRequestTimeoutMonitoring.reqMonCtx = reqMonCtx;
        }
      };
    },
    monitoredLogMessages:
    [
      [ 'error', 'Timeout exceeded limit of 2 seconds' ]
    ],
    onMonitoredLogMessageFound()
    {
      this.tempTestData.timeoutErrorMsgDisplayed = true;
    },
    onReadyForRequests()
    {
      const octetListLength = 5;
      const randomOctetsArray = [...Array(octetListLength)].map(() => Math.floor(Math.random() * 256));
      const binaryValue = Buffer.from(randomOctetsArray);
      let formBoundary = getFormFieldBoundary([binaryValue]);

      if (!formBoundary)
      {
        console.error('Error: Could not find a suitable form field boundary.');
        this.testPassed = false;
        this.doneRequestsTesting();
        return;
      }

      const fileUploadEntries = [ buildFileUploadEntry(formBoundary, 'file1', binaryValue, 'filename1.bin') ];
      const binaryPostData = makeBinaryPostData(formBoundary, fileUploadEntries);

      const postRequest = makeBaseRequest(
        {
          headers:
          {
            'Content-Type': `multipart/form-data; boundary=${formBoundary}`,
            'Content-Length': Buffer.byteLength(binaryPostData)
          }
        }
      );

      const reqSendHandler = (req, postData) =>
      {
        if (typeof(postData) !== 'undefined')
        {
          const totalTime = 3 * 1000; // 3 seconds.
          const timeChunkSender = makeTimeChunkSender(req, postData, totalTime);
          timeChunkSender();
        }
        else
        {
          req.end();
        }
      };

      processResponse(this, postRequest, ({ statusCode, dataReceived, consoleLogOutput }) =>
      {
        const { timeoutErrorMsgDisplayed, handleRequestTimeoutMonitoring: { reqMonCtx } } = this.tempTestData;
        const { postedForm: { openedFiles: systemUploadFiles = [] } } = reqMonCtx;
        let systemUploadFileExistedBefore;
        systemUploadFiles.forEach((file) =>
        {
          if (typeof(systemUploadFileExistedBefore) === 'undefined')
          {
            systemUploadFileExistedBefore = true;
          }
          systemUploadFileExistedBefore = systemUploadFileExistedBefore && fs.existsSync(file.path);
        });

        this.testPassed = !dataReceived.length &&
          (statusCode === 413) &&
          (consoleLogOutput.status === 'captured') &&
          !systemUploadFileExistedBefore &&
          timeoutErrorMsgDisplayed;
      }, { postData: binaryPostData, reqSendHandler });
    }
  }
);

module.exports =
[
  test_contents_001_post_params_form_uploading_slow,
  test_contents_002_post_params_form_uploading_slow_maxtime
];
