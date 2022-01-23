'use strict';

const allTests =
[
  'testBattery_001',
  'testBattery_002',
  'testBattery_003',
  'testBattery_004',
  'testBattery_005',
  'testBattery_006',
  'testBattery_007',
  'testBattery_008',
  'testBattery_009',
  'testBattery_010',
  'testBattery_011',
  'testBattery_012',
  'testBattery_013',
  'testBattery_014',
  'testBattery_015',
  'testBattery_016',
  'testBattery_017',
  'testBattery_018',
  'testBattery_contents_01',
  'testBattery_contents_02',
  'testBattery_contents_03',
  'testBattery_contents_04',
  'testBattery_contents_05',
  'testBattery_contents_06',
  'testBattery_contents_07',
  'testBattery_contents_08',
  'testBattery_contents_09',
  'testBattery_contents_10',
  'testBattery_contents_11',
  'testBattery_contents_12',
  'testBattery_contents_13'
];

const fs = require('fs');
const fsPath = require('path');

const start = (jscTestGlobal, onCompletionCb) =>
{
  jscTestGlobal.onCompletion = onCompletionCb;
  jscTestGlobal.totalTestsRun = 0;
  jscTestGlobal.totalTestsPassed = 0;
  jscTestGlobal.maxUserFilesOrDirs = 0;
  jscTestGlobal.failedTestNames = [];
  jscTestGlobal.terminateApplication = terminateApplication.bind(jscTestGlobal);
  jscTestGlobal.doEmptyTestDirectory = doEmptyTestDirectory.bind(jscTestGlobal);
  jscTestGlobal.checkLogOutputWillOccur = checkLogOutputWillOccur.bind(jscTestGlobal);
  jscTestGlobal.doCreateDirectoryFromPathList = doCreateDirectoryFromPathList.bind(jscTestGlobal);
  jscTestGlobal.getTestFilePath = getTestFilePath.bind(jscTestGlobal);
  jscTestGlobal.doRemoveDirectoryFromPathList = doRemoveDirectoryFromPathList.bind(jscTestGlobal);
  jscTestGlobal.createFile = createFile.bind(jscTestGlobal);
  jscTestGlobal.deleteFile = deleteFile.bind(jscTestGlobal);
  jscTestGlobal.readFile = readFile.bind(jscTestGlobal);
  jscTestGlobal.fileExists = fileExists.bind(jscTestGlobal);
  jscTestGlobal.chmodFileOrDir = chmodFileOrDir.bind(jscTestGlobal);
  jscTestGlobal.createSymlink = createSymlink.bind(jscTestGlobal);
  jscTestGlobal.isDirectoryEmpty = isDirectoryEmpty.bind(jscTestGlobal);
  jscTestGlobal.signalTestEnd = signalTestEnd.bind(jscTestGlobal);
  jscTestGlobal.testList = [];
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
      console.error(`ERROR: Error when trying to load ${currentName}.`);
      console.error(e);
      jscTestGlobal.testList = [];
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
          jscTestGlobal.testList.push(thisTest);
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
        jscTestGlobal.testList.push(currentTest);
      }
    }
  }

  if (onlyTestList.length)
  {
    console.info('\'only\' directive detected.  Only hand-picked tests will be performed.');
    jscTestGlobal.testList = onlyTestList;
  }

  if (jscTestGlobal.testList.length)
  {
    console.info('Testing started.');

    nextTest(jscTestGlobal);
  }
  else
  {
    console.info('No testing was performed.');
  }
};

function finishedAllTesting(jscTestGlobal)
{
  console.info('*************************************************');
  console.info(`Total tests run: ${jscTestGlobal.totalTestsRun}`);
  console.info(`Total tests passed: ${jscTestGlobal.totalTestsPassed}`);
  if (jscTestGlobal.failedTestNames.length)
  {
    console.info('Failed tests:');
    jscTestGlobal.failedTestNames.forEach((name) =>
    {
      console.info(` - ${name}`);
    });
    console.info(`Total tests failed: ${jscTestGlobal.totalTestsRun - jscTestGlobal.totalTestsPassed}`);

    if (jscTestGlobal.failedTestNames.length > 200)
    {
      console.info('Too many tests failing with ECONNRESET without an apparent reason?');
      console.info(' - Make sure that no other process is using the same HTTP/S port as the test server (usually 3000.)');
    }
  }
  else
  {
    console.info('All tests passed!');
  }
  if (typeof(jscTestGlobal.onCompletion) === 'function')
  {
    jscTestGlobal.onCompletion();
  }
}

function callTestPhaseIfAvailable({ jscTestContext, testPhaseCallbackName, nextStepCall })
{
  const testPhaseCallback = jscTestContext[testPhaseCallbackName];

  if (testPhaseCallback)
  {
    jscTestContext.doneRequestsTesting = undefined;

    jscTestContext.testNextAvailableStepCall = nextStepCall;
    if ((testPhaseCallbackName === 'onReadyForRequests') && jscTestContext.isRequestsTest)
    {
      jscTestContext.doneRequestsTesting = jscTestContext.waitForDoneSignal( // This can only be used within onReadyForRequests().
        () => {
          console.info('onReadyForRequests: this.doneRequestsTesting() invoked!  Moving on.');
        });
      console.info('onReadyForRequests: Waiting for this.doneRequestsTesting() invocation...');
    }
    jscTestContext.currentTestPhaseName = testPhaseCallbackName;
    try {
      testPhaseCallback.call(jscTestContext);
    }
    catch(e)
    {
      console.error(`CRITICAL: Error found in ${jscTestContext.currentTestPhaseName}()`);
      console.error(e);
      if (jscTestContext.stepCallToTriggerOnDone)
      {
        jscTestContext.stepCallToTriggerOnDone = undefined;
      }
    }
    jscTestContext.testNextAvailableStepCall = undefined;

    if (!jscTestContext.stepCallToTriggerOnDone)
    {
      jscTestContext.currentTestPhaseName = '';
      nextStepCall && nextStepCall.call(jscTestContext);
    }
  }
  else
  {
    nextStepCall && nextStepCall.call(jscTestContext);
  }
}

function createNewTestPromise(jscTestContext, currentTest)
{
  return (resolve) =>
  {
    jscTestContext.maxFilesOrDirInDirectory = undefined;
    jscTestContext.testNextAvailableStepCall = undefined;
    jscTestContext.stepCallToTriggerOnDone = undefined;
    jscTestContext.currentTestPhaseName = '';
    jscTestContext.isUnitTest = false;
    jscTestContext.isRequestsTest = false;
    jscTestContext.maxTerminateRetries = undefined;
    jscTestContext.rootDir = fsPath.join('.', 'jsctest', 'testrootdir');
    jscTestContext.testPassed = false;
    jscTestContext.gotAllExpectedLogMsgs = false;
    jscTestContext.gotWarningMessages = false;
    jscTestContext.gotErrorMessages = false;
    jscTestContext.numberOfServersInvokedSofar = 0;
    jscTestContext.serverDidStart = false;
    jscTestContext.serverDidTerminate = false;
    jscTestContext.logOutputToConsoleOccurred = false;
    jscTestContext.logOutputToServerDirOccurred = false;
    jscTestContext.logOutputToSiteDirOccurred = false;
    jscTestContext.pendingCallbacks = 0;
    jscTestContext.isWaitingForLogTermination = false;
    jscTestContext.signalTestEndInvoked = false;
    jscTestContext.waitForContinueTestingCall = false;
    jscTestContext.waitForContinueTestingCallPasses = 0;
    jscTestContext.waitForContinueTestingCallMaxPasses = 60;
    jscTestContext.waitForContinueTestingCallHandlerId = undefined;
    jscTestContext.tempTestData = undefined;
    jscTestContext.functionCallListeners = {};
    jscTestContext.runtimeExceptionRaised = false;
    jscTestContext.contentReqExpectedSiteResponded = undefined;
    Object.assign(jscTestContext, currentTest);
    console.info(`####### Starting test: ${jscTestContext.testName}`);

    callTestPhaseIfAvailable(
      {
        jscTestContext,
        testPhaseCallbackName: 'onTestBeforeStart',
        nextStepCall: () => { jscTestContext.testPromiseAtStart(resolve); }
      }
    );
  }
}

function nextTest(jscTestGlobal)
{
  jscTestGlobal.testName = `<NOT SET #${jscTestGlobal.totalTestsRun}>`;
  // Reset to default.
  jscTestGlobal.maxUserFilesOrDirs = 0;
  const thisTest = jscTestGlobal.testList.shift();

  if (!thisTest)
  {
    finishedAllTesting(jscTestGlobal);
    return;
  }

  jscTestGlobal.totalTestsRun++;

  jscTestGlobal.checkIfSpecificLogMessagesFound = (type, message) =>
  {
    checkForSpecificLogMessages(type, message, jscTestGlobal);
  };

  jscTestGlobal.checkIfExpectedLogMessagesPass = (type, message) =>
  {
    checkExpectedLogMessages(type, message, jscTestGlobal);

    if (type === 'warning')
    {
      jscTestGlobal.gotWarningMessages = true;
    }
    else if (type === 'error')
    {
      jscTestGlobal.gotErrorMessages = true;
    }
  };

  jscTestGlobal.areCallbacksStillPending = () =>
  {
    return (jscTestGlobal.pendingCallbacks > 0);
  }

  jscTestGlobal.callbackCalled = (options) =>
  {
    const { isThenOrCatch = false } = options || {};
    jscTestGlobal.pendingCallbacks -= (isThenOrCatch) ? 2 : 1;
  };

  jscTestGlobal.waitForDoneSignal = (callbackOnDone) =>
  {
    if (jscTestGlobal.stepCallToTriggerOnDone)
    {
      console.error('CRITICAL: Test application bug found.  waitForDoneSignal() called in wrong place, or more than once in the same phase callback function.  This is not allowed.');
      console.error(`Current test phase: ${jscTestGlobal.currentTestPhaseName || '<unknown>'}`);
      console.error('If the above phase is onReadyForRequests and there is none in the file it is in, it is possible that isRequestsTest is erroneously set to true elsewhere.');
      console.error('If the above phase has one call only, chances are the offending call is in a previous, non-allowed phase.');
      console.error('Cannot continue due to critical error found.');
      process.exit();
    }
    else
    {
      jscTestGlobal.stepCallToTriggerOnDone = jscTestGlobal.testNextAvailableStepCall;
      return jscTestGlobal.makeSendDoneSignal(callbackOnDone);
    }
  };
  
  jscTestGlobal.makeSendDoneSignal = (callbackOnDone) => {
    return () => {
      callbackOnDone && callbackOnDone.call(jscTestGlobal);
      if (jscTestGlobal.stepCallToTriggerOnDone)
      {
        jscTestGlobal.currentTestPhaseName = '';
        jscTestGlobal.testNextAvailableStepCall = undefined;
        const triggerOnDoneCb = jscTestGlobal.stepCallToTriggerOnDone;
        jscTestGlobal.stepCallToTriggerOnDone = undefined; // Need to undefine before calling because checking for undefined might occur even during its call.
        triggerOnDoneCb.call(jscTestGlobal);
      }
      else
      {
        console.error('CRITICAL: Test application bug found.  We received a Done signal with no next step callback.');
        console.error(`Current test phase: ${jscTestGlobal.currentTestPhaseName || '<unknown>'}`);
        throw new Error('Cannot continue due to critical error found.');
      }
    };
  };

  jscTestGlobal.testPromiseAtStart = (resolve) =>
  {
    const { jscLib } = jscTestGlobal;
    jscTestGlobal.resolveIt = resolve;
  
    if (jscTestGlobal.isUnitTest)
    {
      jscTestGlobal.resolveIt();
    }
    else
    {
      const originalOnServerStartedOrError = jscTestGlobal.onServerStartedOrError;
      jscTestGlobal.onServerStartedOrError = () =>
      {
        jscTestGlobal.numberOfServersInvokedSofar++;
        originalOnServerStartedOrError.call(jscTestGlobal)
      };
  
      const originalOnServerError = jscTestGlobal.onServerError;
      jscTestGlobal.onServerError = (errorMessage) =>
      {
        resolve(originalOnServerError.call(jscTestGlobal, errorMessage));
        if (typeof(jscTestGlobal.onServerStartedOrError) === 'function')
        {
          jscTestGlobal.onServerStartedOrError.call(jscTestGlobal);
        }
      };
  
      jscLib.startApplication(
        {
          onServerStarted: () =>
          {
            jscTestGlobal.serverDidStart = true;
            jscTestGlobal.onServerStarted.call(jscTestGlobal);
          },
          onServerError: jscTestGlobal.onServerError.bind(jscTestGlobal),
          onServerStartedOrError: jscTestGlobal.onServerStartedOrError.bind(jscTestGlobal),
          rootDir: jscTestGlobal.rootDir
        }
      );
    }
  }

  const testPromise = new Promise(createNewTestPromise(jscTestGlobal, thisTest));

  testPromise
    .then((result) =>
    {
      result && console.info(result);

      checkForShouldSignalTestEnd(jscTestGlobal);
    })
    .catch((e) =>
    {
      console.error('CRITICAL: Test application bug found.  We should have never gotten here. Aborting.');
      console.error(e);
      console.info(`####### Finished test: ${jscTestGlobal.testName}`);

      callTestPhaseIfAvailable(
        {
          jscTestContext: jscTestGlobal,
          testPhaseCallbackName: 'onTestEnd',
          nextStepCall: () => {}
        }
      );
    });
}

function stillWaitingForContinueTestingCall(jscTestGlobal)
{
  console.info('Waiting for continue testing signal...');
  if (++jscTestGlobal.waitForContinueTestingCallPasses >= jscTestGlobal.waitForContinueTestingCallMaxPasses)
  {
    console.error(`Wait for continue testing call reached the maximum of ${jscTestGlobal.waitForContinueTestingCallMaxPasses} passes.`);
    jscTestGlobal.testPassed = false;
    console.error('On to failing this test and ending it...');
    jscTestGlobal.continueTesting();
  }
}

function checkForShouldSignalTestEnd(jscTestGlobal)
{
  if (jscTestGlobal.areCallbacksStillPending())
  {
    setTimeout(() => { checkForShouldSignalTestEnd(jscTestGlobal); }, 500);
  }
  else
  {
    signalTestEnd(jscTestGlobal);
  }
};

function signalTestEnd(jscTestGlobal, { followUpCall = false, generalError = false, error = undefined } = {})
{
  if (generalError)
  {
    console.error('CRITICAL: A general, unexpected error within JSCause was found during testing.');
    console.error(error);
  }

  if (jscTestGlobal.signalTestEndInvoked && !followUpCall && !generalError)
  {
    return;
  }

  jscTestGlobal.signalTestEndInvoked = true;

  if (jscTestGlobal.isWaitingForLogTermination)
  {
    setTimeout(() => { signalTestEnd(jscTestGlobal, { followUpCall: true }) }, 0);
  }
  else
  {
    jscTestGlobal.continueTesting = () =>
    {
      jscTestGlobal.waitForContinueTestingCall = false;
      if (jscTestGlobal.waitForContinueTestingCallHandlerId)
      {
        clearInterval(jscTestGlobal.waitForContinueTestingCallHandlerId);
        jscTestGlobal.waitForContinueTestingCallHandlerId = null;
      }
      endTest(jscTestGlobal);
    };

    const onAllRequestsEndedCall = () =>
    {
      callTestPhaseIfAvailable(
        {
          jscTestContext: jscTestGlobal,
          testPhaseCallbackName: 'onAllRequestsEnded',
          nextStepCall: onBeforeEndTestCall
        }
      );
    };

    const onReadyForRequestsCall = () =>
    {
      callTestPhaseIfAvailable(
        {
          jscTestContext: jscTestGlobal,
          testPhaseCallbackName: 'onReadyForRequests',
          nextStepCall: onAllRequestsEndedCall
        }
      );
    };

    const onBeforeEndTestCall = () =>
    {
      if (!jscTestGlobal.serverDidTerminate && jscTestGlobal.serverDidStart)
      {
        console.warn('WARNING: The server did not terminate by the time all testing was completed.');
      }

      callTestPhaseIfAvailable(
        {
          jscTestContext: jscTestGlobal,
          testPhaseCallbackName: 'onBeforeTestEnd',
          nextStepCall: () =>
          {
            wrapUpSignalTestEnd(jscTestGlobal);
          }
        }
      );
    };

    if (jscTestGlobal.isUnitTest)
    {
      callTestPhaseIfAvailable(
        {
          jscTestContext: jscTestGlobal,
          testPhaseCallbackName: 'onUnitTestStarted',
          nextStepCall: onBeforeEndTestCall
        }
      );
    }
    else if (jscTestGlobal.currentTestPhaseName === 'onAllRequestsEnded')
    {
      onBeforeEndTestCall();
    }
    else
    {
      onReadyForRequestsCall();
    }
  }
}

function wrapUpSignalTestEnd(jscTestContext)
{
  if (jscTestContext.waitForContinueTestingCall)
  {
    jscTestContext.waitForContinueTestingCallHandlerId = setInterval(() => { stillWaitingForContinueTestingCall(jscTestContext) }, 1000);
  }
  else
  {
    jscTestContext.continueTesting();
  }
}

function endTest(jscTestGlobal)
{
  if (jscTestGlobal.testPassed)
  {
    jscTestGlobal.totalTestsPassed++;
  }
  else
  {
    if (jscTestGlobal.testFailMessage)
    {
      console.error('Test failed:');
      console.error(jscTestGlobal.testFailMessage);
    }
    jscTestGlobal.failedTestNames.push(jscTestGlobal.testName);
  }
  console.info(`####### Finished test: ${jscTestGlobal.testName}`);

  callTestPhaseIfAvailable(
    {
      jscTestContext: jscTestGlobal,
      testPhaseCallbackName: 'onTestEnd',
      nextStepCall: () => { 
        nextTest(jscTestGlobal);
      }
    }
  );
}

function invokeOnCompletion(jscTestGlobal, resolveMessage)
{
  const { resolveIt } = jscTestGlobal;

  if (typeof(resolveIt) === 'function')
  {
    resolveIt(resolveMessage);
  }
}

function checkLogOutputWillOccur(logOptions)
{
  const { toConsole = false, toServerDir = null, toSiteDir = null } = logOptions;
  this.logOutputToConsoleOccurred = this.logOutputToConsoleOccurred || toConsole;
  this.logOutputToServerDirOccurred = this.logOutputToServerDirOccurred || !!toServerDir;
  this.logOutputToSiteDirOccurred = this.logOutputToSiteDirOccurred || !!toSiteDir;
}

function checkExpectedLogMessages(type, message, jscTestContext)
{
  const { expectedLogMessages } = jscTestContext;
  if (expectedLogMessages && expectedLogMessages.length)
  {
    const [ listType = '', listMessage = '', listMessageType = '' ] = expectedLogMessages[0];
    if ((type === listType) &&
        ((message === listMessage) ||
        ((listMessageType === 'prefix') && message.startsWith(listMessage)) ||
        ((listMessageType === 'suffix') && message.endsWith(listMessage))
        ))
    {
      expectedLogMessages.shift();
  
      if (expectedLogMessages.length === 0)
      {
        jscTestContext.gotAllExpectedLogMsgs = true;
        jscTestContext.onExpectedLogMessagesPass.call(jscTestContext);
      }
    }
  }
}

function checkForSpecificLogMessages(type, message, jscTestContext)
{
  const { monitoredLogMessages } = jscTestContext;
  if (monitoredLogMessages && monitoredLogMessages.length)
  {
    for (let i = 0; i < monitoredLogMessages.length; i++)
    {
      if (typeof(monitoredLogMessages[i]) === 'undefined')
      {
        continue;
      }
      const [ listType = '', listMessage = '', listMessageType = '' ] = monitoredLogMessages[i];
      if ((type === listType) &&
          ((message === listMessage) ||
          ((listMessageType === 'prefix') && message.startsWith(listMessage)) ||
          ((listMessageType === 'suffix') && message.endsWith(listMessage))
          ))
      {
        monitoredLogMessages[i] = undefined;
        jscTestContext.onMonitoredLogMessageFound.call(jscTestContext);
        break;
      }
    }
  }
}

function terminateApplication({resolveMessage = '', onComplete} = {})
{
  const jscTestGlobal = this;
  const { jscLib } = jscTestGlobal;
  jscLib.exitApplication(
    {
      onTerminateComplete(terminateMessage)
      {
        invokeOnCompletion(jscTestGlobal, resolveMessage);
        if (!jscTestGlobal.serverDidStart)
        {
          console.warn('\nWARNING!  The server never started (already running in a different process?)');
        }
        onComplete && onComplete(terminateMessage);
      }
    });
}

function getTestFilePath(dirPathList, callerName, { errorMessage, unrestrictedPath } = {})
{
  const dirPath = (unrestrictedPath) ?
    fsPath.join.apply(null, dirPathList) :
    fsPath.join.apply(null, [this.rootDir].concat(dirPathList));
  if (dirPath)
  {
    if ((dirPath.indexOf(fsPath.join('.', 'jsctest', 'testrootdir')) === 0) || unrestrictedPath)
    {
      return dirPath;
    }
    else
    {
      console.error(`CRITICAL: ${callerName}(): Not sure if we are inside the testrootdir sandbox directory.  Stopping.`);
    }
  }
  else
  {
    console.error(`CRITICAL: ${callerName}(): ${errorMessage || 'No path specified'}`);
  }

  return null;
}

function createFile(dirPathList, contents)
{
  const filePath = this.getTestFilePath(dirPathList, 'createFile', { errorMessage: 'No file path specified for creation' });
  if (filePath)
  {
    fs.writeFileSync(filePath, contents);
  }
}

function deleteFile(dirPathList)
{
  const filePath = this.getTestFilePath(dirPathList, 'deleteFile', { errorMessage: 'No file path specified for deletion' });
  let results = false;

  if (filePath && fs.existsSync(filePath))
  {
    fs.unlinkSync(filePath);
    results = true;
  }

  return results;
}

function readFile(dirPathList)
{
  const filePath = this.getTestFilePath(dirPathList, 'readFile', { errorMessage: 'No file path specified for reading' });
  if (filePath && fs.existsSync(filePath))
  {
    return fs.readFileSync(filePath);
  }

  console.error(`ERROR: ${filePath} does not exist.`);
  return null;
}

function fileExists(dirPathList)
{
  const filePath = this.getTestFilePath(dirPathList, 'fileExists', { errorMessage: 'No file path specified for checking file existence' });
  return (filePath && fs.existsSync(filePath));
}

function chmodFileOrDir(dirPathList, permissionInOctal)
{
  const fileOrDirPath = this.getTestFilePath(dirPathList, 'chmodFileOrDir', { errorMessage: 'No file path specified for chmod' });
  if (fileOrDirPath)
  {
    fs.chmodSync(fileOrDirPath, permissionInOctal);
  }
}

function createSymlink(unresTrictedTargetPathList, symlinkPathList)
{
  const targetFilePath = this.getTestFilePath(unresTrictedTargetPathList, 'createSymlink', { errorMessage: 'No file path specified for target', unrestrictedPath: true });
  const symlinkFilePath = this.getTestFilePath(symlinkPathList, 'createSymlink', { errorMessage: 'No file path specified for symlink' });
  if (targetFilePath && symlinkFilePath)
  {
    fs.symlinkSync(targetFilePath, symlinkFilePath);
  }
}

function doEmptyTestDirectory(dirPathList = [], { preserveDirectory = false } = {})
{
  const rootDir = this.rootDir;
  const dirPath = this.getTestFilePath(dirPathList, 'doEmptyTestDirectory', { errorMessage: 'No directory specified for deletion' });

  if (dirPath && fs.existsSync(dirPath))
  {
    fs.readdirSync(dirPath).forEach(function(entry)
    {
      const entry_path = fsPath.join(dirPath, entry);
      if (fs.lstatSync(entry_path).isDirectory())
      {
        doEmptyTestDirectory.call(this, dirPathList.concat(entry));
      }
      else
      {
        if ((dirPath !== rootDir) || (entry !== 'readme.txt'))
        {
          fs.unlinkSync(entry_path);
        }
      }
    }.bind(this));
    if ((dirPath !== rootDir) && !preserveDirectory)
    {
      fs.rmdirSync(dirPath);
    }
  }
}

function isDirectoryEmpty(dirPathList = [])
{
  const dirPath = this.getTestFilePath(dirPathList, 'doEmptyTestDirectory', { errorMessage: 'No directory specified for checking' });

  if (dirPath)
  {
    if (fs.existsSync(dirPath))
    {
      return (fs.readdirSync(dirPath).length === 0);
    }
    else
    {
      console.error('CRITICAL: isDirectoryEmpty(): Directory does not exist');
    }
  }

  return null;
}

function doCreateDirectoryFromPathList(dirPathList)
{
  const rootDir = this.rootDir;
  const dirPath = fsPath.join.apply(null, [rootDir].concat(dirPathList));
  if (!dirPath)
  {
    console.error('CRITICAL: doCreateDirectoryFromPathList(): No directory specified for creation');
    return;
  }

  if (dirPath.indexOf(fsPath.join('.', 'jsctest', 'testrootdir')) !== 0)
  {
    console.error('CRITICAL: doCreateDirectoryFromPathList(): Not sure if we are inside the testrootdir sandbox directory.  Stopping.');
    return;
  }

  fs.mkdirSync(dirPath);
}

function doRemoveDirectoryFromPathList(dirPathList, { ignoreIfMissing = false } = {})
{
  const dirPath = this.getTestFilePath(dirPathList, 'doRemoveDirectoryFromPathList', { errorMessage: 'No directory specified for removal' });
  if (dirPath)
  {
    let dirPathExists = true;
    try
    {
      fs.statSync(dirPath);
    }
    catch (e)
    {
      dirPathExists = false;
      if (!ignoreIfMissing)
      {
        console.error(`CRITICAL: doRemoveDirectoryFromPathList(): Could not delete directory: ${dirPath}`);
        console.error(e);
      }
    }

    if (dirPathExists)
    {
      fs.rmdirSync(dirPath);
    }
  }
}

module.exports =
{
  start
};
