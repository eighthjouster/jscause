'use strict';

const allTests =
[
  'testBattery_001',
  'testBattery_002',
  'testBattery_003',
  'testBattery_004',
  'testBattery_005'
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
  jscTestGlobal.doCreateDirectoryFromPathList = doCreateDirectoryFromPathList.bind(jscTestGlobal);
  jscTestGlobal.doRemoveDirectoryFromPathList = doRemoveDirectoryFromPathList.bind(jscTestGlobal);
  jscTestGlobal.createFile = createFile.bind(jscTestGlobal);

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
    jscTestGlobal.onTestBeforeStart = undefined;
    jscTestGlobal.onTestEnd = undefined;
    jscTestGlobal.rootDir = fsPath.join('.', 'jsctest', 'testrootdir');
    Object.assign(jscTestGlobal, thisTest);
    jscTestGlobal.onTestBeforeStart && jscTestGlobal.onTestBeforeStart();

    jscTestGlobal.resolveIt = resolve;

    const originalOnServerError = jscTestGlobal.onServerError;
    jscTestGlobal.onServerError = () =>
    {
      resolve(originalOnServerError());
    };

    jscLib.startApplication(
      {
        onServerStarted: jscTestGlobal.onServerStarted && jscTestGlobal.onServerStarted.bind(jscTestGlobal),
        onServerError: jscTestGlobal.onServerError && jscTestGlobal.onServerError.bind(jscTestGlobal),
        rootDir: jscTestGlobal.rootDir
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
    const [ listType = '', listMessage = '', listMessageType = '' ] = expectedLogMessages[0];
    if ((type === listType) && ((message === listMessage) || ((listMessageType === 'prefix') && (message.indexOf(listMessage) === 0))))
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
        const [ endType = '', endMessage = '', endMessageType = '' ] = endOfExpectLogMessages[i];
        if ((type === endType) && ((message === endMessage) || ((endMessageType === 'prefix') && (message.indexOf(endMessage) === 0))))
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

function createFile(dirPathList, contents)
{
  if (!dirPathList)
  {
    console.log('CRITICAL: createFile(): No file path specified for creation');
    return;
  }

  const filePath = fsPath.join.apply(null, [this.rootDir].concat(dirPathList));

  if (filePath.indexOf(fsPath.join('.', 'jsctest', 'testrootdir')) !== 0)
  {
    console.log('CRITICAL: createFile(): Not sure if we are inside the testrootdir sandbox directory.  Stopping.');
    return;
  }

  fs.writeFileSync(filePath, contents);
}

function doEmptyTestDirectory(dirPathParam)
{
  const rootDir = this.rootDir;
  const dirPath = dirPathParam || rootDir;
  if (!dirPath)
  {
    console.log('CRITICAL: doEmptyDirectory(): No directory specified for deletion');
    return;
  }

  if (dirPath.indexOf(fsPath.join('.', 'jsctest', 'testrootdir')) !== 0)
  {
    console.log('CRITICAL: doEmptyDirectory(): Not sure if we are inside the testrootdir sandbox directory.  Stopping.');
    return;
  }

  if (fs.existsSync(dirPath))
  {
    fs.readdirSync(dirPath).forEach(function(entry)
    {
      const entry_path = fsPath.join(dirPath, entry);
      if (fs.lstatSync(entry_path).isDirectory())
      {
        doEmptyTestDirectory.call(this, entry_path);
      }
      else
      {
        if ((dirPath !== rootDir) || (entry !== 'readme.txt'))
        {
          fs.unlinkSync(entry_path);
        }
      }
    }.bind(this));
    if (dirPath !== rootDir)
    {
      fs.rmdirSync(dirPath);
    }
  }
}

function doCreateDirectoryFromPathList(dirPathList)
{
  const rootDir = this.rootDir;
  const dirPath = fsPath.join.apply(null, [rootDir].concat(dirPathList));
  if (!dirPath)
  {
    console.log('CRITICAL: doCreateDirectoryFromPathList(): No directory specified for creation');
    return;
  }

  if (dirPath.indexOf(fsPath.join('.', 'jsctest', 'testrootdir')) !== 0)
  {
    console.log('CRITICAL: doCreateDirectoryFromPathList(): Not sure if we are inside the testrootdir sandbox directory.  Stopping.');
    return;
  }

  fs.mkdirSync(dirPath);
}

function doRemoveDirectoryFromPathList(dirPathList, { ignoreIfMissing = false } = {})
{
  const rootDir = this.rootDir;
  const dirPath = fsPath.join.apply(null, [rootDir].concat(dirPathList));
  if (!dirPath)
  {
    console.log('CRITICAL: doRemoveDirectoryFromPathList(): No directory specified for creation');
    return;
  }

  if (dirPath.indexOf(fsPath.join('.', 'jsctest', 'testrootdir')) !== 0)
  {
    console.log('CRITICAL: doRemoveDirectoryFromPathList(): Not sure if we are inside the testrootdir sandbox directory.  Stopping.');
    return;
  }

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
      console.log(`CRITICAL: doRemoveDirectoryFromPathList(): Could not delete directory: ${dirPath}`);
      console.log(e);
    }
  }

  if (dirPathExists)
  {
    fs.rmdirSync(dirPath);
  }
}

module.exports =
{
  start
};
