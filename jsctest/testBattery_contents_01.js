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

const test_contents_001_jscp_index_empty = Object.assign(makeFromBaseTest('Contents; JSCP file; index; empty'),
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
      processResponse(this, makeBaseRequest(), ({ statusCode, dataReceived }) =>
      {
        this.testPassed = this.contentReqExpectedSiteResponded &&
          (statusCode === 200) &&
          !dataReceived.length;
      });
    }
  }
);

const test_contents_002_jscp_index_console_log = Object.assign(makeFromBaseTest('Contents; JSCP file; index; console.log'),
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
      processResponse(this, makeBaseRequest(), ({ statusCode, dataReceived, consoleLogOutput }) =>
      {
        this.testPassed = this.contentReqExpectedSiteResponded &&
          (statusCode === 200) && !dataReceived.length &&
          (consoleLogOutput.status === 'captured') &&
          (consoleLogOutput.lines.length === 1) &&
          (consoleLogOutput.lines.pop() === 1);
      });
    }
  }
);

const test_contents_003_jscp_index_rt_print = Object.assign(makeFromBaseTest('Contents; JSCP file; index; output "1" on page'),
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
      processResponse(this, makeBaseRequest(), ({ statusCode, dataReceived }) =>
      {
        this.testPassed = this.contentReqExpectedSiteResponded &&
          (statusCode === 200) && (dataReceived.length &&
                                   (Buffer.concat(dataReceived).toString() === '1'));
      });
    }
  }
);

const test_contents_004_jscp_index_syntax_error = Object.assign(makeFromBaseTest('Contents; JSCP file; index; "p" source'),
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
      processResponse(this, makeBaseRequest(), ({ statusCode }) =>
      {
        this.testPassed = this.contentReqExpectedSiteResponded &&
          (statusCode === 500);
      });
    }
  }
);

const test_contents_005_jscp_index_rt_print_pt2 = Object.assign(makeFromBaseTest('Contents; JSCP file; index; output "p" on page'),
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
      processResponse(this, makeBaseRequest(), ({ statusCode, dataReceived }) =>
      {
        const outputLines = dataReceived.length  && Buffer.concat(dataReceived).toString().split('\n') || [];
        this.testPassed = this.contentReqExpectedSiteResponded &&
          (statusCode === 200) && areFlatArraysEqual(outputLines,
          [
            'p ',
            ' '
          ]);
      });
    }
  }
);

const test_contents_006_jscp_index_special_symbols_in_strings = Object.assign(makeFromBaseTest('Contents; JSCP file; index; special "<>" in strings.'),
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
      processResponse(this, makeBaseRequest(), ({ statusCode, dataReceived, consoleLogOutput }) =>
      {
        const outputLines = dataReceived.length && Buffer.concat(dataReceived).toString().split('\n') || [];
        this.testPassed = (
          this.contentReqExpectedSiteResponded &&
          (statusCode === 200) &&
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

const test_contents_007_jscp_index_multiple_output_tests = Object.assign(makeFromBaseTest('Contents; JSCP file; index; mutiple output tests.'),
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
      processResponse(this, makeBaseRequest(), ({ statusCode, dataReceived }) =>
      {
        const outputLines = dataReceived.length && Buffer.concat(dataReceived).toString().split('\n') || [];
        this.testPassed = (
          this.contentReqExpectedSiteResponded &&
          (statusCode === 200) &&
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

const test_contents_008_jscp_index_html_indicator = Object.assign(makeFromBaseTest('Contents; JSCP file; index; initial html indicator.'),
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
      processResponse(this, makeBaseRequest(), ({ statusCode, dataReceived }) =>
      {
        const outputLines = dataReceived.length && Buffer.concat(dataReceived).toString().split('\n') || [];
        this.testPassed = (
          this.contentReqExpectedSiteResponded &&
          (statusCode === 200) &&
          areFlatArraysEqual(outputLines,
            [
              'Hello ',
              ' '
            ].map(sanitizeForHTMLOutput))
        );
      });
    }
  }
);

const test_contents_009_jscp_index_html_indicator_pt2 = Object.assign(makeFromBaseTest('Contents; JSCP file; index; initial html indicator, part 2.'),
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
      processResponse(this, makeBaseRequest(), ({ statusCode, dataReceived }) =>
      {
        const outputLines = dataReceived.length && Buffer.concat(dataReceived).toString().split('\n') || [];
        this.testPassed = (
          this.contentReqExpectedSiteResponded &&
          (statusCode === 200) &&
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

const test_contents_010_jscp_index_html_indicator_pt3 = Object.assign(makeFromBaseTest('Contents; JSCP file; index; initial html indicator, part 3.'),
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
      processResponse(this, makeBaseRequest(), ({ statusCode, dataReceived, consoleLogOutput }) =>
      {
        const outputLines = dataReceived.length && Buffer.concat(dataReceived).toString().split('\n') || [];
        this.testPassed = (
          this.contentReqExpectedSiteResponded &&
          (statusCode === 200) &&
          (consoleLogOutput.status === 'captured') &&
          areFlatArraysEqual(consoleLogOutput.lines,
            [
              1,
            ]) &&
          areFlatArraysEqual(outputLines,
            [
              'Hello ',
              ' '
            ].map(sanitizeForHTMLOutput))
        );
      });
    }
  }
);

module.exports =
[
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
