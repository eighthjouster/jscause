'use strict';

const querystring = require('querystring');

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

const test_contents_001_post_params_form_pt1 = Object.assign(makeFromBaseTest('Contents; JSCP file; POST parameters; form; part 1; simple test'),
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
      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], 'console.log(rt.postParams[\'txt_name\']);');

      this.isRequestsTest = true;
    },
    onReadyForRequests()
    {
      const postData = querystring.stringify(
        {
          'txt_name': 'some_name'
        }
      );

      const postRequest = makeBaseRequest(
        {
          headers:
          {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(postData)
          }
        }
      );

      processResponse(this, postRequest, ({ dataReceived, consoleLogOutput }) =>
      {
        this.testPassed = !dataReceived.length &&
          (consoleLogOutput.status === 'captured') &&
          areFlatArraysEqual(consoleLogOutput.lines,
            [
              'some_name'
            ]);
      }, postData);
    }
  }
);

const test_contents_002_post_params_form_pt2_forbidden = Object.assign(makeFromBaseTest('Contents; JSCP file; POST parameters; form; part 2; forbidden uploads'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      const siteConfContents = makeBaseSiteConfContents(
        {
          'canUpload': false
        }
      );
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));

      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], '');

      this.isRequestsTest = true;
    },
    onReadyForRequests()
    {
      const postData = querystring.stringify(
        {
          'txt_name': 'some_name'
        }
      );

      const postRequest = makeBaseRequest(
        {
          headers:
          {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(postData)
          }
        }
      );

      processResponse(this, postRequest, ({ statusCode }) =>
      {
        this.testPassed = (statusCode === 403);
      }, postData);
    }
  }
);

const test_contents_003_post_params_form_pt3 = Object.assign(makeFromBaseTest('Contents; JSCP file; POST parameters; part 3; random values'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      const siteConfContents = makeBaseSiteConfContents();
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
      
      initConsoleLogCapture();
      this.tempTestData = { paramValue: Math.random().toString() };
      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], 'console.log(rt.postParams[\'txt_name\'], rt.postParams[\'txt_value\'], rt.postParams[\'b_submit\']);');

      this.isRequestsTest = true;
    },
    onReadyForRequests()
    {
      const { paramValue } = this.tempTestData;

      const postData = querystring.stringify(
        {
          'txt_name': 'some_name',
          'txt_value': paramValue,
          'b_submit': 'submit'
        }
      );

      const postRequest = makeBaseRequest(
        {
          headers:
          {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(postData)
          }
        }
      );

      processResponse(this, postRequest, ({ dataReceived, consoleLogOutput }) =>
      {
        this.testPassed = !dataReceived.length &&
          (consoleLogOutput.status === 'captured') &&
          areFlatArraysEqual(consoleLogOutput.lines,
            [
              ['some_name', paramValue, 'submit'].join(' ')
            ]);
      }, postData);
    }
  }
);

module.exports = [
  test_contents_001_post_params_form_pt1,
  test_contents_002_post_params_form_pt2_forbidden,
  test_contents_003_post_params_form_pt3
];
