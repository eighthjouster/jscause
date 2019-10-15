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

const test_contents_001_get_params = Object.assign(makeFromBaseTest('Contents; JSCP file; GET parameters'),
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
      this.tempTestData = { paramValue: Math.random().toString() };
      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], 'console.log(rt.getParams[\'paramValue\']);');

      this.isRequestsTest = true;
    },
    onReadyForRequests()
    {
      const { paramValue } = this.tempTestData;
      const reqUrl = `/?paramValue=${paramValue}`;
      processResponse(this, makeBaseRequest({ path: reqUrl }), ({ dataReceived, consoleLogOutput }) =>
      {
        this.testPassed = !dataReceived.length &&
          (consoleLogOutput.status === 'captured') &&
          areFlatArraysEqual(consoleLogOutput.lines,
            [
              paramValue
            ]);
      });
    }
  }
);

const test_contents_002_two_get_params = Object.assign(makeFromBaseTest('Contents; JSCP file; two GET parameters'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      initConsoleLogCapture();
      this.tempTestData =
        {
          paramValue1: Math.random().toString(),
          paramValue2: Math.random().toString()
        };
      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], '[1, 2].forEach(n => console.log(rt.getParams[`paramValue${n}`]));');

      this.isRequestsTest = true;
    },
    onReadyForRequests()
    {
      const { paramValue1, paramValue2 } = this.tempTestData;
      const reqUrl = `/?paramValue1=${paramValue1}&paramValue2=${paramValue2}`;
      processResponse(this, makeBaseRequest({ path: reqUrl }), ({ dataReceived, consoleLogOutput }) =>
      {
        this.testPassed = !dataReceived.length &&
          (consoleLogOutput.status === 'captured') &&
          areFlatArraysEqual(consoleLogOutput.lines,
            [
              paramValue1,
              paramValue2
            ]);
      });
    }
  }
);

const test_contents_003_two_get_params_one_undefined_pt1 = Object.assign(makeFromBaseTest('Contents; JSCP file; two GET parameters, one undefined; part 1'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      initConsoleLogCapture();
      const someDefaultNumber = Math.random().toString();
      this.tempTestData =
        {
          paramValue1: Math.random().toString(),
          paramValue2: Math.random().toString(),
          someDefaultNumber
        };
      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], `[1, 2, 3].forEach(n => console.log(rt.getParams[\`paramValue\${n}\`] || '${someDefaultNumber}'));`);

      this.isRequestsTest = true;
    },
    onReadyForRequests()
    {
      const { paramValue1, paramValue2, someDefaultNumber } = this.tempTestData;
      const reqUrl = `/?paramValue1=${paramValue1}&paramValue2=${paramValue2}`;
      processResponse(this, makeBaseRequest({ path: reqUrl }), ({ dataReceived, consoleLogOutput }) =>
      {
        this.testPassed = !dataReceived.length &&
          (consoleLogOutput.status === 'captured') &&
          areFlatArraysEqual(consoleLogOutput.lines,
            [
              paramValue1,
              paramValue2,
              someDefaultNumber
            ]);
      });
    }
  }
);

const test_contents_003_two_get_params_one_undefined_pt2 = Object.assign(makeFromBaseTest('Contents; JSCP file; two GET parameters, one undefined; part 2'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      initConsoleLogCapture();
      this.tempTestData =
        {
          paramValue1: Math.random().toString(),
          paramValue2: Math.random().toString()
        };
      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], '[1, 2, 3].forEach(n => console.log(rt.getParams[`paramValue${n}`]));');

      this.isRequestsTest = true;
    },
    onReadyForRequests()
    {
      const { paramValue1, paramValue2 } = this.tempTestData;
      const reqUrl = `/?paramValue1=${paramValue1}&paramValue2=${paramValue2}`;
      processResponse(this, makeBaseRequest({ path: reqUrl }), ({ dataReceived, consoleLogOutput }) =>
      {
        this.testPassed = !dataReceived.length &&
          (consoleLogOutput.status === 'captured') &&
          areFlatArraysEqual(consoleLogOutput.lines,
            [
              paramValue1,
              paramValue2,
              undefined
            ]);
      });
    }
  }
);

const test_contents_004_two_get_params_one_empty = Object.assign(makeFromBaseTest('Contents; JSCP file; two GET parameters, one empty'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      initConsoleLogCapture();
      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], 'console.log(rt.getParams[\'a\'], rt.getParams[\'b\'], rt.getParams[\'c\']);');

      this.isRequestsTest = true;
    },
    onReadyForRequests()
    {
      const reqUrl = '/?a=1&b=&c=3';
      processResponse(this, makeBaseRequest({ path: reqUrl }), ({ dataReceived, consoleLogOutput }) =>
      {
        this.testPassed = !dataReceived.length &&
          (consoleLogOutput.status === 'captured') &&
          areFlatArraysEqual(consoleLogOutput.lines,
            [
              ['1', '', '3'].join(' ')
            ]);
      });
    }
  }
);

module.exports = [
  test_contents_001_get_params,
  test_contents_002_two_get_params,
  test_contents_003_two_get_params_one_undefined_pt1,
  test_contents_003_two_get_params_one_undefined_pt2,
  test_contents_004_two_get_params_one_empty
];
