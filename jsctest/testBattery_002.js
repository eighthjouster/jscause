'use strict';

const testUtils = require('./testBatteryUtils');

const test_002_001_emptyLogsDirectory = Object.assign(testUtils.makeFromBaseTest('Empty logs dir'),
  {
    // only: true,
    onTestBeforeStart()
    {
      this.doEmptyTestDirectory();

      const jsCauseConfContents =
      {
        'sites': [1],
        'logging': {}
      };
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));

      this.doCreateDirectoryFromPathList(['logs']);
    },
    expectedLogMessages:
    [
      [ 'error', 'Site configuration: Missing site name.' ],
      [ 'error', 'Site (no name) not started.' ],
      [ 'error', 'Server not started.  No sites are running.' ]
    ],
    onServerStarted()
    {
      this.testPassed = false;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_002_002_emptySiteConfigExtraComma = Object.assign(testUtils.makeFromBaseTest('Empty site config, extra comma'),
  {
    // only: true,
    onTestBeforeStart()
    {
      this.createFile('jscause.conf', '{\n  "sites": [\n    {\n    },\n  ],\n  "logging": {}\n}\n');
    },
    expectedLogMessages:
    [
      [ 'error', 'Invalid jscause.conf file format.' ],
      [ 'error', 'Unexpected token ] in JSON at position 18' ],
      [ 'error', 'Server not started.  No sites are running.' ]
    ],
    onServerStarted()
    {
      this.testPassed = false;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_002_003_emptySiteConfig = Object.assign(testUtils.makeFromBaseTest('Empty site config'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const jsCauseConfContents =
      {
        'sites':
        [
          {
          }
        ],
        'logging': {}
      };
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));
    },
    expectedLogMessages:
    [
      [ 'error', 'Site configuration: Missing site name.' ],
      [ 'error', 'Site (no name) not started.' ],
      [ 'error', 'Server not started.  No sites are running.' ]
    ],
    onServerStarted()
    {
      this.testPassed = false;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_002_004_emptySiteName = Object.assign(testUtils.makeFromBaseTest('Site config, empty name'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const jsCauseConfContents =
      {
        'sites':
        [
          {
            'name': ''
          }
        ],
        'logging': {}
      };
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));
    },
    expectedLogMessages:
    [
      [ 'error', 'Site configuration: Missing site name.' ],
      [ 'error', 'Site (no name) not started.' ],
      [ 'error', 'Server not started.  No sites are running.' ]
    ],
    onServerStarted()
    {
      this.testPassed = false;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_002_004_02_invalidSiteName = Object.assign(testUtils.makeFromBaseTest('Site config, invalid, non-string name'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const jsCauseConfContents =
      {
        'sites':
        [
          {
            'name': 4
          }
        ],
        'logging': {}
      };
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));
    },
    expectedLogMessages:
    [
      [ 'error', 'Site configuration: Site name has an invalid value, 4. String expected.' ],
      [ 'error', 'Site \'4\' not started.' ],
      [ 'error', 'Server not started.  No sites are running.' ]
    ],
    onServerStarted()
    {
      this.testPassed = false;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_002_005_missingSitePort = Object.assign(testUtils.makeFromBaseTest('Site config, missing port'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const jsCauseConfContents =
      {
        'sites':
        [
          {
            'name': 'My Site'
          }
        ],
        'logging': {}
      };
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));
    },
    expectedLogMessages:
    [
      [ 'error', 'Site configuration: Site name \'My Site\' is missing port.' ],
      [ 'error', 'Site \'My Site\' not started.' ],
      [ 'error', 'Server not started.  No sites are running.' ]
    ],
    onServerStarted()
    {
      this.testPassed = false;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_002_006_invalidSitePort = Object.assign(testUtils.makeFromBaseTest('Site config, invalid port'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const jsCauseConfContents =
      {
        'sites':
        [
          {
            'name': 'My Site',
            'port': ''
          }
        ],
        'logging': {}
      };
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));
    },
    expectedLogMessages:
    [
      [ 'error', 'Site configuration:  Site name \'My Site\' has an invalid port.  Integer number expected.' ],
      [ 'error', 'Site \'My Site\' not started.' ],
      [ 'error', 'Server not started.  No sites are running.' ]
    ],
    onServerStarted()
    {
      this.testPassed = false;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_002_007_missingRootDirName = Object.assign(testUtils.makeFromBaseTest('Site config, missing root directory name'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const jsCauseConfContents =
      {
        'sites':
        [
          {
            'name': 'My Site',
            'port': 3000
          }
        ],
        'logging': {}
      };
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));
    },
    expectedLogMessages:
    [
      [ 'error', 'Site configuration: Site name \'My Site\': Missing rootdirectoryname.' ],
      [ 'error', 'Site \'My Site\' not started.' ],
      [ 'error', 'Server not started.  No sites are running.' ]
    ],
    onServerStarted()
    {
      this.testPassed = false;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_002_008_emptyRootDirName = Object.assign(testUtils.makeFromBaseTest('Site config, empty root directory name'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const jsCauseConfContents =
      {
        'sites':
        [
          {
            'name': 'My Site',
            'port': 3000,
            'rootDirectoryName': ''
          }
        ],
        'logging': {}
      };
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));
    },
    expectedLogMessages:
    [
      [ 'error', 'Site configuration: Site name \'My Site\': rootdirectoryname cannot be empty.' ],
      [ 'error', 'Site \'My Site\' not started.' ],
      [ 'error', 'Server not started.  No sites are running.' ]
    ],
    onServerStarted()
    {
      this.testPassed = false;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_002_009_invalidRootDirName = Object.assign(testUtils.makeFromBaseTest('Site config, invalid root directory name'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const jsCauseConfContents =
      {
        'sites':
        [
          {
            'name': 'My Site',
            'port': 3000,
            'rootDirectoryName': 4
          }
        ],
        'logging': {}
      };
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));
    },
    expectedLogMessages:
    [
      [ 'error', 'Site configuration: Site name \'My Site\': rootdirectoryname expects a string value.' ],
      [ 'error', 'Site \'My Site\' not started.' ],
      [ 'error', 'Server not started.  No sites are running.' ]
    ],
    onServerStarted()
    {
      this.testPassed = false;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

const test_002_010_missingSitesDir = Object.assign(testUtils.makeFromBaseTest('Site config valid, missing sites directory'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const jsCauseConfContents =
      {
        'sites':
        [
          {
            'name': 'My Site',
            'port': 3000,
            'rootDirectoryName': 'mysite'
          }
        ],
        'logging': {}
      };
      this.createFile('jscause.conf', JSON.stringify(jsCauseConfContents));
    },
    expectedLogMessages:
    [
      [ 'error', 'Cannot find directory: jsctest/testrootdir/sites/mysite' ],
      [ 'error', 'Site \'My Site\' not started.' ],
      [ 'error', 'Server not started.  No sites are running.' ]
    ],
    onServerStarted()
    {
      this.testPassed = false;
      this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
    }
  }
);

module.exports =
[
  test_002_001_emptyLogsDirectory,
  test_002_002_emptySiteConfigExtraComma,
  test_002_003_emptySiteConfig,
  test_002_004_emptySiteName,
  test_002_004_02_invalidSiteName,
  test_002_005_missingSitePort,
  test_002_006_invalidSitePort,
  test_002_007_missingRootDirName,
  test_002_008_emptyRootDirName,
  test_002_009_invalidRootDirName,
  test_002_010_missingSitesDir
];
