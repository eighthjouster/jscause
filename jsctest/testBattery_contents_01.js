'use strict';

const testUtils = require('./testBatteryUtils');
const http = require('http');

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

function makeTestEndBoilerplate()
{
  return {
    onAllRequestsEnded()
    {
      this.terminateApplication({ onComplete: this.waitForDoneSignal() });
    },
    onBeforeTestEnd()
    {
      this.testPassed = this.testPassed && this.serverDidTerminate;
    },
    onTestEnd()
    {
      this.deleteFile(['sites', 'mysite', 'website', 'index.jscp']);
    }
  };
}

function areFlatArraysEqual(a, b)
{
  return a.every((line, i) => b[i] === line) && (a.length || !b.length);
}

function performTestRequestAndOutput({ onResponseEnd: onResponseEndCb })
{
  const requestContext =
  {
    dataReceived: [],
    consoleLogOutput: undefined,
    statusCode: undefined
  }

  const { dataReceived } = requestContext;
  const req = http.request(makeBaseRequest(),
    (res) =>
    {
      if (res.statusCode >= 400)
      {
        console.error(`The response status code is an error ${res.statusCode}.`);
      }
      res.on('data', (data) => dataReceived.push(data));

      res.on('end', () =>
      {
        requestContext.consoleLogOutput = endConsoleLogCapture();
        requestContext.statusCode = res.statusCode;
        onResponseEndCb && onResponseEndCb(requestContext);
        this.doneRequestsTesting();
      });
    }
  );

  req.on('error', (error) =>
  {
    console.error('An error ocurred during the request.');
    console.error(error);
    this.doneRequestsTesting();
  });

  req.end();
}

function processResponse(onResponseEndCb)
{
  this.testPassed = false;
  if (this.serverDidStart)
  {
    performTestRequestAndOutput.call(this,
      {
        onResponseEnd: onResponseEndCb
      });
  }
  else
  {
    this.doneRequestsTesting();
  }
}

function initConsoleLogCapture()
{
  const originalConsoleLog = console.log;
  console.log = (message) => { console.log.output.push(message); };
  console.log.original = originalConsoleLog;
  console.log.output = [];
}

function endConsoleLogCapture()
{
  let consoleLogOutput;
  if (console.log.original)
  {
    consoleLogOutput = { lines: console.log.output, status: 'captured' };
    console.log = console.log.original;
  }
  else
  {
    consoleLogOutput = { lines: [], status: 'No console output.  Call initConsoleLogCapture() inside onTestBeforeStart() to capture.' };
  }
  return consoleLogOutput;
}

const test_contents_001_jscp_index_empty = Object.assign(testUtils.makeFromBaseTest('Contents; JSCP file; index; empty'),
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
      
      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], '');
      this.isRequestsTest = true;
    },
    onReadyForRequests()
    {
      processResponse.call(this, ({ dataReceived }) =>
      {
        this.testPassed = !dataReceived.length;
      });
    }
  }
);

const test_contents_002_jscp_index_console_log = Object.assign(testUtils.makeFromBaseTest('Contents; JSCP file; index; console.log'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      initConsoleLogCapture();
      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], 'console.log(1);');
      this.isRequestsTest = true;
    },
    onReadyForRequests()
    {
      processResponse.call(this, ({ dataReceived, consoleLogOutput }) =>
      {
        this.testPassed = !dataReceived.length &&
          (consoleLogOutput.status === 'captured') &&
          (consoleLogOutput.lines.length === 1) &&
          (consoleLogOutput.lines.pop() === 1);
      });
    }
  }
);

const test_contents_003_jscp_index_rt_print = Object.assign(testUtils.makeFromBaseTest('Contents; JSCP file; index; output "1" on page'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], 'rt.print(1);');
      this.isRequestsTest = true;
    },
    onReadyForRequests()
    {
      processResponse.call(this, ({ dataReceived }) =>
      {
        this.testPassed = ((dataReceived.length === 1) &&
                           (dataReceived[0].toString() === '1'));
      });
    }
  }
);

const test_contents_004_jscp_index_syntax_error = Object.assign(testUtils.makeFromBaseTest('Contents; JSCP file; index; "p" source'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], 'p');
      this.isRequestsTest = true;
    },
    onReadyForRequests()
    {
      processResponse.call(this, ({ statusCode }) =>
      {
        this.testPassed = (statusCode === 500);
      });
    }
  }
);

const test_contents_005_jscp_index_rt_print_pt2 = Object.assign(testUtils.makeFromBaseTest('Contents; JSCP file; index; output "p" on page'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], '/js>p');
      this.isRequestsTest = true;
    },
    onReadyForRequests()
    {
      processResponse.call(this, ({ dataReceived }) =>
      {
        const outputLines = dataReceived && (dataReceived.length === 1) && dataReceived[0].toString().split('\n') || [];
        this.testPassed = areFlatArraysEqual(outputLines,
          [
            ' ',
            ' p ',
            ' '
          ]);
      });
    }
  }
);

const test_contents_006_jscp_index_special_symbols_in_strings = Object.assign(testUtils.makeFromBaseTest('Contents; JSCP file; index; special "<>" in strings.'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      initConsoleLogCapture();
      this.createFile(['sites', 'mysite', 'website', 'index.jscp'],
        [
          'console.log(\'\\<js\');',
          'console.log(\'\\/js>\');',
          'rt.print(\'\\<js\');',
          'rt.print(\'\\/js>\');'
        ].join('\n'));
      this.isRequestsTest = true;
    },
    onReadyForRequests()
    {
      const { jscLib: { sanitizeForHTMLOutput } } = this;
      processResponse.call(this, ({ dataReceived, consoleLogOutput }) =>
      {
        const outputLines = dataReceived && (dataReceived.length === 1) && dataReceived[0].toString().split('\n') || [];
        this.testPassed = (
          (consoleLogOutput.status === 'captured') &&
          areFlatArraysEqual(consoleLogOutput.lines,
            [
              '<js',
              '/js>',
            ]) &&
          areFlatArraysEqual(outputLines,
            [
              '<js/js>'
            ].map(sanitizeForHTMLOutput))
        );
      });
    }
  }
);

const test_contents_007_jscp_index_multiple_output_tests = Object.assign(testUtils.makeFromBaseTest('Contents; JSCP file; index; mutiple output tests.'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      this.createFile(['sites', 'mysite', 'website', 'index.jscp'],
        [
          '<js rt.print(\'1\'); /js><js rt.print(\'2\'); /js>',
          '<js rt.print(\'3\'); /js>',
          '<js rt.print(\'4\'); /js>',
          '<js rt.print(\'5\');',
          '/js>',
          '<js',
          'rt.print(\'6\'); /js>',
          '<js',
          'rt.print(\'7\');',
          '/js>',
          '',
          '<js',
          'rt.print(\'8\');/js><js',
          '',
          'rt.print(\'9\');',
          '',
          '/js>',
          'abc<js rt.print(\'d\'); /js>',
          '',
          'efg',
          '',
          '<js rt.print(\'h\'); /js>',
          '<js rt.print(\'i\');',
          '',
          '',
          '/js><js',
          '',
          '',
          'rt.print(\'j\');',
          '',
          '',
          '/js>',
          '<js               rt.print(\'k\');rt.print(\'l\');                   /js>',
          '<JS rt.print(\'m\'); /JS>'
        ].join('\n'));
      this.isRequestsTest = true;
    },
    onReadyForRequests()
    {
      const { jscLib: { sanitizeForHTMLOutput } } = this;
      processResponse.call(this, ({ dataReceived }) =>
      {
        const outputLines = dataReceived && (dataReceived.length === 1) && dataReceived[0].toString().split('\n') || [];
        this.testPassed = (
          areFlatArraysEqual(outputLines,
            [
              '12 ',
              ' 3 ',
              ' 4 ',
              ' 5 ',
              ' 6 ',
              ' 7 ',
              ' 89 ',
              ' abcd ',
              ' efg ',
              ' h ',
              ' ij ',
              ' kl ',
              ' m ',
              ' '
            ].map(sanitizeForHTMLOutput))
        );
      });
    }
  }
);

const test_contents_008_jscp_index_html_indicator = Object.assign(testUtils.makeFromBaseTest('Contents; JSCP file; index; initial html indicator.'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      this.createFile(['sites', 'mysite', 'website', 'index.jscp'],
        [
          '<html/>Hello',
          ''
        ].join('\n'));
      this.isRequestsTest = true;
    },
    onReadyForRequests()
    {
      const { jscLib: { sanitizeForHTMLOutput } } = this;
      processResponse.call(this, ({ dataReceived }) =>
      {
        const outputLines = dataReceived && (dataReceived.length === 1) && dataReceived[0].toString().split('\n') || [];
        this.testPassed = (
          areFlatArraysEqual(outputLines,
            [
              ' ',
              ' Hello ',
              ' '
            ].map(sanitizeForHTMLOutput))
        );
      });
    }
  }
);

const test_contents_009_jscp_index_html_indicator_pt2 = Object.assign(testUtils.makeFromBaseTest('Contents; JSCP file; index; initial html indicator, part 2.'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      this.createFile(['sites', 'mysite', 'website', 'index.jscp'],
        [
          '<html/>',
          'Hello',
          ''
        ].join('\n'));
      this.isRequestsTest = true;
    },
    onReadyForRequests()
    {
      const { jscLib: { sanitizeForHTMLOutput } } = this;
      processResponse.call(this, ({ dataReceived }) =>
      {
        const outputLines = dataReceived && (dataReceived.length === 1) && dataReceived[0].toString().split('\n') || [];
        this.testPassed = (
          areFlatArraysEqual(outputLines,
            [
              ' ',
              ' Hello ',
              ' '
            ].map(sanitizeForHTMLOutput))
        );
      });
    }
  }
);

const test_contents_010_jscp_index_html_indicator_pt3 = Object.assign(testUtils.makeFromBaseTest('Contents; JSCP file; index; initial html indicator, part 3.'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      initConsoleLogCapture();
      this.createFile(['sites', 'mysite', 'website', 'index.jscp'],
        [
          '<html/>Hello',
          '<js console.log(1);',
          ''
        ].join('\n'));
      this.isRequestsTest = true;
    },
    onReadyForRequests()
    {
      const { jscLib: { sanitizeForHTMLOutput } } = this;
      processResponse.call(this, ({ dataReceived, consoleLogOutput }) =>
      {
        const outputLines = dataReceived && (dataReceived.length === 1) && dataReceived[0].toString().split('\n') || [];
        this.testPassed = (
          (consoleLogOutput.status === 'captured') &&
          areFlatArraysEqual(consoleLogOutput.lines,
            [
              1,
            ]) &&
          areFlatArraysEqual(outputLines,
            [
              ' ',
              ' Hello ',
              ' '
            ].map(sanitizeForHTMLOutput))
        );
      });
    }
  }
);

module.exports = [
  test_contents_001_jscp_index_empty,
  test_contents_002_jscp_index_console_log,
  test_contents_003_jscp_index_rt_print,
  test_contents_004_jscp_index_syntax_error,
  test_contents_005_jscp_index_rt_print_pt2,
  test_contents_006_jscp_index_special_symbols_in_strings,
  test_contents_007_jscp_index_multiple_output_tests,
  test_contents_008_jscp_index_html_indicator,
  test_contents_009_jscp_index_html_indicator_pt2,
  test_contents_010_jscp_index_html_indicator_pt3
];
