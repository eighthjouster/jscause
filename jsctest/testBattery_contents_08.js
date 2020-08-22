'use strict';

// Legend:
// External error: exty/extn
// readFile succeeds: ry/rn
// onSuccess: sp (present), sn (not present)
// onSuccess has error inside: iy/in/ix (x=n/a)
// onError: ep (present), en (not present)
// onError has error inside: iy/in/ix (x=n/a)

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

const
  {
    makeFromBaseTest,
    makeTestEndBoilerplate,
    processResponse
  } = testUtils;

const test_contents_001_jscp_hangingExceptionBug_exty_rn_sn_ix_en_ix = Object.assign(makeFromBaseTest('Contents; JSCP file; rt fn exception hanging bug; Yes Fails Not present N/A Not present N/A'),
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
      
      const badProgram = [
        'rt.readFile(\'non_existing_file.txt\');',
        '[][0](); // Deliberate external error.'
      ].join('\n');

      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], badProgram);
      this.isRequestsTest = true;
      this.maxTerminateRetries = 10;
      this.suppressHTTPErrorsWarning = true;
    },
    expectedLogMessages:
    [
      [ 'error', 'Site: My Site: Runtime error on file /index.jscp: ENOENT: no such file or directory', 'prefix' ]
    ],
    onReadyForRequests()
    {
      processResponse(this, makeBaseRequest(), () =>
      {
        this.testPassed = this.gotAllExpectedLogMsgs;
      });
    }
  }
);

const test_contents_002_jscp_hangingExceptionBug_exty_ry_sn_ix_en_ix = Object.assign(makeFromBaseTest('Contents; JSCP file; rt fn exception hanging bug; Yes Succeeds Not present N/A Not present N/A'),
  makeTestEndBoilerplate.call(this),
  {
    // only: true,
    onTestBeforeStart()
    {
      const jsCauseConfContents = makeBaseJsCauseConfContents({
        requesttimeoutsecs: 1
      });
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));

      const siteConfContents = makeBaseSiteConfContents();
      this.createFile(['sites', 'mysite', 'configuration', 'site.json'], JSON.stringify(siteConfContents));

      const badProgram = [
        'rt.readFile(\'existing_file.txt\');',
        '[][0](); // Deliberate external error.'
      ].join('\n');

      this.createFile(['sites', 'mysite', 'website', 'index.jscp'], badProgram);
      this.isRequestsTest = true;
      this.maxTerminateRetries = 10;
      this.suppressHTTPErrorsWarning = true;
    },
    expectedLogMessages:
    [
      [ 'error', 'Site: My Site: Runtime error on file /index.jscp: ENOENT: no such file or directory', 'prefix' ]
    ],
    onReadyForRequests()
    {
      processResponse(this, makeBaseRequest(), () =>
      {
        this.testPassed = this.gotAllExpectedLogMsgs;
      });
    }
  }
);

module.exports =
[
  test_contents_001_jscp_hangingExceptionBug_exty_rn_sn_ix_en_ix,
  test_contents_002_jscp_hangingExceptionBug_exty_ry_sn_ix_en_ix,
  // test_contents_003_jscp_hangingExceptionBug_extn_ry_sp_in_ep_in,
  // test_contents_004_jscp_hangingExceptionBug_extn_ry_sp_iy_ep_in,
  // test_contents_005_jscp_hangingExceptionBug_extn_ry_sp_in_ep_iy,
  // test_contents_006_jscp_hangingExceptionBug_extn_ry_sp_iy_ep_iy,
  // test_contents_007_jscp_hangingExceptionBug_extn_ry_sp_in_en_ix,
  // test_contents_008_jscp_hangingExceptionBug_extn_ry_sp_iy_en_ix,
  // test_contents_009_jscp_hangingExceptionBug_extn_ry_sn_ix_ep_in,
  // test_contents_010_jscp_hangingExceptionBug_extn_ry_sn_ix_ep_iy,
  // test_contents_011_jscp_hangingExceptionBug_extn_ry_sn_ix_en_ix,
  // test_contents_012_jscp_hangingExceptionBug_extn_rn_sp_in_ep_in,
  // test_contents_013_jscp_hangingExceptionBug_extn_rn_sp_iy_ep_in,
  // test_contents_014_jscp_hangingExceptionBug_extn_rn_sp_in_ep_iy,
  // test_contents_015_jscp_hangingExceptionBug_extn_rn_sp_iy_ep_iy,
  // test_contents_016_jscp_hangingExceptionBug_extn_rn_sp_in_en_ix,
  // test_contents_017_jscp_hangingExceptionBug_extn_rn_sp_iy_en_ix,
  // test_contents_018_jscp_hangingExceptionBug_extn_rn_sn_ix_ep_in,
  // test_contents_019_jscp_hangingExceptionBug_extn_rn_sn_ix_ep_iy,
  // test_contents_020_jscp_hangingExceptionBug_extn_rn_sn_ix_en_ix,
  // test_contents_021_jscp_hangingExceptionBug_exty_ry_sp_in_ep_in,
  // test_contents_022_jscp_hangingExceptionBug_exty_ry_sp_iy_ep_in,
  // test_contents_023_jscp_hangingExceptionBug_exty_ry_sp_in_ep_iy,
  // test_contents_024_jscp_hangingExceptionBug_exty_ry_sp_iy_ep_iy,
  // test_contents_025_jscp_hangingExceptionBug_exty_ry_sp_in_en_ix,
  // test_contents_026_jscp_hangingExceptionBug_exty_ry_sp_iy_en_ix,
  // test_contents_027_jscp_hangingExceptionBug_exty_ry_sn_ix_ep_in,
  // test_contents_028_jscp_hangingExceptionBug_exty_ry_sn_ix_ep_iy,
  // test_contents_029_jscp_hangingExceptionBug_exty_rn_sp_in_ep_in,
  // test_contents_030_jscp_hangingExceptionBug_exty_rn_sp_iy_ep_in,
  // test_contents_031_jscp_hangingExceptionBug_exty_rn_sp_in_ep_iy,
  // test_contents_032_jscp_hangingExceptionBug_exty_rn_sp_iy_ep_iy,
  // test_contents_033_jscp_hangingExceptionBug_exty_rn_sp_in_en_ix,
  // test_contents_034_jscp_hangingExceptionBug_exty_rn_sp_iy_en_ix,
  // test_contents_035_jscp_hangingExceptionBug_exty_rn_sn_ix_ep_in,
  // test_contents_036_jscp_hangingExceptionBug_exty_rn_sn_ix_ep_iy
];
