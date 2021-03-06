'use strict';

// Legend:
// External error: exty/extn
// readFile succeeds: ry/rn (ok/error)
// onSuccess: sp (present), sn (not present)
// onSuccess has error inside: iy/in/ix (x=n/a) (ok/error/does not apply)
// onError: ep (present), en (not present)
// onError has error inside: iy/in/ix (x=n/a) (ok/error/does not apply)

// Example:
// exty_rn_sn_ix_en_ix means:
// External error is present, readFile does not succeed,
// onSuccess is not present, onSuccess inside error does not apply,
// onError is not present, onError inside error does not apply.

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
      'hostName': 'localhost',
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
      hostname: 'localhost',
      port: 3000,
      path: '/',
      method: 'GET'
    }, extra
  );

function prepareTest()
{
  this.isRequestsTest = true;
  this.maxTerminateRetries = 10;
}

const
  {
    makeFromBaseTest,
    makeTestEndBoilerplate,
    processResponse,
    initConsoleLogCapture,
    areFlatArraysEqual
  } = testUtils;

const test_contents_001_jscp_hangingExceptionBug_exty_rn_sn_ix_en_ix = Object.assign(makeFromBaseTest('Contents; JSCP file; rt fn exception hanging bug; ExtError Fails Not present N/A Not present N/A'),
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

      this.createFile(['sites', 'mysite', 'existing_file.txt'], 'some existing file.');

      const jsCauseConfContents = makeBaseJsCauseConfContents({
        requesttimeoutsecs: 1
      });
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));
    
      const siteConfContents = makeBaseSiteConfContents();
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));

      initConsoleLogCapture({ prefixInputWithConsoleTag: true });

      prepareTest.call(this);

      // 'ExtError Fails Not present N/A Not present N/A'
      const testCode = [
        'rt.readFile(\'non_existing_file.txt\');',
        '[][0](); // Deliberate external error.',
        'console.log(\'We should never get here.\');'
      ].join('\n');

      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], testCode);
    },
    expectedLogMessages:
    [
      [ 'error', 'Site: My Site: Runtime error on file /index.jscp: ENOENT: no such file or directory', 'prefix' ]
    ],
    onReadyForRequests()
    {
      processResponse(this, makeBaseRequest(), ({ consoleLogOutput, statusCode }) =>
      {
        this.testPassed = this.contentReqExpectedSiteResponded &&
          (statusCode !== 408) && // 408 = Timeout exceeded.
          (statusCode === 500) && // Redundant, but it's what's expected.
          this.gotAllExpectedLogMsgs &&
          (consoleLogOutput.status === 'captured') &&
          areFlatArraysEqual(consoleLogOutput.lines, []);
      });
    }
  }
);

const test_contents_002_jscp_hangingExceptionBug_exty_ry_sn_ix_en_ix = Object.assign(makeFromBaseTest('Contents; JSCP file; rt fn exception hanging bug; ExtError Succeeds Not present N/A Not present N/A'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      initConsoleLogCapture({ prefixInputWithConsoleTag: true });

      prepareTest.call(this);

      // 'ExtError Succeeds Not present N/A Not present N/A'
      const testCode = [
        'rt.readFile(\'existing_file.txt\');',
        '[][0](); // Deliberate external error.',
        'console.log(\'We should never get here.\');'
      ].join('\n');

      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], testCode);
    },
    expectedLogMessages:
    [
      [ 'error', 'Site: My Site: Runtime error on file /index.jscp: [][0] is not a function', 'prefix' ]
    ],
    onReadyForRequests()
    {
      processResponse(this, makeBaseRequest(), ({ consoleLogOutput, statusCode }) =>
      {
        this.testPassed = this.contentReqExpectedSiteResponded &&
          (statusCode !== 408) && // 408 = Timeout exceeded.
          (statusCode === 500) && // Redundant, but it's what's expected.
          this.gotAllExpectedLogMsgs &&
          (consoleLogOutput.status === 'captured') &&
          areFlatArraysEqual(consoleLogOutput.lines, []);
      });
    }
  }
);

const test_contents_003_jscp_hangingExceptionBug_extn_ry_sp_in_ep_in = Object.assign(makeFromBaseTest('Contents; JSCP file; rt fn exception hanging bug; NoExtError Succeeds Present ok Present ok'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      initConsoleLogCapture({ prefixInputWithConsoleTag: true });

      prepareTest.call(this);
      
      // 'NoExtError Succeeds Present ok Present ok'
      const testCode = [
        'rt.readFile(\'existing_file.txt\')',
        '.rtOnSuccess((contents) => {console.log(\'Great success\');})',
        '.rtOnError((err) => {console.warn(\'Great error\');});',
        '// No deliberate external error.',
        'console.log(\'We must get here.\');'
      ].join('\n');

      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], testCode);
    },
    onReadyForRequests()
    {
      processResponse(this, makeBaseRequest(), ({ consoleLogOutput, statusCode }) =>
      {
        this.testPassed = this.contentReqExpectedSiteResponded &&
          (statusCode !== 408) && // 408 = Timeout exceeded.
          (statusCode === 200) && // Redundant, but it's what's expected.
          (consoleLogOutput.status === 'captured') &&
          areFlatArraysEqual(consoleLogOutput.lines,
            [
              'LOG: We must get here.',
              'LOG: Great success'
            ]);
      });
    }
  }
);

const test_contents_004_jscp_hangingExceptionBug_extn_ry_sp_iy_ep_in = Object.assign(makeFromBaseTest('Contents; JSCP file; rt fn exception hanging bug; NoExtError Succeeds Present error Present ok'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      initConsoleLogCapture({ prefixInputWithConsoleTag: true });

      prepareTest.call(this);
      
      // 'NoExtError Succeeds Present error Present ok'
      const testCode = [
        'rt.readFile(\'existing_file.txt\')',
        '.rtOnSuccess((contents) => {',
        '  [][0](); // Deliberate error.',
        '})',
        '.rtOnError((err) => {console.warn(\'Great error\');});',
        '// No deliberate external error.',
        'console.log(\'We must get here.\');'
      ].join('\n');

      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], testCode);
    },
    expectedLogMessages:
    [
      [ 'error', 'Site: My Site: Runtime error on file /index.jscp: [][0] is not a function', 'prefix' ]
    ],
    onReadyForRequests()
    {
      processResponse(this, makeBaseRequest(), ({ consoleLogOutput, statusCode }) =>
      {
        this.testPassed = this.contentReqExpectedSiteResponded &&
          (statusCode !== 408) && // 408 = Timeout exceeded.
          (statusCode === 500) && // Redundant, but it's what's expected.
          this.gotAllExpectedLogMsgs &&
          (consoleLogOutput.status === 'captured') &&
          areFlatArraysEqual(consoleLogOutput.lines,
            [
              'LOG: We must get here.',
            ]);
      });
    }
  }
);

const test_contents_005_jscp_hangingExceptionBug_extn_ry_sp_in_ep_iy = Object.assign(makeFromBaseTest('Contents; JSCP file; rt fn exception hanging bug; NoExtError Succeeds Present ok Present error'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      initConsoleLogCapture({ prefixInputWithConsoleTag: true });

      prepareTest.call(this);
      
      // 'NoExtError Succeeds Present ok Present error'
      const testCode = [
        'rt.readFile(\'existing_file.txt\')',
        '.rtOnSuccess((contents) => {console.log(\'Great success\');})',
        '.rtOnError((err) => {',
        '  [][0](); // Deliberate error.',
        '});',
        '// No deliberate external error.',
        'console.log(\'We must get here.\');'
      ].join('\n');

      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], testCode);
    },
    onReadyForRequests()
    {
      processResponse(this, makeBaseRequest(), ({ consoleLogOutput, statusCode }) =>
      {
        this.testPassed = this.contentReqExpectedSiteResponded &&
          (statusCode !== 408) && // 408 = Timeout exceeded.
          (statusCode === 200) && // Redundant, but it's what's expected.
          (consoleLogOutput.status === 'captured') &&
          areFlatArraysEqual(consoleLogOutput.lines,
            [
              'LOG: We must get here.',
              'LOG: Great success'
            ]);
      });
    }
  }
);

const test_contents_006_jscp_hangingExceptionBug_extn_ry_sp_iy_ep_iy = Object.assign(makeFromBaseTest('Contents; JSCP file; rt fn exception hanging bug; NoExtError Succeeds Present error Present error'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      initConsoleLogCapture({ prefixInputWithConsoleTag: true });

      prepareTest.call(this);
      
      // 'NoExtError Succeeds Present error Present error'
      const testCode = [
        'rt.readFile(\'existing_file.txt\')',
        '.rtOnSuccess((contents) => {',
        '  [][0](); // Deliberate error.',
        '})',
        '.rtOnError((err) => {',
        '  [][0](); // Deliberate error.',
        '});',
        '// No deliberate external error.',
        'console.log(\'We must get here.\');'
      ].join('\n');

      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], testCode);
    },
    expectedLogMessages:
    [
      [ 'error', 'Site: My Site: Runtime error on file /index.jscp: [][0] is not a function', 'prefix' ]
    ],
    onReadyForRequests()
    {
      processResponse(this, makeBaseRequest(), ({ consoleLogOutput, statusCode }) =>
      {
        this.testPassed = this.contentReqExpectedSiteResponded &&
          (statusCode !== 408) && // 408 = Timeout exceeded.
          (statusCode === 500) && // Redundant, but it's what's expected.
          this.gotAllExpectedLogMsgs &&
          (consoleLogOutput.status === 'captured') &&
          areFlatArraysEqual(consoleLogOutput.lines,
            [
              'LOG: We must get here.'
            ]);
      });
    }
  }
);

const test_contents_007_jscp_hangingExceptionBug_extn_ry_sp_in_en_ix = Object.assign(makeFromBaseTest('Contents; JSCP file; rt fn exception hanging bug; NoExtError Succeeds Present ok Not present N/A'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      initConsoleLogCapture({ prefixInputWithConsoleTag: true });

      prepareTest.call(this);
      
      // 'NoExtError Succeeds Present ok Not present N/A'
      const testCode = [
        'rt.readFile(\'existing_file.txt\')',
        '.rtOnSuccess((contents) => {console.log(\'Great success\');});',
        '// No deliberate external error.',
        'console.log(\'We must get here.\');'
      ].join('\n');

      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], testCode);
    },
    onReadyForRequests()
    {
      processResponse(this, makeBaseRequest(), ({ consoleLogOutput, statusCode }) =>
      {
        this.testPassed = this.contentReqExpectedSiteResponded &&
          (statusCode !== 408) && // 408 = Timeout exceeded.
          (statusCode === 200) && // Redundant, but it's what's expected.
          (consoleLogOutput.status === 'captured') &&
          areFlatArraysEqual(consoleLogOutput.lines,
            [
              'LOG: We must get here.',
              'LOG: Great success'
            ]);
      });
    }
  }
);

const test_contents_008_jscp_hangingExceptionBug_extn_ry_sp_iy_en_ix = Object.assign(makeFromBaseTest('Contents; JSCP file; rt fn exception hanging bug; NoExtError Succeeds Present error Not present N/A'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      initConsoleLogCapture({ prefixInputWithConsoleTag: true });

      prepareTest.call(this);
      
      // 'NoExtError Succeeds Present error Not present N/A'
      const testCode = [
        'rt.readFile(\'existing_file.txt\')',
        '.rtOnSuccess((contents) => {',
        '  [][0](); // Deliberate error.',
        '});',
        '// No deliberate external error.',
        'console.log(\'We must get here.\');'
      ].join('\n');

      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], testCode);
    },
    expectedLogMessages:
    [
      [ 'error', 'Site: My Site: Runtime error on file /index.jscp: [][0] is not a function', 'prefix' ]
    ],
    onReadyForRequests()
    {
      processResponse(this, makeBaseRequest(), ({ consoleLogOutput, statusCode }) =>
      {
        this.testPassed = this.contentReqExpectedSiteResponded &&
          (statusCode !== 408) && // 408 = Timeout exceeded.
          (statusCode === 500) && // Redundant, but it's what's expected.
          this.gotAllExpectedLogMsgs &&
          (consoleLogOutput.status === 'captured') &&
          areFlatArraysEqual(consoleLogOutput.lines,
            [
              'LOG: We must get here.'
            ]);
      });
    }
  }
);

const test_contents_009_jscp_hangingExceptionBug_extn_ry_sn_ix_ep_in = Object.assign(makeFromBaseTest('Contents; JSCP file; rt fn exception hanging bug; NoExtError Succeeds Not present N/A Present ok'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      initConsoleLogCapture({ prefixInputWithConsoleTag: true });

      prepareTest.call(this);
      
      // 'NoExtError Succeeds Not present N/A Present ok'
      const testCode = [
        'rt.readFile(\'existing_file.txt\')',
        '.rtOnError((err) => {console.warn(\'Great error\');});',
        '// No deliberate external error.',
        'console.log(\'We must get here.\');'
      ].join('\n');

      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], testCode);
    },
    onReadyForRequests()
    {
      processResponse(this, makeBaseRequest(), ({ consoleLogOutput, statusCode }) =>
      {
        this.testPassed = this.contentReqExpectedSiteResponded &&
          (statusCode !== 408) && // 408 = Timeout exceeded.
          (statusCode === 200) && // Redundant, but it's what's expected.
          (consoleLogOutput.status === 'captured') &&
          areFlatArraysEqual(consoleLogOutput.lines,
            [
              'LOG: We must get here.'
            ]);
      });
    }
  }
);

const test_contents_010_jscp_hangingExceptionBug_extn_ry_sn_ix_ep_iy = Object.assign(makeFromBaseTest('Contents; JSCP file; rt fn exception hanging bug; NoExtError Succeeds Not present N/A Present error'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      initConsoleLogCapture({ prefixInputWithConsoleTag: true });

      prepareTest.call(this);
      
      // 'NoExtError Succeeds Not present N/A Present error'
      const testCode = [
        'rt.readFile(\'existing_file.txt\')',
        '.rtOnError((err) => {',
        '  [][0](); // Deliberate error.',
        '});',
        '// No deliberate external error.',
        'console.log(\'We must get here.\');'
      ].join('\n');

      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], testCode);
    },
    onReadyForRequests()
    {
      processResponse(this, makeBaseRequest(), ({ consoleLogOutput, statusCode }) =>
      {
        this.testPassed = this.contentReqExpectedSiteResponded &&
          (statusCode !== 408) && // 408 = Timeout exceeded.
          (statusCode === 200) && // Redundant, but it's what's expected.
          (consoleLogOutput.status === 'captured') &&
          areFlatArraysEqual(consoleLogOutput.lines,
            [
              'LOG: We must get here.'
            ]);
      });
    }
  }
);

const test_contents_011_jscp_hangingExceptionBug_extn_ry_sn_ix_en_ix = Object.assign(makeFromBaseTest('Contents; JSCP file; rt fn exception hanging bug; NoExtError Succeeds Not present N/A Not present N/A'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      initConsoleLogCapture({ prefixInputWithConsoleTag: true });

      prepareTest.call(this);
      
      // 'NoExtError Succeeds Not present N/A Not present N/A'
      const testCode = [
        'rt.readFile(\'existing_file.txt\');',
        '// No deliberate external error.',
        'console.log(\'We must get here.\');'
      ].join('\n');

      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], testCode);
    },
    onReadyForRequests()
    {
      processResponse(this, makeBaseRequest(), ({ consoleLogOutput, statusCode }) =>
      {
        this.testPassed = this.contentReqExpectedSiteResponded &&
          (statusCode !== 408) && // 408 = Timeout exceeded.
          (statusCode === 200) && // Redundant, but it's what's expected.
          (consoleLogOutput.status === 'captured') &&
          areFlatArraysEqual(consoleLogOutput.lines, ['LOG: We must get here.']);
      });
    }
  }
);

const test_contents_012_jscp_hangingExceptionBug_extn_rn_sp_in_ep_in = Object.assign(makeFromBaseTest('Contents; JSCP file; rt fn exception hanging bug; NoExtError Fails Present ok Present ok'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      initConsoleLogCapture({ prefixInputWithConsoleTag: true });

      prepareTest.call(this);
      
      // 'NoExtError Fails Present ok Present ok'
      const testCode = [
        'rt.readFile(\'non_existing_file.txt\')',
        '.rtOnSuccess((contents) => {console.log(\'Great success\');})',
        '.rtOnError((err) => {console.warn(\'Great error\');});',
        '// No deliberate external error.',
        'console.log(\'We must get here.\');'
      ].join('\n');

      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], testCode);
    },
    onReadyForRequests()
    {
      processResponse(this, makeBaseRequest(), ({ consoleLogOutput, statusCode }) =>
      {
        this.testPassed = this.contentReqExpectedSiteResponded &&
          (statusCode !== 408) && // 408 = Timeout exceeded.
          (statusCode === 200) && // Redundant, but it's what's expected.
          (consoleLogOutput.status === 'captured') &&
          areFlatArraysEqual(consoleLogOutput.lines,
            [
              'LOG: We must get here.',
              'WARN: Great error'
            ]);
      });
    }
  }
);

const test_contents_013_jscp_hangingExceptionBug_extn_rn_sp_iy_ep_in = Object.assign(makeFromBaseTest('Contents; JSCP file; rt fn exception hanging bug; NoExtError Fails Present error Present ok'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      initConsoleLogCapture({ prefixInputWithConsoleTag: true });

      prepareTest.call(this);
      
      // 'NoExtError Fails Present error Present ok'
      const testCode = [
        'rt.readFile(\'non_existing_file.txt\')',
        '.rtOnSuccess((contents) => {',
        '  [][0](); // Deliberate error.',
        '})',
        '.rtOnError((err) => {console.warn(\'Great error\');});',
        '// No deliberate external error.',
        'console.log(\'We must get here.\');'
      ].join('\n');

      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], testCode);
    },
    onReadyForRequests()
    {
      processResponse(this, makeBaseRequest(), ({ consoleLogOutput, statusCode }) =>
      {
        this.testPassed = this.contentReqExpectedSiteResponded &&
          (statusCode !== 408) && // 408 = Timeout exceeded.
          (statusCode === 200) && // Redundant, but it's what's expected.
          (consoleLogOutput.status === 'captured') &&
          areFlatArraysEqual(consoleLogOutput.lines,
            [
              'LOG: We must get here.',
              'WARN: Great error'
            ]);
      });
    }
  }
);

const test_contents_014_jscp_hangingExceptionBug_extn_rn_sp_in_ep_iy = Object.assign(makeFromBaseTest('Contents; JSCP file; rt fn exception hanging bug; NoExtError Fails Present ok Present error'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      initConsoleLogCapture({ prefixInputWithConsoleTag: true });

      prepareTest.call(this);
      
      // 'NoExtError Fails Present ok Present error'
      const testCode = [
        'rt.readFile(\'non_existing_file.txt\')',
        '.rtOnSuccess((contents) => {console.log(\'Great success\');})',
        '.rtOnError((err) => {',
        '  [][0](); // Deliberate error.',
        '});',
        '// No deliberate external error.',
        'console.log(\'We must get here.\');'
      ].join('\n');

      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], testCode);
    },
    expectedLogMessages:
    [
      [ 'error', 'Site: My Site: Runtime error on file /index.jscp: [][0] is not a function', 'prefix' ]
    ],
    onReadyForRequests()
    {
      processResponse(this, makeBaseRequest(), ({ consoleLogOutput, statusCode }) =>
      {
        this.testPassed = this.contentReqExpectedSiteResponded &&
          (statusCode !== 408) && // 408 = Timeout exceeded.
          (statusCode === 500) && // Redundant, but it's what's expected.
          this.gotAllExpectedLogMsgs &&
          (consoleLogOutput.status === 'captured') &&
          areFlatArraysEqual(consoleLogOutput.lines,
            [
              'LOG: We must get here.'
            ]);
      });
    }
  }
);

const test_contents_015_jscp_hangingExceptionBug_extn_rn_sp_iy_ep_iy = Object.assign(makeFromBaseTest('Contents; JSCP file; rt fn exception hanging bug; NoExtError Fails Present error Present error'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      initConsoleLogCapture({ prefixInputWithConsoleTag: true });

      prepareTest.call(this);
      
      // 'NoExtError Fails Present error Present error'
      const testCode = [
        'rt.readFile(\'non_existing_file.txt\')',
        '.rtOnSuccess((contents) => {',
        '  [][0](); // Deliberate error.',
        '})',
        '.rtOnError((err) => {',
        '  [][0](); // Deliberate error.',
        '});',
        '// No deliberate external error.',
        'console.log(\'We must get here.\');'
      ].join('\n');

      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], testCode);
    },
    expectedLogMessages:
    [
      [ 'error', 'Site: My Site: Runtime error on file /index.jscp: [][0] is not a function', 'prefix' ]
    ],
    onReadyForRequests()
    {
      processResponse(this, makeBaseRequest(), ({ consoleLogOutput, statusCode }) =>
      {
        this.testPassed = this.contentReqExpectedSiteResponded &&
          (statusCode !== 408) && // 408 = Timeout exceeded.
          (statusCode === 500) && // Redundant, but it's what's expected.
          this.gotAllExpectedLogMsgs &&
          (consoleLogOutput.status === 'captured') &&
          areFlatArraysEqual(consoleLogOutput.lines,
            [
              'LOG: We must get here.'
            ]);
      });
    }
  }
);

const test_contents_016_jscp_hangingExceptionBug_extn_rn_sp_in_en_ix = Object.assign(makeFromBaseTest('Contents; JSCP file; rt fn exception hanging bug; NoExtError Fails Present ok Not present N/A'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      initConsoleLogCapture({ prefixInputWithConsoleTag: true });

      prepareTest.call(this);
      
      // 'NoExtError Fails Present ok Not present N/A'
      const testCode = [
        'rt.readFile(\'non_existing_file.txt\')',
        '.rtOnSuccess((contents) => {console.log(\'Great success\');});',
        '// No deliberate external error.',
        'console.log(\'We must get here.\');'
      ].join('\n');

      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], testCode);
    },
    expectedLogMessages:
    [
      [ 'error', 'Site: My Site: Runtime error on file /index.jscp: ENOENT: no such file or directory', 'prefix' ]
    ],
    onReadyForRequests()
    {
      processResponse(this, makeBaseRequest(), ({ consoleLogOutput, statusCode }) =>
      {
        this.testPassed = this.contentReqExpectedSiteResponded &&
          (statusCode !== 408) && // 408 = Timeout exceeded.
          (statusCode === 500) && // Redundant, but it's what's expected.
          this.gotAllExpectedLogMsgs &&
          (consoleLogOutput.status === 'captured') &&
          areFlatArraysEqual(consoleLogOutput.lines,
            [
              'LOG: We must get here.'
            ]);
      });
    }
  }
);

const test_contents_017_jscp_hangingExceptionBug_extn_rn_sp_iy_en_ix = Object.assign(makeFromBaseTest('Contents; JSCP file; rt fn exception hanging bug; NoExtError Fails Present error Not present N/A'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      initConsoleLogCapture({ prefixInputWithConsoleTag: true });

      prepareTest.call(this);
      
      // 'NoExtError Fails Present error Not present N/A'
      const testCode = [
        'rt.readFile(\'non_existing_file.txt\')',
        '.rtOnSuccess((contents) => {',
        '  [][0](); // Deliberate error.',
        '});',
        '// No deliberate external error.',
        'console.log(\'We must get here.\');'
      ].join('\n');

      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], testCode);
    },
    expectedLogMessages:
    [
      [ 'error', 'Site: My Site: Runtime error on file /index.jscp: ENOENT: no such file or directory', 'prefix' ]
    ],
    onReadyForRequests()
    {
      processResponse(this, makeBaseRequest(), ({ consoleLogOutput, statusCode }) =>
      {
        this.testPassed = this.contentReqExpectedSiteResponded &&
          (statusCode !== 408) && // 408 = Timeout exceeded.
          (statusCode === 500) && // Redundant, but it's what's expected.
          this.gotAllExpectedLogMsgs &&
          (consoleLogOutput.status === 'captured') &&
          areFlatArraysEqual(consoleLogOutput.lines,
            [
              'LOG: We must get here.'
            ]);
      });
    }
  }
);

const test_contents_018_jscp_hangingExceptionBug_extn_rn_sn_ix_ep_in = Object.assign(makeFromBaseTest('Contents; JSCP file; rt fn exception hanging bug; NoExtError Fails Not present N/A Present ok'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      initConsoleLogCapture({ prefixInputWithConsoleTag: true });

      prepareTest.call(this);
      
      // 'NoExtError Fails Not present N/A Present ok'
      const testCode = [
        'rt.readFile(\'non_existing_file.txt\')',
        '.rtOnError((err) => {console.warn(\'Great error\');});',
        '// No deliberate external error.',
        'console.log(\'We must get here.\');'
      ].join('\n');

      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], testCode);
    },
    onReadyForRequests()
    {
      processResponse(this, makeBaseRequest(), ({ consoleLogOutput, statusCode }) =>
      {
        this.testPassed = this.contentReqExpectedSiteResponded &&
          (statusCode !== 408) && // 408 = Timeout exceeded.
          (statusCode === 200) && // Redundant, but it's what's expected.
          (consoleLogOutput.status === 'captured') &&
          areFlatArraysEqual(consoleLogOutput.lines,
            [
              'LOG: We must get here.',
              'WARN: Great error'
            ]);
      });
    }
  }
);

const test_contents_019_jscp_hangingExceptionBug_extn_rn_sn_ix_ep_iy = Object.assign(makeFromBaseTest('Contents; JSCP file; rt fn exception hanging bug; NoExtError Fails Not present N/A Present error'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      initConsoleLogCapture({ prefixInputWithConsoleTag: true });

      prepareTest.call(this);
      
      // 'NoExtError Fails Not present N/A Present error'
      const testCode = [
        'rt.readFile(\'non_existing_file.txt\')',
        '.rtOnError((err) => {',
        '  [][0](); // Deliberate error.',
        '});',
        '// No deliberate external error.',
        'console.log(\'We must get here.\');'
      ].join('\n');

      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], testCode);
    },
    expectedLogMessages:
    [
      [ 'error', 'Site: My Site: Runtime error on file /index.jscp: [][0] is not a function', 'prefix' ]
    ],
    onReadyForRequests()
    {
      processResponse(this, makeBaseRequest(), ({ consoleLogOutput, statusCode }) =>
      {
        this.testPassed = this.contentReqExpectedSiteResponded &&
          (statusCode !== 408) && // 408 = Timeout exceeded.
          (statusCode === 500) && // Redundant, but it's what's expected.
          this.gotAllExpectedLogMsgs &&
          (consoleLogOutput.status === 'captured') &&
          areFlatArraysEqual(consoleLogOutput.lines,
            [
              'LOG: We must get here.',
            ]);
      });
    }
  }
);

const test_contents_020_jscp_hangingExceptionBug_extn_rn_sn_ix_en_ix = Object.assign(makeFromBaseTest('Contents; JSCP file; rt fn exception hanging bug; NoExtError Fails Not present N/A Not present N/A'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      initConsoleLogCapture({ prefixInputWithConsoleTag: true });

      prepareTest.call(this);
      
      // 'NoExtError Fails Not present N/A Not present N/A'
      const testCode = [
        'rt.readFile(\'non_existing_file.txt\');',
        '// No deliberate external error.',
        'console.log(\'We must get here.\');'
      ].join('\n');

      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], testCode);
    },
    expectedLogMessages:
    [
      [ 'error', 'Site: My Site: Runtime error on file /index.jscp: ENOENT: no such file or directory', 'prefix' ]
    ],
    onReadyForRequests()
    {
      processResponse(this, makeBaseRequest(), ({ consoleLogOutput, statusCode }) =>
      {
        this.testPassed = this.contentReqExpectedSiteResponded &&
          (statusCode !== 408) && // 408 = Timeout exceeded.
          (statusCode === 500) && // Redundant, but it's what's expected.
          this.gotAllExpectedLogMsgs &&
          (consoleLogOutput.status === 'captured') &&
          areFlatArraysEqual(consoleLogOutput.lines,
            [
              'LOG: We must get here.',
            ]);
      });
    }
  }
);

const test_contents_021_jscp_hangingExceptionBug_exty_ry_sp_in_ep_in = Object.assign(makeFromBaseTest('Contents; JSCP file; rt fn exception hanging bug; ExtError Succeeds Present ok Present ok'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      initConsoleLogCapture({ prefixInputWithConsoleTag: true });

      prepareTest.call(this);

      // 'ExtError Succeeds Present ok Present ok'
      const testCode = [
        'rt.readFile(\'existing_file.txt\')',
        '.rtOnSuccess((contents) => {console.log(\'Great success\');})',
        '.rtOnError((err) => {console.warn(\'Great error\');});',
        '[][0](); // Deliberate external error.',
        'console.log(\'We should never get here.\');'
      ].join('\n');

      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], testCode);
    },
    expectedLogMessages:
    [
      [ 'error', 'Site: My Site: Runtime error on file /index.jscp: [][0] is not a function', 'prefix' ]
    ],
    onReadyForRequests()
    {
      processResponse(this, makeBaseRequest(), ({ consoleLogOutput, statusCode }) =>
      {
        this.testPassed = this.contentReqExpectedSiteResponded &&
          (statusCode !== 408) && // 408 = Timeout exceeded.
          (statusCode === 500) && // Redundant, but it's what's expected.
          this.gotAllExpectedLogMsgs &&
          (consoleLogOutput.status === 'captured') &&
          areFlatArraysEqual(consoleLogOutput.lines, []);
      });
    }
  }
);

const test_contents_022_jscp_hangingExceptionBug_exty_ry_sp_iy_ep_in = Object.assign(makeFromBaseTest('Contents; JSCP file; rt fn exception hanging bug; ExtError Succeeds Present error Present ok'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      initConsoleLogCapture({ prefixInputWithConsoleTag: true });

      prepareTest.call(this);

      // 'ExtError Succeeds Present error Present ok'
      const testCode = [
        'rt.readFile(\'existing_file.txt\')',
        '.rtOnSuccess((contents) => {',
        '  [][0](); // Deliberate error.',
        '})',
        '.rtOnError((err) => {console.warn(\'Great error\');});',
        '[][0](); // Deliberate external error.',
        'console.log(\'We should never get here.\');'
      ].join('\n');

      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], testCode);
    },
    expectedLogMessages:
    [
      [ 'error', 'Site: My Site: Runtime error on file /index.jscp: [][0] is not a function', 'prefix' ]
    ],
    onReadyForRequests()
    {
      processResponse(this, makeBaseRequest(), ({ consoleLogOutput, statusCode }) =>
      {
        this.testPassed = this.contentReqExpectedSiteResponded &&
          (statusCode !== 408) && // 408 = Timeout exceeded.
          (statusCode === 500) && // Redundant, but it's what's expected.
          this.gotAllExpectedLogMsgs &&
          (consoleLogOutput.status === 'captured') &&
          areFlatArraysEqual(consoleLogOutput.lines, []);
      });
    }
  }
);

const test_contents_023_jscp_hangingExceptionBug_exty_ry_sp_in_ep_iy = Object.assign(makeFromBaseTest('Contents; JSCP file; rt fn exception hanging bug; ExtError Succeeds Present ok Present error'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      initConsoleLogCapture({ prefixInputWithConsoleTag: true });

      prepareTest.call(this);

      // 'ExtError Succeeds Present ok Present error'
      const testCode = [
        'rt.readFile(\'existing_file.txt\')',
        '.rtOnSuccess((contents) => {console.log(\'Great success\');})',
        '.rtOnError((err) => {',
        '  [][0](); // Deliberate error.',
        '});',
        '[][0](); // Deliberate external error.',
        'console.log(\'We should never get here.\');'
      ].join('\n');

      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], testCode);
    },
    expectedLogMessages:
    [
      [ 'error', 'Site: My Site: Runtime error on file /index.jscp: [][0] is not a function', 'prefix' ]
    ],
    onReadyForRequests()
    {
      processResponse(this, makeBaseRequest(), ({ consoleLogOutput, statusCode }) =>
      {
        this.testPassed = this.contentReqExpectedSiteResponded &&
          (statusCode !== 408) && // 408 = Timeout exceeded.
          (statusCode === 500) && // Redundant, but it's what's expected.
          this.gotAllExpectedLogMsgs &&
          (consoleLogOutput.status === 'captured') &&
          areFlatArraysEqual(consoleLogOutput.lines, []);
      });
    }
  }
);

const test_contents_024_jscp_hangingExceptionBug_exty_ry_sp_iy_ep_iy = Object.assign(makeFromBaseTest('Contents; JSCP file; rt fn exception hanging bug; ExtError Succeeds Present error Present error'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      initConsoleLogCapture({ prefixInputWithConsoleTag: true });

      prepareTest.call(this);

      // 'ExtError Succeeds Present error Present error'
      const testCode = [
        'rt.readFile(\'existing_file.txt\')',
        '.rtOnSuccess((contents) => {',
        '  [][0](); // Deliberate error.',
        '})',
        '.rtOnError((err) => {',
        '  [][0](); // Deliberate error.',
        '});',
        '[][0](); // Deliberate external error.',
        'console.log(\'We should never get here.\');'
      ].join('\n');

      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], testCode);
    },
    expectedLogMessages:
    [
      [ 'error', 'Site: My Site: Runtime error on file /index.jscp: [][0] is not a function', 'prefix' ]
    ],
    onReadyForRequests()
    {
      processResponse(this, makeBaseRequest(), ({ consoleLogOutput, statusCode }) =>
      {
        this.testPassed = this.contentReqExpectedSiteResponded &&
          (statusCode !== 408) && // 408 = Timeout exceeded.
          (statusCode === 500) && // Redundant, but it's what's expected.
          this.gotAllExpectedLogMsgs &&
          (consoleLogOutput.status === 'captured') &&
          areFlatArraysEqual(consoleLogOutput.lines, []);
      });
    }
  }
);

const test_contents_025_jscp_hangingExceptionBug_exty_ry_sp_in_en_ix = Object.assign(makeFromBaseTest('Contents; JSCP file; rt fn exception hanging bug; ExtError Succeeds Present ok Not present N/A'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      initConsoleLogCapture({ prefixInputWithConsoleTag: true });

      prepareTest.call(this);

      // 'ExtError Succeeds Present ok Not present N/A'
      const testCode = [
        'rt.readFile(\'existing_file.txt\')',
        '.rtOnSuccess((contents) => {console.log(\'Great success\');});',
        '[][0](); // Deliberate external error.',
        'console.log(\'We should never get here.\');'
      ].join('\n');

      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], testCode);
    },
    expectedLogMessages:
    [
      [ 'error', 'Site: My Site: Runtime error on file /index.jscp: [][0] is not a function', 'prefix' ]
    ],
    onReadyForRequests()
    {
      processResponse(this, makeBaseRequest(), ({ consoleLogOutput, statusCode }) =>
      {
        this.testPassed = this.contentReqExpectedSiteResponded &&
          (statusCode !== 408) && // 408 = Timeout exceeded.
          (statusCode === 500) && // Redundant, but it's what's expected.
          this.gotAllExpectedLogMsgs &&
          (consoleLogOutput.status === 'captured') &&
          areFlatArraysEqual(consoleLogOutput.lines, []);
      });
    }
  }
);

const test_contents_026_jscp_hangingExceptionBug_exty_ry_sp_iy_en_ix = Object.assign(makeFromBaseTest('Contents; JSCP file; rt fn exception hanging bug; ExtError Succeeds Present error Not present N/A'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      initConsoleLogCapture({ prefixInputWithConsoleTag: true });

      prepareTest.call(this);

      // 'ExtError Succeeds Present error Not present N/A'
      const testCode = [
        'rt.readFile(\'existing_file.txt\')',
        '.rtOnSuccess((contents) => {',
        '  [][0](); // Deliberate error.',
        '});',
        '[][0](); // Deliberate external error.',
        'console.log(\'We should never get here.\');'
      ].join('\n');

      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], testCode);
    },
    expectedLogMessages:
    [
      [ 'error', 'Site: My Site: Runtime error on file /index.jscp: [][0] is not a function', 'prefix' ]
    ],
    onReadyForRequests()
    {
      processResponse(this, makeBaseRequest(), ({ consoleLogOutput, statusCode }) =>
      {
        this.testPassed = this.contentReqExpectedSiteResponded &&
          (statusCode !== 408) && // 408 = Timeout exceeded.
          (statusCode === 500) && // Redundant, but it's what's expected.
          this.gotAllExpectedLogMsgs &&
          (consoleLogOutput.status === 'captured') &&
          areFlatArraysEqual(consoleLogOutput.lines, []);
      });
    }
  }
);

const test_contents_027_jscp_hangingExceptionBug_exty_ry_sn_ix_ep_in = Object.assign(makeFromBaseTest('Contents; JSCP file; rt fn exception hanging bug; ExtError Succeeds Not present N/A Present ok'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      initConsoleLogCapture({ prefixInputWithConsoleTag: true });

      prepareTest.call(this);

      // 'ExtError Succeeds Not present N/A Present ok'
      const testCode = [
        'rt.readFile(\'existing_file.txt\')',
        '.rtOnError((err) => {console.warn(\'Great error\');});',
        '[][0](); // Deliberate external error.',
        'console.log(\'We should never get here.\');'
      ].join('\n');

      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], testCode);
    },
    expectedLogMessages:
    [
      [ 'error', 'Site: My Site: Runtime error on file /index.jscp: [][0] is not a function', 'prefix' ]
    ],
    onReadyForRequests()
    {
      processResponse(this, makeBaseRequest(), ({ consoleLogOutput, statusCode }) =>
      {
        this.testPassed = this.contentReqExpectedSiteResponded &&
          (statusCode !== 408) && // 408 = Timeout exceeded.
          (statusCode === 500) && // Redundant, but it's what's expected.
          this.gotAllExpectedLogMsgs &&
          (consoleLogOutput.status === 'captured') &&
          areFlatArraysEqual(consoleLogOutput.lines, []);
      });
    }
  }
);

const test_contents_028_jscp_hangingExceptionBug_exty_ry_sn_ix_ep_iy = Object.assign(makeFromBaseTest('Contents; JSCP file; rt fn exception hanging bug; ExtError Succeeds Not present N/A Present error'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      initConsoleLogCapture({ prefixInputWithConsoleTag: true });

      prepareTest.call(this);

      // 'ExtError Succeeds Not present N/A Present error'
      const testCode = [
        'rt.readFile(\'existing_file.txt\')',
        '.rtOnError((err) => {',
        '  [][0](); // Deliberate error.',
        '});',
        '[][0](); // Deliberate external error.',
        'console.log(\'We should never get here.\');'
      ].join('\n');

      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], testCode);
    },
    expectedLogMessages:
    [
      [ 'error', 'Site: My Site: Runtime error on file /index.jscp: [][0] is not a function', 'prefix' ]
    ],
    onReadyForRequests()
    {
      processResponse(this, makeBaseRequest(), ({ consoleLogOutput, statusCode }) =>
      {
        this.testPassed = this.contentReqExpectedSiteResponded &&
          (statusCode !== 408) && // 408 = Timeout exceeded.
          (statusCode === 500) && // Redundant, but it's what's expected.
          this.gotAllExpectedLogMsgs &&
          (consoleLogOutput.status === 'captured') &&
          areFlatArraysEqual(consoleLogOutput.lines, []);
      });
    }
  }
);

const test_contents_029_jscp_hangingExceptionBug_exty_rn_sp_in_ep_in = Object.assign(makeFromBaseTest('Contents; JSCP file; rt fn exception hanging bug; ExtError Fails Present ok Present ok'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      initConsoleLogCapture({ prefixInputWithConsoleTag: true });

      prepareTest.call(this);

      // 'ExtError Fails Present ok Present ok'
      const testCode = [
        'rt.readFile(\'non_existing_file.txt\')',
        '.rtOnSuccess((contents) => {console.log(\'Great success\');})',
        '.rtOnError((err) => {console.warn(\'Great error\');});',
        '[][0](); // Deliberate external error.',
        'console.log(\'We should never get here.\');'
      ].join('\n');

      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], testCode);
    },
    expectedLogMessages:
    [
      [ 'error', 'Site: My Site: Runtime error on file /index.jscp: [][0] is not a function', 'prefix' ]
    ],
    onReadyForRequests()
    {
      processResponse(this, makeBaseRequest(), ({ consoleLogOutput, statusCode }) =>
      {
        this.testPassed = this.contentReqExpectedSiteResponded &&
          (statusCode !== 408) && // 408 = Timeout exceeded.
          (statusCode === 500) && // Redundant, but it's what's expected.
          this.gotAllExpectedLogMsgs &&
          (consoleLogOutput.status === 'captured') &&
          areFlatArraysEqual(consoleLogOutput.lines, []);
      });
    }
  }
);

const test_contents_030_jscp_hangingExceptionBug_exty_rn_sp_iy_ep_in = Object.assign(makeFromBaseTest('Contents; JSCP file; rt fn exception hanging bug; ExtError Fails Present error Present ok'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      initConsoleLogCapture({ prefixInputWithConsoleTag: true });

      prepareTest.call(this);

      // 'ExtError Fails Present error Present ok'
      const testCode = [
        'rt.readFile(\'non_existing_file.txt\')',
        '.rtOnSuccess((contents) => {',
        '  [][0](); // Deliberate error.',
        '})',
        '.rtOnError((err) => {console.warn(\'Great error\');});',
        '[][0](); // Deliberate external error.',
        'console.log(\'We should never get here.\');'
      ].join('\n');

      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], testCode);
    },
    expectedLogMessages:
    [
      [ 'error', 'Site: My Site: Runtime error on file /index.jscp: [][0] is not a function', 'prefix' ]
    ],
    onReadyForRequests()
    {
      processResponse(this, makeBaseRequest(), ({ consoleLogOutput, statusCode }) =>
      {
        this.testPassed = this.contentReqExpectedSiteResponded &&
          (statusCode !== 408) && // 408 = Timeout exceeded.
          (statusCode === 500) && // Redundant, but it's what's expected.
          this.gotAllExpectedLogMsgs &&
          (consoleLogOutput.status === 'captured') &&
          areFlatArraysEqual(consoleLogOutput.lines, []);
      });
    }
  }
);

const test_contents_031_jscp_hangingExceptionBug_exty_rn_sp_in_ep_iy = Object.assign(makeFromBaseTest('Contents; JSCP file; rt fn exception hanging bug; ExtError Fails Present ok Present error'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      initConsoleLogCapture({ prefixInputWithConsoleTag: true });

      prepareTest.call(this);

      // 'ExtError Fails Present ok Present error'
      const testCode = [
        'rt.readFile(\'non_existing_file.txt\')',
        '.rtOnSuccess((contents) => {console.log(\'Great success\');})',
        '.rtOnError((err) => {',
        '  [][0](); // Deliberate error.',
        '});',
        '[][0](); // Deliberate external error.',
        'console.log(\'We should never get here.\');'
      ].join('\n');

      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], testCode);
    },
    expectedLogMessages:
    [
      [ 'error', 'Site: My Site: Runtime error on file /index.jscp: [][0] is not a function', 'prefix' ]
    ],
    onReadyForRequests()
    {
      processResponse(this, makeBaseRequest(), ({ consoleLogOutput, statusCode }) =>
      {
        this.testPassed = this.contentReqExpectedSiteResponded &&
          (statusCode !== 408) && // 408 = Timeout exceeded.
          (statusCode === 500) && // Redundant, but it's what's expected.
          this.gotAllExpectedLogMsgs &&
          (consoleLogOutput.status === 'captured') &&
          areFlatArraysEqual(consoleLogOutput.lines, []);
      });
    }
  }
);

const test_contents_032_jscp_hangingExceptionBug_exty_rn_sp_iy_ep_iy = Object.assign(makeFromBaseTest('Contents; JSCP file; rt fn exception hanging bug; ExtError Fails Present error Present error'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      initConsoleLogCapture({ prefixInputWithConsoleTag: true });

      prepareTest.call(this);

      // 'ExtError Fails Present error Present error'
      const testCode = [
        'rt.readFile(\'non_existing_file.txt\')',
        '.rtOnSuccess((contents) => {',
        '  [][0](); // Deliberate error.',
        '})',
        '.rtOnError((err) => {',
        '  [][0](); // Deliberate error.',
        '});',
        '[][0](); // Deliberate external error.',
        'console.log(\'We should never get here.\');'
      ].join('\n');

      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], testCode);
    },
    expectedLogMessages:
    [
      [ 'error', 'Site: My Site: Runtime error on file /index.jscp: [][0] is not a function', 'prefix' ]
    ],
    onReadyForRequests()
    {
      processResponse(this, makeBaseRequest(), ({ consoleLogOutput, statusCode }) =>
      {
        this.testPassed = this.contentReqExpectedSiteResponded &&
          (statusCode !== 408) && // 408 = Timeout exceeded.
          (statusCode === 500) && // Redundant, but it's what's expected.
          this.gotAllExpectedLogMsgs &&
          (consoleLogOutput.status === 'captured') &&
          areFlatArraysEqual(consoleLogOutput.lines, []);
      });
    }
  }
);

const test_contents_033_jscp_hangingExceptionBug_exty_rn_sp_in_en_ix = Object.assign(makeFromBaseTest('Contents; JSCP file; rt fn exception hanging bug; ExtError Fails Present ok Not present N/A'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      initConsoleLogCapture({ prefixInputWithConsoleTag: true });

      prepareTest.call(this);

      // 'ExtError Fails Present ok Not present N/A'
      const testCode = [
        'rt.readFile(\'non_existing_file.txt\')',
        '.rtOnSuccess((contents) => {console.log(\'Great success\');});',
        '[][0](); // Deliberate external error.',
        'console.log(\'We should never get here.\');'
      ].join('\n');

      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], testCode);
    },
    expectedLogMessages:
    [
      [ 'error', 'Site: My Site: Runtime error on file /index.jscp: ENOENT: no such file or directory', 'prefix' ]
    ],
    onReadyForRequests()
    {
      processResponse(this, makeBaseRequest(), ({ consoleLogOutput, statusCode }) =>
      {
        this.testPassed = this.contentReqExpectedSiteResponded &&
          (statusCode !== 408) && // 408 = Timeout exceeded.
          (statusCode === 500) && // Redundant, but it's what's expected.
          this.gotAllExpectedLogMsgs &&
          (consoleLogOutput.status === 'captured') &&
          areFlatArraysEqual(consoleLogOutput.lines, []);
      });
    }
  }
);

const test_contents_034_jscp_hangingExceptionBug_exty_rn_sp_iy_en_ix = Object.assign(makeFromBaseTest('Contents; JSCP file; rt fn exception hanging bug; ExtError Fails Present error Not present N/A'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      initConsoleLogCapture({ prefixInputWithConsoleTag: true });

      prepareTest.call(this);

      // 'ExtError Fails Present error Not present N/A'
      const testCode = [
        'rt.readFile(\'non_existing_file.txt\')',
        '.rtOnSuccess((contents) => {',
        '  [][0](); // Deliberate error.',
        '});',
        '[][0](); // Deliberate external error.',
        'console.log(\'We should never get here.\');'
      ].join('\n');

      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], testCode);
    },
    expectedLogMessages:
    [
      [ 'error', 'Site: My Site: Runtime error on file /index.jscp: ENOENT: no such file or directory', 'prefix' ]
    ],
    onReadyForRequests()
    {
      processResponse(this, makeBaseRequest(), ({ consoleLogOutput, statusCode }) =>
      {
        this.testPassed = this.contentReqExpectedSiteResponded &&
          (statusCode !== 408) && // 408 = Timeout exceeded.
          (statusCode === 500) && // Redundant, but it's what's expected.
          this.gotAllExpectedLogMsgs &&
          (consoleLogOutput.status === 'captured') &&
          areFlatArraysEqual(consoleLogOutput.lines, []);
      });
    }
  }
);

const test_contents_035_jscp_hangingExceptionBug_exty_rn_sn_ix_ep_in = Object.assign(makeFromBaseTest('Contents; JSCP file; rt fn exception hanging bug; ExtError Fails Not present N/A Present ok'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      initConsoleLogCapture({ prefixInputWithConsoleTag: true });

      prepareTest.call(this);

      // 'ExtError Fails Not present N/A Present ok'
      const testCode = [
        'rt.readFile(\'non_existing_file.txt\')',
        '.rtOnError((err) => {console.warn(\'Great error\');});',
        '[][0](); // Deliberate external error.',
        'console.log(\'We should never get here.\');'
      ].join('\n');

      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], testCode);
    },
    expectedLogMessages:
    [
      [ 'error', 'Site: My Site: Runtime error on file /index.jscp: [][0] is not a function', 'prefix' ]
    ],
    onReadyForRequests()
    {
      processResponse(this, makeBaseRequest(), ({ consoleLogOutput, statusCode }) =>
      {
        this.testPassed = this.contentReqExpectedSiteResponded &&
          (statusCode !== 408) && // 408 = Timeout exceeded.
          (statusCode === 500) && // Redundant, but it's what's expected.
          this.gotAllExpectedLogMsgs &&
          (consoleLogOutput.status === 'captured') &&
          areFlatArraysEqual(consoleLogOutput.lines, []);
      });
    }
  }
);

const test_contents_036_jscp_hangingExceptionBug_exty_rn_sn_ix_ep_iy = Object.assign(makeFromBaseTest('Contents; JSCP file; rt fn exception hanging bug; ExtError Fails Not present N/A Present error'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      initConsoleLogCapture({ prefixInputWithConsoleTag: true });

      prepareTest.call(this);

      // 'ExtError Fails Not present N/A Present error'
      const testCode = [
        'rt.readFile(\'non_existing_file.txt\')',
        '.rtOnError((err) => {',
        '  [][0](); // Deliberate error.',
        '});',
        '[][0](); // Deliberate external error.',
        'console.log(\'We should never get here.\');'
      ].join('\n');

      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], testCode);
    },
    expectedLogMessages:
    [
      [ 'error', 'Site: My Site: Runtime error on file /index.jscp: [][0] is not a function', 'prefix' ]
    ],
    onReadyForRequests()
    {
      processResponse(this, makeBaseRequest(), ({ consoleLogOutput, statusCode }) =>
      {
        this.testPassed = this.contentReqExpectedSiteResponded &&
          (statusCode !== 408) && // 408 = Timeout exceeded.
          (statusCode === 500) && // Redundant, but it's what's expected.
          this.gotAllExpectedLogMsgs &&
          (consoleLogOutput.status === 'captured') &&
          areFlatArraysEqual(consoleLogOutput.lines, []);
      });
    }
  }
);

module.exports =
[
  test_contents_001_jscp_hangingExceptionBug_exty_rn_sn_ix_en_ix,
  test_contents_002_jscp_hangingExceptionBug_exty_ry_sn_ix_en_ix,
  test_contents_003_jscp_hangingExceptionBug_extn_ry_sp_in_ep_in,
  test_contents_004_jscp_hangingExceptionBug_extn_ry_sp_iy_ep_in,
  test_contents_005_jscp_hangingExceptionBug_extn_ry_sp_in_ep_iy,
  test_contents_006_jscp_hangingExceptionBug_extn_ry_sp_iy_ep_iy,
  test_contents_007_jscp_hangingExceptionBug_extn_ry_sp_in_en_ix,
  test_contents_008_jscp_hangingExceptionBug_extn_ry_sp_iy_en_ix,
  test_contents_009_jscp_hangingExceptionBug_extn_ry_sn_ix_ep_in,
  test_contents_010_jscp_hangingExceptionBug_extn_ry_sn_ix_ep_iy,
  test_contents_011_jscp_hangingExceptionBug_extn_ry_sn_ix_en_ix,
  test_contents_012_jscp_hangingExceptionBug_extn_rn_sp_in_ep_in,
  test_contents_013_jscp_hangingExceptionBug_extn_rn_sp_iy_ep_in,
  test_contents_014_jscp_hangingExceptionBug_extn_rn_sp_in_ep_iy,
  test_contents_015_jscp_hangingExceptionBug_extn_rn_sp_iy_ep_iy,
  test_contents_016_jscp_hangingExceptionBug_extn_rn_sp_in_en_ix,
  test_contents_017_jscp_hangingExceptionBug_extn_rn_sp_iy_en_ix,
  test_contents_018_jscp_hangingExceptionBug_extn_rn_sn_ix_ep_in,
  test_contents_019_jscp_hangingExceptionBug_extn_rn_sn_ix_ep_iy,
  test_contents_020_jscp_hangingExceptionBug_extn_rn_sn_ix_en_ix,
  test_contents_021_jscp_hangingExceptionBug_exty_ry_sp_in_ep_in,
  test_contents_022_jscp_hangingExceptionBug_exty_ry_sp_iy_ep_in,
  test_contents_023_jscp_hangingExceptionBug_exty_ry_sp_in_ep_iy,
  test_contents_024_jscp_hangingExceptionBug_exty_ry_sp_iy_ep_iy,
  test_contents_025_jscp_hangingExceptionBug_exty_ry_sp_in_en_ix,
  test_contents_026_jscp_hangingExceptionBug_exty_ry_sp_iy_en_ix,
  test_contents_027_jscp_hangingExceptionBug_exty_ry_sn_ix_ep_in,
  test_contents_028_jscp_hangingExceptionBug_exty_ry_sn_ix_ep_iy,
  test_contents_029_jscp_hangingExceptionBug_exty_rn_sp_in_ep_in,
  test_contents_030_jscp_hangingExceptionBug_exty_rn_sp_iy_ep_in,
  test_contents_031_jscp_hangingExceptionBug_exty_rn_sp_in_ep_iy,
  test_contents_032_jscp_hangingExceptionBug_exty_rn_sp_iy_ep_iy,
  test_contents_033_jscp_hangingExceptionBug_exty_rn_sp_in_en_ix,
  test_contents_034_jscp_hangingExceptionBug_exty_rn_sp_iy_en_ix,
  test_contents_035_jscp_hangingExceptionBug_exty_rn_sn_ix_ep_in,
  test_contents_036_jscp_hangingExceptionBug_exty_rn_sn_ix_ep_iy
];
