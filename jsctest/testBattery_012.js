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

const test_012_005_getCurrentLogFileName_fileWithLogExtension_noSizeThreshold = Object.assign(testUtils.makeFromBaseTest('getCurrentLogFileName - File with log extension, no size threshold'),
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

const test_012_006_getCurrentLogFileName_fileWithLogExtension_withSizeThreshold = Object.assign(testUtils.makeFromBaseTest('getCurrentLogFileName - File with log extension, with size threshold'),
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
      this.createFile(['logs', existingFileName], 'A'.repeat(aboveThreshold + 1));
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

const test_012_007_getCurrentLogFileName_fileWithLogExtension_withSizeThreshold_pt2 = Object.assign(testUtils.makeFromBaseTest('getCurrentLogFileName - File with log extension, with size threshold; part 2: existing suffix.'),
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
      this.createFile(['logs', existingFileName1], 'A'.repeat(aboveThreshold + 1));
      this.createFile(['logs', existingFileName2], 'A'.repeat(aboveThreshold + 1));
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

module.exports = [
  test_012_001_getCurrentLogFileName_invalidLogDir_undefined,
  test_012_002_getCurrentLogFileName_invalidLogDir_nonString,
  test_012_003_getCurrentLogFileName_unreadableLogDir,
  test_012_004_getCurrentLogFileName_emptyLogDir,
  test_012_005_getCurrentLogFileName_fileWithLogExtension_noSizeThreshold,
  test_012_006_getCurrentLogFileName_fileWithLogExtension_withSizeThreshold,
  test_012_007_getCurrentLogFileName_fileWithLogExtension_withSizeThreshold_pt2
];
