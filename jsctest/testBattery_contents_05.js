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
    getFormFieldBoundary
  } = testUtils;

const test_contents_001_post_params_form_uploading_binary_simple = Object.assign(makeFromBaseTest('Contents; JSCP file; POST parameters; form uploading; form-data simple test; binary value'),
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
      this.tempTestData = { randomOctetsArray };
      let formBoundary = getFormFieldBoundary([binaryValue]);
      if (formBoundary)
      {
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

        processResponse(this, postRequest, ({ statusCode, dataReceived, consoleLogOutput }) =>
        {
          const { randomOctetsArray } = this.tempTestData;
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
        }, binaryPostData);
      }
      else
      {
        console.error('Error: Could not find a suitable form field boundary.');
        this.testPassed = false;
        this.doneRequestsTesting();
      }
    }
  }
);

const test_contents_002_post_params_form_uploading_binary_field_simple = Object.assign(makeFromBaseTest('Contents; JSCP file; POST parameters; form uploading; form-data simple test; binary value and text field'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      initConsoleLogCapture();
      const testCode =
      [
        'rt.readFile(rt.uploadedFiles[\'file1\'].path).rtOnSuccess((response) => {',
        '  console.log(rt.uploadedFiles[\'file1\']);',
        '  console.log(rt.uploadedFiles[\'file1\'].name);',
        '  Buffer.from(response).forEach(c=>console.log(c));',
        '  console.log(rt.postParams[\'field1\']);',
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
      const textFieldValue = 'some_text_value';
      this.tempTestData = { randomOctetsArray };
      let formBoundary = getFormFieldBoundary([binaryValue, textFieldValue]);
      if (formBoundary)
      {
        const fileUploadEntries = [
          buildFileUploadEntry(formBoundary, 'file1', binaryValue, 'filename1.bin'),
          buildFileUploadEntry(formBoundary, 'field1', textFieldValue)
        ];
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

        processResponse(this, postRequest, ({ statusCode, dataReceived, consoleLogOutput }) =>
        {
          const { randomOctetsArray } = this.tempTestData;
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
                ...randomOctetsArray,
                'some_text_value'
              ]);
        }, binaryPostData);
      }
      else
      {
        console.error('Error: Could not find a suitable form field boundary.');
        this.testPassed = false;
        this.doneRequestsTesting();
      }
    }
  }
);

const test_contents_003_post_params_form_uploading_binary_maxpayload_pt1 = Object.assign(makeFromBaseTest('Contents; JSCP file; POST parameters; form uploading; form-data simple test; binary value; exceeds max payload; must fail'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      initConsoleLogCapture();

      const octetListLength = 5;
      const randomOctetsArray = [...Array(octetListLength)].map(() => Math.floor(Math.random() * 256));
      const binaryValue = Buffer.from(randomOctetsArray);
      this.tempTestData = { randomOctetsArray };
      let binaryPostData;
      let formBoundary = getFormFieldBoundary([binaryValue]);
      if (formBoundary)
      {
        const fileUploadEntries = [ buildFileUploadEntry(formBoundary, 'file1', binaryValue, 'filename1.bin') ];
        binaryPostData = makeBinaryPostData(formBoundary, fileUploadEntries);

        const binaryPostDataLength = Buffer.byteLength(binaryPostData);
        const maxPayloadSizeBytes = binaryPostDataLength - 1;

        this.tempTestData = {
          binaryPostData,
          binaryPostDataLength,
          formBoundary,
          moveToTempWorkDirData: { actualFilePath: '', systemUploadFileExistedBefore: false },
          pleaseProceed: true };

        const siteConfContents = makeBaseSiteConfContents(
          {
            'maxPayloadSizeBytes': maxPayloadSizeBytes
          }
        );
        this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));

        const testCode =
        [
          'console.log(rt.uploadedFiles[\'file1\']);',
        ].join('\n');
        this.createFile(['sites', 'mysite', 'website', 'index.jscp'], testCode);

        const { tempTestData } = this;
        this.functionCallListeners.doMoveToTempWorkDir =
        {
          beforeCb(thisActualFile)
          {
            const { moveToTempWorkDirData } = tempTestData;
            moveToTempWorkDirData.actualFilePath = thisActualFile.path;
            moveToTempWorkDirData.systemUploadFileExistedBefore = fs.existsSync(thisActualFile.path);
          }
        };
      }
      else
      {
        console.error('Error: Could not find a suitable form field boundary.');
      }
      this.isRequestsTest = true;
    },
    onReadyForRequests()
    {
      const { binaryPostData, binaryPostDataLength, formBoundary, pleaseProceed } = this.tempTestData;
      if (!pleaseProceed)
      {
        this.doneRequestsTesting();
        return;
      }

      const postRequest = makeBaseRequest(
        {
          headers:
          {
            'Content-Type': `multipart/form-data; boundary=${formBoundary}`,
            'Content-Length': binaryPostDataLength
          }
        }
      );

      processResponse(this, postRequest, ({ statusCode, consoleLogOutput }) =>
      {
        const { moveToTempWorkDirData: { actualFilePath, systemUploadFileExistedBefore } } = this.tempTestData;
        this.testPassed = (statusCode === 413) &&
        (consoleLogOutput.status === 'captured') &&
        (consoleLogOutput.lines.length === 0) &&
        !actualFilePath &&
        !systemUploadFileExistedBefore
      }, binaryPostData);
    }
  }
);

const test_contents_004_post_params_form_uploading_binary_maxpayload_pt2 = Object.assign(makeFromBaseTest('Contents; JSCP file; POST parameters; form uploading; form-data simple test; binary value; meets max payload; must pass'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      const octetListLength = 5;
      const randomOctetsArray = [...Array(octetListLength)].map(() => Math.floor(Math.random() * 256));
      const binaryValue = Buffer.from(randomOctetsArray);
      this.tempTestData = { randomOctetsArray };
      let binaryPostData;
      let formBoundary = getFormFieldBoundary([binaryValue]);
      if (formBoundary)
      {
        const fileUploadEntries = [ buildFileUploadEntry(formBoundary, 'file1', binaryValue, 'filename1.bin') ];
        binaryPostData = makeBinaryPostData(formBoundary, fileUploadEntries);

        const binaryPostDataLength = Buffer.byteLength(binaryPostData);
        const maxPayloadSizeBytes = binaryPostDataLength;

        this.tempTestData = { binaryPostData, binaryPostDataLength, formBoundary, pleaseProceed: true };

        const siteConfContents = makeBaseSiteConfContents(
          {
            'maxPayloadSizeBytes': maxPayloadSizeBytes
          }
        );
        this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));

        this.createFile(['sites', 'mysite', 'website', 'index.jscp'], '');

      }
      else
      {
        console.error('Error: Could not find a suitable form field boundary.');
      }
      this.isRequestsTest = true;
    },
    onReadyForRequests()
    {
      const { binaryPostData, binaryPostDataLength, formBoundary, pleaseProceed } = this.tempTestData;
      if (!pleaseProceed)
      {
        this.doneRequestsTesting();
        return;
      }

      const postRequest = makeBaseRequest(
        {
          headers:
          {
            'Content-Type': `multipart/form-data; boundary=${formBoundary}`,
            'Content-Length': binaryPostDataLength
          }
        }
      );

      processResponse(this, postRequest, ({ statusCode }) =>
      {
        this.testPassed = (statusCode === 200);
      }, binaryPostData);
    }
  }
);

module.exports = [
  test_contents_001_post_params_form_uploading_binary_simple,
  test_contents_002_post_params_form_uploading_binary_field_simple,
  test_contents_003_post_params_form_uploading_binary_maxpayload_pt1,
  test_contents_004_post_params_form_uploading_binary_maxpayload_pt2
];
