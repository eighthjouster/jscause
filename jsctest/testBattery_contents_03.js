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

const test_contents_003_post_params_form_pt3 = Object.assign(makeFromBaseTest('Contents; JSCP file; POST parameters; form; part 3; random values'),
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

const test_contents_004_post_params_form_maxpayload_precheck_pt1 = Object.assign(makeFromBaseTest('Contents; JSCP file; POST parameters; form; max payload; under threshold; must pass'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      const parameterIdLength = Math.floor(Math.random() * 10) + 10;
      const parameterValueLength = Math.floor(Math.random() * 10) + 10;
      const parameterName = 'a'.repeat(parameterIdLength);
      const payLoad =
      {
        [parameterName]: 'B'.repeat(parameterValueLength)
      }
      const extraBytes = Object.keys(payLoad).length; // 1 extra byte representing the equal sign.
      const preMaxPayloadSizeBytes = parameterIdLength + parameterValueLength + extraBytes;
      const maxPayloadSizeBytes = preMaxPayloadSizeBytes + 1;

      this.tempTestData = { payLoad };

      const siteConfContents = makeBaseSiteConfContents(
        {
          'maxPayloadSizeBytes': maxPayloadSizeBytes
        }
      );
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));

      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], '');

      this.isRequestsTest = true;
    },
    onReadyForRequests()
    {
      const { payLoad } = this.tempTestData;
      const postData = querystring.stringify(payLoad);

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
        this.testPassed = (statusCode === 200);
      }, postData);
    }
  }
);

const test_contents_005_post_params_form_maxpayload_precheck_pt2 = Object.assign(makeFromBaseTest('Contents; JSCP file; POST parameters; form; max payload; reached threshold; must pass'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      const parameterIdLength = Math.floor(Math.random() * 10) + 10;
      const parameterValueLength = Math.floor(Math.random() * 10) + 10;
      const parameterName = 'a'.repeat(parameterIdLength);
      const payLoad =
      {
        [parameterName]: 'B'.repeat(parameterValueLength)
      }
      const extraBytes = Object.keys(payLoad).length; // 1 extra byte representing the equal sign.
      const preMaxPayloadSizeBytes = parameterIdLength + parameterValueLength + extraBytes;
      const maxPayloadSizeBytes = preMaxPayloadSizeBytes;

      this.tempTestData = { payLoad };

      const siteConfContents = makeBaseSiteConfContents(
        {
          'maxPayloadSizeBytes': maxPayloadSizeBytes
        }
      );
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));

      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], '');

      this.isRequestsTest = true;
    },
    onReadyForRequests()
    {
      const { payLoad } = this.tempTestData;
      const postData = querystring.stringify(payLoad);

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
        this.testPassed = (statusCode === 200);
      }, postData);
    }
  }
);

const test_contents_006_post_params_form_maxpayload_actualcheck = Object.assign(makeFromBaseTest('Contents; JSCP file; POST parameters; form; max payload; above threshold; must fail'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      const parameterIdLength = Math.floor(Math.random() * 10) + 10;
      const parameterValueLength = Math.floor(Math.random() * 10) + 10;
      const parameterName = 'a'.repeat(parameterIdLength);
      const payLoad =
      {
        [parameterName]: 'B'.repeat(parameterValueLength)
      }
      const extraBytes = Object.keys(payLoad).length; // 1 extra byte representing the equal sign.
      const preMaxPayloadSizeBytes = parameterIdLength + parameterValueLength + extraBytes;
      const maxPayloadSizeBytes = preMaxPayloadSizeBytes - 1;

      this.tempTestData = { payLoad };

      const siteConfContents = makeBaseSiteConfContents(
        {
          'maxPayloadSizeBytes': maxPayloadSizeBytes
        }
      );
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));

      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], '');

      this.isRequestsTest = true;
    },
    onReadyForRequests()
    {
      const { payLoad } = this.tempTestData;
      const postData = querystring.stringify(payLoad);

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
        this.testPassed = (statusCode === 413);
      }, postData);
    }
  }
);

const test_contents_007_post_params_json_pt1 = Object.assign(makeFromBaseTest('Contents; JSCP file; POST parameters; json; part 1; simple test'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      const jsCauseConfContents = makeBaseJsCauseConfContents();
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));

      const siteConfContents = makeBaseSiteConfContents();
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
      
      initConsoleLogCapture();
      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], 'console.log(rt.postParams[\'json_name\']);');

      this.isRequestsTest = true;
    },
    onReadyForRequests()
    {
      const postData = JSON.stringify(
        {
          'json_name': 'some_json_name'
        }
      );

      const postRequest = makeBaseRequest(
        {
          headers:
          {
            'Content-Type': 'application/json',
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
              'some_json_name'
            ]);
      }, postData);
    }
  }
);

const test_contents_008_post_params_json_pt2_forbidden = Object.assign(makeFromBaseTest('Contents; JSCP file; POST parameters; json; part 2; forbidden uploads'),
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
      const postData = JSON.stringify(
        {
          'json_name': 'some_json_name'
        }
      );

      const postRequest = makeBaseRequest(
        {
          headers:
          {
            'Content-Type': 'application/json',
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

const test_contents_009_post_params_json_pt3 = Object.assign(makeFromBaseTest('Contents; JSCP file; POST parameters; json; part 3; random values'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      const siteConfContents = makeBaseSiteConfContents();
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
      
      initConsoleLogCapture();
      this.tempTestData = { paramValue: Math.random().toString() };
      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], 'console.log(rt.postParams[\'json_name\'], rt.postParams[\'json_value\'], rt.postParams[\'b_submit\']);');

      this.isRequestsTest = true;
    },
    onReadyForRequests()
    {
      const { paramValue } = this.tempTestData;

      const postData = JSON.stringify(
        {
          'json_name': 'some_json_name',
          'json_value': paramValue,
          'b_submit': 'submit'
        }
      );

      const postRequest = makeBaseRequest(
        {
          headers:
          {
            'Content-Type': 'application/json',
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
              ['some_json_name', paramValue, 'submit'].join(' ')
            ]);
      }, postData);
    }
  }
);

const test_contents_010_post_params_json_maxpayload_precheck_pt1 = Object.assign(makeFromBaseTest('Contents; JSCP file; POST parameters; json; max payload; under threshold; must pass'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      const parameterIdLength = Math.floor(Math.random() * 10) + 10;
      const parameterValueLength = Math.floor(Math.random() * 10) + 10;
      const parameterName = 'a'.repeat(parameterIdLength);
      const payLoad =
      {
        [parameterName]: 'B'.repeat(parameterValueLength)
      }
      const extraBytes = 2 + Object.keys(payLoad).length * 5; // 2 brackets + 5 (4 quote marks and 1 colon.)
      const preMaxPayloadSizeBytes = parameterIdLength + parameterValueLength + extraBytes;
      const maxPayloadSizeBytes = preMaxPayloadSizeBytes + 1;

      this.tempTestData = { payLoad };

      const siteConfContents = makeBaseSiteConfContents(
        {
          'maxPayloadSizeBytes': maxPayloadSizeBytes
        }
      );
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));

      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], '');

      this.isRequestsTest = true;
    },
    onReadyForRequests()
    {
      const { payLoad } = this.tempTestData;
      const postData = JSON.stringify(payLoad);

      const postRequest = makeBaseRequest(
        {
          headers:
          {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
          }
        }
      );

      processResponse(this, postRequest, ({ statusCode }) =>
      {
        this.testPassed = (statusCode === 200);
      }, postData);
    }
  }
);

const test_contents_011_post_params_json_maxpayload_precheck_pt2 = Object.assign(makeFromBaseTest('Contents; JSCP file; POST parameters; json; max payload; reached threshold; must pass'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      const parameterIdLength = Math.floor(Math.random() * 10) + 10;
      const parameterValueLength = Math.floor(Math.random() * 10) + 10;
      const parameterName = 'a'.repeat(parameterIdLength);
      const payLoad =
      {
        [parameterName]: 'B'.repeat(parameterValueLength)
      }
      const extraBytes = 2 + Object.keys(payLoad).length * 5; // 2 brackets + 5 (4 quote marks and 1 colon.)
      const preMaxPayloadSizeBytes = parameterIdLength + parameterValueLength + extraBytes;
      const maxPayloadSizeBytes = preMaxPayloadSizeBytes;

      this.tempTestData = { payLoad };

      const siteConfContents = makeBaseSiteConfContents(
        {
          'maxPayloadSizeBytes': maxPayloadSizeBytes
        }
      );
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));

      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], '');

      this.isRequestsTest = true;
    },
    onReadyForRequests()
    {
      const { payLoad } = this.tempTestData;
      const postData = JSON.stringify(payLoad);

      const postRequest = makeBaseRequest(
        {
          headers:
          {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
          }
        }
      );

      processResponse(this, postRequest, ({ statusCode }) =>
      {
        this.testPassed = (statusCode === 200);
      }, postData);
    }
  }
);

const test_contents_012_post_params_json_maxpayload_actualcheck = Object.assign(makeFromBaseTest('Contents; JSCP file; POST parameters; json; max payload; above threshold; must fail'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      const parameterIdLength = Math.floor(Math.random() * 10) + 10;
      const parameterValueLength = Math.floor(Math.random() * 10) + 10;
      const parameterName = 'a'.repeat(parameterIdLength);
      const payLoad =
      {
        [parameterName]: 'B'.repeat(parameterValueLength)
      }
      const extraBytes = 2 + Object.keys(payLoad).length * 5; // 2 brackets + 5 (4 quote marks and 1 colon.)
      const preMaxPayloadSizeBytes = parameterIdLength + parameterValueLength + extraBytes;
      const maxPayloadSizeBytes = preMaxPayloadSizeBytes - 1;

      this.tempTestData = { payLoad };

      const siteConfContents = makeBaseSiteConfContents(
        {
          'maxPayloadSizeBytes': maxPayloadSizeBytes
        }
      );
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));

      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], '');

      this.isRequestsTest = true;
    },
    onReadyForRequests()
    {
      const { payLoad } = this.tempTestData;
      const postData = JSON.stringify(payLoad);

      const postRequest = makeBaseRequest(
        {
          headers:
          {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
          }
        }
      );

      processResponse(this, postRequest, ({ statusCode }) =>
      {
        this.testPassed = (statusCode === 413);
      }, postData);
    }
  }
);

const test_contents_013_post_params_raw_pt1 = Object.assign(makeFromBaseTest('Contents; JSCP file; POST parameters; raw; part 1; random octets'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      const jsCauseConfContents = makeBaseJsCauseConfContents();
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));

      const siteConfContents = makeBaseSiteConfContents();
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
      
      initConsoleLogCapture();
      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], 'rt.postParams[\'data\'].toJSON().data.forEach(c=>console.log(c));');

      this.isRequestsTest = true;
    },
    onReadyForRequests()
    {
      const postDataArray = [...Array(5)].map(() => Math.floor(Math.random() * 256));
      const postData = Buffer.from(postDataArray);
      this.tempTestData = { postDataArray };

      const postRequest = makeBaseRequest(
        {
          headers:
          {
            'Content-Type': 'application/octet-stream',
            'Content-Length': Buffer.byteLength(postData)
          }
        }
      );

      processResponse(this, postRequest, ({ dataReceived, consoleLogOutput }) =>
      {
        const { postDataArray } = this.tempTestData;
        this.testPassed = !dataReceived.length &&
          (consoleLogOutput.status === 'captured') &&
          areFlatArraysEqual(consoleLogOutput.lines, postDataArray);
      }, postData);
    }
  }
);

const test_contents_014_post_params_raw_pt2 = Object.assign(makeFromBaseTest('Contents; JSCP file; POST parameters; raw; part 2; random string'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      const jsCauseConfContents = makeBaseJsCauseConfContents();
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));

      const siteConfContents = makeBaseSiteConfContents();
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));
      
      initConsoleLogCapture();
      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], 'console.log(rt.postParams[\'data\'].toString());');

      this.isRequestsTest = true;
    },
    onReadyForRequests()
    {
      const postDataArray = [...Array(5)].map(() => Math.floor(Math.random() * 26) + 65);
      const postData = Buffer.from(postDataArray).toString();

      this.tempTestData = { postData };

      const postRequest = makeBaseRequest(
        {
          headers:
          {
            'Content-Type': 'application/octet-stream',
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
              postData
            ]);
      }, postData);
    }
  }
);

const test_contents_015_post_params_raw_pt3_forbidden = Object.assign(makeFromBaseTest('Contents; JSCP file; POST parameters; raw; part 3; forbidden uploads'),
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
      const postDataArray = [...Array(5)].map(() => 65);
      const postData = Buffer.from(postDataArray);
      this.tempTestData = { postDataArray };

      const postRequest = makeBaseRequest(
        {
          headers:
          {
            'Content-Type': 'application/octet-stream',
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

const test_contents_016_post_params_raw_maxpayload_precheck_pt1 = Object.assign(makeFromBaseTest('Contents; JSCP file; POST parameters; raw; max payload; under threshold; must pass'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      const parameterValueLength = Math.floor(Math.random() * 10) + 10;
      const payLoad = Buffer.from([...Array(parameterValueLength)].map(() => 65));
      const maxPayloadSizeBytes = parameterValueLength + 1;

      this.tempTestData = { payLoad };

      const siteConfContents = makeBaseSiteConfContents(
        {
          'maxPayloadSizeBytes': maxPayloadSizeBytes
        }
      );
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));

      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], '');

      this.isRequestsTest = true;
    },
    onReadyForRequests()
    {
      const { payLoad } = this.tempTestData;

      const postRequest = makeBaseRequest(
        {
          headers:
          {
            'Content-Type': 'application/octet-stream',
            'Content-Length': Buffer.byteLength(payLoad)
          }
        }
      );

      processResponse(this, postRequest, ({ statusCode }) =>
      {
        this.testPassed = (statusCode === 200);
      }, payLoad);
    }
  }
);

const test_contents_017_post_params_raw_maxpayload_precheck_pt2 = Object.assign(makeFromBaseTest('Contents; JSCP file; POST parameters; raw; max payload; reached threshold; must pass'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      const parameterValueLength = Math.floor(Math.random() * 10) + 10;
      const payLoad = Buffer.from([...Array(parameterValueLength)].map(() => 65));
      const maxPayloadSizeBytes = parameterValueLength;

      this.tempTestData = { payLoad };

      const siteConfContents = makeBaseSiteConfContents(
        {
          'maxPayloadSizeBytes': maxPayloadSizeBytes
        }
      );
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));

      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], '');

      this.isRequestsTest = true;
    },
    onReadyForRequests()
    {
      const { payLoad } = this.tempTestData;

      const postRequest = makeBaseRequest(
        {
          headers:
          {
            'Content-Type': 'application/octet-stream',
            'Content-Length': Buffer.byteLength(payLoad)
          }
        }
      );

      processResponse(this, postRequest, ({ statusCode }) =>
      {
        this.testPassed = (statusCode === 200);
      }, payLoad);
    }
  }
);

const test_contents_018_post_params_raw_maxpayload_actualcheck = Object.assign(makeFromBaseTest('Contents; JSCP file; POST parameters; raw; max payload; above threshold; must fail'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      const parameterValueLength = Math.floor(Math.random() * 10) + 10;
      const payLoad = Buffer.from([...Array(parameterValueLength)].map(() => 65));
      const maxPayloadSizeBytes = parameterValueLength - 1;

      this.tempTestData = { payLoad };

      const siteConfContents = makeBaseSiteConfContents(
        {
          'maxPayloadSizeBytes': maxPayloadSizeBytes
        }
      );
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));

      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], '');

      this.isRequestsTest = true;
    },
    onReadyForRequests()
    {
      const { payLoad } = this.tempTestData;

      const postRequest = makeBaseRequest(
        {
          headers:
          {
            'Content-Type': 'application/octet-stream',
            'Content-Length': Buffer.byteLength(payLoad)
          }
        }
      );

      processResponse(this, postRequest, ({ statusCode }) =>
      {
        this.testPassed = (statusCode === 413);
      }, payLoad);
    }
  }
);

module.exports = [
  test_contents_001_post_params_form_pt1,
  test_contents_002_post_params_form_pt2_forbidden,
  test_contents_003_post_params_form_pt3,
  test_contents_004_post_params_form_maxpayload_precheck_pt1,
  test_contents_005_post_params_form_maxpayload_precheck_pt2,
  test_contents_006_post_params_form_maxpayload_actualcheck,
  test_contents_007_post_params_json_pt1,
  test_contents_008_post_params_json_pt2_forbidden,
  test_contents_009_post_params_json_pt3,
  test_contents_010_post_params_json_maxpayload_precheck_pt1,
  test_contents_011_post_params_json_maxpayload_precheck_pt2,
  test_contents_012_post_params_json_maxpayload_actualcheck,
  test_contents_013_post_params_raw_pt1,
  test_contents_014_post_params_raw_pt2,
  test_contents_015_post_params_raw_pt3_forbidden,
  test_contents_016_post_params_raw_maxpayload_precheck_pt1,
  test_contents_017_post_params_raw_maxpayload_precheck_pt2,
  test_contents_018_post_params_raw_maxpayload_actualcheck
];
