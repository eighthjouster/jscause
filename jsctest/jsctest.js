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
  'testBattery_011'
];

const fs = require('fs');
const fsPath = require('path');

const start = (jscTestGlobal, onCompletionCb) =>
{
  jscTestGlobal.onCompletion = onCompletionCb;
  jscTestGlobal.totalTestsRun = 0;
  jscTestGlobal.totalTestsPassed = 0;
  jscTestGlobal.failedTestNames = [];
  jscTestGlobal.terminateApplication = terminateApplication.bind(jscTestGlobal);
  jscTestGlobal.doEmptyTestDirectory = doEmptyTestDirectory.bind(jscTestGlobal);
  jscTestGlobal.checkLogOutputWillOccur = checkLogOutputWillOccur.bind(jscTestGlobal);
  jscTestGlobal.doCreateDirectoryFromPathList = doCreateDirectoryFromPathList.bind(jscTestGlobal);
  jscTestGlobal.getTestFilePath = getTestFilePath.bind(jscTestGlobal);
  jscTestGlobal.doRemoveDirectoryFromPathList = doRemoveDirectoryFromPathList.bind(jscTestGlobal);
  jscTestGlobal.createFile = createFile.bind(jscTestGlobal);
  jscTestGlobal.readFile = readFile.bind(jscTestGlobal);
  jscTestGlobal.chmodFileOrDir = chmodFileOrDir.bind(jscTestGlobal);
  jscTestGlobal.createSymlink = createSymlink.bind(jscTestGlobal);

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
      console.error(`Error when trying to load ${currentName}.`);
      console.error(e);
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
    console.info('\'only\' directive detected.  Only hand-picked tests will be performed.');
    testList = onlyTestList;
  }

  if (testList.length)
  {
    console.info('Testing started.');

    nextTest(jscTestGlobal, testList);
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
  jscTestGlobal.checkExpectedLogMessages = (type, message) =>
  {
    checkExpectedLogMessages(
      type,
      message,
      jscTestGlobal.expectedLogMessages,
      () =>
      {
        jscTestGlobal.gotAllExpectedLogMsgs = true;
        jscTestGlobal.expectedLogMessagesPass && jscTestGlobal.expectedLogMessagesPass.call(jscTestGlobal);
      }
    );

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
    return jscTestGlobal.pendingCallbacks > 0;
  }

  jscTestGlobal.callbackCalled = () =>
  {
    jscTestGlobal.pendingCallbacks--;
    if (!jscTestGlobal.areCallbacksStillPending())
    {
      if (jscTestGlobal.pendingCallbackTrackingEnabled)
      {
        signalTestEnd(jscTestGlobal, list);
      }
    }
  };

  const testPromise = new Promise((resolve) =>
  {
    jscTestGlobal.onTestBeforeStart = undefined;
    jscTestGlobal.onBeforeTestEnd = undefined;
    jscTestGlobal.onTestEnd = undefined;
    jscTestGlobal.rootDir = fsPath.join('.', 'jsctest', 'testrootdir');
    jscTestGlobal.testPassed = false;
    jscTestGlobal.gotAllExpectedLogMsgs = false;
    jscTestGlobal.gotWarningMessages = false;
    jscTestGlobal.gotErrorMessages = false;
    jscTestGlobal.serverDidStart = false;
    jscTestGlobal.logOutputToConsoleOccurred = false;
    jscTestGlobal.logOutputToServerDirOccurred = false;
    jscTestGlobal.logOutputToSiteDirOccurred = false;
    jscTestGlobal.pendingCallbackTrackingEnabled = true;
    jscTestGlobal.pendingCallbacks = 0;
    Object.assign(jscTestGlobal, thisTest);
    console.info(`Starting test: ${jscTestGlobal.testName}`);
    jscTestGlobal.onTestBeforeStart && jscTestGlobal.onTestBeforeStart();

    jscTestGlobal.resolveIt = resolve;

    const originalOnServerError = jscTestGlobal.onServerError;
    jscTestGlobal.onServerError = () =>
    {
      resolve(originalOnServerError());
    };

    jscLib.startApplication(
      {
        onServerStarted: () =>
        {
          jscTestGlobal.serverDidStart = true;
          jscTestGlobal.onServerStarted && jscTestGlobal.onServerStarted.call(jscTestGlobal);
        },
        onServerError: jscTestGlobal.onServerError && jscTestGlobal.onServerError.bind(jscTestGlobal),
        rootDir: jscTestGlobal.rootDir
      }
    );
  });

  testPromise
    .then((result) =>
    {
      result && console.info(result);

      if (!jscTestGlobal.areCallbacksStillPending())
      {
        signalTestEnd(jscTestGlobal, list);
      }
    })
    .catch((e) =>
    {
      console.error('CRITICAL: Test application bug found.  We should have never gotten here. Aborting.');
      console.error(e);
      console.info(`Finished test: ${jscTestGlobal.testName}`);
      jscTestGlobal.onTestEnd && jscTestGlobal.onTestEnd();
    });
}

function signalTestEnd(jscTestGlobal, list)
{
  jscTestGlobal.continueTesting = () =>
  {
    endTest(jscTestGlobal, list);
  };

  const result = jscTestGlobal.onBeforeTestEnd && jscTestGlobal.onBeforeTestEnd();

  if (!result || !result.waitForContinueTestingSignal)
  {
    jscTestGlobal.continueTesting();
  }
}

function endTest(jscTestGlobal, list)
{
  console.log('END TEST!!!!');//__RP
  if (jscTestGlobal.testPassed)
  {
    jscTestGlobal.totalTestsPassed++;
  }
  else
  {
    jscTestGlobal.failedTestNames.push(jscTestGlobal.testName);
  }

  console.info(`Finished test: ${jscTestGlobal.testName}`);
  jscTestGlobal.onTestEnd && jscTestGlobal.onTestEnd();
  nextTest(jscTestGlobal, list);
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

function checkExpectedLogMessages(type, message, expectedLogMessages, expectedLogMessagesPass)
{
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
        expectedLogMessagesPass();
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

function createFile(dirPathList, contents)
{
  const filePath = this.getTestFilePath(dirPathList, 'createFile', { errorMessage: 'No file path specified for creation' });
  if (filePath)
  {
    fs.writeFileSync(filePath, contents);
  }
}

function readFile(dirPathList)
{
  const filePath = this.getTestFilePath(dirPathList, 'readFile', { errorMessage: 'No file path specified for reading' });
  if (filePath)
  {
    return fs.readFileSync(filePath);
  }
  return null;
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
    console.log('CHECKING!!!');//__RP
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
