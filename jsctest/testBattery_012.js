'use strict';

const testUtils = require('./testBatteryUtils');

const test_012_001_getCurrentLogFileName_invalidLogDir_undefined = Object.assign(testUtils.makeFromBaseTest('getCurrentLogFileName - Invalid log dir; undefined'),
  {
    // only: true,
    onTestBeforeStart()
    {
      this.doEmptyTestDirectory();
      this.doCreateDirectoryFromPathList(['logs']);
      this.isUnitTest = true;
    },
    onUnitTestStarted()
    {
      const { jscLib: { getCurrentLogFileName } } = this;
      getCurrentLogFileName(undefined, 0)
        .then((fileName) =>
        {
          this.testFailMessage = `Got a valid file name ('${fileName}').  We should have never gotten one.`;
          this.testPassed = false;
          this.continueTesting();
        })
        .catch(e =>
        {
          this.testPassed = (e.message.indexOf('Path must be a string.') === 0);
          this.continueTesting();
        });

      this.waitForContinueTestingCall = true;
    }
  }
);

const test_012_002_getCurrentLogFileName_invalidLogDir_nonString = Object.assign(testUtils.makeFromBaseTest('getCurrentLogFileName - Invalid log dir; non string'),
  {
    // only: true,
    onTestBeforeStart()
    {
      this.isUnitTest = true;
    },
    onUnitTestStarted()
    {
      const { jscLib: { getCurrentLogFileName } } = this;
      getCurrentLogFileName(42, 0)
        .then((fileName) =>
        {
          this.testFailMessage = `Got a valid file name ('${fileName}').  We should have never gotten one.`;
          this.testPassed = false;
          this.continueTesting();
        })
        .catch(e =>
        {
          this.testPassed = (e.message.indexOf('Path must be a string.') === 0);
          this.continueTesting();
        });

      this.waitForContinueTestingCall = true;
    }
  }
);

const test_012_003_getCurrentLogFileName_unreadableLogDir = Object.assign(testUtils.makeFromBaseTest('getCurrentLogFileName - Unreadable log dir'),
  {
    // only: true,
    onTestBeforeStart()
    {
      this.isUnitTest = true;
    },
    onUnitTestStarted()
    {
      const { jscLib: { getCurrentLogFileName } } = this;
      this.chmodFileOrDir(['.', 'logs'], 0o444);
      getCurrentLogFileName(this.getTestFilePath(['logs']), 0)
        .then((/* fileName */) =>
        {
          this.testFailMessage = 'Got to read the directory when it was supposed to be unreadable.  We should have never gotten one.';
          this.testPassed = false;
          this.continueTesting();
        })
        .catch(e =>
        {
          this.testPassed = (e.message.indexOf('permission denied') >= 0);
          this.continueTesting();
        });

      this.waitForContinueTestingCall = true;
    },
    onTestEnd()
    {
      this.chmodFileOrDir(['.', 'logs'], 0o755);
    }
  }
);


const test_012_004_getCurrentLogFileName_emptyLogDir = Object.assign(testUtils.makeFromBaseTest('getCurrentLogFileName - Empty log dir'),
  {
    // only: true,
    onTestBeforeStart()
    {
      this.isUnitTest = true;
    },
    onUnitTestStarted()
    {
      const { jscLib: { getCurrentLogFileName, dateToYYYMMDD_HH0000 } } = this;
      const expectedFileName = `jsc_${dateToYYYMMDD_HH0000()}.log`;
      getCurrentLogFileName(this.getTestFilePath(['logs']), 0)
        .then((fileName) =>
        {
          this.testPassed = (fileName === expectedFileName);
          this.continueTesting();
        })
        .catch(() =>
        {
          this.testPassed = false;
          this.continueTesting();
        });

      this.waitForContinueTestingCall = true;
    }
  }
);

const test_012_005_getCurrentLogFileName_existingLogFile_noSizeThreshold = Object.assign(testUtils.makeFromBaseTest('getCurrentLogFileName - Existing log file, no size threshold'),
  {
    // only: true,
    onTestBeforeStart()
    {
      this.isUnitTest = true;
      this.doEmptyTestDirectory(['logs'], { preserveDirectory: true });
    },
    onUnitTestStarted()
    {
      const { jscLib: { getCurrentLogFileName, dateToYYYMMDD_HH0000 } } = this;
      const existingFileName = `jsc_${dateToYYYMMDD_HH0000()}.log`;
      this.createFile(['logs', existingFileName], 'Some contents.');
      getCurrentLogFileName(this.getTestFilePath(['logs']), 0)
        .then((fileName) =>
        {
          this.testPassed = (fileName === existingFileName);
          this.continueTesting();
        })
        .catch(() =>
        {
          this.testPassed = false;
          this.continueTesting();
        });

      this.waitForContinueTestingCall = true;
    }
  }
);

const test_012_006_getCurrentLogFileName_existingLogFile_withSizeThreshold = Object.assign(testUtils.makeFromBaseTest('getCurrentLogFileName - Existing log file, with size threshold'),
  {
    // only: true,
    onTestBeforeStart()
    {
      this.isUnitTest = true;
      this.doEmptyTestDirectory(['logs'], { preserveDirectory: true });
    },
    onUnitTestStarted()
    {
      const { jscLib: { getCurrentLogFileName, dateToYYYMMDD_HH0000 } } = this;
      const sizeThreshold = 10;
      const aboveThreshold = sizeThreshold + 1;
      const fileNameDateComponent = dateToYYYMMDD_HH0000();
      const existingFileName = `jsc_${fileNameDateComponent}.log`;
      this.createFile(['logs', existingFileName], 'A'.repeat(aboveThreshold));
      getCurrentLogFileName(this.getTestFilePath(['logs']), sizeThreshold)
        .then((fileName) =>
        {
          this.testPassed = (fileName === `jsc_${fileNameDateComponent}--1.log`);
          this.continueTesting();
        })
        .catch(() =>
        {
          this.testPassed = false;
          this.continueTesting();
        });

      this.waitForContinueTestingCall = true;
    }
  }
);

const test_012_007_getCurrentLogFileName_existingLogFiles_withSizeThreshold_pt2 = Object.assign(testUtils.makeFromBaseTest('getCurrentLogFileName - Existing log files, with size threshold; part 2: existing suffix.'),
  {
    // only: true,
    onTestBeforeStart()
    {
      this.isUnitTest = true;
      this.doEmptyTestDirectory(['logs'], { preserveDirectory: true });
    },
    onUnitTestStarted()
    {
      const { jscLib: { getCurrentLogFileName, dateToYYYMMDD_HH0000 } } = this;
      const sizeThreshold = 10;
      const aboveThreshold = sizeThreshold + 1;
      const fileNameDateComponent = dateToYYYMMDD_HH0000();
      const existingFileName1 = `jsc_${fileNameDateComponent}.log`;
      const existingFileName2 = `jsc_${fileNameDateComponent}--1.log`;
      this.createFile(['logs', existingFileName1], 'A'.repeat(aboveThreshold));
      this.createFile(['logs', existingFileName2], 'A'.repeat(aboveThreshold));
      getCurrentLogFileName(this.getTestFilePath(['logs']), sizeThreshold)
        .then((fileName) =>
        {
          this.testPassed = (fileName === `jsc_${fileNameDateComponent}--2.log`);
          this.continueTesting();
        })
        .catch(() =>
        {
          this.testPassed = false;
          this.continueTesting();
        });

      this.waitForContinueTestingCall = true;
    }
  }
);

const test_012_008_getCurrentLogFileName_existingGzFile = Object.assign(testUtils.makeFromBaseTest('getCurrentLogFileName - Existing gz file..'),
  {
    // only: true,
    onTestBeforeStart()
    {
      this.isUnitTest = true;
      this.doEmptyTestDirectory(['logs'], { preserveDirectory: true });
    },
    onUnitTestStarted()
    {
      const { jscLib: { getCurrentLogFileName, dateToYYYMMDD_HH0000 } } = this;
      const fileNameDateComponent = dateToYYYMMDD_HH0000();
      const existingFileName = `jsc_${fileNameDateComponent}.log.gz`;
      this.createFile(['logs', existingFileName], 'Some compressed contents.');
      getCurrentLogFileName(this.getTestFilePath(['logs']))
        .then((fileName) =>
        {
          this.testPassed = (fileName === `jsc_${fileNameDateComponent}--1.log`);
          this.continueTesting();
        })
        .catch(() =>
        {
          this.testPassed = false;
          this.continueTesting();
        });

      this.waitForContinueTestingCall = true;
    }
  }
);

const test_012_009_getCurrentLogFileName_existingGzFiles = Object.assign(testUtils.makeFromBaseTest('getCurrentLogFileName - Existing gz file, with size threshold.'),
  {
    // only: true,
    onTestBeforeStart()
    {
      this.isUnitTest = true;
      this.doEmptyTestDirectory(['logs'], { preserveDirectory: true });
    },
    onUnitTestStarted()
    {
      const { jscLib: { getCurrentLogFileName, dateToYYYMMDD_HH0000 } } = this;
      const fileNameDateComponent = dateToYYYMMDD_HH0000();
      const existingFileName1 = `jsc_${fileNameDateComponent}.log.gz`;
      const existingFileName2 = `jsc_${fileNameDateComponent}--1.log.gz`;
      this.createFile(['logs', existingFileName1], 'Some compressed contents.');
      this.createFile(['logs', existingFileName2], 'Some other compressed contents.');
      getCurrentLogFileName(this.getTestFilePath(['logs']))
        .then((fileName) =>
        {
          this.testPassed = (fileName === `jsc_${fileNameDateComponent}--2.log`);
          this.continueTesting();
        })
        .catch(() =>
        {
          this.testPassed = false;
          this.continueTesting();
        });

      this.waitForContinueTestingCall = true;
    }
  }
);

const test_012_010_getCurrentLogFileName_existingGzFileLogFile_noSizeThreshold = Object.assign(testUtils.makeFromBaseTest('getCurrentLogFileName - Existing gz file and log file, no size threshold.'),
  {
    // only: true,
    onTestBeforeStart()
    {
      this.isUnitTest = true;
      this.doEmptyTestDirectory(['logs'], { preserveDirectory: true });
    },
    onUnitTestStarted()
    {
      const { jscLib: { getCurrentLogFileName, dateToYYYMMDD_HH0000 } } = this;
      const fileNameDateComponent = dateToYYYMMDD_HH0000();
      const existingFileName1 = `jsc_${fileNameDateComponent}.log.gz`;
      const existingFileName2 = `jsc_${fileNameDateComponent}--1.log`;
      this.createFile(['logs', existingFileName1], 'Some compressed contents.');
      this.createFile(['logs', existingFileName2], 'Some contents.');
      getCurrentLogFileName(this.getTestFilePath(['logs']))
        .then((fileName) =>
        {
          console.log(existingFileName1);//__RP
          console.log(existingFileName2);//__RP
          console.log(fileName);//__RP
          this.testPassed = (fileName === `jsc_${fileNameDateComponent}--1.log`);
          this.continueTesting();
        })
        .catch(() =>
        {
          this.testPassed = false;
          this.continueTesting();
        });

      this.waitForContinueTestingCall = true;
    }
  }
);

const test_012_011_getCurrentLogFileName_existingGzFileLogFile_withBelowSizeThreshold = Object.assign(testUtils.makeFromBaseTest('getCurrentLogFileName - Existing gz file and log file, with size threshold below.'),
  {
    // only: true,
    onTestBeforeStart()
    {
      this.isUnitTest = true;
      this.doEmptyTestDirectory(['logs'], { preserveDirectory: true });
    },
    onUnitTestStarted()
    {
      const { jscLib: { getCurrentLogFileName, dateToYYYMMDD_HH0000 } } = this;
      const sizeThreshold = 10;
      const belowThreshold = sizeThreshold - 1;
      const fileNameDateComponent = dateToYYYMMDD_HH0000();
      const existingFileName1 = `jsc_${fileNameDateComponent}.log.gz`;
      const existingFileName2 = `jsc_${fileNameDateComponent}--1.log`;
      this.createFile(['logs', existingFileName1], 'Some compressed contents.');
      this.createFile(['logs', existingFileName2], 'A'.repeat(belowThreshold));
      getCurrentLogFileName(this.getTestFilePath(['logs']), sizeThreshold)
        .then((fileName) =>
        {
          this.testPassed = (fileName === `jsc_${fileNameDateComponent}--1.log`);
          this.continueTesting();
        })
        .catch(() =>
        {
          this.testPassed = false;
          this.continueTesting();
        });

      this.waitForContinueTestingCall = true;
    }
  }
);

const test_012_012_getCurrentLogFileName_existingGzFileLogFile_withAboveSizeThreshold = Object.assign(testUtils.makeFromBaseTest('getCurrentLogFileName - Existing gz file and log file, with size threshold above.'),
  {
    // only: true,
    onTestBeforeStart()
    {
      this.isUnitTest = true;
      this.doEmptyTestDirectory(['logs'], { preserveDirectory: true });
    },
    onUnitTestStarted()
    {
      const { jscLib: { getCurrentLogFileName, dateToYYYMMDD_HH0000 } } = this;
      const sizeThreshold = 10;
      const aboveThreshold = sizeThreshold + 1;
      const fileNameDateComponent = dateToYYYMMDD_HH0000();
      const existingFileName1 = `jsc_${fileNameDateComponent}.log.gz`;
      const existingFileName2 = `jsc_${fileNameDateComponent}--1.log`;
      this.createFile(['logs', existingFileName1], 'Some compressed contents.');
      this.createFile(['logs', existingFileName2], 'A'.repeat(aboveThreshold));
      getCurrentLogFileName(this.getTestFilePath(['logs']), sizeThreshold)
        .then((fileName) =>
        {
          this.testPassed = (fileName === `jsc_${fileNameDateComponent}--2.log`);
          this.continueTesting();
        })
        .catch(() =>
        {
          this.testPassed = false;
          this.continueTesting();
        });

      this.waitForContinueTestingCall = true;
    }
  }
);

const test_012_013_getCurrentLogFileName_maxSuffixReached = Object.assign(testUtils.makeFromBaseTest('getCurrentLogFileName - Max suffix reached.'),
  {
    // only: true,
    onTestBeforeStart()
    {
      this.isUnitTest = true;
      this.doEmptyTestDirectory(['logs'], { preserveDirectory: true });
    },
    onUnitTestStarted()
    {
      const { jscLib: { getCurrentLogFileName, dateToYYYMMDD_HH0000 } } = this;
      const fileNameDateComponent = dateToYYYMMDD_HH0000();
      const sizeThreshold = 10;
      const aboveTheThreshold = sizeThreshold + 1;
      const contentsAboveTheThreshold = 'A'.repeat(aboveTheThreshold);
      this.createFile(['logs', `jsc_${fileNameDateComponent}.log`], contentsAboveTheThreshold);
      this.createFile(['logs', `jsc_${fileNameDateComponent}--1.log`], contentsAboveTheThreshold);
      this.createFile(['logs', `jsc_${fileNameDateComponent}--2.log`], contentsAboveTheThreshold);
      this.createFile(['logs', `jsc_${fileNameDateComponent}--3.log`], contentsAboveTheThreshold);
      getCurrentLogFileName(this.getTestFilePath(['logs']), sizeThreshold, 3)
        .then((fileName) =>
        {
          this.testFailMessage = `Got a valid file name ('${fileName}').  We should have never gotten one.`;
          this.testPassed = false;
          this.continueTesting();
        })
        .catch((rejectMsg) =>
        {
          this.testPassed = (rejectMsg === 'Too many segment files (>3)');
          this.continueTesting();
        });

      this.waitForContinueTestingCall = true;
    }
  }
);

module.exports = [
  test_012_001_getCurrentLogFileName_invalidLogDir_undefined,
  test_012_002_getCurrentLogFileName_invalidLogDir_nonString,
  test_012_003_getCurrentLogFileName_unreadableLogDir,
  test_012_004_getCurrentLogFileName_emptyLogDir,
  test_012_005_getCurrentLogFileName_existingLogFile_noSizeThreshold,
  test_012_006_getCurrentLogFileName_existingLogFile_withSizeThreshold,
  test_012_007_getCurrentLogFileName_existingLogFiles_withSizeThreshold_pt2,
  test_012_008_getCurrentLogFileName_existingGzFile,
  test_012_009_getCurrentLogFileName_existingGzFiles,
  test_012_010_getCurrentLogFileName_existingGzFileLogFile_noSizeThreshold,
  test_012_011_getCurrentLogFileName_existingGzFileLogFile_withBelowSizeThreshold,
  test_012_012_getCurrentLogFileName_existingGzFileLogFile_withAboveSizeThreshold,
  test_012_013_getCurrentLogFileName_maxSuffixReached
];
