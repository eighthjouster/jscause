'use strict';

const start = (jscTestGlobal, onCompletionCb) =>
{
  const { jscLib } = jscTestGlobal;

  jscTestGlobal.snifferList =
  [
    [ 'error', 'Cannot find doesnotexist file.' ],
    [ 'error', 'Server not started.  No sites are running.' ]
  ];

  jscTestGlobal.snifferEndPhrases = [
    [ 'error', 'Server not started.  No sites are running.' ]
  ];

  jscTestGlobal.allMessagesSniffedOk = () =>
  {
    console.log('ALRIGHT, TEST PASSED!!!!!');//__RP
  };

  jscTestGlobal.allMessagesSniffedError = () =>
  {
    console.log('SHUCKS, TEST DID NOT PASS!!');//__RP
  };

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

  jscTestGlobal.serverStarted = () => {
    console.log('SERVER STARTED OK?! SUCKS! TEST DID NOT PASS!');//__RP
    jscLib.exitApplication({ onTerminateComplete: () => { invokeOnCompletion(onCompletion); } }); //__RP
  };

  console.log('Testing started.');
  const onCompletion = onCompletionCb;

  jscLib.startApplication('jscause.conf',
    {
      onServerStarted: jscTestGlobal.serverStarted,
      onServerError: () =>
      {
        console.log('EEEEEEEEEEEERROR!');//__RP
      }
    });//__RP

  //__RP invokeOnCompletion(onCompletion);
};

function invokeOnCompletion(onCompletion)
{
  if (typeof(onCompletion) === 'function')
  {
    onCompletion();
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

module.exports =
{
  start
};
