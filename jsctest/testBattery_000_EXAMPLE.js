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
    // this.isRequestsTest = true; // Uncomment this is you're planning to use onReadyForRequests()
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
  onServerStartedOrError()
  {
    // Useful call for when dealing with more than one server and some cleanup needs to happen when all have been invoked.
    // Usually combined with this.numberOfServersInvokedSofar
  },
  onUnitTestStarted()
  {
    // Called when this.isUnitTest is assigned a value of true - usually in onTestBeforeStart()
    // Here we can individually test application functions and set this.testPassed accordingly.
  },
  onReadyForRequests()
  {
    // Called when this.isRequestsTest is set to true in onTestBeforeStart, when the server
    // has finished starting up, setting up all sites and is ready to take client requests.
    // You can use http.request() and/or https.request() here.
    // When you get a response and you're done with the request (either on a pass or fail capacity),
    // call this.doneRequestsTesting()
  },
  onAllRequestsEnded()
  {
    // Called when all requests and responses invoked in onReadyForRequests() have completed.
    // this.terminateApplication({ onComplete: this.waitForDoneSignal() });
    // waitForDoneSignal() is crucial above so that application terminates before we move on to the next test.
  },
  onBeforeTestEnd()
  {
    // Called just before checking whether the test passed or failed.
    // It's for last-minute checks.
    // For example, after the server has been terminated and all messages have been logged.
    // Happens after onExpectedLogMessagesPass(), onServerStarted(), onServerError()
    // this.testPassed = true;
    // Do not call functions here that may trigger signalTestEnd() (e.g. this.terminateApplication())
    // Do use this.waitForDoneSignal() here.
  },
  onTestEnd()
  {
    // Here we tear down the test.  Config files, sample files, etc
    // that are no longer needed.
  }
};

// If there is only one test, then there will be no need to put it in an array.
module.exports = [ emptyDir ];
