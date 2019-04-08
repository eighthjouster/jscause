'use strict';

const start = (jscTestGlobal, onCompletionCb) =>
{
  jscTestGlobal.onCompletion = onCompletionCb;
  jscTestGlobal.totalTestsRun = 0;
  jscTestGlobal.totalTestsPassed = 0;
  jscTestGlobal.failedTestNames = [];

  const testList = [ test1 ];
  
  console.log('Testing started.');

  nextTest(jscTestGlobal, testList);
};

function finishedAllTesting(jscTestGlobal)
{
  console.log('WE HAVE FINISHED ALL TESTING!');//__RP
  console.log(jscTestGlobal);//__RP
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
  jscTestGlobal.testSniffer = (type, message, logOptions) =>
  {
    testSniffer(
      type,
      message,
      logOptions,
      jscTestGlobal.snifferList,
      jscTestGlobal.snifferEndPhrases,
      jscTestGlobal.allMessagesSniffedOk,
      jscTestGlobal.allMessagesSniffedError
    );
  };

  const testPromise = new Promise((resolve) =>
  {
    thisTest(jscTestGlobal);

    jscTestGlobal.resolveIt = resolve;

    const originalOnServerError = jscTestGlobal.onServerError;
    jscTestGlobal.onServerError = () =>
    {
      resolve(originalOnServerError());
    };

    jscLib.startApplication('____DOESNOTEXIST____',
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

      nextTest(jscTestGlobal, list);
    })
    .catch((e) =>
    {
      console.log('SOMETHING WRONG HAPPENED. WE SHOULD HAVE NEVER GOTTEN HERE!');//__RP
      console.log(e);

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

function testSniffer(type, message, logOptions, snifferList, snifferEndPhrases, allMessagesSniffedOk, allMessagesSniffedError) //__RP will logOptions ever be used here?
{
  if (snifferList.length)
  {
    const [ listType = '', listMessage = '' ] = snifferList[0];
    if ((type === listType) && (message === listMessage))
    {
      snifferList.shift();
  
      if (snifferList.length === 0)
      {
        allMessagesSniffedOk();
      }
    }
    else
    {
      for (let i = 0; i < snifferEndPhrases.length; i++)
      {
        const [ endType = '', endMessage = '' ] = snifferEndPhrases[i];
        if ((type === endType) && (message === endMessage))
        {
          allMessagesSniffedError();
          break;
        }
      }
    }
  }
}

function terminateApplication(jscTestGlobal, resolveMessage = '')
{
  const { jscLib } = jscTestGlobal;
  jscLib.exitApplication({ onTerminateComplete: () => { invokeOnCompletion(jscTestGlobal, resolveMessage); } }); //__RP
}

function test1(jscTestGlobal)
{
  jscTestGlobal.testName = 'My test';
  jscTestGlobal.snifferList =
  [
    [ 'error', 'Cannot find ____DOESNOTEXIST____ file.' ],
    [ 'error', 'Server not started.  No sites are running.' ]
  ];

  jscTestGlobal.snifferEndPhrases = [
    [ 'error', 'Server not started.  No sites are running.' ]
  ];

  jscTestGlobal.allMessagesSniffedOk = () =>
  {
    console.log('ALRIGHT, TEST PASSED!!!!!');//__RP
    jscTestGlobal.testPassed = true;
  };

  jscTestGlobal.allMessagesSniffedError = () =>
  {
    console.log('SHUCKS, TEST DID NOT PASS!!');//__RP
    jscTestGlobal.testPassed = false;
  };

  jscTestGlobal.onServerStarted = () =>
  {
    console.log('SERVER STARTED OK?! SHUCKS! TEST DID NOT PASS!');//__RP

    jscTestGlobal.testPassed = false;
    terminateApplication(jscTestGlobal, 'The server started okay.  Do we ever get here? Yes we do.');
  };

  jscTestGlobal.onServerError = () =>
  {
    console.log('EEEEEEEEEEEERROR!');//__RP
    return 'The server emitted an error.  Might be good or bad.';//__RP
  };
}

module.exports =
{
  start
};
