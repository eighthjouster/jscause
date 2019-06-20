'use strict';

const testUtils = require('./testBatteryUtils');

const test_011_001_dateToYYYMMDD_HH0000_noSuffix = Object.assign(testUtils.makeFromBaseTest('dateToYYYMMDD_HH0000 - No suffix'),
  {
    // only: true,
    onTestBeforeStart()
    {
      this.isUnitTest = true;
    },
    onUnitTestStarted()
    {
      const { jscLib: { dateToYYYMMDD_HH0000 } } = this;
      const testDate = new Date('2000-11-22 07:00');
      this.testPassed = dateToYYYMMDD_HH0000({ date: testDate }) === '2000-11-22_07-00-00-0';
    }
  }
);

const test_011_002_dateToYYYMMDD_HH0000_withSuffix = Object.assign(testUtils.makeFromBaseTest('dateToYYYMMDD_HH0000 - With suffix'),
  {
    // only: true,
    onTestBeforeStart()
    {
      this.isUnitTest = true;
    },
    onUnitTestStarted()
    {
      const { jscLib: { dateToYYYMMDD_HH0000 } } = this;
      const testDate = new Date('2000-11-22 07:00');
      const randomSuffix = Math.floor(Math.random() * 100) + 1;
      this.testPassed = dateToYYYMMDD_HH0000({ date: testDate, suffix: randomSuffix }) === `2000-11-22_07-00-00-0--${randomSuffix}`;
    }
  }
);

module.exports = [
  test_011_001_dateToYYYMMDD_HH0000_noSuffix,
  test_011_002_dateToYYYMMDD_HH0000_withSuffix
];
