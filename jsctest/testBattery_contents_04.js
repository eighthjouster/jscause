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

const test_contents_001_post_params_form_uploading_pt1 = Object.assign(makeFromBaseTest('Contents; JSCP file; POST parameters; form uploading; form-data simple test; one text field'),
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
        `--${formBoundary}`,
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

const test_contents_002_post_params_form_uploading_pt2 = Object.assign(makeFromBaseTest('Contents; JSCP file; POST parameters; form uploading; form-data simple test; one text field; malformed request'),
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
        `--${formBoundary}`,
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

const test_contents_003_post_params_form_uploading_pt3 = Object.assign(makeFromBaseTest('Contents; JSCP file; POST parameters; form uploading; form-data simple test; one text field; malformed request, part 2'),
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

module.exports = [
  test_contents_001_post_params_form_uploading_pt1,
  test_contents_002_post_params_form_uploading_pt2,
  test_contents_003_post_params_form_uploading_pt3
];
