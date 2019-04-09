'use strict';

const thisTest =
{
  // only: true,
  testName: 'My test',
  configfile: '____DOESNOTEXIST____',
  expectedLogMessages:
  [
    [ 'error', 'Cannot find ____DOESNOTEXIST____ file.' ],
    [ 'error', 'Server not started.  No sites are running.' ]
  ],
  endOfExpectLogMessages:
  [
    [ 'error', 'Server not started.  No sites are running.' ]
  ],
  onTestBeforeStart()
  {
    // Here we set up the test.  Config files, sample files, etc.
    // Announcing that we are about to start this particular test might
    // help with debugging.
    //
    // console.log(`Starting: ${this.testName}`);
  },
  expectedLogMessagesPass()
  {
    // We got all the sequence of log messages we were expecting.
    // It's generally a good thing.  But it will depened on the test.
    this.testPassed = true;
  },
  expectedLogMessagesFail()
  {
    // We never got the sequence of log messages we were expecting.
    // It's generally a bad thing.  But it will depened on the test.
    this.testPassed = false;
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
  onTestEnd()
  {
    // Here we tear down the test.  Config files, sample files, etc
    // that are no longer needed.
    // Announcing that we are finishing this particular test might
    // help with debugging.
    //
    // console.log(`Finished: ${this.testName}`);
  }
};

// If there is only one test, then there will be no need to put it in an array.
module.exports = [ thisTest ];
