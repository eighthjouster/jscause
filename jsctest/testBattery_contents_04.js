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
    areFlatArraysEqual
  } = testUtils;

const test_contents_001_post_params_form_uploading_simple = Object.assign(makeFromBaseTest('Contents; JSCP file; POST parameters; form uploading; form-data simple test; one text field'),
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
      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], 'console.log(rt.postParams[\'some_field_name\']);');

      this.isRequestsTest = true;
    },
    onReadyForRequests()
    {
      const formBoundary = 'some_boundary_123';
      const postData =
      [
        `--${formBoundary}`,
        'Content-Disposition: form-data; name="some_field_name"',
        '',
        'some_field_value',
        `--${formBoundary}`
      ].join('\r\n'); // \r\n is required by HTTP specs.

      const postRequest = makeBaseRequest(
        {
          headers:
          {
            'Content-Type': `multipart/form-data; boundary=${formBoundary}`,
            'Content-Length': Buffer.byteLength(postData)
          }
        }
      );

      processResponse(this, postRequest, ({ statusCode, dataReceived, consoleLogOutput }) =>
      {
        this.testPassed = !dataReceived.length &&
          (statusCode === 200) &&
          (consoleLogOutput.status === 'captured') &&
          areFlatArraysEqual(consoleLogOutput.lines,
            [
              'some_field_value'
            ]);
      }, postData);
    }
  }
);

const test_contents_002_post_params_form_uploading_malformed_pt1 = Object.assign(makeFromBaseTest('Contents; JSCP file; POST parameters; form uploading; form-data simple test; one text field; malformed request'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], '');

      this.isRequestsTest = true;
    },
    onReadyForRequests()
    {
      const formBoundary = 'some_boundary_123';
      const postData =
      [
        `--${formBoundary}`,
        'Content-Disposition: form-data; name="some_field_name"',
        '',
        'some_field_value',
        `--${formBoundary}`
      ].join('\n'); // \r\n is required by HTTP specs.  Deliberating using \n so the form upload fails.

      const postRequest = makeBaseRequest(
        {
          headers:
          {
            'Content-Type': `multipart/form-data; boundary=${formBoundary}`,
            'Content-Length': Buffer.byteLength(postData)
          }
        }
      );

      processResponse(this, postRequest, ({ statusCode }) =>
      {
        this.testPassed = statusCode === 500;
      }, postData);
    }
  }
);

const test_contents_003_post_params_form_uploading_malformed_pt2 = Object.assign(makeFromBaseTest('Contents; JSCP file; POST parameters; form uploading; form-data simple test; one text field; malformed request, part 2'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], '');

      this.isRequestsTest = true;
    },
    onReadyForRequests()
    {
      const formBoundary = 'some_boundary_123';
      const postData = // Deliberately leaving formBoundary out of postData to trigger an error.
      [
        'Content-Disposition: form-data; name="some_field_name"',
        '',
        'some_field_value'
      ].join('\r\n'); // \r\n is required by HTTP specs.

      const postRequest = makeBaseRequest(
        {
          headers:
          {
            'Content-Type': `multipart/form-data; boundary=${formBoundary}`,
            'Content-Length': Buffer.byteLength(postData)
          }
        }
      );

      processResponse(this, postRequest, ({ statusCode }) =>
      {
        this.testPassed = statusCode === 500;
      }, postData);
    }
  }
);

const test_contents_004_post_params_form_uploading_two_fields = Object.assign(makeFromBaseTest('Contents; JSCP file; POST parameters; form uploading; form-data simple test; two text fields'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      initConsoleLogCapture();
      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], 'console.log(rt.postParams[\'some_field_name_1\']);console.log(rt.postParams[\'some_field_name_2\']);');

      this.isRequestsTest = true;
    },
    onReadyForRequests()
    {
      const formBoundary = 'some_boundary_123';
      const postData =
      [
        `--${formBoundary}`,
        'Content-Disposition: form-data; name="some_field_name_1"',
        '',
        'some_field_value_1',
        `--${formBoundary}`,
        'Content-Disposition: form-data; name="some_field_name_2"',
        '',
        'some_field_value_2',
        `--${formBoundary}`
      ].join('\r\n'); // \r\n is required by HTTP specs.

      const postRequest = makeBaseRequest(
        {
          headers:
          {
            'Content-Type': `multipart/form-data; boundary=${formBoundary}`,
            'Content-Length': Buffer.byteLength(postData)
          }
        }
      );

      processResponse(this, postRequest, ({ statusCode, dataReceived, consoleLogOutput }) =>
      {
        this.testPassed = !dataReceived.length &&
          (statusCode === 200) &&
          (consoleLogOutput.status === 'captured') &&
          areFlatArraysEqual(consoleLogOutput.lines,
            [
              'some_field_value_1',
              'some_field_value_2'
            ]);
      }, postData);
    }
  }
);

const test_contents_005_post_params_form_uploading_one_file_field_pt1 = Object.assign(makeFromBaseTest('Contents; JSCP file; POST parameters; form uploading; form-data simple test; one file field; text'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      initConsoleLogCapture();
      const file1Contents = 'some text file, line 1\nsome text file, line 2.\n';
      this.tempTestData = { file1Contents };
      const testCode =
      [
        'rt.readFile(rt.uploadedFiles[\'file1\'].path, \'utf-8\').rtOnSuccess((response) => {',
        '  console.log(rt.postParams[\'file1\']);',
        '  console.log(rt.uploadedFiles[\'file1\'].name);',
        '  console.log(rt.uploadedFiles[\'file1\'].size);',
        '  console.log(rt.uploadedFiles[\'file1\'].type);',
        '  console.log(rt.uploadedFiles[\'file1\'].unsafeName);',
        '  console.log(response);',
        '});',
      ].join('\n');
      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], testCode);

      this.isRequestsTest = true;
    },
    onReadyForRequests()
    {
      const { file1Contents } = this.tempTestData;

      const formBoundary = 'some_boundary_123';
      const postData =
      [
        `--${formBoundary}`,
        'Content-Disposition: form-data; name="file1"; filename="filename1.txt"',
        'Content-Type: text/plain',
        '',
        file1Contents,
        `--${formBoundary}`
      ].join('\r\n'); // \r\n is required by HTTP specs.

      const postRequest = makeBaseRequest(
        {
          headers:
          {
            'Content-Type': `multipart/form-data; boundary=${formBoundary}`,
            'Content-Length': Buffer.byteLength(postData)
          }
        }
      );

      processResponse(this, postRequest, ({ statusCode, dataReceived, consoleLogOutput }) =>
      {
        this.testPassed = !dataReceived.length &&
          (statusCode === 200) &&
          (consoleLogOutput.status === 'captured') &&
          areFlatArraysEqual(consoleLogOutput.lines,
            [
              undefined,
              'filename1.txt',
              Buffer.byteLength(file1Contents),
              'text/plain',
              'filename1.txt',
              file1Contents
            ]);
      }, postData);
    }
  }
);

const test_contents_006_post_params_form_uploading_one_file_field_pt2 = Object.assign(makeFromBaseTest('Contents; JSCP file; POST parameters; form uploading; form-data simple test; one file field; text; temp files erased'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      initConsoleLogCapture();
      const file1Contents = 'some text file, line 1\nsome text file, line 2.\n';
      this.tempTestData = { file1Contents, moveToTempWorkDirData: { actualFilePath: '', systemUploadFileExistedBefore: false, moveErrorOccurred: false } };
      const testCode =
      [
        'console.log(rt.uploadedFiles[\'file1\']);',
      ].join('\n');
      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], testCode);

      this.isRequestsTest = true;

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
    },
    monitoredLogMessages:
    [
      [ 'error', 'Could not rename unhandled uploaded file: filename1.txt' ]
    ],
    onMonitoredLogMessageFound()
    {
      this.tempTestData.moveToTempWorkDirData.moveErrorOccurred = true;
    },
    onReadyForRequests()
    {
      const { file1Contents } = this.tempTestData;

      const formBoundary = 'some_boundary_123';
      const postData =
      [
        `--${formBoundary}`,
        'Content-Disposition: form-data; name="file1"; filename="filename1.txt"',
        'Content-Type: text/plain',
        '',
        file1Contents,
        `--${formBoundary}`
      ].join('\r\n'); // \r\n is required by HTTP specs.

      const postRequest = makeBaseRequest(
        {
          headers:
          {
            'Content-Type': `multipart/form-data; boundary=${formBoundary}`,
            'Content-Length': Buffer.byteLength(postData)
          }
        }
      );

      processResponse(this, postRequest, ({ statusCode, dataReceived, consoleLogOutput }) =>
      {
        const { moveToTempWorkDirData: { actualFilePath, systemUploadFileExistedBefore, moveErrorOccurred } } = this.tempTestData;

        const systemUploadFileExistedAfter = fs.existsSync(actualFilePath);
        const jsCauseUploadFilePath = consoleLogOutput.lines[0].path;
        const jsCauseUploadFileExistedAfter = fs.existsSync(jsCauseUploadFilePath);

        this.testPassed = !dataReceived.length &&
          (statusCode === 200) &&
          (consoleLogOutput.status === 'captured') &&
          !moveErrorOccurred &&
          systemUploadFileExistedBefore &&
          actualFilePath &&
          !systemUploadFileExistedAfter &&
          jsCauseUploadFilePath &&
          !jsCauseUploadFileExistedAfter;
            
      }, postData);
    }
  }
);

const test_contents_007_post_params_form_uploading_one_file_field_pt3 = Object.assign(makeFromBaseTest('Contents; JSCP file; POST parameters; form uploading; form-data simple test; one file field; empty; temp files erased'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      initConsoleLogCapture();
      const file1Contents = '';
      this.tempTestData = { file1Contents, moveToTempWorkDirData: { actualFilePath: '', systemUploadFileExistedBefore: false, moveErrorOccurred: false } };
      const testCode =
      [
        'console.log(rt.uploadedFiles[\'file1\']);',
      ].join('\n');
      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], testCode);

      this.isRequestsTest = true;

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
    },
    monitoredLogMessages:
    [
      [ 'error', 'Could not rename unhandled uploaded file: filename1.txt' ]
    ],
    onMonitoredLogMessageFound()
    {
      this.tempTestData.moveToTempWorkDirData.moveErrorOccurred = true;
    },
    onReadyForRequests()
    {
      const { file1Contents } = this.tempTestData;

      const formBoundary = 'some_boundary_123';
      const postData =
      [
        `--${formBoundary}`,
        'Content-Disposition: form-data; name="file1"; filename="filename1.txt"',
        'Content-Type: text/plain',
        '',
        file1Contents,
        `--${formBoundary}`
      ].join('\r\n'); // \r\n is required by HTTP specs.

      const postRequest = makeBaseRequest(
        {
          headers:
          {
            'Content-Type': `multipart/form-data; boundary=${formBoundary}`,
            'Content-Length': Buffer.byteLength(postData)
          }
        }
      );

      processResponse(this, postRequest, ({ statusCode, dataReceived, consoleLogOutput }) =>
      {
        const { moveToTempWorkDirData: { actualFilePath, systemUploadFileExistedBefore, moveErrorOccurred } } = this.tempTestData;

        const systemUploadFileExistedAfter = fs.existsSync(actualFilePath);
        const jsCauseUploadFilePath = consoleLogOutput.lines[0].path;
        const jsCauseUploadFileExistedAfter = fs.existsSync(jsCauseUploadFilePath);

        this.testPassed = !dataReceived.length &&
          (statusCode === 200) &&
          (consoleLogOutput.status === 'captured') &&
          !moveErrorOccurred &&
          systemUploadFileExistedBefore &&
          actualFilePath &&
          !systemUploadFileExistedAfter &&
          jsCauseUploadFilePath &&
          !jsCauseUploadFileExistedAfter;
            
      }, postData);
    }
  }
);

const test_contents_008_post_params_form_uploading_one_file_field_unsafe_name = Object.assign(makeFromBaseTest('Contents; JSCP file; POST parameters; form uploading; form-data simple test; one file field; unsafe name'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      initConsoleLogCapture();
      const testCode =
      [
        'console.log(rt.uploadedFiles[\'file1\'].unsafeName);',
        'console.log(rt.uploadedFiles[\'file1\'].name);',
        'console.log(rt.uploadedFiles[\'file2\'].unsafeName);',
        'console.log(rt.uploadedFiles[\'file2\'].name);',
        'console.log(rt.uploadedFiles[\'file3\'].unsafeName);',
        'console.log(rt.uploadedFiles[\'file3\'].name);',
        'console.log(rt.uploadedFiles[\'file4\'].unsafeName);',
        'console.log(rt.uploadedFiles[\'file4\'].name);',
        'console.log(rt.uploadedFiles[\'file5\'].unsafeName);',
        'console.log(rt.uploadedFiles[\'file5\'].name);'
      ].join('\n');
      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], testCode);

      this.isRequestsTest = true;
    },
    onReadyForRequests()
    {
      const formBoundary = 'some_boundary_123';
      const postData =
      [
        `--${formBoundary}`,
        'Content-Disposition: form-data; name="file1"; filename="f<>\u0000*?/.txt"',
        'Content-Type: text/plain',
        '',
        'placeholder content',
        `--${formBoundary}`,
        'Content-Disposition: form-data; name="file2"; filename="."',
        'Content-Type: text/plain',
        '',
        'placeholder content',
        `--${formBoundary}`,
        'Content-Disposition: form-data; name="file3"; filename=".."',
        'Content-Type: text/plain',
        '',
        'placeholder content',
        `--${formBoundary}`,
        'Content-Disposition: form-data; name="file4"; filename="CON"',
        'Content-Type: text/plain',
        '',
        'placeholder content',
        `--${formBoundary}`,
        `Content-Disposition: form-data; name="file5"; filename="${'A'.repeat(300)}"`,
        'Content-Type: text/plain',
        '',
        'placeholder content',
        `--${formBoundary}`
      ].join('\r\n'); // \r\n is required by HTTP specs.

      const postRequest = makeBaseRequest(
        {
          headers:
          {
            'Content-Type': `multipart/form-data; boundary=${formBoundary}`,
            'Content-Length': Buffer.byteLength(postData)
          }
        }
      );

      processResponse(this, postRequest, ({ statusCode, dataReceived, consoleLogOutput }) =>
      {
        this.testPassed = !dataReceived.length &&
          (statusCode === 200) &&
          (consoleLogOutput.status === 'captured') &&
          areFlatArraysEqual(consoleLogOutput.lines,
            [
              'f<>\u0000*?/.txt',
              'f______.txt',
              '.',
              '_',
              '..',
              '_',
              'CON',
              '_',
              'A'.repeat(300),
              'A'.repeat(255)
            ]);
      }, postData);
    }
  }
);

const test_contents_009_post_params_form_uploading_two_files = Object.assign(makeFromBaseTest('Contents; JSCP file; POST parameters; form uploading; form-data simple test; two file fields; text'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      initConsoleLogCapture();
      const file1Contents = 'some text file, line 1\nsome text file, line 2.\n';
      const file2Contents = 'some other text file, line 1\nsome text file, line 2.\n';
      this.tempTestData = { file1Contents, file2Contents, moveErrorOccurred: false };
      const testCode =
      [
        'rt.readFile(rt.uploadedFiles[\'file1\'].path, \'utf-8\').rtOnSuccess((response1) => {',
        '  rt.readFile(rt.uploadedFiles[\'file2\'].path, \'utf-8\').rtOnSuccess((response2) => {',
        '    console.log(rt.uploadedFiles[\'file1\']);',
        '    console.log(rt.uploadedFiles[\'file2\']);',
        '    console.log(rt.uploadedFiles[\'file1\'].name);',
        '    console.log(rt.uploadedFiles[\'file2\'].name);',
        '    console.log(response1);',
        '    console.log(response2);',
        '  });',
        '});'
      ].join('\n');
      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], testCode);

      this.isRequestsTest = true;
    },
    monitoredLogMessages:
    [
      [ 'error', 'Could not rename unhandled uploaded file: filename1.txt' ]
    ],
    onMonitoredLogMessageFound()
    {
      this.tempTestData.moveErrorOccurred = true;
    },
    onReadyForRequests()
    {
      const { file1Contents, file2Contents, moveErrorOccurred } = this.tempTestData;

      const formBoundary = 'some_boundary_123';
      const postData =
      [
        `--${formBoundary}`,
        'Content-Disposition: form-data; name="file1"; filename="filename1.txt"',
        'Content-Type: text/plain',
        '',
        file1Contents,
        `--${formBoundary}`,
        'Content-Disposition: form-data; name="file2"; filename="filename2.txt"',
        'Content-Type: text/plain',
        '',
        file2Contents,
        `--${formBoundary}`
      ].join('\r\n'); // \r\n is required by HTTP specs.

      const postRequest = makeBaseRequest(
        {
          headers:
          {
            'Content-Type': `multipart/form-data; boundary=${formBoundary}`,
            'Content-Length': Buffer.byteLength(postData)
          }
        }
      );

      processResponse(this, postRequest, ({ statusCode, dataReceived, consoleLogOutput }) =>
      {
        const jsCauseUploadFile1Path = consoleLogOutput.lines[0].path;
        const jsCauseUploadFile1ExistedAfter = fs.existsSync(jsCauseUploadFile1Path);
        const jsCauseUploadFile2Path = consoleLogOutput.lines[1].path;
        const jsCauseUploadFile2ExistedAfter = fs.existsSync(jsCauseUploadFile2Path);

        const consoleLogOutputLinesButFirstTwo = consoleLogOutput.lines.slice(2);
        this.testPassed = !dataReceived.length &&
          (statusCode === 200) &&
          (consoleLogOutput.status === 'captured') &&
          !moveErrorOccurred &&
          jsCauseUploadFile1Path &&
          !jsCauseUploadFile1ExistedAfter &&
          jsCauseUploadFile2Path &&
          !jsCauseUploadFile2ExistedAfter &&
          areFlatArraysEqual(consoleLogOutputLinesButFirstTwo,
            [
              'filename1.txt',
              'filename2.txt',
              'some text file, line 1\nsome text file, line 2.\n',
              'some other text file, line 1\nsome text file, line 2.\n'
            ]);
            
      }, postData);
    }
  }
);

const test_contents_010_post_params_form_uploading_two_files_same_filename_pt1 = Object.assign(makeFromBaseTest('Contents; JSCP file; POST parameters; form uploading; form-data simple test; two file fields; text; same file names'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      const file1Contents = 'some text file, line 1\nsome text file, line 2.\n';
      const file2Contents = 'some other text file, line 1\nsome text file, line 2.\n';
      this.tempTestData = { file1Contents, file2Contents };
      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], '');

      this.isRequestsTest = true;
    },
    onReadyForRequests()
    {
      const { file1Contents, file2Contents } = this.tempTestData;
      const sameFileFieldName = 'some_file_field_name';

      const formBoundary = 'some_boundary_123';
      const postData =
      [
        `--${formBoundary}`,
        `Content-Disposition: form-data; name="${sameFileFieldName}"; filename="filename1.txt"`,
        'Content-Type: text/plain',
        '',
        file1Contents,
        `--${formBoundary}`,
        `Content-Disposition: form-data; name="${sameFileFieldName}"; filename="filename2.txt"`,
        'Content-Type: text/plain',
        '',
        file2Contents,
        `--${formBoundary}`
      ].join('\r\n'); // \r\n is required by HTTP specs.

      const postRequest = makeBaseRequest(
        {
          headers:
          {
            'Content-Type': `multipart/form-data; boundary=${formBoundary}`,
            'Content-Length': Buffer.byteLength(postData)
          }
        }
      );

      processResponse(this, postRequest, ({ statusCode, dataReceived }) =>
      {
        this.testPassed = !dataReceived.length &&
          (statusCode === 200);
            
      }, postData);
    }
  }
);

const test_contents_011_post_params_form_uploading_two_files_same_filename_pt2 = Object.assign(makeFromBaseTest('Contents; JSCP file; POST parameters; form uploading; form-data simple test; two file fields; same field name; text'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      initConsoleLogCapture();
      const file1Contents = 'multiple upload; some text file, line 1\nsome text file, line 2.\n';
      const file2Contents = 'multiple upload; some other text file, line 1\nsome text file, line 2.\n';
      this.tempTestData = { file1Contents, file2Contents, moveErrorOccurred: false };
      const testCode =
      [
        'rt.readFile(rt.uploadedFiles[\'file1\'][0].path, \'utf-8\').rtOnSuccess((response1) => {',
        '  rt.readFile(rt.uploadedFiles[\'file1\'][1].path, \'utf-8\').rtOnSuccess((response2) => {',
        '    console.log(rt.uploadedFiles[\'file1\'][0]);',
        '    console.log(rt.uploadedFiles[\'file1\'][1]);',
        '    console.log(rt.uploadedFiles[\'file1\'][0].name);',
        '    console.log(rt.uploadedFiles[\'file1\'][1].name);',
        '    console.log(response1);',
        '    console.log(response2);',
        '  });',
        '});'
      ].join('\n');
      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], testCode);

      this.isRequestsTest = true;
    },
    monitoredLogMessages:
    [
      [
        'error', 'Could not rename unhandled uploaded file: filename1.txt',
        'error', 'Could not rename unhandled uploaded file: filename2.txt'
      ]
    ],
    onMonitoredLogMessageFound()
    {
      this.tempTestData.moveErrorOccurred = true;
    },
    onReadyForRequests()
    {
      const { file1Contents, file2Contents, moveErrorOccurred } = this.tempTestData;

      const formBoundary = 'some_boundary_123';
      const postData =
      [
        `--${formBoundary}`,
        'Content-Disposition: form-data; name="file1"; filename="filename1.txt"',
        'Content-Type: text/plain',
        '',
        file1Contents,
        `--${formBoundary}`,
        'Content-Disposition: form-data; name="file1"; filename="filename2.txt"',
        'Content-Type: text/plain',
        '',
        file2Contents,
        `--${formBoundary}`
      ].join('\r\n'); // \r\n is required by HTTP specs.

      const postRequest = makeBaseRequest(
        {
          headers:
          {
            'Content-Type': `multipart/form-data; boundary=${formBoundary}`,
            'Content-Length': Buffer.byteLength(postData)
          }
        }
      );

      processResponse(this, postRequest, ({ statusCode, dataReceived, consoleLogOutput }) =>
      {
        const jsCauseUploadFile1Path = consoleLogOutput.lines[0].path;
        const jsCauseUploadFile1ExistedAfter = fs.existsSync(jsCauseUploadFile1Path);
        const jsCauseUploadFile2Path = consoleLogOutput.lines[1].path;
        const jsCauseUploadFile2ExistedAfter = fs.existsSync(jsCauseUploadFile2Path);

        const consoleLogOutputLinesButFirstTwo = consoleLogOutput.lines.slice(2);
        this.testPassed = !dataReceived.length &&
          (statusCode === 200) &&
          (consoleLogOutput.status === 'captured') &&
          !moveErrorOccurred &&
          jsCauseUploadFile1Path &&
          !jsCauseUploadFile1ExistedAfter &&
          jsCauseUploadFile2Path &&
          !jsCauseUploadFile2ExistedAfter &&
          areFlatArraysEqual(consoleLogOutputLinesButFirstTwo,
            [
              'filename1.txt',
              'filename2.txt',
              'multiple upload; some text file, line 1\nsome text file, line 2.\n',
              'multiple upload; some other text file, line 1\nsome text file, line 2.\n'
            ]);
            
      }, postData);
    }
  }
);

module.exports = [
  test_contents_001_post_params_form_uploading_simple,
  test_contents_002_post_params_form_uploading_malformed_pt1,
  test_contents_003_post_params_form_uploading_malformed_pt2,
  test_contents_004_post_params_form_uploading_two_fields,
  test_contents_005_post_params_form_uploading_one_file_field_pt1,
  test_contents_006_post_params_form_uploading_one_file_field_pt2,
  test_contents_007_post_params_form_uploading_one_file_field_pt3,
  test_contents_008_post_params_form_uploading_one_file_field_unsafe_name,
  test_contents_009_post_params_form_uploading_two_files,
  test_contents_010_post_params_form_uploading_two_files_same_filename_pt1,
  test_contents_011_post_params_form_uploading_two_files_same_filename_pt2
];
