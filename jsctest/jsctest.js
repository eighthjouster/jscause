'use strict';

const allTests =
[
  'testBattery_001'
];

const start = (jscTestGlobal, onCompletionCb) =>
{
  jscTestGlobal.onCompletion = onCompletionCb;
  jscTestGlobal.totalTestsRun = 0;
  jscTestGlobal.totalTestsPassed = 0;
  jscTestGlobal.failedTestNames = [];
  jscTestGlobal.terminateApplication = terminateApplication.bind(jscTestGlobal);

  let testList = [];
  let onlyTestList = [];

  for (let i = 0; i < allTests.length; i++)
  {
    const currentName = allTests[i];
    let currentTest;
    try
    {
      currentTest = require(`./${currentName}`);
    }
    catch(e)
    {
      console.log(`Error when trying to load ${currentName}.`);
      console.log(e);
      testList = [];
      break;
    }

    if (Array.isArray(currentTest))
    {
      currentTest.forEach((thisTest) =>
      {
        if (thisTest.only)
        {
          onlyTestList.push(thisTest);
        }
        else
        {
          testList.push(thisTest);
        }
      });
    }
    else
    {
      if (currentTest.only)
      {
        onlyTestList.push(currentTest);
      }
      else
      {
        testList.push(currentTest);
      }
    }
  }

  if (onlyTestList.length)
  {
    console.log('\'only\' directive detected.  Only hand-picked tests will be performed.');
    testList = onlyTestList;
  }

  if (testList.length)
  {
    console.log('Testing started.');

    nextTest(jscTestGlobal, testList);
  }
  else
  {
    console.log('No testing was performed.');
  }
};

function finishedAllTesting(jscTestGlobal)
{
  console.log('*************************************************');
  console.log(`Total tests run: ${jscTestGlobal.totalTestsRun}`);
  console.log(`Total tests passed: ${jscTestGlobal.totalTestsPassed}`);
  if (jscTestGlobal.failedTestNames.length)
  {
    console.log('Failed tests:');
    jscTestGlobal.failedTestNames.forEach((name) =>
    {
      console.log(` - ${name}`);
    });
    console.log(`Total tests failed: ${jscTestGlobal.totalTestsRun - jscTestGlobal.totalTestsPassed}`);
  }
  else
  {
    console.log('All tests passed!');
  }
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
      jscTestGlobal.expectedLogMessagesPass && jscTestGlobal.expectedLogMessagesPass.bind(jscTestGlobal),
      jscTestGlobal.expectedLogMessagesFail && jscTestGlobal.expectedLogMessagesFail.bind(jscTestGlobal)
    );
  };

  const testPromise = new Promise((resolve) =>
  {
    jscTestGlobal.configfile = '';
    jscTestGlobal.onTestBeforeStart = undefined;
    jscTestGlobal.onTestEnd = undefined;
    Object.assign(jscTestGlobal, thisTest);
    jscTestGlobal.onTestBeforeStart && jscTestGlobal.onTestBeforeStart();

    jscTestGlobal.resolveIt = resolve;

    const originalOnServerError = jscTestGlobal.onServerError;
    jscTestGlobal.onServerError = () =>
    {
      resolve(originalOnServerError());
    };

    jscLib.startApplication((typeof(jscTestGlobal.configfile) !== 'undefined') ? jscTestGlobal.configfile : 'jscause.conf',
      {
        onServerStarted: jscTestGlobal.onServerStarted && jscTestGlobal.onServerStarted.bind(jscTestGlobal),
        onServerError: jscTestGlobal.onServerError && jscTestGlobal.onServerError.bind(jscTestGlobal)
      }
    );
  });

  testPromise
    .then((result) =>
    {
      result && console.log(result);
      if (jscTestGlobal.testPassed)
      {
        jscTestGlobal.totalTestsPassed++;
      }
      else
      {
        jscTestGlobal.failedTestNames.push(jscTestGlobal.testName);
      }

      jscTestGlobal.onTestEnd && jscTestGlobal.onTestEnd();
      nextTest(jscTestGlobal, list);
    })
    .catch((e) =>
    {
      console.log('CRITICAL: Test application bug found.  We should have never gotten here. Aborting.');
      console.log(e);
      jscTestGlobal.onTestEnd && jscTestGlobal.onTestEnd();
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

function checkExpectedLogMessages(type, message, logOptions, expectedLogMessages, endOfExpectLogMessages, expectedLogMessagesPass, expectedLogMessagesFail)
{
  if (expectedLogMessages.length)
  {
    const [ listType = '', listMessage = '' ] = expectedLogMessages[0];
    if ((type === listType) && (message === listMessage))
    {
      expectedLogMessages.shift();
  
      if (expectedLogMessages.length === 0)
      {
        expectedLogMessagesPass(this);
      }
    }
    else
    {
      for (let i = 0; i < endOfExpectLogMessages.length; i++)
      {
        const [ endType = '', endMessage = '' ] = endOfExpectLogMessages[i];
        if ((type === endType) && (message === endMessage))
        {
          expectedLogMessagesFail(this);
          break;
        }
      }
    }
  }
}

function terminateApplication(resolveMessage = '')
{
  const jscTestGlobal = this;
  const { jscLib } = jscTestGlobal;
  jscLib.exitApplication({ onTerminateComplete() { invokeOnCompletion(jscTestGlobal, resolveMessage); } });
}

module.exports =
{
  start
};
