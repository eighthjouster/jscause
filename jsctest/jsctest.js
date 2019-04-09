'use strict';

const start = (jscTestGlobal, onCompletionCb) =>
{
  jscTestGlobal.onCompletion = onCompletionCb;
  jscTestGlobal.totalTestsRun = 0;
  jscTestGlobal.totalTestsPassed = 0;
  jscTestGlobal.failedTestNames = [];

  const testList = [
    test1
  ];
  
  console.log('Testing started.');

  nextTest(jscTestGlobal, testList);
};

function finishedAllTesting(jscTestGlobal)
{
  console.log('WE HAVE FINISHED ALL TESTING!');
  console.log(`Total tests run: ${jscTestGlobal.totalTestsRun}`);
  console.log(`Total tests passed: ${jscTestGlobal.totalTestsPassed}`);
  console.log(`Failed tests: ${(jscTestGlobal.failedTestNames.length && jscTestGlobal.failedTestNames || [ 'None.  All tests passed.' ]).join(', ')}`);//__RP
  if (typeof(jscTestGlobal.onCompletion) === 'function')
  {
    jscTestGlobal.onCompletion();
  }
}

function nextTest(jscTestGlobal, list)
{
  const { jscLib } = jscTestGlobal;
  jscTestGlobal.testName = `<NOT SET #${jscTestGlobal.totalTestsRun}>`;
  const thisTest = list.shift();

  if (!thisTest)
  {
    finishedAllTesting(jscTestGlobal);
    return;
  }

  jscTestGlobal.totalTestsRun++;
  jscTestGlobal.checkExpectedLogMessages = (type, message, logOptions) =>
  {
    checkExpectedLogMessages(
      type,
      message,
      logOptions,
      jscTestGlobal.expectedLogMessages,
      jscTestGlobal.endOfExpectLogMessages,
      jscTestGlobal.expectedLogMessagesPass,
      jscTestGlobal.expectedLogMessagesFail
    );
  };

  const testPromise = new Promise((resolve) =>
  {
    jscTestGlobal.configfile = '';
    jscTestGlobal.onTestBeforeStart = undefined;
    jscTestGlobal.onTestEnd = undefined;
    thisTest(jscTestGlobal);
    jscTestGlobal.onTestBeforeStart && jscTestGlobal.onTestBeforeStart();


    jscTestGlobal.resolveIt = resolve;

    const originalOnServerError = jscTestGlobal.onServerError;
    jscTestGlobal.onServerError = () =>
    {
      resolve(originalOnServerError());
    };

    jscLib.startApplication((typeof(jscTestGlobal.configfile) !== 'undefined') ? jscTestGlobal.configfile : 'jscause.conf',
      {
        onServerStarted: jscTestGlobal.onServerStarted,
        onServerError: jscTestGlobal.onServerError
      }
    );//__RP
  });

  testPromise
    .then((result) =>
    {
      console.log('DONE WITH THE TEST. DID IT PASS?');//__RP
      console.log(jscTestGlobal.testPassed);//__RP
      if (jscTestGlobal.testPassed)
      {
        jscTestGlobal.totalTestsPassed++;
      }
      else
      {
        jscTestGlobal.failedTestNames.push(jscTestGlobal.testName);
      }
      console.log(result);//__RP

      jscTestGlobal.onTestEnd && jscTestGlobal.onTestEnd();
      nextTest(jscTestGlobal, list);
    })
    .catch((e) =>
    {
      console.log('SOMETHING WRONG HAPPENED. WE SHOULD HAVE NEVER GOTTEN HERE!');//__RP
      console.log(e);

      jscTestGlobal.onTestEnd && jscTestGlobal.onTestEnd();
      nextTest(jscTestGlobal, list);
    });
}

function invokeOnCompletion(jscTestGlobal, resolveMessage)
{
  const { resolveIt } = jscTestGlobal;

  if (typeof(resolveIt) === 'function')
  {
    resolveIt(resolveMessage);
  }
}

function checkExpectedLogMessages(type, message, logOptions, expectedLogMessages, endOfExpectLogMessages, expectedLogMessagesPass, expectedLogMessagesFail) //__RP will logOptions ever be used here?
{
  if (expectedLogMessages.length)
  {
    const [ listType = '', listMessage = '' ] = expectedLogMessages[0];
    if ((type === listType) && (message === listMessage))
    {
      expectedLogMessages.shift();
  
      if (expectedLogMessages.length === 0)
      {
        expectedLogMessagesPass();
      }
    }
    else
    {
      for (let i = 0; i < endOfExpectLogMessages.length; i++)
      {
        const [ endType = '', endMessage = '' ] = endOfExpectLogMessages[i];
        if ((type === endType) && (message === endMessage))
        {
          expectedLogMessagesFail();
          break;
        }
      }
    }
  }
}

function terminateApplication(jscTestGlobal, resolveMessage = '')
{
  const { jscLib } = jscTestGlobal;
  jscLib.exitApplication({ onTerminateComplete() { invokeOnCompletion(jscTestGlobal, resolveMessage); } }); //__RP
}

function test1(jscTestGlobal)
{
  const currentTest =
  {
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
      console.log('STARTING TEST 1!!');//__RP
    },
    expectedLogMessagesPass()
    {
      console.log('ALRIGHT, TEST PASSED!!!!!');//__RP
      jscTestGlobal.testPassed = true;
    },
    expectedLogMessagesFail()
    {
      console.log('SHUCKS, TEST DID NOT PASS!!');//__RP
      jscTestGlobal.testPassed = false;
    },
    onServerStarted()
    {
      console.log('SERVER STARTED OK?! SHUCKS! TEST DID NOT PASS!');//__RP
  
      jscTestGlobal.testPassed = false;
      terminateApplication(jscTestGlobal, 'The server started okay.  Do we ever get here? Yes we do.');
    },
    onServerError()
    {
      console.log('EEEEEEEEEEEERROR!');//__RP
      return 'The server emitted an error.  Might be good or bad.';//__RP
    },
    onTestEnd()
    {
      console.log('TEST 1 COMPLETED.  NOTHING TO TEAR DOWN, I THINK.');//__RP
    }
  };

  Object.assign(jscTestGlobal, currentTest);
}

module.exports =
{
  start
};
