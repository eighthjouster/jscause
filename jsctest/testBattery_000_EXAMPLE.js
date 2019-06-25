const emptyDir =
{
  // only: true,
  testName: 'Empty app dir',
  expectedLogMessages:
  [
    [ 'error', 'Cannot find jscause.conf file.' ],
    [ 'error', 'Server not started.  No sites are running.' ]
  ],
  onTestBeforeStart()
  {
    // Here we set up the test.  Config files, sample files, etc.
    // In theory, the following function must be called right before
    // and right after all battery of tests are performed.
    // this.doEmptyTestDirectory();
  },
  onExpectedLogMessagesPass()
  {
    // We got all the sequence of log messages we were expecting.
    // It's generally a good thing.  But it will depened on the test.
    this.testPassed = true;
  },
  onServerStarted()
  {
    this.testPassed = false;
    this.terminateApplication(/* 'The server started okay.  It might be good or bad, depending on the test.' */);
  },
  onServerError()
  {
    // return 'The server emitted an error.  It might be good or bad, depending on the test.';
  },
  onUnitTestStarted()
  {
    // Called when this.isUnitTest is assigned a value of true - usually in onTestBeforeStart()
    // Here we can individually test application functions and set this.testPassed accordingly.
  },
  onBeforeTestEnd()
  {
    // Called just before checking whether the test passed or failed.
    // It's for last-minute checks.
    // For example, after the server has been terminated and all messages have been logged.
    // Happens after onExpectedLogMessagesPass(), onServerStarted(), onServerError()
    // this.testPassed = true;
  },
  onTestEnd()
  {
    // Here we tear down the test.  Config files, sample files, etc
    // that are no longer needed.
  }
};

// If there is only one test, then there will be no need to put it in an array.
module.exports = [ emptyDir ];
