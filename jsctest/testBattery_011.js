'use strict';

const testUtils = require('./testBatteryUtils');

const test_011_001_getCurrentLogFileName_invalidLogDir_undefined = Object.assign(testUtils.makeFromBaseTest('getCurrentLogFileName - Invalid log dir; undefined'),
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

const test_011_002_getCurrentLogFileName_invalidLogDir_nonString = Object.assign(testUtils.makeFromBaseTest('getCurrentLogFileName - Invalid log dir; non string'),
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

const test_011_003_getCurrentLogFileName_unreadableLogDir = Object.assign(testUtils.makeFromBaseTest('getCurrentLogFileName - Unreadable log dir'),
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


const test_011_004_getCurrentLogFileName_emptyLogDir = Object.assign(testUtils.makeFromBaseTest('getCurrentLogFileName - Empty log dir'),
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
          this.testPassed = (fileName === expectedFileName); //__RP SHOULD BE TRUE IF 
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

const test_011_005_getCurrentLogFileName_fileWithGZExtension = Object.assign(testUtils.makeFromBaseTest('getCurrentLogFileName - File with gz extension'),
  {
    // only: true,
    onTestBeforeStart()
    {
      this.isUnitTest = true;
    },
    onUnitTestStarted()
    {
      //__RP TO-DO: CREATE THE TEST.



      // const { jscLib: { getCurrentLogFileName, dateToYYYMMDD_HH0000 } } = this;
      // const expectedFileName = `jsc_${dateToYYYMMDD_HH0000()}.log`;
      // getCurrentLogFileName(this.getTestFilePath(['logs']), 0)
      //   .then((fileName) =>
      //   {
      //     this.testPassed = (fileName === expectedFileName); //__RP SHOULD BE TRUE IF 
      //     this.continueTesting();
      //   })
      //   .catch(() =>
      //   {
      //     this.testPassed = false;
      //     this.continueTesting();
      //   });

      // this.waitForContinueTestingCall = true;
    }
  }
);

module.exports = [
  test_011_001_getCurrentLogFileName_invalidLogDir_undefined,
  test_011_002_getCurrentLogFileName_invalidLogDir_nonString,
  test_011_003_getCurrentLogFileName_unreadableLogDir,
  test_011_004_getCurrentLogFileName_emptyLogDir,
  test_011_005_getCurrentLogFileName_fileWithGZExtension
];
