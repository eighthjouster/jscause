'use strict';

/* *************************************
   *
   * Setup
   *
   ************************************** */
const JSCAUSE_APPLICATION_VERSION = '0.3.0';

const http = require('http');
const https = require('https');
const fs = require('fs');
const fsPath = require('path');
const urlUtils = require('url');
const crypto = require('crypto');
const zlib = require('zlib');

const JSCAUSE_CONF_FILENAME = 'jscause.conf';
const JSCAUSE_CONF_PATH = 'configuration';
const JSCAUSE_SITES_PATH = 'sites';
const JSCAUSE_CERTS_PATH = 'certs';
const JSCAUSE_WEBSITE_PATH = 'website';
const JSCAUSE_SITECONF_FILENAME = fsPath.join(JSCAUSE_CONF_PATH, 'site.json');
const FORMDATA_MULTIPART_RE = /^multipart\/form-data/i;
const FORMDATA_URLENCODED_RE = /^application\/x-www-form-urlencoded/i;
const VENDOR_TEMPLATE_FILENAME = 'jscvendor/vendor_template.jsctpl';

const PROMISE_ACTOR_TYPE_SUCCESS = 1;
const PROMISE_ACTOR_TYPE_ERROR = 2;

const TERMINAL_ERROR_STRING = '\x1b[31mERROR\x1b[0m';
const TERMINAL_INFO_STRING = '\x1b[32mINFO\x1b[0m';
const TERMINAL_WARNING_STRING = '\x1b[33mWARNING\x1b[0m';
const LOGFILE_ERROR_STRING = 'ERROR';
const LOGFILE_INFO_STRING = 'INFO';
const LOGFILE_WARNING_STRING = 'WARNING';

const LOGTERMINATE_WAIT_MS = 50; // It should NEVER be 0.
const MAX_NUMBER_OF_JSCLOGTERMINATE_RETRIES = (30 * 1000) / LOGTERMINATE_WAIT_MS; // 30 seconds max.

const MAX_FILES_OR_DIRS_IN_DIRECTORY = 2048;
const MAX_DIRECTORIES_TO_PROCESS = 4096;
const MAX_PROCESSED_DIRECTORIES_THRESHOLD = 1024;
const MAX_CACHED_FILES_PER_SITE = 256;
const MAX_CACHEABLE_FILE_SIZE_BYTES = 1024 * 512;
const MAX_COMPRESSION_JOBS_PER_SITE = 4;
const MAX_FILELOG_QUEUE_ENTRIES = 10 * 1024 * 1000000; // 10MiB queue.  Arbitrary number.
const LOGQUEUEFULL_WARNING_INTERVAL = 5 * 1000; // How often should the system warn about a full log queue.  In milliseconds.
const DEFAULT_LOGFILENAME_MAX_SUFFIX = 10;

const JSCLOG_DATA =
{
  'error':
    {
      outputToConsole: console.error,
      consolePrefix: TERMINAL_ERROR_STRING,
      messagePrefix: LOGFILE_ERROR_STRING
    },
  'warning':
    {
      outputToConsole: console.warn,
      consolePrefix: TERMINAL_WARNING_STRING,
      messagePrefix: LOGFILE_WARNING_STRING
    },
  'raw':
    {
      outputToConsole: console.info,
      consolePrefix: '',
      messagePrefix: '',
    },
  'info':
    {
      outputToConsole: console.info,
      consolePrefix: TERMINAL_INFO_STRING,
      messagePrefix: LOGFILE_INFO_STRING
    }
};

const MIME_TYPES =
{
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.gif': 'image/gif',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.woff': 'application/font-woff',
  '.ttf': 'application/font-ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'application/font-otf',
  '.svg': 'application/image/svg+xml; charset=utf-8'
};

const symbolsToSanitize =
{
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  '\'': '&#39;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;'
};

const defaultSiteConfig =
{
  siteName: '',
  rootDirectoryName: '',
  fullSitePath: '',
  staticFiles: {},
  compiledFiles: {},
  siteHostName: undefined,
  sitePort: undefined,
  tempWorkDirectory: null,
  canUpload: true,
  maxPayloadSizeBytes: undefined,
  jscpExtensionRequired: 'optional',
  includeHttpPoweredByHeader: true,
  mimeTypes: {},
  enableHTTPS: false,
  httpsCertFile: undefined,
  httpsKeyFile: undefined
};

const LOGEXTENSION_FILENAME_RE = /\.log$/;

let allLogDirs;
let allOpenLogFiles;
let compressLogsDirQueue;
let JSCLogMessageQueue;
let JSCLogMessageQueueFullWarningTime;
let isJSCLogMessageQueueProcessing;
let isCurrentlyLogDirCompressing;
let applicationIsTerminating;
let jsclogTerminateRetries;
let processExitAttempts;
let serverConfig;
let runningServers;

/* *****************************************
 * 
 * Startup code.
 * 
 * *****************************************/

const isTestMode = (process.argv[2] === 'runtests');
const { cookies, formidable, sanitizeFilename } = loadVendorModules();
const RUNTIME_ROOT_DIR = process.cwd();

const jscTestGlobal = {};

// jscCallback, jscThen and jscCatch are needed during testing so we wait for
// all the callbacks to complete (file operations, networking) before going to the
// next test.
const jscCallback = (isTestMode) ?
  (cb) =>
  {
    jscTestGlobal.pendingCallbacks++;
    return function() // It must be a function object instead of an arrow one because of the arguments object.
    {
      try
      {
        cb(...arguments);
        jscTestGlobal.callbackCalled();
      }
      catch(e)
      {
        JSCLog('error', 'CRITICAL: An application error occurred when processing a callback.');
        JSCLog('error', e);
        console.error(e);
        jscTestGlobal.signalTestEnd(jscTestGlobal, { generalError: true });
      }
    };
  } :
  (cb) => cb;

const jscThen = (isTestMode) ?
  (cb) =>
  {
    jscTestGlobal.pendingCallbacks++;

    return function() // It must be a function object instead of an arrow one because of the arguments object.
    {
      cb(...arguments);
      jscTestGlobal.callbackCalled({ isThenOrCatch: true });
    };
  } :
  (cb) => cb;

const jscCatch = (isTestMode) ?
  (cb) =>
  {
    jscTestGlobal.pendingCallbacks++;

    return function() // It must be a function object instead of an arrow one because of the arguments object.
    {
      cb(...arguments);
      jscTestGlobal.callbackCalled({ isThenOrCatch: true });
    };
  } :
  (cb) => cb;

if (isTestMode)
{
  jscTestGlobal.jscLib = getAllElementsToSupportTesting();
  runTesting();
}
else
{
  if (process.argv[2])
  {
    console.error('Unrecognized command line switch. Server not started.');
    process.exit(1);
  }

  startApplication();
}

/* *****************************************
 * 
 * Helper functions
 * 
 * *****************************************/

function initializeGlobals()
{
  allLogDirs = {};
  allOpenLogFiles = {};
  compressLogsDirQueue = [];
  JSCLogMessageQueue = [];
  isJSCLogMessageQueueProcessing = false;
  isCurrentlyLogDirCompressing = false;
  applicationIsTerminating = false;
  processExitAttempts = 0;
  jsclogTerminateRetries = 0;
  serverConfig = {};
  runningServers = {};
}

function determineLogFileSuffix(suffix)
{
  return (suffix) ? `--${suffix}` : '';
}

function dateToYYYMMDD_HH0000({ date, suffix = 0 } = {})
{
  const d = date && new Date(date) || new Date();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = (d.getDate()).toString().padStart(2, '0');
  const year = d.getFullYear();
  const hours = d.getHours().toString().padStart(2, '0');
  return `${year}-${month}-${day}_${hours}-00-00${determineLogFileSuffix(suffix)}`;
}

function retrieveNextAvailableLogName(logDir, fileSizeThreshold, resolve, reject, suffix = 0, maxSuffix, postExtension = '')
{
  // Typically, this function is used this way:
  // Provide an initial suffix of 0 and a postExtension of '.gz'.
  // That signals the function that we're looking for names that have already been
  // used (files are compressed with this name).
  // If the name exists, recursively call this file with a different suffix (e.g. 1).
  // Once a name has not been used in a compressed file, recursively call this function again,
  // this time with no postExtension.
  // That signals the function that we're looking for names for files that either:
  // 1. are not being used, or 2. are being used and under a certain file size threshold.
  //
  // Example:  Look for a name such as 'jsc_name'.
  // 1. Does jsc_name.log.gz exists? Look for jsc_name--1.log.gz, then jsc_name--2.log.gz, etc.
  // 2. Found that jsc_name--3.log.gz does not exist? Ok.
  // 3. Check if jsc_name--3.log exists.  It does not?  Cool.  Let's use this name for logging.  The end.
  // 4. It exists?  Check if its size is no larger than the threshold.
  // 5. Otherwise, check for jsc_name--4.log, jsc_name--5.log, etc, going back to step 3.
  const currentFileNameStem = `jsc_${dateToYYYMMDD_HH0000({ suffix })}`;
  const currentFileName = `${currentFileNameStem}.log${postExtension}`;
  const currentFilePath = fsPath.join(logDir, currentFileName);
  
  if (suffix <= maxSuffix)
  {
    fs.stat(currentFilePath, jscCallback((error, stats) =>
    {
      if (error)
      {
        if (error.code === 'ENOENT')
        {
          if (postExtension)
          {
            retrieveNextAvailableLogName(logDir, fileSizeThreshold, resolve, reject, suffix, maxSuffix, '');
          }
          else
          {
            resolve(currentFileName);
          }
        }
        else
        {
          reject(error);
        }
      }
      else
      {
        if (postExtension || (fileSizeThreshold && (stats.size > fileSizeThreshold)))
        {
          retrieveNextAvailableLogName(logDir, fileSizeThreshold, resolve, reject, suffix + 1, maxSuffix, postExtension);
        }
        else
        {
          resolve(currentFileName);
        }
      }
    }));
  }
  else
  {
    reject(`Too many segment files (>${maxSuffix})`);
  }
}

function getCurrentLogFileName(logDir, fileSizeThreshold, maxSuffix = DEFAULT_LOGFILENAME_MAX_SUFFIX)
{
  return new Promise((resolve, reject) =>
  {
    retrieveNextAvailableLogName(logDir, fileSizeThreshold, resolve, reject, 0, maxSuffix, '.gz');
  });
}

function consoleWarning(messageList)
{
  messageList.forEach(message =>
  {
    console.warn(message);
  });
  if (isTestMode)
  {
    jscTestGlobal.logOutputToConsoleOccurred = true;
  }
}

function writeLogToFile(filePath, logFileFd, message, canOutputErrorsToConsole)
{
  if (logFileFd)
  {
    fs.write(logFileFd, Buffer.from(`${message}\n`), jscCallback((error) =>
    {
      if (error)
      {
        // Dropping the message.  We'll set things up so that the next message
        // will not attempt to reopen the file.
        fs.close(logFileFd, jscCallback((error) =>
        {
          if (error && canOutputErrorsToConsole)
          {
            consoleWarning([`${TERMINAL_WARNING_STRING}:  Could not close log file after write error: ${filePath}`]);
          }
        }));
        allOpenLogFiles[filePath] = { errorStatus: 'unable to write to this file', fd: null };
        if (canOutputErrorsToConsole)
        {
          consoleWarning(
            [
              `${TERMINAL_WARNING_STRING}:  Unable to write to this log file: ${filePath}`,
              `${TERMINAL_WARNING_STRING}:  The message was: ${message}`
            ]);
        }
      }
  
      if (JSCLogMessageQueue.length)
      {
        JSCLogQueueNext();
      }
      else
      {
        isJSCLogMessageQueueProcessing = false;
      }
    }));
  }
}

function setUpLogFileCompressionEvents(logDir, fileName, compressedFileName, fileToCompressPath, fileToCompressStream, compressedFileStream, dataCompressor, canOutputErrorsToConsole, onCompressionEnd)
{
  fileToCompressStream
    .on('error', (error) =>
    {
      if (canOutputErrorsToConsole)
      {
        consoleWarning([
          `${TERMINAL_WARNING_STRING}:  Log compression: Error while reading from: ${fileName}`,
          error
        ]);
      }
      compressedFileStream.end();
      dataCompressor.end();
      fileToCompressStream.end();
      onCompressionEnd && onCompressionEnd(logDir, fileName, canOutputErrorsToConsole);
    })
    .pipe(dataCompressor)
    .on('error', (error) =>
    {
      if (canOutputErrorsToConsole)
      {
        consoleWarning([
          `${TERMINAL_WARNING_STRING}:  Log compression: Error while compressing to: ${fileName} to ${compressedFileName}`,
          error
        ]);
      }
      fileToCompressStream.end();
      dataCompressor.end();
      compressedFileStream.end();
      onCompressionEnd && onCompressionEnd(logDir, fileName, canOutputErrorsToConsole);
    })
    .pipe(compressedFileStream)
    .on('error', (error) =>
    {
      if (canOutputErrorsToConsole)
      {
        consoleWarning([
          `${TERMINAL_WARNING_STRING}:  Log compression: Error while writing to: ${compressedFileName}`,
          error
        ]);
      }
      compressedFileStream.end();
      dataCompressor.end();
      fileToCompressStream.end();
      onCompressionEnd && onCompressionEnd(logDir, fileName, canOutputErrorsToConsole);
    })
    .on('finish', () =>
    {
      fs.unlink(fileToCompressPath, jscCallback((error) =>
      {
        if (error && canOutputErrorsToConsole)
        {
          consoleWarning([
            `${TERMINAL_WARNING_STRING}:  Log compression: Error while deleting source of already compressed file: ${fileName}`,
            error
          ]);
        }

        onCompressionEnd && onCompressionEnd(logDir, fileName, canOutputErrorsToConsole);
      }));
    });
}

function initiateLogFileCompression(logDir, fileName, canOutputErrorsToConsole, onCompressionEnd)
{
  const dataCompressor = zlib.createGzip();
  const fileToCompressPath = fsPath.join(logDir, fileName);
  const compressedFileName = `${fileName}.gz`;
  const fileToCompressStream = fs.createReadStream(fileToCompressPath);
  const compressedFileStream = fs.createWriteStream(fsPath.join(logDir, compressedFileName));
  let compressionInitiated = false;

  if (!fileToCompressStream)
  {
    if (canOutputErrorsToConsole)
    {
      consoleWarning([`${TERMINAL_WARNING_STRING}:  Unable to create log file stream for reading: ${fileName}`]);
    }
  }
  else if (!dataCompressor)
  {
    if (canOutputErrorsToConsole)
    {
      consoleWarning([`${TERMINAL_WARNING_STRING}:  Unable to create compressing stream to compress file: ${fileName}`]);
    }
  }
  else if (!compressedFileStream)
  {
    if (canOutputErrorsToConsole)
    {
      consoleWarning([`${TERMINAL_WARNING_STRING}:  Unable to create compressed log file stream for writing: ${compressedFileName}`]);
    }
  }
  else
  {
    setUpLogFileCompressionEvents(logDir, fileName, compressedFileName, fileToCompressPath, fileToCompressStream, compressedFileStream, dataCompressor, canOutputErrorsToConsole, onCompressionEnd)
    compressionInitiated = true;
  }

  if (!compressionInitiated)
  {
    onCompressionEnd && onCompressionEnd(logDir, fileName, canOutputErrorsToConsole);
  }
}

function closeLogFile(logDir, filePath, canOutputErrorsToConsole)
{
  const { fd: logFileFd } = allOpenLogFiles[filePath] || {};

  if (logFileFd)
  {
    fs.close(logFileFd, jscCallback((error) =>
    {
      if (error && canOutputErrorsToConsole)
      {
        consoleWarning([`${TERMINAL_WARNING_STRING}:  Could not close log file for archival: ${filePath}`]);
      }
    }));
  }

  delete allOpenLogFiles[filePath];
  delete allLogDirs[logDir].fileName;
  delete allLogDirs[logDir].filePath;
}

function openAndWriteToLogFile(filePath, message, canOutputErrorsToConsole)
{
  fs.open(filePath, 'a', jscCallback((error, fd) =>
  {
    if (error)
    {
      if (canOutputErrorsToConsole)
      {
        consoleWarning([`${TERMINAL_WARNING_STRING}:  Unable to open log file for creating or appending: ${filePath}`]);
      }
    }
    else
    {
      allOpenLogFiles[filePath] = { fd };
      writeLogToFile(filePath, fd, message, canOutputErrorsToConsole);
    }
  }));
}

function onCompressionEnd(logDir, fileName, canOutputErrorsToConsole)
{
  const { currentlyCompressingFileNameList, pendingToCompressingFileNameList } = allLogDirs[logDir] || {};
  let allCompressionEnded = false;

  allCompressionEnded = !currentlyCompressingFileNameList;

  if (!allCompressionEnded && Array.isArray(currentlyCompressingFileNameList))
  {
    const position = currentlyCompressingFileNameList.indexOf(fileName);
    if (position > -1)
    {
      currentlyCompressingFileNameList.splice(position, 1);
      if (pendingToCompressingFileNameList && pendingToCompressingFileNameList.length && !processExitAttempts)
      {
        const fileName = pendingToCompressingFileNameList.shift();
        currentlyCompressingFileNameList.push(fileName)
        initiateLogFileCompression(logDir, fileName, canOutputErrorsToConsole, onCompressionEnd);
      }
    }

    allCompressionEnded = (currentlyCompressingFileNameList.length === 0);
  }

  if (allCompressionEnded)
  {
    if (compressLogsDirQueue.length && !processExitAttempts)
    {
      initiateLogDirCompression(canOutputErrorsToConsole);
    }
    else
    {
      isCurrentlyLogDirCompressing = false;
    }
  }
}

function initiateLogDirCompression(canOutputErrorsToConsole)
{
  const logDir = compressLogsDirQueue.shift();
  isCurrentlyLogDirCompressing = true;

  const { fileName: fileNameForLogging, currentlyCompressingFileNameList, pendingToCompressingFileNameList } = allLogDirs[logDir];

  fs.readdir(logDir, jscCallback((error, allFiles) =>
  {
    if (error)
    {
      if (canOutputErrorsToConsole)
      {
        consoleWarning([`${TERMINAL_WARNING_STRING}:  Unable read this log directory: ${logDir}`]);
      }
    }
    else
    {
      allFiles.forEach((fileName) =>
      {
        if (LOGEXTENSION_FILENAME_RE.test(fileName))
        {
          if (fileNameForLogging !== fileName)
          {
            if (currentlyCompressingFileNameList.length < MAX_COMPRESSION_JOBS_PER_SITE)
            {
              currentlyCompressingFileNameList.push(fileName);
              initiateLogFileCompression(logDir, fileName, canOutputErrorsToConsole, onCompressionEnd);
            }
            else
            {
              pendingToCompressingFileNameList.push(fileName);
            }
          }
        }
      });
    }
  }));
}

function compressLogs(logDir, fileNameForLogging, canOutputErrorsToConsole)
{
  if (compressLogsDirQueue.indexOf(logDir) > -1)
  {
    console.log(`${logDir} IS ALREADY QUEUED FOR COMPRESSION!`);
    return;
  }

  allLogDirs[logDir] = Object.assign(allLogDirs[logDir],
    {
      currentlyCompressingFileNameList: [],
      pendingToCompressingFileNameList: []
    });

  compressLogsDirQueue.push(logDir);

  if (!isCurrentlyLogDirCompressing)
  {
    initiateLogDirCompression(canOutputErrorsToConsole);
  }
}

function assignLogFileToLogDir(logDir, fileNameForLogging)
{
  allLogDirs[logDir] = Object.assign(allLogDirs[logDir] || {},
    {
      fileName: fileNameForLogging,
      filePath: fsPath.join(logDir, fileNameForLogging)
    });
}

function checkAndPrepareIfShouldCompressLogs(logDir, fileNameForLogging, canOutputErrorsToConsole)
{
  const { fileName, filePath, currentlyCompressingFileNameList } = allLogDirs[logDir] || {};
  const isCompressingAlreadyGoingOn = currentlyCompressingFileNameList && currentlyCompressingFileNameList.length;
  let shouldCompressLogs = (fileName !== fileNameForLogging) && !isCompressingAlreadyGoingOn;

  if (shouldCompressLogs && filePath)
  {
    closeLogFile(logDir, filePath, canOutputErrorsToConsole);
    assignLogFileToLogDir(logDir, fileNameForLogging);
  }

  return shouldCompressLogs;
}

function outputLogToDir(logDir, fileSizeThreshold = 0, message, canOutputErrorsToConsole)
{
  getCurrentLogFileName(logDir, fileSizeThreshold)
    .then(jscThen((latestFileNameForLogging) =>
    {
      if (!allLogDirs[logDir] || !allLogDirs[logDir].fileName)
      {
        assignLogFileToLogDir(logDir, latestFileNameForLogging);
      }
  
      if (checkAndPrepareIfShouldCompressLogs(logDir, latestFileNameForLogging, canOutputErrorsToConsole))
      {
        compressLogs(logDir, latestFileNameForLogging, canOutputErrorsToConsole);
      }
  
      const { filePath } = allLogDirs[logDir];
  
      if (allOpenLogFiles[filePath])
      {
        writeLogToFile(filePath, allOpenLogFiles[filePath].fd, message, canOutputErrorsToConsole);
      }
      else
      {
        openAndWriteToLogFile(filePath, message, canOutputErrorsToConsole);
      }
    }))
    .catch(jscCatch((error) =>
    {
      if (canOutputErrorsToConsole)
      {
        consoleWarning([
          `${TERMINAL_WARNING_STRING}:  Could not get the current log file name`,
          error
        ]);
      }
    }));
}

function formatLogMessage(prefix, message)
{
  return `${(prefix) ? `${prefix}: ` : ''}${message}`;
}

function JSCLogQueueNext()
{
  const { type, message, logOptions } = JSCLogMessageQueue.shift();

  let outputToFile = false;
  if (isTestMode)
  {
    jscTestGlobal.checkLogOutputWillOccur(logOptions);
    jscTestGlobal.checkIfSpecificLogMessagesFound(type, message);
    jscTestGlobal.checkIfExpectedLogMessagesPass(type, message);
  }

  const { e, toConsole = false, toServerDir, toSiteDir, fileSizeThreshold } = logOptions;
  const { outputToConsole, consolePrefix, messagePrefix } = JSCLOG_DATA[type] || JSCLOG_DATA.raw;

  const consoleOutputDuringTest = false; // Set to true to allow actual JSCLog() output to the console when debugging tests.
  if ((!isTestMode && toConsole) || consoleOutputDuringTest)
  {
    if (outputToConsole)
    {
      outputToConsole(formatLogMessage(consolePrefix, message));
      if (e)
      {
        outputToConsole(e);
      }
    }
    else
    {
      console.warn(`\nWARNING!  No console output function for type: ${type}`);
    }
  }

  if (toServerDir || toSiteDir)
  {
    const formattedMessage = formatLogMessage(messagePrefix, message);
    if (toServerDir)
    {
      outputLogToDir(toServerDir, fileSizeThreshold, formattedMessage, toConsole);
      if (e)
      {
        outputLogToDir(toServerDir, fileSizeThreshold, e, toConsole);
      }
    }
    if (toSiteDir)
    {
      outputLogToDir(toSiteDir, fileSizeThreshold, formattedMessage, toConsole);
      if (e)
      {
        outputLogToDir(toSiteDir, fileSizeThreshold, e, toConsole);
      }
    }
    outputToFile = true;
  }

  if (outputToFile)
  {
    isJSCLogMessageQueueProcessing = true;
  }
  else if (JSCLogMessageQueue.length)
  {
    JSCLogQueueNext();
  }
}

function JSCLog(type, message, logOptions = {})
{
  if (JSCLogMessageQueue.length <= MAX_FILELOG_QUEUE_ENTRIES)
  {
    JSCLogMessageQueue.push({ type, message, logOptions });
  }
  else if (!JSCLogMessageQueueFullWarningTime || ((Date.now() - JSCLogMessageQueueFullWarningTime) > LOGQUEUEFULL_WARNING_INTERVAL))
  {
    console.warn('\nWARNING! Log message queue full.  No entries are being logged to file.  Check permissions, storage space and/or filesystem health.');
    JSCLogMessageQueueFullWarningTime = Date.now();
    isJSCLogMessageQueueProcessing = false;
  }

  if (!isJSCLogMessageQueueProcessing)
  {
    JSCLogQueueNext();
  }
}

function waitForLogsProcessingBeforeTerminate(options)
{
  if (isCurrentlyLogDirCompressing || isJSCLogMessageQueueProcessing)
  {
    setTimeout(jscCallback(() => { waitForLogsProcessingBeforeTerminate(options); }), 0);
  }
  else
  {
    Object.keys(allOpenLogFiles).forEach((key) =>
    {
      const fileObj = allOpenLogFiles[key];
      if (fileObj)
      {
        // TO-DO: We need try/catch here. If error, include ${key} on the reporting.
        fs.closeSync(fileObj.fd);
      }
      allOpenLogFiles[key] = null;
    });
    allOpenLogFiles = {};

    if (processExitAttempts)
    {
      if (!isTestMode)
      {
        console.log('Terminated.');
      }

      jscTestGlobal.serverDidTerminate = true;
      jscTestGlobal.isWaitingForLogTermination = false;
      if (typeof(options.onTerminateComplete) === 'function')
      {
        Promise.all(
          Object.values(runningServers)
            .map(
              (thisServer) => {
                thisServer.webServer.close(() => Promise.resolve());
              }
            )
        )
          .then(() =>
          {
            options.onTerminateComplete();
          })
          .catch((e) =>
          {
            console.error('ERROR:  Error on server listening termination:');
            console.error(e);
          });
      }
      else
      {
        process.exit();
      }
    }
    else
    {
      jscTestGlobal.serverDidTerminate = true;
      jscTestGlobal.isWaitingForLogTermination = false;
      if (typeof(options.onTerminateComplete) === 'function')
      {
        options.onTerminateComplete();
      }
    }
  }
}

function JSCLogTerminate(options)
{
  if (jscTestGlobal.serverDidStart && !jscTestGlobal.serverDidTerminate)
  {
    jscTestGlobal.isWaitingForLogTermination = true;
    if (jscTestGlobal.pendingCallbacks > 0)
    {
      if (jsclogTerminateRetries <= MAX_NUMBER_OF_JSCLOGTERMINATE_RETRIES)
      {
        jsclogTerminateRetries++;
        setTimeout(() => { JSCLogTerminate(options); }, LOGTERMINATE_WAIT_MS);
        return;
      }
      else
      {
        console.warn(`\nWARNING!  Reached the amount of log termination retries due to pending callbacks (${MAX_NUMBER_OF_JSCLOGTERMINATE_RETRIES}).  Giving up.`);
      }
    }
    if (applicationIsTerminating)
    {
      return;
    }
    applicationIsTerminating = true;
  }

  waitForLogsProcessingBeforeTerminate(options);
}

function vendor_require(vendorModuleName)
{
  let moduleFile;
  let compiledModule;
  let hydratedFile;

  let templateFile;

  try
  {
    templateFile = fs.readFileSync(VENDOR_TEMPLATE_FILENAME, 'utf-8');
  }
  catch(e)
  {
    JSCLog('error', `CRITICAL: Cannot load ${VENDOR_TEMPLATE_FILENAME} file. The JSCause installation might be corrupted.`, { e, toConsole: true });
  }

  if (typeof(templateFile) !== 'undefined')
  {
    const requireName = `${vendorModuleName}/index.js`;
    try
    {
      moduleFile = fs.readFileSync(requireName, 'utf-8');
    }
    catch(e)
    {
      JSCLog('error', `CRITICAL: Cannot load ${requireName} file. The JSCause installation might be corrupted.`, { e, toConsole: true });
    }
  }

  if (typeof(moduleFile) !== 'undefined')
  {
    moduleFile = moduleFile.replace(/\s+require\((['"']{1})/g, ' _jscause_require($1');
    hydratedFile = templateFile.replace('__JSCAUSE__THIS_MODULE__NAME__jscau$e1919', vendorModuleName);
    const Module = module.constructor;
    Module._nodeModulePaths(fsPath.dirname(''));
    try
    {
      const moduleToCompile = new Module();
      moduleToCompile._compile(`${hydratedFile}\n${moduleFile}`, '');
      compiledModule = moduleToCompile.exports;
    }
    catch (e)
    {
      JSCLog('error', `CRITICAL: Could not compile vendor module ${vendorModuleName}.`, { toConsole: true });
    }
  }

  if (!compiledModule)
  {
    JSCLog('error', `CRITICAL: Failed to load vendor module ${vendorModuleName}. The JSCause installation might be corrupted.`, { toConsole: true });
  }

  return compiledModule;
}

function prepareConfigFileForParsing(readConfigFile)
{
  return readConfigFile
    .replace(/\/\/[^\n]*/g, '') // Strip //
    .replace(/\n\s*/g, '\n') // Strip leading white space at the beginning of line.
    .replace(/^\s*/g, '');  // Strip leading white space at the beginning of file.
}

function validateJSONFile(readConfigFile, fileName, jscLogConfig)
{
  let readConfigJSON;

  try
  {
    readConfigJSON = JSON.parse(readConfigFile) || {};
  }
  catch(e)
  {
    JSCLog('error', `Invalid ${fileName} file format.`, jscLogConfig);
    JSCLog('error', e.message, jscLogConfig);
    const positionExtract = e.message.match(/.+at position (\d+).*$/i);
    if (positionExtract)
    {
      const errorPosition = positionExtract[1];
      if (errorPosition)
      {
        const excerpt = (readConfigFile || '').substr(errorPosition - 20, 40).split(/\n/);
        JSCLog('error', 'Error is around the following section of the file:', jscLogConfig);
        JSCLog('error', excerpt.join(''), jscLogConfig);
      }
    }
  }

  return readConfigJSON;
}

function processKeyContext(state)
{
  let
    {
      processingContext, processingState,
      currentChar , keyChars, valueTypeQueue,
      parseErrorDescription, parseError,
      skipNext, firstLevelKeys
    } = state;

  if (processingState === 'expectkey')
  {
    if (currentChar === '"')
    {
      keyChars = [];
      processingState = 'gettingkey';
    }
    else if (currentChar === '}')
    {
      const poppedType = valueTypeQueue.pop();
      if (poppedType)
      {
        if (currentChar === poppedType)
        {
          processingContext = 'values';
          processingState = 'donegettingvalue';
        }
        else
        {
          parseErrorDescription = `Expected ${poppedType}.`;
          parseError = true;
        }
      }
      else
      {
        parseErrorDescription = `Unexpected ${currentChar}.`;
        parseError = true;
      }
    }
    else if (currentChar !== ',')
    {
      parseErrorDescription = 'Expected quote.';
      parseError = true;
    }
  }
  else if (processingState === 'gettingkey')
  {
    if (currentChar === '\\')
    {
      skipNext = true;
    }
    else if (currentChar === '"')
    {
      processingState = 'expectcolon';

      if (valueTypeQueue.length === 0)
      {
        const keyName = keyChars.join('').toLowerCase();
        const keyNameLowerCase = keyName.toLowerCase();
        if (firstLevelKeys.indexOf(keyNameLowerCase) === -1)
        {
          firstLevelKeys.push(keyNameLowerCase);
        }
        else
        {
          parseErrorDescription = `Duplicate key: ${keyName}`;
          parseError = true;
        }
      }
    }
    else
    {
      keyChars.push(currentChar);
    }
  }
  else if (processingState === 'expectcolon')
  {
    if (currentChar === ':')
    {
      processingContext = 'values';
      processingState = 'expectvalue';
    }
    else
    {
      parseErrorDescription = 'Expected colon.';
      parseError = true;
    }
  }
  else
  {
    parseErrorDescription = 'Unexpected error.';
    parseError = true;
  }
  return { processingContext, processingState,
    currentChar, keyChars, valueTypeQueue,
    parseErrorDescription, parseError,
    skipNext, firstLevelKeys
  };
}

function processValueContext(state)
{
  let
    {
      processingContext, processingState,
      currentChar , keyChars, valueTypeQueue,
      parseErrorDescription, parseError,
      skipNext, firstLevelKeys
    } = state;

  if (processingState === 'expectvalue')
  {
    if (currentChar === '"')
    {
      processingState = 'gettingstring';
    }
    else if (currentChar === '[')
    {
      valueTypeQueue.push(']');
    }
    else if (currentChar === '{')
    {
      valueTypeQueue.push('}');
      processingContext = 'keys';
      processingState = 'expectkey';
    }
    else if (currentChar === ']')
    {
      const poppedType = valueTypeQueue.pop();
      if (poppedType)
      {
        if (currentChar === poppedType)
        {
          processingState = 'donegettingvalue';
        }
        else
        {
          parseErrorDescription = `Expected ${poppedType}.`;
          parseError = true;
        }
      }
      else
      {
        parseErrorDescription = `Unexpected ${currentChar}.`;
        parseError = true;
      }
    }
    else if (currentChar !== ',')
    {
      processingState = 'gettingliteral';
    }
  }
  else if (processingState === 'gettingstring')
  {
    if (currentChar === '\\')
    {
      skipNext = true;
    }
    else if (currentChar === '"')
    {
      processingState = 'donegettingvalue';
    }
  }
  else if ((processingState === 'gettingliteral') || (processingState === 'donegettingvalue'))
  {
    if (currentChar === ']')
    {
      const poppedType = valueTypeQueue.pop();
      if (poppedType)
      {
        if (currentChar === poppedType)
        {
          processingState = 'donegettingvalue';
        }
        else
        {
          parseErrorDescription = `Expected ${poppedType}.`;
          parseError = true;
        }
      }
      else
      {
        parseErrorDescription = `Unexpected ${currentChar}.`;
        parseError = true;
      }
    }
    else if (currentChar === '}')
    {
      const poppedType = valueTypeQueue.pop();
      if (poppedType)
      {
        if (currentChar === poppedType)
        {
          processingState = 'donegettingvalue';
        }
        else
        {
          parseErrorDescription = `Expected ${poppedType}.`;
          parseError = true;
        }
      }
      else
      {
        parseErrorDescription = `Unexpected ${currentChar}.`;
        parseError = true;
      }
    }
    else if (currentChar === ',')
    {
      if ((valueTypeQueue.length > 0) && valueTypeQueue[valueTypeQueue.length - 1] === ']')
      {
        processingState = 'expectvalue';
      }
      else
      {
        processingContext = 'keys';
        processingState = 'expectkey';
      }
    }
    else if ((currentChar === '"') || (currentChar === '[') || (currentChar === '{'))
    {
      parseErrorDescription = '"," expected.';
      parseError = true;
    }
    else if (processingState === 'donegettingvalue')
    {
      parseErrorDescription = `Unexpected ${currentChar}.`;
      parseError = true;
    }
  }

  return { processingContext, processingState,
    currentChar, keyChars, valueTypeQueue,
    parseErrorDescription, parseError,
    skipNext, firstLevelKeys
  };
}
  
function parseNextInConfigFile(state)
{
  let
    {
      processingContext, processingState,
      currentChar , keyChars, valueTypeQueue,
      parseErrorDescription, parseError,
      skipNext, firstLevelKeys
    } = state;

  // Good for debugging.
  //console.log('Pass - begin');
  //console.log(processingContext);
  //console.log(processingState);
  //console.log(currentChar);
  
  if (processingContext === 'keys')
  {
    Object.assign(state, processKeyContext(state));
  }
  else if (processingContext === 'values')
  {
    Object.assign(state, processValueContext(state));
  }
  else
  {
    parseErrorDescription = 'Unexpected error.';
    parseError = true;
  }

  return { processingContext, processingState,
    currentChar, keyChars, valueTypeQueue,
    parseErrorDescription, parseError,
    skipNext, firstLevelKeys
  };
}

function configFileFreeOfDuplicates(readConfigFile, fileName, jscLogConfig)
{
  // JSON gets rid of duplicate keys.  However, let's tell the user if the original
  // file had duplicate first-level keys, in case it was a mistake.
  // This is done after the parsing took place because at this point we know
  // that the source file is legal JSON (except for the potential duplicate keys),
  // and thus the code can be easy to parse.

  const state = 
  {
    processingConfigFile: null,
    parseErrorDescription: null,
    currentPos: 0,
    processingContext: 'keys',
    processingState: 'expectkey',
    valueTypeQueue: [],
    skipNext: false,
    currentChar: null,
    parseError: false,
    keyChars: [],
    firstLevelKeys: []
  };

  // Get rid of initial surrounding brackets.
  // But first, let's find out if said initial surrounding (if any) brackets match.
  const firstCharMatch = readConfigFile.match(/^\s*(.{1})/);
  
  // Good for debugging.
  //const lastCharMatch = readConfigFile.match(/(.{1})\**?\s*$/);
  const lastCharMatch = readConfigFile.match(/(.{1})\s*$/);

  if (firstCharMatch && lastCharMatch)
  {
    if (firstCharMatch[1] === '{')
    {
      if (lastCharMatch[1] !== '}')
      {
        state.parseErrorDescription = `Unexpected ending ${lastCharMatch[1]}.`;
        state.parseError = true;
      }
    }
  }

  if (!state.parseError)
  {
    state.processingConfigFile = readConfigFile
      .replace(/^\s*\{\s*?\n?/, '')
      .replace(/\n?\s*?\}\s*$/, '');
  }

  while (!state.parseError && (state.currentPos < state.processingConfigFile.length))
  {
    state.currentChar = state.processingConfigFile.substr(state.currentPos, 1);
    
    // Good for debugging.
    if (state.currentChar === '*')
    {
      break;
    }

    if (state.skipNext)
    {
      state.skipNext = false;
    }
    else
    {
      if (!state.currentChar.match(/[\n\s]/) || (state.processingState === 'gettingkey') || (state.processingState === 'gettingvalue'))
      {
        Object.assign(state, parseNextInConfigFile(state));
      }
    }

    // Good for debugging.
    //console.log('Pass - end');
    //console.log(state.processingContext);
    //console.log(state.processingState);

    state.currentPos++;
  }

  if (!state.parseError && (state.valueTypeQueue.length !== 0))
  {
    // In theory, we should never get here because the file has already been JSON.parsed.
    const lastBracket = state.valueTypeQueue.pop();
    state.parseErrorDescription = `Unexpected end of file. ${lastBracket} was never found.`;
    state.parseError = true;
  }

  if (state.parseError)
  {
    JSCLog('error', `Error parsing ${fileName}`, jscLogConfig);
    JSCLog('error', state.parseErrorDescription, jscLogConfig);
  }

  return !state.parseError;
}

function printInit(ctx)
{
  ctx.outputQueue = [];
}

function runAfterInit(ctx)
{
  ctx.runAfterQueue = [];
}

function assignAppHeaders(ctx, headers)
{
  ctx.appHeaders = Object.assign(ctx.appHeaders, headers);
}

function sanitizeForHTMLOutput(inputText)
{
  return String(inputText).replace(/[&<>"'`=/]/g, (s) => symbolsToSanitize[s]);
}

function setTempWorkDirectory(siteConfig, jscLogConfig)
{
  let { canUpload, siteName, tempWorkDirectory } = siteConfig;

  let setupSuccess = true;

  if (tempWorkDirectory && canUpload)
  {
    if (fsPath.isAbsolute(tempWorkDirectory))
    {
      JSCLog('error', `Temporary work directory path ${tempWorkDirectory} must be specified as relative to ${getSiteNameOrNoName(siteName)}.`, jscLogConfig);
      setupSuccess = false;
    }
    else
    {
      tempWorkDirectory = fsPath.join(siteConfig.fullSitePath, tempWorkDirectory);
      siteConfig.tempWorkDirectory = getDirectoryPathAndCheckIfWritable(tempWorkDirectory, '', jscLogConfig);
      setupSuccess = (typeof(siteConfig.tempWorkDirectory) !== 'undefined');
    }
  }

  return setupSuccess;
}

function doDeleteFile(thisFile, jscLogConfig)
{
  fs.stat(thisFile.path, jscCallback((err) =>
  {
    if (err)
    {
      if (err.code !== 'ENOENT')
      {
        JSCLog('warning', `Could not delete unhandled uploaded file: ${thisFile.name}`, jscLogConfig);
        JSCLog('warning', `(CONT) On the file system as: ${thisFile.path}`, Object.assign({ e: err }, jscLogConfig));
      }
    }
    else
    {
      fs.unlink(thisFile.path, jscCallback((err) =>
      {
        if (err)
        {
          JSCLog('warning', `Could not delete unhandled uploaded file: ${thisFile.name}`, jscLogConfig);
          JSCLog('warning', `(CONT) On the file system as: ${thisFile.path}`, Object.assign({ e: err }, jscLogConfig));
        }
      }));
    }
  }));
}

const makeFunctionCallListener = (handlerFn) => (isTestMode) ?
  (...params) =>
  {
    const { functionCallListeners: { [handlerFn.name]: { beforeCb } = {} } = {} } = jscTestGlobal;
    beforeCb && beforeCb.apply(null, params);
    return handlerFn.apply({}, params);
  } :
  handlerFn;

function moveToTempWorkDir(thisFile, serverConfig, identifiedSite, responder, pendingWork, resContext, formContext)
{
  const { logging: { siteLogDir, doLogToConsole }, tempWorkDirectory } = identifiedSite;
  const { serverLogDir, general: { logFileSizeThreshold } } = serverConfig.logging;
  const oldFilePath = thisFile.path;
  const newFilePath = fsPath.join(tempWorkDirectory, `jscupload_${crypto.randomBytes(16).toString('hex')}`);

  const jscLogConfig =
  {
    toConsole: doLogToConsole,
    toServerDir: serverLogDir,
    toSiteDir: siteLogDir,
    fileSizeThreshold: logFileSizeThreshold
  };
  
  pendingWork.pendingRenaming++;

  fs.rename(oldFilePath, newFilePath, jscCallback((err) =>
  {
    pendingWork.pendingRenaming--;
    if (err)
    {
      JSCLog('error', `Could not rename unhandled uploaded file: ${thisFile.name}`, jscLogConfig);
      JSCLog('error', `(CONT) Renaming from: ${oldFilePath}`, jscLogConfig);
      JSCLog('error', `(CONT) Renaming to: ${newFilePath}`, Object.assign({ e: err }, jscLogConfig));
    }
    else
    {
      thisFile.path = newFilePath;
    }
    
    if (pendingWork.pendingRenaming <= 0)
    {
      responder(serverConfig, identifiedSite, resContext, { formContext });
    }
  }));
}

function handleRequestTimeoutMonitoring(reqMonCtx, req, res, requestTimeoutSecs, site, jscLogConfig)
{
  return jscCallback(() => {
    ((reqMonCtx.postedForm || {}).openedFiles || []).forEach((thisFile) =>
    {
      fs.stat(thisFile.path, jscCallback((err) =>
      {
        if (err) { return; }
        fs.unlink(thisFile.path, jscCallback((err) =>
        {
          if (!err) { return; }
          JSCLog('warning', `Could not delete unhandled uploaded file: ${thisFile.name}`, jscLogConfig);
          JSCLog('warning', `(CONT) On the file system as: ${thisFile.path}`, Object.assign({ e: err }, jscLogConfig));
        }));
      }));
    });
    sendTimeoutExceeded(requestTimeoutSecs, { req, res, serverConfig, identifiedSite: site, requestTickTockId: reqMonCtx.requestTickTockId });
  });
}

const doMoveToTempWorkDir = makeFunctionCallListener(moveToTempWorkDir);

const doHandleRequestTimeoutMonitoring = makeFunctionCallListener(handleRequestTimeoutMonitoring);

function deleteUnhandledFiles(unhandledFiles, jscLogConfig)
{
  Object.keys(unhandledFiles).forEach((name) =>
  {
    const fileInfo = unhandledFiles[name];
    if (Array.isArray(fileInfo))
    {
      fileInfo.forEach((thisFile) =>
      {
        doDeleteFile(thisFile, jscLogConfig);
      });

    }
    else
    {
      doDeleteFile(fileInfo, jscLogConfig);
    }
  });
}

function doneWith(serverConfig, identifiedSite, ctx, id, isCancellation)
{
  if (id)
  {
    delete ctx.waitForQueue[id];
  }

  if (isCancellation)
  {
    return;
  }

  const { serverLogDir, general: { logFileSizeThreshold } } = serverConfig.logging;
  const { logging: { siteLogDir, doLogToConsole }, siteHostName, siteName } = identifiedSite;

  if (Object.keys(ctx.waitForQueue).length === 0)
  {
    if (ctx.runAfterQueue && ctx.runAfterQueue.length)
    {
      const cb = ctx.runAfterQueue.shift();
      const waitForId = createWaitForCallback(serverConfig, identifiedSite, ctx, cb);
      ctx.waitForQueue[waitForId]();
    }
    else
    {
      const { runtimeException, runFileName, reqObject, resObject, compileTimeError, statusCode, requestTickTockId } = ctx;
      let formUploadErrorOccurred = ctx.formUploadErrorOccurred;

      const formFiles = ctx.uploadedFiles;
      if (formFiles && !formUploadErrorOccurred)
      {
        try
        {
          deleteUnhandledFiles(formFiles, { doLogToConsole, serverLogDir, siteLogDir });
        }
        catch(e)
        {
          JSCLog('error', `Site: ${siteName}: Application error when processing ${runFileName}.`, { e });
          formUploadErrorOccurred = true;
        }
      }

      if (runtimeException)
      {
        ctx.outputQueue = [];
        JSCLog('error', `Site: ${siteName}: Runtime error on file ${runFileName}: ${extractErrorFromRuntimeObject(runtimeException)}`,
          {
            e: runtimeException,
            toConsole: doLogToConsole,
            toServerDir: serverLogDir,
            toSiteDir: siteLogDir,
            fileSizeThreshold: logFileSizeThreshold
          });
      }

      if (runtimeException || compileTimeError || formUploadErrorOccurred)
      {
        handleError5xx(reqObject, resObject, serverConfig, identifiedSite, requestTickTockId);
        return;
      }
      else
      {
        let showContents = true;
        if (ctx.redirection.willHappen)
        {
          const { httpStatusCode, location, delay } = ctx.redirection;
          resObject.statusCode = httpStatusCode;
          if (delay)
          {
            resObject.setHeader('Refresh', `${delay}; ${location}`);
          }
          else
          {
            resObject.setHeader('Location', location);
            showContents = false;
          }
        }
        else
        {
          resObject.statusCode = statusCode;
        }
        resEnd(reqObject, resObject, { doLogToConsole, serverLogDir, siteLogDir, logFileSizeThreshold, siteHostName, requestTickTockId }, showContents ? (ctx.outputQueue || []).join('') : '');
      }
    }
  }
}

function finishUpHeaders(ctx)
{
  const { appHeaders, resObject } = ctx;
  Object.keys(appHeaders).forEach((headerName) => resObject.setHeader(headerName, appHeaders[headerName]));
}

function createWaitForCallback(serverConfig, identifiedSite, rtContext, cb)
{
  const waitForId = rtContext.waitForNextId++;
  
  rtContext.waitForQueue[waitForId] = (...params) =>
  {
    if (!rtContext.runtimeException)
    {
      try
      {
        cb.apply({}, params);
      }
      catch(e)
      {
        rtContext.runtimeException = e;
      }
    }
    doneWith(serverConfig, identifiedSite, rtContext, waitForId);
  };

  return waitForId;
}

function makeRTPromiseHandler(serverConfig, identifiedSite, rtContext, resolve, reject)
{
  const resolverCallback = (err, data) =>
  {
    if (err)
    {
      reject(err);
    }
    else
    {
      resolve(data);
    }
  };

  const waitForId = createWaitForCallback(serverConfig, identifiedSite, rtContext, resolverCallback);
  return rtContext.waitForQueue[waitForId];
}

function cancelDefaultRTPromises(serverConfig, identifiedSite, rtContext, defaultSuccessWaitForId, defaultErrorWaitForId, isCancellation)
{
  let isErrorCancellation = isCancellation;
  if (defaultSuccessWaitForId)
  {
    doneWith(serverConfig, identifiedSite, rtContext, defaultSuccessWaitForId, isCancellation);
    isErrorCancellation = true;
  }

  if (defaultErrorWaitForId)
  {
    doneWith(serverConfig, identifiedSite, rtContext, defaultErrorWaitForId, isErrorCancellation);
  }
}

function doneWithPromiseCounterActor(serverConfig, identifiedSite, rtContext, promiseContext, promiseActorType)
{
  const counterActorId = (promiseActorType === PROMISE_ACTOR_TYPE_SUCCESS) ?
    promiseContext.errorWaitForId :
    promiseContext.successWaitForId;
  if (counterActorId)
  {
    doneWith(serverConfig, identifiedSite, rtContext, counterActorId);
  }
}

function makeCustomRtPromiseActor(serverConfig, identifiedSite, rtContext, promiseContext, promiseActorType, defaultSuccessWaitForId, defaultErrorWaitForId, actorCallback)
{
  return (actorCallback) ?
    (...params) =>
    {
      try
      {
        actorCallback.apply({}, params);
      }
      catch(e)
      {
        rtContext.runtimeException = e;
      }

      doneWithPromiseCounterActor(serverConfig, identifiedSite, rtContext, promiseContext, promiseActorType);
      cancelDefaultRTPromises(serverConfig, identifiedSite, rtContext, defaultSuccessWaitForId, defaultErrorWaitForId, true);
    } :
    () =>
    {
      doneWithPromiseCounterActor(serverConfig, identifiedSite, rtContext, promiseContext, promiseActorType);
      cancelDefaultRTPromises(serverConfig, identifiedSite, rtContext, defaultSuccessWaitForId, defaultErrorWaitForId, true);
    };
}

function makeRTOnSuccessOnErrorHandlers(serverConfig, identifiedSite, rtContext, promiseContext, defaultSuccessWaitForId, defaultErrorWaitForId)
{
  const rtOnSuccess = (successCallback) =>
  {
    const cb = makeCustomRtPromiseActor(serverConfig, identifiedSite, rtContext, promiseContext, PROMISE_ACTOR_TYPE_SUCCESS, defaultSuccessWaitForId, defaultErrorWaitForId, successCallback);

    promiseContext.successWaitForId = createWaitForCallback(serverConfig, identifiedSite, rtContext, cb);

    return {
      rtOnError
    };
  };

  const rtOnError = (errorCallback) =>
  {
    if (typeof(promiseContext.successWaitForId) === 'undefined')
    {
      return rtOnSuccess()
        .rtOnError(errorCallback);
    }

    promiseContext.customCallback = makeCustomRtPromiseActor(serverConfig, identifiedSite, rtContext, promiseContext, PROMISE_ACTOR_TYPE_ERROR, defaultSuccessWaitForId, defaultErrorWaitForId, errorCallback);

    promiseContext.errorWaitForId = createWaitForCallback(serverConfig, identifiedSite, rtContext, promiseContext.customCallback);
  };

  return {
    rtOnSuccess,
    rtOnError
  };
}

function makeRTPromise(serverConfig, identifiedSite, rtContext, rtPromise)
{
  let defaultSuccessWaitForId;
  let defaultErrorWaitForId;
  const promiseContext =
  {
    successWaitForId: undefined,
    errorWaitForId: undefined,
    customCallback: undefined
  };

  defaultSuccessWaitForId = createWaitForCallback(serverConfig, identifiedSite, rtContext, () =>
  {
    cancelDefaultRTPromises(serverConfig, identifiedSite, rtContext, defaultSuccessWaitForId, defaultErrorWaitForId);
  });

  defaultErrorWaitForId = createWaitForCallback(serverConfig, identifiedSite, rtContext, (e) =>
  {
    rtContext.runtimeException = e;
    
    if (promiseContext.successWaitForId)
    {
      doneWith(serverConfig, identifiedSite, rtContext, promiseContext.successWaitForId, true);
    }

    cancelDefaultRTPromises(serverConfig, identifiedSite, rtContext, defaultSuccessWaitForId, defaultErrorWaitForId);
  });

  new Promise(rtPromise)
    .then(jscThen((...params) =>
    {
      if (promiseContext.successWaitForId)
      {
        rtContext.waitForQueue[promiseContext.successWaitForId].apply({}, params);
      }
      else
      {
        rtContext.waitForQueue[defaultSuccessWaitForId]();
      }
    }))
    .catch(jscCatch((e) =>
    {
      if (promiseContext.errorWaitForId)
      {
        if (promiseContext.customCallback)
        {
          rtContext.waitForQueue[promiseContext.errorWaitForId](e);
        }
        else {
          rtContext.runtimeException = e;

          if (promiseContext.successWaitForId)
          {
            doneWith(serverConfig, identifiedSite, rtContext, promiseContext.successWaitForId);
          }

          cancelDefaultRTPromises(serverConfig, identifiedSite, rtContext, defaultSuccessWaitForId, defaultErrorWaitForId, true);
        }
      }
      else
      {
        rtContext.waitForQueue[defaultErrorWaitForId](e);
      }
    }));

  return makeRTOnSuccessOnErrorHandlers(serverConfig, identifiedSite, rtContext, promiseContext, defaultSuccessWaitForId, defaultErrorWaitForId);
}

function createRunTime(serverConfig, identifiedSite, rtContext)
{
  const { runFileName, getParams, postParams, contentType,
    requestMethod, uploadedFiles, additional, reqObject = {}, resObject = {} } = rtContext;

  const jsCookies = new cookies(reqObject, resObject);

  const pathCheck = runFileName.match(/(.*)\/.*\.jscp$/);
  const currentPath = pathCheck && pathCheck[1] || '/';

  const { serverLogDir, general: { logFileSizeThreshold } } = serverConfig.logging;
  const { fullSitePath, logging: { siteLogDir, doLogToConsole } } = identifiedSite;

  const jscLogConfig =
  {
    toConsole: doLogToConsole,
    toServerDir: serverLogDir,
    toSiteDir: siteLogDir,
    fileSizeThreshold: logFileSizeThreshold
  };

  return Object.freeze({
    getCurrentPath() { return currentPath; },
    unsafePrint(output = '') { rtContext.outputQueue.push(output); return undefined; },
    print(output = '') { rtContext.outputQueue.push(sanitizeForHTMLOutput(output)); return undefined; },
    header(nameOrObject, value)
    {
      assignAppHeaders.apply(this,
        (typeof(nameOrObject) === 'string') ?
          [rtContext, {[nameOrObject]: value}] :
          [].concat(rtContext, nameOrObject)
      );
    },
    waitFor(cb)
    {
      return rtContext.waitForQueue[createWaitForCallback(serverConfig, identifiedSite, rtContext, cb)];
    },
    runAfter(cb)
    {
      rtContext.runAfterQueue.push(cb);
    },
    fileExists(path)
    {
      if (!fsPath.isAbsolute(path))
      {
        path = fsPath.join(fullSitePath, path);
      }

      return makeRTPromise(serverConfig, identifiedSite, rtContext, (resolve, reject) =>
      {
        fs.stat(path, makeRTPromiseHandler(serverConfig, identifiedSite, rtContext, resolve, reject));
      });
    },
    readFile(path, encoding)
    {
      if (!fsPath.isAbsolute(path))
      {
        path = fsPath.join(fullSitePath, path);
      }

      return makeRTPromise(serverConfig, identifiedSite, rtContext, (resolve, reject) =>
      {
        fs.readFile(path, encoding, makeRTPromiseHandler(serverConfig, identifiedSite, rtContext, resolve, reject));
      });
    },
    copyFile(source, destination, overwrite = true)
    {
      if (!fsPath.isAbsolute(source))
      {
        source = fsPath.join(fullSitePath, source);
      }

      if (!fsPath.isAbsolute(destination))
      {
        destination = fsPath.join(fullSitePath, destination);
      }

      return makeRTPromise(serverConfig, identifiedSite, rtContext, (resolve, reject) =>
      {
        if (overwrite)
        {
          fs.copyFile(source, destination, makeRTPromiseHandler(serverConfig, identifiedSite, rtContext, resolve, reject));
        }
        else
        {
          fs.copyFile(source, destination, fs.constants.COPYFILE_EXCL, makeRTPromiseHandler(serverConfig, identifiedSite, rtContext, resolve, reject));
        }
      });
    },
    moveFile(source, destination, overwrite = true)
    {
      if (!fsPath.isAbsolute(source))
      {
        source = fsPath.join(fullSitePath, source);
      }

      if (!fsPath.isAbsolute(destination))
      {
        destination = fsPath.join(fullSitePath, destination);
      }

      return makeRTPromise(serverConfig, identifiedSite, rtContext, (resolve, reject) =>
      {
        if (overwrite)
        {
          fs.rename(source, destination, makeRTPromiseHandler(serverConfig, identifiedSite, rtContext, resolve, reject));
        }
        else
        {
          fs.stat(destination, jscCallback((err) =>
          {
            if (err)
            {
              // If file doesn't exist, then we can proceed with the move operation.
              fs.rename(source, destination, makeRTPromiseHandler(serverConfig, identifiedSite, rtContext, resolve, reject));
            }
            else
            {
              reject({
                Error: `EEXIST: file already exists, movefile '${source}' -> '${destination}'`,
                code: 'EEXIST',
                syscall: 'rename',
                path: source,
                dest: destination
              });
            }
          }));
        }
      });
    },
    deleteFile(path)
    {
      if (!fsPath.isAbsolute(path))
      {
        path = fsPath.join(fullSitePath, path);
      }

      return makeRTPromise(serverConfig, identifiedSite, rtContext, (resolve, reject) =>
      {
        fs.unlink(path, makeRTPromiseHandler(serverConfig, identifiedSite, rtContext, resolve, reject));
      });
    },
    module(moduleName)
    {
      if (fsPath.isAbsolute(moduleName))
      {
        JSCLog('error', `Module name and path ${moduleName} must be specified as relative.`, jscLogConfig);
        return null;
      }
      else
      {
        const modulePath = fsPath.join(fullSitePath, JSCAUSE_WEBSITE_PATH, `${moduleName}.jscm`);
        return require(modulePath);
      }
    },
    getCookie(cookieName = '', options = {})
    {
      const { decodeURIValue = true } = options;
      let value = '';
      if (typeof(cookieName) === 'string')
      {
        if (decodeURIValue)
        {
          value = decodeURIComponent(jsCookies.get(encodeURIComponent(cookieName)) || '');
        }
        else
        {
          value = jsCookies.get(encodeURIComponent(cookieName)) || '';
        }
      }

      return value;
    },
    setCookie(cookieName = '', value = '', options = {})
    {
      if (typeof(cookieName) !== 'string')
      {
        return false;
      }

      let result = false;
      let { expires, maxAge, httpOnly = true, secure, path = '/', domain, sameSite, encodeURIValue = true } = options;

      const { connection = {}, protocol } = reqObject;
      const { encrypted: isEncryptedConnection } = connection || {};

      if (secure && !((protocol === 'https') || isEncryptedConnection))
      {
        throw(new Error('Cookie is secure but the connection is not HTTPS.  Will not send.'));
      }

      if (expires && ((typeof(expires) !== 'object') || !(expires instanceof Date)))
      {
        throw(new Error('Invalid expired value.  Date object expected.'));
      }

      if (maxAge && (typeof(maxAge) !== 'number'))
      {
        maxAge = undefined;
      }

      if (expires && maxAge)
      {
        expires = undefined;
      }

      if (sameSite && ((sameSite !== 'strict') && (sameSite !== 'lax')))
      {
        throw(new Error('Invalid sameSite value.  \'strict\' or \'lax\' expected.'));
      }

      cookieName = encodeURIComponent(cookieName);
      if (encodeURIValue)
      {
        value = encodeURIComponent(value);
      }

      try
      {
        jsCookies.set(cookieName, value || '', {
          expires,
          maxAge,
          httpOnly: !!httpOnly,
          secure,
          path,
          domain,
          sameSite
        });
        result = true;
      }
      catch(e)
      {
        // Throwing as new error, so the line number makes sense to the user.
        // (Otherwise, the line number shown will be that of the cookies compiled module.)
        throw(new Error(e));
      }

      return result;
    },
    deleteCookie(cookieName = '')
    {
      if (typeof(cookieName) !== 'string')
      {
        return false;
      }

      let result = false;

      cookieName = encodeURIComponent(cookieName);

      try
      {
        jsCookies.set(cookieName);
        result = true;
      }
      catch(e)
      {
        // Throwing as new error, so the line number makes sense to the user.
        // (Otherwise, the line number shown will be that of the cookies compiled module.)
        throw(new Error(e));
      }

      return result;
    },
    redirectTo(redirectUrl = '', delayInSeconds)
    {
      if (rtContext.runFileName === '/error4xx.jscp')
      {
        throw(new Error('Endless redirection detected.'));
      }
      else
      {
        Object.assign(rtContext.redirection,
          {
            willHappen: true,
            httpStatusCode: 302,
            location: redirectUrl
          }
        );

        if (typeof(delayInSeconds) === 'number')
        {
          Object.assign(rtContext.redirection,
            {
              delay: delayInSeconds
            }
          );
        }
      }
    },
    resetRedirectTo()
    {
      Object.assign(rtContext.redirection,
        {
          willHappen: false
        }
      );
    },
    getParams,
    postParams,
    contentType,
    requestMethod,
    uploadedFiles,
    additional
  });
}

function extractErrorFromCompileObject(e)
{
  const lineNumberInfo = (e.stack || ':(unknown)').toString().split('\n')[0];
  const lineNumber = lineNumberInfo.split(/.*:([^:]*)$/)[1] || '(unknown)';
  return `${e.message || 'unknown error'} at line ${lineNumber}`;
}

function extractErrorFromRuntimeObject(e)
{
  const lineNumberInfo = e.stack || '<anonymous>::(unknown)';
  const [, fileName = '', potentialFileNumber] = lineNumberInfo.match(/^(.+):(\d+)\n/) || [];
  const atInfo = (potentialFileNumber) ?
    `at file ${fileName}, line ${potentialFileNumber}`
    :
    `at line ${((lineNumberInfo.match(/<anonymous>:(\d*):\d*/i) || [])[1] || '(unknown)')}`
  return `${e.message || 'unknown error'} ${atInfo}`;
}

/* *************************************
   *
   * Server stuff
   *
   ************************************** */
function getUploadedFileInfo(file)
{
  return (
    {
      lastModifiedDate: file.lastModifiedDate,
      name: file.name,
      path: file.path,
      size: file.size,
      type: file.type,
      unsafeName: file.unsafeName
    } 
  );
}

function responder(serverConfig, identifiedSite, baseResContext, { formContext, postContext } = {})
{
  const
    {
      formFiles,
      formData,
      maxSizeExceeded: formMaxSizeExceeded = false,
      forbiddenUploadAttempted: formForbiddenUploadAttempted = false,
      formUploadErrorOccurred = false
    } = formContext || {};
  
  const
    {
      requestBody,
      statusCode,
      maxSizeExceeded = formMaxSizeExceeded,
      forbiddenUploadAttempted = formForbiddenUploadAttempted
    } = postContext || {};

  let postParams;
  let uploadedFiles = {};
  const additional = {};

  switch(baseResContext.contentType)
  {
    case 'formDataWithUpload':
      postParams = formData;
      Object.keys(formFiles).forEach((keyName) =>
      {
        const fileData = formFiles[keyName];
        if (Array.isArray(fileData))
        {
          uploadedFiles[keyName] = fileData.map(getUploadedFileInfo);
        }
        else
        {
          uploadedFiles[keyName] = getUploadedFileInfo(fileData);
        }
      });
      break;
  
    case 'formData':
      postParams = formData;
      break;
    
    case 'jsonData':
      try
      {
        postParams = JSON.parse(Buffer.concat(requestBody).toString());
      }
      catch(e)
      {
        additional.jsonParseError = true;
        postParams = {};
      }
      break;

    default:
      // Assumed postData (application/octet-stream).  Pass it raw.
      postParams = { data: Buffer.concat(requestBody) };
  }

  const resContext = Object.assign({}, baseResContext,
    {
      additional,
      appHeaders: {},
      compileTimeError: false,
      outputQueue: undefined,
      getParams: urlUtils.parse(baseResContext.reqObject.url, true).query,
      postParams,
      redirection: { willHappen: false },
      runAfterQueue: undefined,
      runtimeException: undefined,
      formUploadErrorOccurred,
      statusCode: statusCode || 200,
      uploadedFiles,
      waitForNextId: 1,
      waitForQueue: {}
    }
  );

  if (additional.jsonParseError)
  {
    resContext.statusCode = 400;
  }

  const runTime = createRunTime(serverConfig, identifiedSite, resContext);

  if (!maxSizeExceeded && !forbiddenUploadAttempted)
  {
    if (formUploadErrorOccurred)
    {
      resContext.statusCode = 500;
    }
    else
    {
      const { compiledFiles } = identifiedSite;
      const compiledCode = compiledFiles && compiledFiles[baseResContext.runFileName];
      if (compiledCode)
      {
        printInit(resContext);
        runAfterInit(resContext);
        try
        {
          compiledCode.call({}, runTime);
        }
        catch (e)
        {
          resContext.runtimeException = e;
        }

        assignAppHeaders(resContext, {'Content-Type': 'text/html; charset=utf-8'});

        finishUpHeaders(resContext);
      }
      else
      {
        resContext.compileTimeError = true;
      }
    }
  }
  
  doneWith(serverConfig, identifiedSite, resContext);
}

function responderStaticFileError(e, req, res, serverConfig, identifiedSite, runFileName, requestTickTockId)
{
  const { logging: { serverLogDir, logFileSizeThreshold } } = serverConfig;
  const { siteName, siteHostName, staticFiles, logging: { doLogToConsole, siteLogDir } } = identifiedSite;
  const { fullPath } = staticFiles[runFileName];

  JSCLog('error', `Site ${getSiteNameOrNoName(siteName)}: Cannot serve ${fullPath} file.`,
    {
      e,
      toConsole: doLogToConsole,
      toServerDir: serverLogDir,
      toSiteDir: siteLogDir,
      fileSizeThreshold: logFileSizeThreshold
    });
  res.statusCode = 404;
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Length', 0);
  resEnd(req, res, { doLogToConsole, serverLogDir, siteLogDir, logFileSizeThreshold, siteHostName, requestTickTockId });
}

function responderStatic(req, res, serverConfig, identifiedSite, runFileName, statusCode, { shouldUseFileContents, readStream, fileNotFoundException, requestTickTockId })
{
  const { logging: { serverLogDir, logFileSizeThreshold } } = serverConfig;
  const { siteHostName, staticFiles, logging: { doLogToConsole, siteLogDir } } = identifiedSite;

  const resObject = res;
  const resContext = { appHeaders: {}, resObject };

  const { fileContents, fileContentType, fileSize } = staticFiles[runFileName];

  assignAppHeaders(resContext, {'Content-Type': fileContentType, 'Content-Length': fileSize});
  finishUpHeaders(resContext);
  
  resObject.statusCode = statusCode;

  if (fileNotFoundException)
  {
    responderStaticFileError(fileNotFoundException, req, resObject, serverConfig, identifiedSite, runFileName);
  }
  else if (shouldUseFileContents || !readStream)
  {
    resEnd(req, resObject, { doLogToConsole, serverLogDir, siteLogDir, logFileSizeThreshold, siteHostName, requestTickTockId }, fileContents);
  }
  else
  {
    req.on('close', () =>
    {
      readStream.destroy();
    });

    readStream.on('data', (data) =>
    {
      resObject.write(data);
    });

    readStream.on('end', () =>
    {
      resEnd(req, resObject, { doLogToConsole, serverLogDir, siteLogDir, logFileSizeThreshold, siteHostName, requestTickTockId });
    });

    readStream.on('error', (e) =>
    {
      responderStaticFileError(e, req, resObject, serverConfig, identifiedSite, runFileName);
    });
  }
}

function sendRequestError(errorCode, message, req, res, serverConfig, identifiedSite, requestTickTockId)
{
  const { logging: { serverLogDir, logFileSizeThreshold } } = serverConfig;
  const { siteHostName, logging: { doLogToConsole, siteLogDir } } = identifiedSite;

  JSCLog('error', message,
    {
      toConsole: doLogToConsole,
      toServerDir: serverLogDir,
      toSiteDir: siteLogDir,
      fileSizeThreshold: logFileSizeThreshold
    });
  res.statusCode = errorCode;
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Connection', 'close');
  resEnd(req, res, { doLogToConsole, serverLogDir, siteLogDir, logFileSizeThreshold, siteHostName, requestTickTockId });
}

function sendPayLoadExceeded(maxPayloadSizeBytes, { req, res, serverConfig, identifiedSite, requestTickTockId })
{
  sendRequestError(413, `Payload exceeded limit of ${maxPayloadSizeBytes} bytes`, req, res, serverConfig, identifiedSite, requestTickTockId);
}

function sendTimeoutExceeded(requestTimeoutSecs, { req, res, serverConfig, identifiedSite, requestTickTockId })
{
  sendRequestError(408, `Timeout exceeded limit of ${requestTimeoutSecs} seconds`, req, res, serverConfig, identifiedSite, requestTickTockId);
}

function sendUploadIsForbidden({ req, res, serverConfig, identifiedSite, requestTickTockId })
{
  sendRequestError(403, 'Uploading is forbidden.', req, res, serverConfig, identifiedSite, requestTickTockId);
}

function handleCustomError(staticFileName, compiledFileName, req, res, serverConfig, identifiedSite, requestTickTockId, errorCode)
{
  const { siteHostName, staticFiles, compiledFiles,
    logging: { doLogToConsole, siteLogDir } } = identifiedSite;
  const { logging: { serverLogDir, logFileSizeThreshold } } = serverConfig;
  
  const { headers = {}, method } = req;
  const requestMethod = (method || '').toLowerCase();
  const contentType = (headers['content-type'] || '').toLowerCase();
  const acceptedContent = (headers['accept'] || '').toLowerCase();

  let runFileName = staticFileName;

  const isTextTypeExpected = !!(acceptedContent.match(/,?text\/.+,?/) || contentType.match(/^text\/.+/));

  const staticCode = staticFiles && staticFiles[runFileName];
  const staticCodeExists = (typeof(staticCode) !== 'undefined');

  if (isTextTypeExpected)
  {
    if (staticCodeExists)
    {
      serveStaticContent(req, res, serverConfig, identifiedSite, runFileName, requestTickTockId, errorCode);
      return;
    }

    runFileName = compiledFileName;

    if (compiledFiles && (typeof(compiledFiles[runFileName]) !== 'undefined'))
    {
      const resContext =
      {
        reqObject: req,
        resObject: res,
        requestMethod,
        contentType,
        runFileName,
        requestTickTockId
      };

      const postContext = { requestBody: [], statusCode: errorCode };

      responder(serverConfig, identifiedSite, resContext, { postContext });
      return;
    }
  }

  res.statusCode = errorCode;
  res.setHeader('Content-Type', 'application/octet-stream');
  resEnd(req, res, { doLogToConsole, serverLogDir, siteLogDir, logFileSizeThreshold, siteHostName, requestTickTockId });
}

function handleError4xx(req, res, serverConfig, identifiedSite, requestTickTockId, errorCode = 404)
{
  handleCustomError('/error4xx.html', '/error4xx.jscp', req, res, serverConfig, identifiedSite, requestTickTockId, errorCode);
}

function handleError5xx(req, res, serverConfig, identifiedSite, requestTickTockId, errorCode = 500)
{
  handleCustomError('/error5xx.html', '/error5xx.jscp', req, res, serverConfig, identifiedSite, requestTickTockId, errorCode);
}

function serveStaticContent(req, res, serverConfig, identifiedSite, runFileName, requestTickTockId, statusCode = 200)
{
  const staticContent = identifiedSite.staticFiles[runFileName];
  const { fileContents, fullPath } = staticContent;
  
  if (typeof(fileContents) === 'undefined')
  {
    fs.stat(fullPath, jscCallback((err) =>
    {
      const readStream = (err) ? null : fs.createReadStream(fullPath);
      responderStatic(req, res, serverConfig, identifiedSite, runFileName, statusCode, { readStream, fileNotFoundException: err, requestTickTockId });
    }));
  }
  else
  {
    responderStatic(req, res, serverConfig, identifiedSite, runFileName, statusCode, { shouldUseFileContents: true, requestTickTockId });
  }
}

function makeLogLine(hostName, method, url, statusCode)
{
  return `${new Date().toUTCString()} - ${hostName} - ${method}: ${url} - ${statusCode}`;
}

function resEnd(req, res, { siteHostName, isRefusedConnection, doLogToConsole, serverLogDir, siteLogDir, logFileSizeThreshold, requestTickTockId }, response)
{
  const { method, url } = req;
  const statusCode = `${res.statusCode}${isRefusedConnection && ' (REFUSED)' || ''}`;

  if (doLogToConsole || serverLogDir || siteLogDir)
  {
    JSCLog('raw', makeLogLine(siteHostName, method, url, statusCode),
      {
        toConsole: doLogToConsole,
        toServerDir: serverLogDir,
        toSiteDir: siteLogDir,
        fileSizeThreshold: logFileSizeThreshold
      });
  }

  if (requestTickTockId)
  {
    clearTimeout(requestTickTockId);

    if (isTestMode)
    {
      jscTestGlobal.callbackCalled(); // Because there is a jscCallBack() in the corresponding clearTimeout().
    }
  }

  res.end(response);
}

function incomingRequestHandler(req, res, sitesInServer)
{
  const { headers = {}, headers: { host: hostHeader = '' }, url, method } = req;
  const [/* Deliberately left blank. */, reqHostName = hostHeader] = hostHeader.match(/(.+):\d+$/) || [];
  const requestMethod = (method || '').toLowerCase();
  const isReqMethodValid = ((requestMethod === 'get') || (requestMethod === 'post'));
  const { logging: serverLogging, requestTimeoutSecs } = serverConfig;
  const { serverLogDir, general: { consoleOutputEnabled: serverConsoleOutputEnabled, logFileSizeThreshold } } = serverLogging;
  const identifiedSite = sitesInServer[reqHostName];

  let contentType = (headers['content-type'] || '').toLowerCase();

  if (!identifiedSite || !isReqMethodValid)
  {
    res.statusCode = 403;
    res.setHeader('Content-Type', 'application/octet-stream');
    resEnd(req, res, { doLogToConsole: serverConsoleOutputEnabled, serverLogDir, logFileSizeThreshold, siteHostName: `<unknown: ${reqHostName}>`, isRefusedConnection: true, requestTickTockId: undefined })
    return;
  }

  let { pathname: resourceName } = urlUtils.parse(url, true);
  let indexFileNameAutomaticallyAdded = false;
  if (resourceName.match(/\/$/))
  {
    resourceName += 'index.jscp';
    indexFileNameAutomaticallyAdded = true;
  }

  const [ /* Deliberately empty */ , /* Deliberately empty */ , resourceFileExtension ] = resourceName.match(/(.*)\.([^./]+)$/) || [];

  let initialRunFileName = `${resourceName}${(resourceFileExtension) ? '' : '.jscp' }`;

  // Because the filesystem and the browser may have encoded the same file name differently (UTF NFC vs NFD):
  resourceName = encodeURI(decodeURI(resourceName).normalize('NFD'));
  initialRunFileName = encodeURI(decodeURI(initialRunFileName).normalize('NFD'));

  const
    {
      canUpload, maxPayloadSizeBytes,
      staticFiles, compiledFiles,
      jscpExtensionRequired, includeHttpPoweredByHeader,
      logging: siteLogging
    } = identifiedSite;

  const { siteLogDir, doLogToConsole } = siteLogging;

  const jscLogConfig =
  {
    toConsole: serverConsoleOutputEnabled,
    toServerDir: serverLogDir,
    toSiteDir: siteLogDir,
    fileSizeThreshold: logFileSizeThreshold
  };

  const reqMonContext = {};
  // req.setTimeout() might be more suitable here.  Test extensively.
  const requestTickTockId = !!requestTimeoutSecs && setTimeout(
    doHandleRequestTimeoutMonitoring(reqMonContext, req, res, requestTimeoutSecs, identifiedSite, jscLogConfig),
    requestTimeoutSecs * 1000
  );

  if (includeHttpPoweredByHeader)
  {
    res.setHeader('X-Powered-By', 'jscause');
  }

  if ((initialRunFileName === '/error4xx.jscp') ||
      (initialRunFileName === '/error4xx.html') ||
      (initialRunFileName === '/error5xx.jscp') ||
      (initialRunFileName === '/error5xx.html'))
  {
    handleError4xx(req, res, serverConfig, identifiedSite, requestTickTockId);
    return;
  }

  let compiledCodeExists = (typeof(compiledFiles[initialRunFileName]) !== 'undefined');

  const jscpExtensionDetected = (resourceFileExtension === 'jscp');
  const indexWithNoExtensionDetected = (!resourceFileExtension && (resourceName.match(/\/index$/)));

  if (!indexFileNameAutomaticallyAdded &&
      ((jscpExtensionRequired === 'never') && (jscpExtensionDetected || indexWithNoExtensionDetected)) ||
      ((jscpExtensionRequired === 'always') && (!resourceFileExtension && compiledCodeExists)))
  {
    handleError4xx(req, res, serverConfig, identifiedSite, requestTickTockId);
    return;
  }
  else if (staticFiles[initialRunFileName])
  {
    serveStaticContent(req, res, serverConfig, identifiedSite, initialRunFileName, requestTickTockId);
  }
  else
  {
    if (!compiledCodeExists)
    {
      initialRunFileName = `${resourceName}/index.jscp`;
      compiledCodeExists = (typeof(compiledFiles[initialRunFileName]) !== 'undefined');
    }

    const runFileName = initialRunFileName;

    if (!compiledCodeExists)
    {
      handleError4xx(req, res, serverConfig, identifiedSite, requestTickTockId);
      return;
    }

    const contentLength = parseInt(headers['content-length'] || 0, 10);
    const isUpload = FORMDATA_MULTIPART_RE.test(contentType);
    const incomingForm = ((requestMethod === 'post') &&
                          (isUpload || FORMDATA_URLENCODED_RE.test(contentType)));

    const postedForm = (incomingForm && canUpload) ?
      new formidable.IncomingForm()
      :
      null;

    let maxSizeExceeded = false;
    let forbiddenUploadAttempted = false;
    
    const postedFormData = { params: {}, files: {}, pendingWork: { pendingRenaming: 0 } };

    if (contentLength && maxPayloadSizeBytes && (contentLength > maxPayloadSizeBytes))
    {
      maxSizeExceeded = true;
      sendPayLoadExceeded(maxPayloadSizeBytes, { req, res, serverConfig, identifiedSite, requestTickTockId });
    }
    else if (incomingForm && !canUpload)
    {
      forbiddenUploadAttempted = true;
      sendUploadIsForbidden({ req, res, serverConfig, identifiedSite, requestTickTockId });
    }
    else if (postedForm)
    {
      postedForm.keepExtensions = false;

      postedForm.parse(req);

      postedForm.on('field', (name, value) =>
      {
        postedFormData.params[name] = value;
      });

      postedForm.on('file', (name, file) =>
      {
        file.unsafeName = file.name;
        file.name = sanitizeFilename(file.name, { replacement: '_' }).replace(';', '_');

        if (postedFormData.files[name])
        {
          if (!Array.isArray(postedFormData.files[name]))
          {
            postedFormData.files[name] = [ postedFormData.files[name] ];
          }
          postedFormData.files[name].push(file);
        }
        else
        {
          postedFormData.files[name] = file;
        }
      });

      postedForm.on('progress', function(bytesReceived)
      {
        if (maxPayloadSizeBytes && (bytesReceived > maxPayloadSizeBytes))
        {
          maxSizeExceeded = true;
          sendPayLoadExceeded(maxPayloadSizeBytes, { req, res, serverConfig, identifiedSite, requestTickTockId });
        }
      });

      const formEnd = (err) =>
      {
        const { params: formData, files: formFiles, pendingWork } = postedFormData;
        const postType = (isUpload) ? 'formDataWithUpload' : 'formData';
        let formUploadErrorOccurred = false;

        if (err)
        {
          JSCLog('error', 'Form upload related error.',
            {
              e: err,
              toConsole: doLogToConsole,
              toServerDir: serverLogDir,
              toSiteDir: siteLogDir,
              fileSizeThreshold: logFileSizeThreshold
            });
          formUploadErrorOccurred = true;
        }

        const resContext =
        {
          reqObject: req,
          resObject: res,
          requestMethod,
          contentType: postType,
          runFileName,
          requestTickTockId
        };

        const formContext =
        {
          formFiles,
          formData,
          maxSizeExceeded,
          forbiddenUploadAttempted,
          formUploadErrorOccurred
        };

        let formFilesKeys;
        if (isUpload)
        {
          formFilesKeys = Object.keys(formFiles);

          if (formFilesKeys.length)
          {
            formFilesKeys.forEach((fileKey) =>
            {
              const thisFile = formFiles[fileKey];
              if (Array.isArray(thisFile))
              {
                thisFile.forEach((thisActualFile) =>
                {
                  doMoveToTempWorkDir(thisActualFile, serverConfig, identifiedSite, responder, pendingWork, resContext, formContext);
                });
              }
              else
              {
                doMoveToTempWorkDir(thisFile, serverConfig, identifiedSite, responder, pendingWork, resContext, formContext);
              }
            });
          }
        }

        if (!isUpload || !formFilesKeys || !formFilesKeys.length)
        {
          responder(serverConfig, identifiedSite, resContext, { formContext });
        }
      };

      postedForm.on('error', formEnd);
      postedForm.on('end', formEnd);

      reqMonContext.requestTickTockId = requestTickTockId;
      reqMonContext.postedForm = postedForm;
    }
    else
    {
      let requestBody = [];
      let bodyLength = 0;
      req.on('data', (chunk) =>
      {
        if (canUpload)
        {
          const futureBodyLength = bodyLength + chunk.length;

          if (futureBodyLength && maxPayloadSizeBytes && (futureBodyLength > maxPayloadSizeBytes))
          {
            maxSizeExceeded = true;
            sendPayLoadExceeded(maxPayloadSizeBytes, { req, res, serverConfig, identifiedSite, requestTickTockId });
          }
          else
          {
            bodyLength += chunk.length;
            requestBody.push(chunk);
          }
        }
        else
        {
          forbiddenUploadAttempted = true;
          sendUploadIsForbidden({ req, res, serverConfig, identifiedSite, requestTickTockId });
        }
      }).on('end', () =>
      {
        if (contentType === 'application/json')
        {
          contentType = 'jsonData';
        }

        const resContext =
        {
          reqObject: req,
          resObject: res,
          requestMethod,
          contentType,
          runFileName,
          requestTickTockId
        };
  
        const postContext = { requestBody, maxSizeExceeded, forbiddenUploadAttempted };

        responder(serverConfig, identifiedSite, resContext, { postContext });
      });
    }
  }

  req.on('error', (err) =>
  {
    JSCLog('error', 'Request related error.',
      {
        e: err,
        toConsole: doLogToConsole,
        toServerDir: serverLogDir,
        toSiteDir: siteLogDir,
        fileSizeThreshold: logFileSizeThreshold
      });
  });
}

function runWebServer(runningServer, serverPort, jscLogConfig, options = {})
{
  const { webServer, serverName, sites: sitesInServer } = runningServer;
  
  webServer.on('request', (isTestMode) ?
    (res, req) =>
    {
      try
      {
        incomingRequestHandler(res, req, sitesInServer);
      }
      catch (e)
      {
        JSCLog('error', 'CRITICAL: An application error occurred when processing an incoming request.');
        JSCLog('error', e);
        jscTestGlobal.signalTestEnd(jscTestGlobal, { generalError: true });
      }
    } :
    (res, req) => { incomingRequestHandler(res, req, sitesInServer) }
  );

  webServer.on('error', (e) =>
  {
    JSCLog('error', `Server ${serverName} could not start listening on port ${serverPort}.`, jscLogConfig);
    JSCLog('error', 'Error returned by the server follows:', jscLogConfig);
    JSCLog('error', e.message, jscLogConfig);
    JSCLog('error', `Server ${serverName} (port: ${serverPort}) not started.`, jscLogConfig);
    Object.values(sitesInServer).forEach((site) =>
    {
      JSCLog('error', `- Site ${getSiteNameOrNoName(site.siteName)} not started.`, jscLogConfig);
    });

    if (typeof(options.onServerStartedOrError) === 'function')
    {
      options.onServerStartedOrError();
    }

    JSCLogTerminate({ onTerminateComplete: options.onServerError });

    if (isTestMode)
    {
      // Because there is a jscCallBack() in webServer.listen() below.
      jscTestGlobal.callbackCalled();
    }
  });

  webServer.listen(serverPort, jscCallback(() =>
  {
    JSCLog('info', `Server ${serverName} listening on port ${serverPort}`, jscLogConfig);
    if (typeof(options.onServerStarted) === 'function')
    {
      options.onServerStarted();
    }
    if (typeof(options.onServerStartedOrError) === 'function')
    {
      options.onServerStartedOrError();
    }
  }));
}

function startServer(siteConfig, jscLogConfigBase, options)
{
  const { siteName, siteHostName, sitePort, fullSitePath, enableHTTPS, httpsCertFile: certFileName, httpsKeyFile: keyFileName, logging: siteLogging } = siteConfig;
  let result = true;

  const jscLogConfig = Object.assign({}, jscLogConfigBase,
    {
      toConsole: siteLogging.doLogToConsole,
      toSiteDir: siteLogging.siteLogDir
    });

  let runningServer = runningServers[sitePort];
  let webServer;
  let serverName;

  if (runningServer)
  {
    serverName  = runningServer.serverName;
  }
  else
  {
    serverName = Object.keys(runningServers).length.toString();

    runningServer =
    {
      serverName,
      sites: {}
    };

    if (enableHTTPS)
    {
      const certsPath = fsPath.join(fullSitePath, JSCAUSE_CONF_PATH, JSCAUSE_CERTS_PATH);
      let sslKey;
      let sslCert;

      try
      {
        sslKey = fs.readFileSync(fsPath.join(certsPath, keyFileName));
      }
      catch(e)
      {
        JSCLog('error', `Site ${getSiteNameOrNoName(siteName)}: Cannot read '${keyFileName}' SSL key file.`, jscLogConfig);
        result = false;
      }

      try
      {
        sslCert = fs.readFileSync(fsPath.join(certsPath, certFileName))
      }
      catch(e)
      {
        JSCLog('error', `Site ${getSiteNameOrNoName(siteName)}: Cannot read '${certFileName}' SSL cert file.`, jscLogConfig);
        result = false;
      }


      if (sslKey && sslCert)
      {
        const httpsOptions =
        {
          key: sslKey,
          cert: sslCert,
        };

        try
        {
          webServer = https.createServer(httpsOptions);
        }
        catch(e)
        {
          JSCLog('error', `Site ${getSiteNameOrNoName(siteName)}: An error occurred while attempting to start HTTPS server.`, jscLogConfig);
          JSCLog('error', e.message, Object.assign({ e }, jscLogConfig));
          result = false;
        }
      }
    }
    else
    {
      try
      {
        webServer = http.createServer();
      }
      catch(e)
      {
        JSCLog('error', `Site ${getSiteNameOrNoName(siteName)}: An error occurred while attempting to start HTTP server.`, jscLogConfig);
        JSCLog('error', e.message, Object.assign({ e }, jscLogConfig));
        result = false;
      }
    }
    
    if (webServer)
    {
      runningServer.webServer = webServer;
      runWebServer(runningServer, sitePort, jscLogConfig, options);
      runningServers[sitePort] = runningServer;
    }
  }

  if (result)
  {
    runningServer.sites[siteHostName] = siteConfig;
    JSCLog('info', `Site ${getSiteNameOrNoName(siteName)} at http${enableHTTPS ? 's' : ''}://${siteHostName}:${sitePort}/ assigned to server ${serverName}`, jscLogConfig);
  }

  return result;
}

function readConfigurationFile(name, path = '.', jscLogConfig = {})
{
  let stats;
  let readConfigFile;
  let readSuccess = false;
  const fullPath = fsPath.join(path, name);

  try
  {
    stats = fs.statSync(fullPath);
    readSuccess = true;
  }
  catch (e)
  {
    JSCLog('error', `Cannot find ${name} file.`, Object.assign({ e }, jscLogConfig));
  }

  if (readSuccess)
  {
    readSuccess = false;

    if (stats.isDirectory())
    {
      JSCLog('error', `${name} is a directory.`, jscLogConfig);
    }
    else
    {
      try
      {
        readConfigFile = fs.readFileSync(fullPath, 'utf-8');
        readSuccess = true;
      }
      catch(e)
      {
        JSCLog('error', `Cannot load ${name} file.`, Object.assign({ e }, jscLogConfig));
      }
    }
  }

  if (!readSuccess)
  {
    readConfigFile = undefined;
  }

  return readConfigFile;
}

function readAndProcessJSONFile(jsonFileName, jsonFilePath, jscLogConfig)
{
  let readConfigJSON;
  let finalConfigJSON;

  let readConfigFile = readConfigurationFile(jsonFileName, jsonFilePath, jscLogConfig);

  if (readConfigFile)
  {
    readConfigFile = prepareConfigFileForParsing(readConfigFile);
    readConfigJSON = validateJSONFile(readConfigFile, jsonFileName, jscLogConfig);
    if (readConfigJSON && configFileFreeOfDuplicates(readConfigFile, jsonFileName, jscLogConfig))
    {
      finalConfigJSON = readConfigJSON;
    }
  }

  return finalConfigJSON;
}

function prepareConfiguration(configJSON, allowedKeys, fileName, jscLogConfig = {})
{
  const configKeys = Object.keys(configJSON);
  const configKeysLength = configKeys.length;
  const processedConfigJSON = {};
  let finalProcessedConfigJSON;
  let invalidKeysFound = false;

  for (let i = 0; i < configKeysLength; i++)
  {
    const configKey = configKeys[i] || '';
    const configKeyLowerCase = configKey.toLowerCase();
    if (allowedKeys.indexOf(configKeyLowerCase) === -1)
    {
      const emptyValueReport = (configKey) ? '': ' (empty value)';
      const casingReport = (configKey === configKeyLowerCase) ? '' : ` ("${configKey}")`;
      JSCLog('error', `"${configKeyLowerCase}"${casingReport}${emptyValueReport} is not a valid configuration key.`, jscLogConfig);
      invalidKeysFound = true;
    }
    else
    {
      processedConfigJSON[configKeyLowerCase] = configJSON[configKey];
    }
  }

  if (invalidKeysFound)
  {
    JSCLog('error', `Check that all the keys and values in ${fileName} are valid.`, jscLogConfig);
  }
  else
  {
    finalProcessedConfigJSON = processedConfigJSON;
  }

  return finalProcessedConfigJSON;
}

function createInitialSiteConfig(siteInfo)
{
  const { name: siteName, port: sitePort, rootdirectoryname: rootDirectoryName, enablehttps: enableHTTPS } = siteInfo;
  return Object.assign({}, defaultSiteConfig,
    {
      siteName,
      sitePort,
      rootDirectoryName,
      enableHTTPS: (typeof(enableHTTPS) === 'undefined') ? false : enableHTTPS
    }
  );
}

function checkForUndefinedConfigValue(configKeyName, configValue, requiredKeysNotFound, errorMsgIfFound, jscLogConfig)
{
  if (typeof(configValue) === 'undefined')
  {
    requiredKeysNotFound.push(configKeyName);
  }
  else
  {
    JSCLog('error', `${errorMsgIfFound}`, jscLogConfig);
  }
}

function checkForRequiredKeysNotFound(requiredKeysNotFound, configName, jscLogConfig)
{
  let soFarSoGood = true;
  if (requiredKeysNotFound.length)
  {
    if (requiredKeysNotFound.length === 1)
    {
      JSCLog('error', `${configName}:  The following configuration attribute was not found:`, jscLogConfig);
    }
    else
    {
      JSCLog('error', `${configName}:  The following configuration attributes were not found:`, jscLogConfig);
    }
    requiredKeysNotFound.forEach((keyName) =>
    {
      JSCLog('error', `- ${keyName}`, jscLogConfig);
    });

    soFarSoGood = false;
  }

  return soFarSoGood;
}

function getSiteNameOrNoName(name)
{
  return name ? `'${name}'` : '(no name)';
}

function compileSource(sourceData, jscLogConfig)
{
  const Module = module.constructor;
  Module._nodeModulePaths(fsPath.dirname(''));
  let compiledModule;
  try
  {
    const CONTEXT_HTML = 0;
    const CONTEXT_JAVASCRIPT = 1;

    // Matches '<js', '<JS', /js>' or '/JS>'
    // Adds a prefixing space to distinguish from 
    // '\<js', '\<JS', '/js>', '/JS>', for easy splitting
    // (Otherwise, it would delete whatever character is right before.)
    let unprocessedData = sourceData
      .replace(/^[\s\n]*<html\s*\/>/i, '<js/js>')
      .replace(/([^\\])<js/gi,'$1 <js')
      .replace(/^<js/i,' <js')
      .replace(/([^\\])\/js>/gi, '$1 /js>')
      .replace(/^\/js>/i, ' /js>');
    
    if (!unprocessedData.match(/\n$/))
    {
      // Adding a blank line at the end of the source code avoids a
      // compilation error if the very last line is a // comment.
      unprocessedData += '\n';
    }

    const processedDataArray = [];

    const firstOpeningTag = unprocessedData.indexOf(' <js');
    const firstClosingTag = unprocessedData.indexOf(' /js>');

    let processingContext = ((firstOpeningTag === -1) && (firstClosingTag === -1) || ((firstClosingTag > -1) && ((firstClosingTag < firstOpeningTag) || (firstOpeningTag === -1)))) ?
      CONTEXT_JAVASCRIPT :
      CONTEXT_HTML;

    do
    {
      if (processingContext === CONTEXT_HTML)
      {
        const [processBefore, processAfter] = unprocessedData
          .split(/\s<js([\s\S]*)/);

        unprocessedData = processAfter;

        const printedStuff = (processBefore) ?
          processBefore
            .replace(/\\(<js)/gi,'$1') // Matches '\<js' or '\<JS' and gets rid of the '\'.
            .replace(/\\(\/js>)/gi,'$1') // Matches '\/js>' or '\/JS>' and gets rid of the '\'.
            .replace(/\\/g,'\\\\')
            .replace(/'/g,'\\\'')
            .replace(/[^\S\n]{2,}/g, ' ')
            .replace(/^\s*|\n\s*/g, '\n')
            .split(/\n/)
            .join(' \\n \\\n') :
          '';
      
        if (printedStuff)
        {
          processedDataArray.push(`;rt.unsafePrint('${printedStuff}');`);
        }

        processingContext = CONTEXT_JAVASCRIPT;
      }
      else
      {
        // Assuming processingContext is CONTEXT_JAVASCRIPT

        const [processBefore, processAfter] = unprocessedData
          .split(/\s\/js>([\s\S]*)/);

        if (processBefore.match(/<html\s*\//i))
        {
          JSCLog('warning', 'Site: <html/> keyword found in the middle of code.  Did you mean to put it in the beginning of an HTML section?', jscLogConfig);
        }

        processedDataArray.push(processBefore);
        
        unprocessedData = processAfter;

        processingContext = CONTEXT_HTML;
      }
    } while (unprocessedData);
    
    const processedData = processedDataArray.join('');

    try
    {
      const moduleToCompile = new Module();
      moduleToCompile._compile(`module.exports = function(rt) {${processedData}}`, '');
      compiledModule = moduleToCompile.exports;
    }
    catch (e)
    {
      JSCLog('error', `Site: Compile error: ${extractErrorFromCompileObject(e)}`, Object.assign({ e }, jscLogConfig));
    }
  }
  catch (e)
  {
    JSCLog('error', 'Site: Parsing error, possibly internal.', Object.assign({ e }, jscLogConfig));
  }

  return compiledModule;
}

function processSourceFile(sourceFilePath, siteJSONFilePath, jscLogConfig)
{
  let sourcePath = fsPath.join(...sourceFilePath);
  if (!fsPath.isAbsolute(sourcePath))
  {
    sourcePath = fsPath.join(siteJSONFilePath, JSCAUSE_WEBSITE_PATH, ...sourceFilePath);
  }
  let compileData;
  let compiledSource;
  let stats;

  try
  {
    stats = fs.statSync(sourcePath);
  }
  catch (e)
  {
    JSCLog('error', `Site: Cannot find source file: ${sourcePath}`, Object.assign({ e }, jscLogConfig));
  }

  if (stats)
  {
    if (stats.isDirectory())
    {
      JSCLog('error', `Site: Entry point is a directory: ${sourcePath}`, jscLogConfig);
    }
    else
    {
      try
      {
        compileData = fs.readFileSync(sourcePath, 'utf-8');
      }
      catch(e)
      {
        JSCLog('error', `Site: Cannot load source file: ${sourcePath}`, Object.assign({ e }, jscLogConfig));
      }
    }
  }

  if (typeof(compileData) !== 'undefined')
  {
    const possiblyCompiledSource = compileSource(compileData, jscLogConfig);
    if (typeof(possiblyCompiledSource) === 'function')
    {
      compiledSource = possiblyCompiledSource;
    }
    else
    {
      JSCLog('error', `Site: Could not compile code for ${fsPath.join(...sourceFilePath)}.`, jscLogConfig);
    }
  }

  return compiledSource;
}

function validateSiteRootDirectoryName(directoryName, siteName, jscLogConfig)
{
  let readSuccess = true;
  if (!directoryName)
  {
    if (typeof(directoryName) === 'undefined')
    {
      JSCLog('error', `Site configuration: Site name ${getSiteNameOrNoName(siteName)} is missing rootdirectoryname.`, jscLogConfig);
    }
    else
    {
      JSCLog('error', `Site configuration: Site name ${getSiteNameOrNoName(siteName)}: rootdirectoryname cannot be empty.`, jscLogConfig);
    }
    readSuccess = false;
  }
  else if (typeof(directoryName) !== 'string')
  {
    JSCLog('error', `Site configuration: Site name ${getSiteNameOrNoName(siteName)}: rootdirectoryname expects a string value.`, jscLogConfig);
    readSuccess = false;
  }

  return readSuccess;
}

function parseSiteHostName(processedConfigJSON, siteConfig, requiredKeysNotFound, jscLogConfig)
{
  let soFarSoGood = true;
  const configKeyName = 'hostname';
  const configValue = processedConfigJSON[configKeyName];

  if (typeof(configValue) === 'string')
  {
    if (configValue.replace(/^\s*/g, '').replace(/\s*$/g, ''))
    {
      siteConfig.siteHostName = configValue;
    }
    else
    {
      JSCLog('error', `Site configuration: Site name ${getSiteNameOrNoName(siteConfig.siteName)}: hostname cannot be empty.`, jscLogConfig);
      soFarSoGood = false;
    }
  }
  else
  {
    checkForUndefinedConfigValue(configKeyName, configValue, requiredKeysNotFound, `Site configuration: Site name ${getSiteNameOrNoName(siteConfig.siteName)}: Invalid hostname.  String value expected.`, jscLogConfig);
    soFarSoGood = false;
  }

  return soFarSoGood;
}

function parseCanUpload(processedConfigJSON, siteConfig, requiredKeysNotFound, jscLogConfig)
{
  let soFarSoGood = true;
  const configKeyName = 'canupload';
  const configValue = processedConfigJSON[configKeyName];

  if (typeof(configValue) === 'boolean')
  {
    siteConfig.canUpload = configValue;
  }
  else
  {
    checkForUndefinedConfigValue(configKeyName, configValue, requiredKeysNotFound, `Site configuration: Site name ${getSiteNameOrNoName(siteConfig.siteName)}: Invalid canupload.  Boolean expected.`, jscLogConfig);
    soFarSoGood = false;
  }

  return soFarSoGood;
}

function parseMaxPayLoadSizeBytes(processedConfigJSON, siteConfig, requiredKeysNotFound, jscLogConfig)
{
  let soFarSoGood = true;
  const configKeyName = 'maxpayloadsizebytes';
  const configValue = processedConfigJSON[configKeyName];

  if (typeof(configValue) !== 'undefined')
  {
    const uploadSize = parseFloat(configValue, 10);
    if (!isNaN(uploadSize) && (uploadSize === Math.floor(uploadSize)))
    {
      siteConfig.maxPayloadSizeBytes = uploadSize;
    }
    else
    {
      JSCLog('error', `Site configuration: Site name ${getSiteNameOrNoName(siteConfig.siteName)}: Invalid maxpayloadsizebytes.  Integer number expected.`, jscLogConfig);
      soFarSoGood = false;
    }
  }
  else
  {
    checkForUndefinedConfigValue(configKeyName, configValue, requiredKeysNotFound, `Site configuration: Site name ${getSiteNameOrNoName(siteConfig.siteName)}: maxpayloadsizebytes cannot be empty.`, jscLogConfig);
    soFarSoGood = false;
  }

  return soFarSoGood;
}

function parseMimeTypes(processedConfigJSON, siteConfig, requiredKeysNotFound, jscLogConfig)
{
  let soFarSoGood = true;
  const configKeyName = 'mimetypes';
  const configValue = processedConfigJSON[configKeyName];

  if (typeof(configValue) === 'object')
  {
    siteConfig.mimeTypes.list = Object.assign({}, MIME_TYPES);
    Object.keys(configValue).every((rawValueName) =>
    {
      const valueName = rawValueName.toLowerCase();
      const mimeTypeList = configValue[valueName];
      const allowdNames = ['include', 'exclude'];
      if (allowdNames.indexOf(valueName) === -1)
      {
        JSCLog('error', `Site configuration: Site name ${getSiteNameOrNoName(siteConfig.siteName)}: mimetype has an invalid '${valueName}' name.  Expected: ${allowdNames.map(name => `'${name}'`).join(', ')}.`, jscLogConfig);
        soFarSoGood = false;
      }
      else if ((valueName === 'include') && ((Array.isArray(mimeTypeList)) || (typeof(mimeTypeList) !== 'object')))
      {
        JSCLog('error', `Site configuration: Site name ${getSiteNameOrNoName(siteConfig.siteName)}: mimetype has an invalid 'include' attribute value. Object (key, value) expected.`, jscLogConfig);
        soFarSoGood = false;
      }
      else if ((valueName === 'exclude') && (!Array.isArray(mimeTypeList)))
      {
        JSCLog('error', `Site configuration: Site name ${getSiteNameOrNoName(siteConfig.siteName)}: mimetype has an invalid 'exclude' attribute value. Array expected.`, jscLogConfig);
        soFarSoGood = false;
      }
      else
      {
        (Array.isArray(mimeTypeList) ? mimeTypeList : Object.keys(mimeTypeList)).every((mimeTypeName) =>
        {
          if (typeof(mimeTypeName) === 'string')
          {
            if (mimeTypeName)
            {
              const includeValue = (valueName === 'include') ? mimeTypeList[mimeTypeName.toLowerCase()] : '';
              if (typeof(includeValue) === 'string')
              {
                if (!includeValue && (valueName === 'include'))
                {
                  JSCLog('warning', `Site configuration: Site name ${getSiteNameOrNoName(siteConfig.siteName)}: ${mimeTypeName} mimetype value is empty.  Assumed application/octet-stream.`, jscLogConfig);
                }

                switch(valueName)
                {
                  case 'include':
                    siteConfig.mimeTypes.list[`.${mimeTypeName}`] = includeValue.toLowerCase();
                    break;

                  case 'exclude':
                    delete siteConfig.mimeTypes.list[`.${mimeTypeName}`];
                    break;
                }
              }
              else
              {
                JSCLog('error', `Site configuration: Site name ${getSiteNameOrNoName(siteConfig.siteName)}: mimetype has an invalid ${valueName} value for ${mimeTypeName}.  String expected.`, jscLogConfig);
                soFarSoGood = false;
              }
            }
            else
            {
              JSCLog('error', `Site configuration: Site name ${getSiteNameOrNoName(siteConfig.siteName)}: mimetype name cannot be empty.`, jscLogConfig);
              soFarSoGood = false;
            }
          }
          else
          {
            JSCLog('error', `Site configuration: Site name ${getSiteNameOrNoName(siteConfig.siteName)}: mimetype has an invalid ${valueName} name.  String expected.`, jscLogConfig);
            soFarSoGood = false;
          }
          return soFarSoGood;
        });
      }
      return soFarSoGood;
    });
  }
  else
  {
    checkForUndefinedConfigValue(configKeyName, configValue, requiredKeysNotFound, `Site configuration: Site name ${getSiteNameOrNoName(siteConfig.siteName)}: Invalid mimetypes.  Object expected.`, jscLogConfig);
    soFarSoGood = false;
  }

  return soFarSoGood;
}

function parseTempWorkDirectory(processedConfigJSON, siteConfig, requiredKeysNotFound, jscLogConfig)
{
  let soFarSoGood = true;
  const configKeyName = 'tempworkdirectory';
  const configValue = processedConfigJSON[configKeyName];

  if (typeof(configValue) === 'string')
  {
    const dirName = configValue.replace(/^\s*/g, '').replace(/\s*$/g, '');
    if (dirName)
    {
      siteConfig.tempWorkDirectory = dirName;
    }
    else
    {
      JSCLog('error', `Site configuration: Site name ${getSiteNameOrNoName(siteConfig.siteName)}: tempworkdirectory cannot be empty.`, jscLogConfig);
      soFarSoGood = false;
    }
  }
  else
  {
    checkForUndefinedConfigValue(configKeyName, configValue, requiredKeysNotFound, `Site configuration: Site name ${getSiteNameOrNoName(siteConfig.siteName)}: Invalid tempworkdirectory.  String value expected.`, jscLogConfig);
    soFarSoGood = false;
  }

  return soFarSoGood;
}

function parseJscpExtensionRequired(processedConfigJSON, siteConfig, requiredKeysNotFound, jscLogConfig)
{
  let soFarSoGood = true;
  const configKeyName = 'jscpextensionrequired';
  const configValue = processedConfigJSON[configKeyName];

  if (typeof(configValue) === 'string')
  {
    if (configValue)
    {
      const finalValue = configValue.toLowerCase();
      switch(finalValue)
      {
        case 'never':
        case 'optional':
        case 'always':
          siteConfig.jscpExtensionRequired = finalValue;
          break;
        default:
          JSCLog('error', `Site configuration: Site name ${getSiteNameOrNoName(siteConfig.siteName)}: Invalid jscpextensionrequired value.  Use 'never' (recommended), 'optional' or 'always'.`, jscLogConfig);
          soFarSoGood = false;
      }
    }
    else
    {
      JSCLog('error', `Site configuration: Site name ${getSiteNameOrNoName(siteConfig.siteName)}: jscpextensionrequired cannot be empty.  Use 'never' (recommended), 'optional' or 'always'.`, jscLogConfig);
      soFarSoGood = false;
    }
  }
  else
  {
    checkForUndefinedConfigValue(configKeyName, configValue, requiredKeysNotFound, `Site configuration: Site name ${getSiteNameOrNoName(siteConfig.siteName)}: Invalid jscpextensionrequired.  String value expected.`, jscLogConfig);
    soFarSoGood = false;
  }

  return soFarSoGood;
}

function parseHttpPoweredByHeader(processedConfigJSON, siteConfig, requiredKeysNotFound, jscLogConfig)
{
  let soFarSoGood = true;
  const configKeyName = 'httppoweredbyheader';
  const configValue = processedConfigJSON[configKeyName];

  if (typeof(configValue) === 'string')
  {
    if (configValue)
    {
      const finalValue = configValue.toLowerCase();
      switch(finalValue)
      {
        case 'include':
        case 'exclude':
          siteConfig.includeHttpPoweredByHeader = (finalValue === 'include');
          break;
        default:
          JSCLog('error', `Site configuration: Site name ${getSiteNameOrNoName(siteConfig.siteName)}: Invalid httppoweredbyheader value.  Use 'include' or 'exclude'.`, jscLogConfig);
          soFarSoGood = false;
      }
    }
    else
    {
      JSCLog('error', `Site configuration: Site name ${getSiteNameOrNoName(siteConfig.siteName)}: httppoweredbyheader cannot be empty.  Use 'include' or 'exclude'.`, jscLogConfig);
      soFarSoGood = false;
    }
  }
  else
  {
    checkForUndefinedConfigValue(configKeyName, configValue, requiredKeysNotFound, `Site configuration: Site name ${getSiteNameOrNoName(siteConfig.siteName)}: Invalid httppoweredbyheader.  String value expected.`, jscLogConfig);
    soFarSoGood = false;
  }

  return soFarSoGood;
}

function parsePerSiteLogging(processedConfigJSON, siteConfig, requiredKeysNotFound, jscLogConfig, rootDir)
{
  const { siteName, fullSitePath } = siteConfig;
  const configKeyName = 'logging';
  const configValue = processedConfigJSON[configKeyName];
  let soFarSoGood = true;

  if (typeof(configValue) === 'object' && !Array.isArray(configValue))
  {
    const loggingConfigValues = {};
    Object.keys(configValue).forEach((keyName) =>
    {
      loggingConfigValues[keyName.toLocaleLowerCase()] = configValue[keyName];
    });
    
    const perSiteData =
    {
      siteName,
      perSiteDirectoryName: loggingConfigValues.directoryname,
      fullSitePath
    };

    const loggingConfig = validateLoggingConfigSection(loggingConfigValues, { serverWide: false, perSiteData }, jscLogConfig, rootDir);

    siteConfig.logging = loggingConfig;
    soFarSoGood = !!loggingConfig;
  }
  else
  {
    checkForUndefinedConfigValue(configKeyName, configValue, requiredKeysNotFound, `Site configuration: Site name ${getSiteNameOrNoName(siteConfig.siteName)}: Invalid logging.  Object expected.`, jscLogConfig);
    soFarSoGood = false;
  }

  return soFarSoGood;
}

function parseHttpsCertFile(processedConfigJSON, siteConfig, requiredKeysNotFound, jscLogConfig)
{
  let soFarSoGood = true;
  const configKeyName = 'httpscertfile';
  const configValue = processedConfigJSON[configKeyName];

  if (typeof(configValue) === 'string')
  {
    if (configValue)
    {
      siteConfig.httpsCertFile = configValue;
    }
    else
    {
      JSCLog('error', `Site configuration: Site name ${getSiteNameOrNoName(siteConfig.siteName)}: httpscertfile cannot be empty.`, jscLogConfig);
      soFarSoGood = false;
    }
  }
  else
  {
    checkForUndefinedConfigValue(configKeyName, configValue, requiredKeysNotFound, `Site configuration: Site name ${getSiteNameOrNoName(siteConfig.siteName)}: Invalid httpscertfile.  String value expected.`, jscLogConfig);
    soFarSoGood = false;
  }

  return soFarSoGood;
}

function parseHttpsKeyFile(processedConfigJSON, siteConfig, requiredKeysNotFound, jscLogConfig)
{
  let soFarSoGood = true;
  const configKeyName = 'httpskeyfile';
  const configValue = processedConfigJSON[configKeyName];

  if (typeof(configValue) === 'string')
  {
    if (configValue)
    {
      siteConfig.httpsKeyFile = configValue;
    }
    else
    {
      JSCLog('error', `Site configuration: Site name ${getSiteNameOrNoName(siteConfig.siteName)}: httpskeyfile cannot be empty.`, jscLogConfig);
      soFarSoGood = false;
    }
  }
  else
  {
    checkForUndefinedConfigValue(configKeyName, configValue, requiredKeysNotFound, `Site configuration: Site name ${getSiteNameOrNoName(siteConfig.siteName)}: Invalid httpskeyfile.  String value expected.`, jscLogConfig);
    soFarSoGood = false;
  }

  return soFarSoGood;
}

function analyzeSymbolicLinkStats(state, siteConfig, fileName, currentDirectoryPath, allFiles, fullPath, currentDirectoryElements, maxFilesOrDirInDirectory, jscLogConfig)
{
  let { soFarSoGood, directoriesToProcess, pushedFiles } = state;
  const { siteName } = siteConfig;

  let linkStats;
  const symlinkList = [];
  do
  {
    const linkedFileName = fs.readlinkSync(fullPath);
    const linkIsFullPath = fsPath.isAbsolute(linkedFileName);
    let linkedPath;
    if (linkIsFullPath)
    {
      linkedPath = linkedFileName;
    }
    else
    {
      linkedPath = fsPath.join(currentDirectoryPath, linkedFileName);
    }

    try
    {
      linkStats = fs.lstatSync(linkedPath);
    }
    catch (e)
    {
      soFarSoGood = false;
      JSCLog('error', `Site ${getSiteNameOrNoName(siteName)}: Cannot find link:`, jscLogConfig);
      JSCLog('error', `- ${fullPath} --> ${linkedFileName}`, Object.assign({ e }, jscLogConfig));
    }

    if (soFarSoGood)
    {
      if (linkStats.isDirectory())
      {
        const symlinkSourceDirElements = [...currentDirectoryElements, fileName];
        const dirElements = (linkIsFullPath) ? [linkedPath] : symlinkSourceDirElements;
        directoriesToProcess.push({ symlinkSourceDirElements, dirElements });
      }
      else if (linkStats.isSymbolicLink())
      {
        if (symlinkList.indexOf(linkedPath) === -1)
        {
          symlinkList.push(linkedPath);
          fullPath = linkedPath;
        }
        else
        {
          JSCLog('error', `Site ${getSiteNameOrNoName(siteName)}: Circular symbolic link reference:`, jscLogConfig);
          symlinkList.forEach(symlinkPath =>
          {
            JSCLog('error', `- ${symlinkPath}`, jscLogConfig);
          });
          soFarSoGood = false;
        }
      }
      else
      {
        if (pushedFiles < maxFilesOrDirInDirectory)
        {
          allFiles.push({ fileName, symlinkTarget: linkedPath });
          if (!linkedPath) // No need to count them here because they will be counted elsewhere.
          {
            pushedFiles++;
          }
        }
        else
        {
          JSCLog('error', `Site ${getSiteNameOrNoName(siteName)}: Too many files and/or directories (> ${maxFilesOrDirInDirectory}) in directory (circular reference?):`, jscLogConfig);
          JSCLog('error', `- ${currentDirectoryPath}`, jscLogConfig);
          soFarSoGood = false;
        }
      }
    }
  }
  while(soFarSoGood && linkStats.isSymbolicLink());

  return { soFarSoGood, directoriesToProcess, pushedFiles };
}

function processStaticFile(state, siteConfig, fileEntry, fileName, stats, fullPath, jscLogConfig, unitTestingContext = {})
{
  const
    {
      JSCLog: JSCLogFn = JSCLog,
      maxCacheableFileSizeBytes = MAX_CACHEABLE_FILE_SIZE_BYTES,
      maxCachedFilesPerSite = MAX_CACHED_FILES_PER_SITE
    } = unitTestingContext;
  const { siteName } = siteConfig;
  let { soFarSoGood, cachedStaticFilesSoFar } = state;
  fileEntry.fileType = 'static';

  const extName = String(fsPath.extname(fileName)).toLowerCase();

  const fileContentType = siteConfig.mimeTypes.list[extName] || 'application/octet-stream';

  let fileContents;

  const fileSize = stats.size;

  if (fileSize <= maxCacheableFileSizeBytes)
  {
    if (cachedStaticFilesSoFar < maxCachedFilesPerSite)
    {
      try
      {
        fileContents = fs.readFileSync(fullPath);
      }
      catch(e)
      {
        JSCLogFn('error', `Site ${getSiteNameOrNoName(siteName)}: Cannot load ${fullPath} file.`, Object.assign({ e }, jscLogConfig));
        soFarSoGood = false;
      }

      if (soFarSoGood)
      {
        cachedStaticFilesSoFar++;
        if (cachedStaticFilesSoFar === maxCachedFilesPerSite)
        {
          JSCLogFn('warning', `Site ${getSiteNameOrNoName(siteName)}: Reached the maximum amount of cached static files (${maxCachedFilesPerSite}). The rest of static files will be loaded and served upon request.`, jscLogConfig);
        }
      }
    }
  }

  if (soFarSoGood)
  {
    Object.assign(fileEntry, { fileContents, fileContentType, fullPath, fileSize });
  }

  return { soFarSoGood, cachedStaticFilesSoFar }
}

function prepareStatFileEntry(fileEntry, fileName, currentDirectoryElements, currentSymlinkSourceDirectoryElements)
{
  fileEntry.filePath = [...currentDirectoryElements, fileName];
  if (currentSymlinkSourceDirectoryElements)
  {
    fileEntry.symlinkSourceFilePath = [...currentSymlinkSourceDirectoryElements, fileName];
  }
}

function analyzeFileStats(state, siteConfig, fileName, currentDirectoryPath, allFiles, fullPath, stats, filePathsList, jscmFilesList, currentDirectoryElements, currentSymlinkSourceDirectoryElements, maxFilesOrDirInDirectory, jscLogConfig)
{
  const { siteName } = siteConfig;
  let
    {
      directoriesProcessedSoFar, soFarSoGood, directoriesToProcess,
      pushedFiles, cachedStaticFilesSoFar
    } = state;
  if (stats.isDirectory())
  {
    if (directoriesProcessedSoFar >= MAX_DIRECTORIES_TO_PROCESS)
    {
      soFarSoGood = false;
      JSCLog('error', `Too many processed so far (> ${MAX_DIRECTORIES_TO_PROCESS}) (circular reference?):`, jscLogConfig);
      JSCLog('error', `- ${fullPath}`, jscLogConfig);
    }
    else if ((directoriesProcessedSoFar - directoriesToProcess.length) > MAX_PROCESSED_DIRECTORIES_THRESHOLD)
    {
      soFarSoGood = false;
      JSCLog('error', `Too many directories left to process (> ${MAX_PROCESSED_DIRECTORIES_THRESHOLD}) (circular reference?):`, jscLogConfig);
      JSCLog('error', `- ${fullPath}`, jscLogConfig);
    }
    else
    {
      const dirElements = [...currentDirectoryElements, fileName];
      directoriesToProcess.push({ dirElements });
      directoriesProcessedSoFar++;
    }
  }
  else if (stats.isSymbolicLink())
  {
    Object.assign(state, analyzeSymbolicLinkStats(state, siteConfig, fileName, currentDirectoryPath, allFiles, fullPath, currentDirectoryElements, maxFilesOrDirInDirectory, jscLogConfig));
    pushedFiles = state.pushedFiles;
    soFarSoGood = state.soFarSoGood;
  }
  else if (fileName.match(/\.jscm$/)) // Ignore jscm files.
  {
    // But let's process them in case they have compile-time errors.
    if (pushedFiles < maxFilesOrDirInDirectory)
    {
      let fileEntry = {};
      prepareStatFileEntry(fileEntry, fileName, currentDirectoryElements, currentSymlinkSourceDirectoryElements);
      jscmFilesList.push(fileEntry);
      pushedFiles++;
    }
    else
    {
      JSCLog('error', `Site ${getSiteNameOrNoName(siteName)}: Too many files and/or directories (> ${maxFilesOrDirInDirectory}) in directory:`, jscLogConfig);
      JSCLog('error', `- ${currentDirectoryPath}`, jscLogConfig);
      soFarSoGood = false;
    }
  }
  else
  {
    let fileEntry = {};
    if (fileName.match(/\.jscp$/))
    {
      fileEntry.fileType = 'jscp';
    }
    else
    {
      // Static files.
      Object.assign(state, processStaticFile(state, siteConfig, fileEntry, fileName, stats, fullPath, jscLogConfig));
      soFarSoGood = state.soFarSoGood;
      cachedStaticFilesSoFar = state.cachedStaticFilesSoFar;
    }

    if (soFarSoGood)
    {
      if (pushedFiles < maxFilesOrDirInDirectory)
      {
        prepareStatFileEntry(fileEntry, fileName, currentDirectoryElements, currentSymlinkSourceDirectoryElements);
        filePathsList.push(fileEntry);
        pushedFiles++;
      }
      else
      {
        JSCLog('error', `Site ${getSiteNameOrNoName(siteName)}: Too many files and/or directories (> ${maxFilesOrDirInDirectory}) in directory:`, jscLogConfig);
        JSCLog('error', `- ${currentDirectoryPath}`, jscLogConfig);
        soFarSoGood = false;
      }
    }
  }

  return {
    directoriesProcessedSoFar, soFarSoGood, directoriesToProcess,
    pushedFiles, cachedStaticFilesSoFar
  };
}

function getDirectoryPathAndCheckIfWritable(directoryName, errorMsgPrefix = '', jscLogConfig)
{
  let finalDirectoryPath;
  let stats;
  let readSuccess = true;

  if (typeof(directoryName) === 'string')
  {
    try
    {
      stats = fs.statSync(directoryName);
    }
    catch (e)
    {
      JSCLog('error', `${errorMsgPrefix}Cannot find directory: ${directoryName}`, Object.assign({ e }, jscLogConfig));
      readSuccess = false;
    }
  
    let linkedPath;
    if (readSuccess && stats.isSymbolicLink())
    {
      linkedPath = fs.readlinkSync(directoryName);
      try
      {
        stats = fs.lstatSync(linkedPath);
      }
      catch (e)
      {
        JSCLog('error', `${errorMsgPrefix}Cannot find link:`, jscLogConfig);
        JSCLog('error', `- ${directoryName} --> ${linkedPath}`, Object.assign({ e }, jscLogConfig));
        readSuccess = false;
      }
    }
  
    if (readSuccess)
    {
      if (stats.isDirectory())
      {
        finalDirectoryPath = linkedPath || directoryName;
      }
      else
      {
        JSCLog('error', `${errorMsgPrefix}${directoryName}${(linkedPath) ? ` --> ${linkedPath}` : ''} is not a directory.`, jscLogConfig);
        readSuccess = false;
      }
    }
  
    if (readSuccess)
    {
      try
      {
        fs.accessSync(finalDirectoryPath, fs.constants.W_OK);
      }
      catch (e)
      {
        JSCLog('error', `${errorMsgPrefix}${directoryName}${(linkedPath) ? ` --> ${linkedPath}` : ''} is not writeable.`, jscLogConfig);
        readSuccess = false;
      }
    }

    if (!readSuccess)
    {
      finalDirectoryPath = undefined;
    }
  }
  else
  {
    JSCLog('error', `${errorMsgPrefix}${directoryName} is not of a valid type.  String expected.`, jscLogConfig);
  }

  return finalDirectoryPath;
}

function parseSitesConfigJSON(processedConfigJSON, { requiredKeysNotFound }, jscLogConfig = {})
{
  let allSitesInServer;
  const configValue = processedConfigJSON.sites;

  if (Array.isArray(configValue))
  {
    if  (configValue.length)
    {
      allSitesInServer = configValue;
    }
    else
    {
      JSCLog('error', 'Configuration:  sites cannot be empty.', jscLogConfig);
    }
  }
  else
  {
    checkForUndefinedConfigValue('sites', configValue, requiredKeysNotFound, 'Server configuration:  Expected an array of sites.', jscLogConfig);
  }

  return allSitesInServer;
}

function parseLoggingConfigJSON(processedConfigJSON, jscLogConfig)
{
  let loggingInfo = {};
  let result = true;
  const configValue = processedConfigJSON.logging;

  if ((typeof(configValue) === 'object') && !Array.isArray(configValue))
  {
    Object.keys(configValue).every((configKey) =>
    {
      const keyValue = configValue[configKey];
      const configKeyLowerCase = configKey.toLowerCase();
      switch(configKeyLowerCase)
      {
        case 'general':
        case 'persite':
          Object.assign(loggingInfo, { [configKeyLowerCase]: {} });
          if ((typeof(keyValue) === 'object') && !Array.isArray(keyValue))
          {
            Object.keys(keyValue).every((attributeKey) =>
            {
              const attributeKeyLowerCase = attributeKey.toLowerCase();
              switch(attributeKeyLowerCase)
              {
                case 'fileoutput':
                case 'directoryname':
                case 'consoleoutput':
                case 'logfilesizethreshold':
                  Object.assign(loggingInfo[configKeyLowerCase], { [attributeKeyLowerCase]: keyValue[attributeKey] });
                  break;
                default:
                  JSCLog('error', `Configuration: logging: ${configKey}: ${attributeKey} is not a valid configuration key.`, jscLogConfig);
                  result = false;
              }

              return result;
            });
          }
          else
          {
            JSCLog('error', 'Configuration: logging:  Invalid value for general.  Object expected.', jscLogConfig);
            result = false;
          }
          break;
        default:
          JSCLog('error', `Configuration: logging:  ${configKey} is not a valid configuration key.`, jscLogConfig);
          result = false;
      }
      return result;
    });
  }
  else
  {
    if (typeof(configValue) !== 'undefined')
    {
      JSCLog('error', 'Server configuration:  Expected a valid logging configuration value.', jscLogConfig);
      result = false;
    }
  }

  return result && loggingInfo;
}

function parseRequestTimeoutSecsConfigJSON(processedConfigJSON, { requiredKeysNotFound }, jscLogConfig = {})
{
  const { requesttimeoutsecs } = processedConfigJSON;
  let timeoutInSecs;
  const configValue = parseInt((typeof(requesttimeoutsecs) === 'undefined') ? 0 : requesttimeoutsecs, 10);

  if (!isNaN(configValue) && (configValue >= 0))
  {
    timeoutInSecs = configValue;
  }
  else
  {
    checkForUndefinedConfigValue('sites', configValue, requiredKeysNotFound, 'Server configuration: requesttimeoutsecs: Expected number; 0 or greater.', jscLogConfig);
  }

  return timeoutInSecs;
}

function validateLoggingConfigSection(loggingInfo, { serverWide = true, perSite = false, perSiteData = {} } = {}, jscLogConfig = {}, additionalToRootDir = '')
{
  let readSuccess = true;
  let doDirectoryCheck = true;
  let loggingConfig;

  let directoryPath;
  let fileOutputEnabled;
  let consoleOutputEnabled;

  // Let's check for invalid entries.
  const validEntries = ['directoryname', 'fileoutput', 'consoleoutput', 'logfilesizethreshold'];

  Object.keys(loggingInfo || {}).every((infoKey) =>
  {
    if (!validEntries.includes(infoKey))
    {
      JSCLog('error', `Site configuration: Logging: '${infoKey}' is not a valid configuration key.`, jscLogConfig);
      readSuccess = false;
    }
  });

  if (!readSuccess)
  {
    return;
  }

  // Let's check the specified directory.
  let
    {
      directoryname: directoryName,
      fileoutput: fileOutput = (serverWide && !perSite) ? 'enabled' : 'disabled',
      consoleoutput: consoleOutput = 'enabled',
      logfilesizethreshold: logFileSizeThreshold
    } = loggingInfo || {};
  let perSiteFileOutputEnabled;
  let perSiteConsoleOutputEnabled;

  if (perSite)
  {
    if (serverWide)
    {
      if (typeof(directoryName) !== 'undefined')
      {
        JSCLog('error', 'Site configuration: Logging: \'perSite\' section must not have a \'directoryName\' configuration key.', jscLogConfig);
        readSuccess = false;
      }

      if (typeof(logFileSizeThreshold) !== 'undefined')
      {
        JSCLog('error', 'Site configuration: Logging: \'perSite\' section must not have a \'logfilesizethreshold\' configuration key.', jscLogConfig);
        readSuccess = false;
      }
    }
  }
  else
  {
    if (serverWide)
    {
      directoryName = directoryName || 'logs';

      if (typeof(logFileSizeThreshold) === 'undefined')
      {
        logFileSizeThreshold = 0;
      }
      else if (typeof(logFileSizeThreshold) === 'number')
      {
        if (logFileSizeThreshold < 0)
        {
          JSCLog('error', 'Site configuration: Logging: \'logfilesizethreshold\' must be 0 or greater.', jscLogConfig);
          readSuccess = false;
        }
      }
      else
      {
        JSCLog('error', 'Site configuration: Logging: \'logfilesizethreshold\' is invalid.  Integer number expected.', jscLogConfig);
        readSuccess = false;
      }
    }
    else
    {
      let { siteName = '', perSiteDirectoryName = null, fullSitePath = '' } = perSiteData;
      if (typeof(logFileSizeThreshold) !== 'undefined')
      {
        JSCLog('error', `Site configuration: '${siteName}' site logging: 'perSite' section must not have a 'logfilesizethreshold' configuration key.`, jscLogConfig);
        readSuccess = false;
      }
      else if (perSiteDirectoryName && typeof(perSiteDirectoryName) !== 'string')
      {
        JSCLog('error', `Site configuration: '${siteName}' site logging: Invalid directoryname.  String expected.`, jscLogConfig);
        readSuccess = false;
      }
      else if (perSiteDirectoryName)
      {
        if (fsPath.isAbsolute(perSiteDirectoryName))
        {
          JSCLog('error', `Site configuration: '${siteName}' site logging: directoryname must be a relative path.`, jscLogConfig);
          readSuccess = false;
        }
        else
        {
          directoryName = fsPath.join(fullSitePath, perSiteDirectoryName);
        }
      }
      else
      {
        if (loggingInfo.fileoutput === 'enabled') // The actual value must be checked here, not fileOutput since it could hold a default value.
        {
          if (perSiteDirectoryName === null)
          {
            JSCLog('error', `Site configuration: '${siteName}' site logging: directoryname is missing.`, jscLogConfig);
          }
          else
          {
            JSCLog('error', `Site configuration: '${siteName}' site logging: directoryname cannot be empty.`, jscLogConfig);
          }
          readSuccess = false;
        }
        else
        {
          doDirectoryCheck = false;
        }
      }
    }

    if (readSuccess && doDirectoryCheck)
    {
      if (!fsPath.isAbsolute(directoryName))
      {
        directoryName = fsPath.join(RUNTIME_ROOT_DIR, additionalToRootDir, directoryName);
      }
      if (serverWide)
      {
        directoryPath = getDirectoryPathAndCheckIfWritable(directoryName, 'Server configuration: Logging: directoryName: ', jscLogConfig);
      }
      else
      {
        directoryPath = getDirectoryPathAndCheckIfWritable(directoryName, `Site configuration: ${getSiteNameOrNoName(perSiteData.siteName)} logging: directoryName: `, jscLogConfig);
      }
      readSuccess = (typeof(directoryPath) !== 'undefined');
    }
  }

  if (readSuccess)
  {
    readSuccess = false;
    // Let's check if there is a fileOutput configuration value.
    if (typeof(fileOutput) === 'string')
    {
      const fileOutputLowerCase = fileOutput.toLowerCase();

      if (fileOutputLowerCase === 'per site')
      {
        if (serverWide && perSite)
        {
          fileOutputEnabled = false;
          perSiteFileOutputEnabled = true;
          readSuccess = true;
        }
      }
      else
      {
        if (doDirectoryCheck)
        {
          fileOutputEnabled = (fileOutputLowerCase === 'enabled');
          readSuccess = (fileOutputEnabled || (fileOutputLowerCase === 'disabled'));
        }
        else
        {
          fileOutputEnabled = false;
          readSuccess = true;
        }
      }
    }

    if (!readSuccess)
    {
      JSCLog('error', 'Site configuration: Logging: fileoutput must be either \'enabled\' or \'disabled\'.', jscLogConfig);
    }
  }
  
  if (readSuccess)
  {
    readSuccess = false;
    // Let's check if there is a consoleOutput configuration value.
    if (typeof(consoleOutput) === 'string')
    {
      const consoleOutputLowerCase = consoleOutput.toLowerCase();

      if (serverWide && perSite && (consoleOutputLowerCase === 'per site'))
      {
        consoleOutputEnabled = false;
        perSiteConsoleOutputEnabled = true;
        readSuccess = true;
      }
      else
      {
        consoleOutputEnabled = (consoleOutputLowerCase === 'enabled');
        readSuccess = (consoleOutputEnabled || (consoleOutputLowerCase === 'disabled'));
      }
    }

    if (!readSuccess)
    {
      JSCLog('error', 'Site configuration: Logging: consoleOutput must be either \'enabled\' or \'disabled\'.', jscLogConfig);
    }
  }
  
  if (readSuccess)
  {
    loggingConfig =
    {
      fileOutputEnabled,
      consoleOutputEnabled
    };

    if (!(serverWide && perSite))
    {
      loggingConfig.directoryPath = directoryPath || null;
    }

    if (typeof(perSiteFileOutputEnabled) !== 'undefined')
    {
      loggingConfig.perSiteFileOutputEnabled = perSiteFileOutputEnabled;
    }

    if (typeof(perSiteConsoleOutputEnabled) !== 'undefined')
    {
      loggingConfig.perSiteConsoleOutputEnabled = perSiteConsoleOutputEnabled;
    }

    if (typeof(logFileSizeThreshold) !== 'undefined')
    {
      loggingConfig.logFileSizeThreshold = logFileSizeThreshold;
    }
  }

  return loggingConfig;
}

function setupSiteLoggingForRequests(siteName, siteConfigLogging, serverConfigLogging, jscLogConfig)
{
  let readSuccess = true;
  const updatedConfigLogging = Object.assign({}, siteConfigLogging);
  const
    {
      general:
      {
        consoleOutputEnabled: serverConsoleOutputEnabled
      },
      perSite:
      {
        fileOutputEnabled: perSitePermanentFileOutputEnabled,
        perSiteFileOutputEnabled: perSiteOptionalFileOutputEnabled,
        consoleOutputEnabled: perSitePermanentConsoleOutputEnabled,
        perSiteConsoleOutputEnabled: perSiteOptionalConsoleOutputEnabled
      }
    } = serverConfigLogging;

  if ((updatedConfigLogging.fileOutputEnabled !== perSitePermanentFileOutputEnabled) && !perSiteOptionalFileOutputEnabled)
  {
    JSCLog('warning', `Site configuration: Site ${getSiteNameOrNoName(siteName)} has file logging ${updatedConfigLogging.fileOutputEnabled ? 'enabled' : 'disabled'} while the server has per-site file logging ${(perSitePermanentFileOutputEnabled) ? 'enabled' : 'disabled'}.`, jscLogConfig);
    JSCLog('warning', '- Server configuration prevails.', jscLogConfig);
    updatedConfigLogging.fileOutputEnabled = perSitePermanentFileOutputEnabled;

    if (!updatedConfigLogging.directoryPath)
    {
      JSCLog('error', `Site configuration: Site ${getSiteNameOrNoName(siteName)}: logging directoryname cannot be empty.`, jscLogConfig);
      readSuccess = false;
    }
  }

  if ((updatedConfigLogging.consoleOutputEnabled !== perSitePermanentConsoleOutputEnabled) && !perSiteOptionalConsoleOutputEnabled)
  {
    JSCLog('warning', `Site configuration: Site ${getSiteNameOrNoName(siteName)} has console logging ${updatedConfigLogging.consoleOutputEnabled ? 'enabled' : 'disabled'} while the server has per-site console logging ${(perSitePermanentConsoleOutputEnabled) ? 'enabled' : 'disabled'}.`, jscLogConfig);
    JSCLog('warning', '- Server configuration prevails.', jscLogConfig);
    updatedConfigLogging.consoleOutputEnabled = perSitePermanentConsoleOutputEnabled;
  }

  updatedConfigLogging.doLogToConsole = !!(serverConsoleOutputEnabled ||
    perSitePermanentConsoleOutputEnabled ||
    (perSiteOptionalConsoleOutputEnabled && updatedConfigLogging.consoleOutputEnabled));

  const doOutputToSiteDir = perSitePermanentFileOutputEnabled ||
    (perSiteOptionalFileOutputEnabled && updatedConfigLogging.fileOutputEnabled);
  
  updatedConfigLogging.siteLogDir = doOutputToSiteDir && updatedConfigLogging.directoryPath;

  return readSuccess && updatedConfigLogging;
}

/* *****************************************************
 *
 * Reading and processing the server configuration file
 *
 *******************************************************/

function loadVendorModules()
{
  let allVendorModulesLoaded = true;
  
  const cookies = vendor_require('./jscvendor/cookies');
  allVendorModulesLoaded = allVendorModulesLoaded && !!cookies;
  
  const formidable = vendor_require('./jscvendor/formidable');
  allVendorModulesLoaded = allVendorModulesLoaded && !!formidable;
  
  const sanitizeFilename = vendor_require('./jscvendor/node-sanitize-filename');
  allVendorModulesLoaded = allVendorModulesLoaded && !!sanitizeFilename;
  
  if (!allVendorModulesLoaded)
  {
    JSCLog('error', 'CRITICAL: One or more vendor modules did not load.  JSCause will now terminate.');
    process.exit(1);
  }

  return { cookies, formidable, sanitizeFilename };
}

function startApplication(options = { rootDir: undefined })
{
  const { rootDir: alternateRootDir } = options;
  initializeGlobals();

  JSCLog('raw', `*** JSCause Server version ${JSCAUSE_APPLICATION_VERSION}`);

  let atLeastOneSiteStarted = false;
  let readSuccess = false;
  let allSitesInServer;
  let serverWideLoggingInfo;
  let requestTimeoutSecs;

  let jscLogBase =
  {
    toConsole: true
  };

  const globalConfigJSON = readAndProcessJSONFile(JSCAUSE_CONF_FILENAME, alternateRootDir, jscLogBase);

  if (globalConfigJSON)
  {
    const allAllowedKeys =
    [
      'sites',
      'logging',
      'requesttimeoutsecs'
    ];

    const requiredKeysNotFound = [];

    let processedConfigJSON = prepareConfiguration(globalConfigJSON, allAllowedKeys, JSCAUSE_CONF_FILENAME, jscLogBase);

    let soFarSoGood = !!processedConfigJSON;
    
    // sites
    if (soFarSoGood)
    {
      allSitesInServer = parseSitesConfigJSON(processedConfigJSON, { requiredKeysNotFound }, jscLogBase);
      soFarSoGood = !!allSitesInServer;
    }

    // logging
    if (soFarSoGood)
    {
      serverWideLoggingInfo = parseLoggingConfigJSON(processedConfigJSON, jscLogBase);
      soFarSoGood = !!serverWideLoggingInfo;
    }

    // requesttimeoutsecs
    if (soFarSoGood)
    {
      requestTimeoutSecs = parseRequestTimeoutSecsConfigJSON(processedConfigJSON, jscLogBase);
      soFarSoGood = (typeof(requestTimeoutSecs) !== 'undefined');
    }

    const allRequiredKeys = checkForRequiredKeysNotFound(requiredKeysNotFound, 'Server configuration', jscLogBase);

    readSuccess = soFarSoGood && allRequiredKeys;
  }

  /* *****************************************************
  *
  * Processing the server's logging configuration
  *
  *******************************************************/
  if (readSuccess)
  {
    readSuccess = false;
    const generalLogging = validateLoggingConfigSection(serverWideLoggingInfo.general, {}, jscLogBase, alternateRootDir);
    
    if (generalLogging)
    {
      const { fileOutputEnabled: doOutputToServerDir, directoryPath: serverLogDir } = generalLogging;
      serverConfig.logging =
      {
        general: generalLogging,
        serverLogDir: doOutputToServerDir && serverLogDir
      };
      
      jscLogBase =
      {
        toConsole: serverConfig.logging.general.consoleOutputEnabled,
        toServerDir: serverConfig.logging.serverLogDir,
        fileSizeThreshold: serverConfig.logging.general.logFileSizeThreshold
      };
    }

    const perSiteLogging = generalLogging && validateLoggingConfigSection(serverWideLoggingInfo.persite, { perSite: true }, jscLogBase, alternateRootDir);
    
    if (generalLogging && perSiteLogging)
    {
      serverConfig.logging.perSite = perSiteLogging;
      readSuccess = true;
    }
  }

  /* *****************************************************
  *
  * Reading and processing the sites' configuration files
  *
  *******************************************************/

  const allSiteConfigs = [];
  let allReadySiteNames = [];
  let allFailedSiteNames = [];
  let allSiteNames = [];
  let allConfigCombos = [];

  if (readSuccess)
  {
    let jscLogBaseWithSite = Object.assign({}, jscLogBase);
    let jscLogSite;

    const allAllowedSiteKeys =
    [
      'name',
      'port',
      'rootdirectoryname',
      'enablehttps'
    ];
    
    const allSitesInServerLength = allSitesInServer.length;

    for (let i = 0; i < allSitesInServerLength; i++)
    {
      readSuccess = true;

      const thisUnprocessedServerSite = allSitesInServer[i];

      let thisServerSite = prepareConfiguration(thisUnprocessedServerSite, allAllowedSiteKeys, JSCAUSE_CONF_FILENAME, jscLogBase);

      if (thisServerSite)
      {
        const siteConfig = createInitialSiteConfig(thisServerSite);

        const { siteName, sitePort, rootDirectoryName: siteRootDirectoryName, enableHTTPS } = siteConfig;

        if (siteName)
        {
          if (typeof(siteName) === 'string')
          {
            if (allSiteNames.indexOf(siteName) === -1)
            {
              allSiteNames.push(siteName);
            }
            else
            {
              JSCLog('error', `Site configuration: Site name '${siteName}' is not unique.`, jscLogBase);
              readSuccess = false;
            }
          }
          else
          {
            JSCLog('error', `Site configuration: Site name has an invalid value, ${siteName}. String expected.`, jscLogBase);
            readSuccess = false;
          }
        }
        else
        {
          JSCLog('error', 'Site configuration: Missing name.', jscLogBase);
          readSuccess = false;
        }

        if (readSuccess)
        {
          if (typeof(sitePort) !== 'undefined')
          {
            const portNumber = parseFloat(sitePort, 10);
            if (!isNaN(portNumber) && (portNumber === Math.floor(portNumber)))
            {
              siteConfig.sitePort = portNumber;
            }
            else
            {
              JSCLog('error', `Site configuration:  Site name ${getSiteNameOrNoName(siteName)} has an invalid port.  Integer number expected.`, jscLogBase);
              readSuccess = false;
            }
          }
          else
          {
            JSCLog('error', `Site configuration: Site name ${getSiteNameOrNoName(siteName)} is missing port.`, jscLogBase);
            readSuccess = false;
          }
        }

        readSuccess = readSuccess && validateSiteRootDirectoryName(siteRootDirectoryName, siteName, jscLogBase);

        let siteJSONFilePath;
        if (readSuccess)
        {
          if (fsPath.isAbsolute(siteRootDirectoryName))
          {
            JSCLog('error', `Site configuration: ${getSiteNameOrNoName(siteName)}: Site root directory name ${siteRootDirectoryName} cannot be specified as an absolute path.  Directory name expected.`, jscLogBase);
            readSuccess = false;
          }
          else
          {
            siteJSONFilePath = getDirectoryPathAndCheckIfWritable(fsPath.join(alternateRootDir || '', JSCAUSE_SITES_PATH, siteRootDirectoryName), '', jscLogBase);
            readSuccess = (typeof(siteJSONFilePath) !== 'undefined');
          }
        }

        if (readSuccess)
        {
          if (typeof(enableHTTPS) !== 'boolean')
          {
            JSCLog('error', `Site configuration: Site name ${getSiteNameOrNoName(siteName)} has an invalid 'enablehttps' value.  Boolean expected.`, jscLogBase);
            readSuccess = false;
          }
        }

        if (readSuccess)
        {
          siteConfig.fullSitePath = fsPath.join(RUNTIME_ROOT_DIR, siteJSONFilePath);

          JSCLog('info', `Reading configuration for site '${siteName}' from '${siteJSONFilePath}'`, jscLogBase);
          const siteConfigJSON = readAndProcessJSONFile(JSCAUSE_SITECONF_FILENAME, siteJSONFilePath, jscLogBase);
          
          readSuccess = !!siteConfigJSON;

          if (readSuccess)
          {
            const allAllowedKeys =
            [
              'hostname',
              'tempworkdirectory',
              'canupload',
              'maxpayloadsizebytes',
              'mimetypes',
              'jscpextensionrequired',
              'httppoweredbyheader',
              'httpscertfile',
              'httpskeyfile',
              'logging'
            ];

            const requiredKeysNotFound = [];

            let processedConfigJSON = prepareConfiguration(siteConfigJSON, allAllowedKeys, JSCAUSE_SITECONF_FILENAME, jscLogBase);

            let soFarSoGood = !!processedConfigJSON;
            let parseHttpsCertResult = false;
            let parseHttpsKeyResult = false;

            if (soFarSoGood)
            {
              soFarSoGood = parsePerSiteLogging(processedConfigJSON, siteConfig, requiredKeysNotFound, jscLogBase, alternateRootDir);

              const updatedConfigLogging = soFarSoGood && setupSiteLoggingForRequests(siteName, siteConfig.logging, serverConfig.logging, jscLogBase);
              soFarSoGood = !!updatedConfigLogging;

              if (soFarSoGood)
              {
                siteConfig.logging = updatedConfigLogging;
                const { doLogToConsole: toConsole, siteLogDir: toSiteDir } = siteConfig.logging;

                jscLogSite = { toConsole, toSiteDir };
    
                jscLogBaseWithSite = Object.assign({}, jscLogBase, jscLogSite);
              }

              soFarSoGood = parseSiteHostName(processedConfigJSON, siteConfig, requiredKeysNotFound, jscLogBaseWithSite) && soFarSoGood;
              soFarSoGood = parseCanUpload(processedConfigJSON, siteConfig, requiredKeysNotFound, jscLogBaseWithSite) && soFarSoGood;
              soFarSoGood = parseMaxPayLoadSizeBytes(processedConfigJSON, siteConfig, requiredKeysNotFound, jscLogBaseWithSite) && soFarSoGood;
              soFarSoGood = parseMimeTypes(processedConfigJSON, siteConfig, requiredKeysNotFound, jscLogBaseWithSite) && soFarSoGood;
              soFarSoGood = parseTempWorkDirectory(processedConfigJSON, siteConfig, requiredKeysNotFound, jscLogBaseWithSite) && soFarSoGood;
              soFarSoGood = parseJscpExtensionRequired(processedConfigJSON, siteConfig, requiredKeysNotFound, jscLogBaseWithSite) && soFarSoGood;
              soFarSoGood = parseHttpPoweredByHeader(processedConfigJSON, siteConfig, requiredKeysNotFound, jscLogBaseWithSite) && soFarSoGood;
              
              parseHttpsCertResult = parseHttpsCertFile(processedConfigJSON, siteConfig, requiredKeysNotFound, jscLogBaseWithSite);
              parseHttpsKeyResult = parseHttpsKeyFile(processedConfigJSON, siteConfig, requiredKeysNotFound, jscLogBaseWithSite);
            }

            let fileMissingIndex = requiredKeysNotFound.indexOf('httpscertfile');
            if (siteConfig.enableHTTPS || (fileMissingIndex === -1))
            {
              soFarSoGood = soFarSoGood && parseHttpsCertResult;
            }
            else
            {
              // Certs file entry does not exist, let's ignore this since https is not enabled.
              requiredKeysNotFound.splice(fileMissingIndex, 1);
            }

            fileMissingIndex = requiredKeysNotFound.indexOf('httpskeyfile');
            if (siteConfig.enableHTTPS || (fileMissingIndex === -1))
            {
              soFarSoGood = soFarSoGood && parseHttpsKeyResult;
            }
            else
            {
              // Key file entry does not exist, let's ignore this since https is not enabled.
              requiredKeysNotFound.splice(fileMissingIndex, 1);
            }

            const allRequiredKeys = checkForRequiredKeysNotFound(requiredKeysNotFound, 'Site configuration', jscLogBaseWithSite);

            readSuccess = soFarSoGood && allRequiredKeys;
          }
          else
          {
            JSCLog('error', `Site configuration: Site ${getSiteNameOrNoName(siteName)}: site.json is invalid.`, jscLogBase);
          }

          if (readSuccess)
          {
            const currentSiteHostName = siteConfig.siteHostName.toLowerCase();
            const currentEnableHTTPS = siteConfig.enableHTTPS;
            const currentRootDirectoryName = siteRootDirectoryName.toLowerCase();

            allConfigCombos.forEach((combo) =>
            {
              if (sitePort === combo.sitePort)
              {
                if (currentRootDirectoryName === combo.rootDirectoryName.toLowerCase())
                {
                  JSCLog('error', `Site configuration: Both sites ${getSiteNameOrNoName(combo.siteName)} and ${getSiteNameOrNoName(siteName)} have the same root directory and port combination - '${currentRootDirectoryName}', ${sitePort}`, jscLogBase);
                  JSCLog('error', `Site configuration: ${getSiteNameOrNoName(siteName)} is attempting to use an already existing root directory and port combination - '${currentRootDirectoryName}', ${sitePort}`, jscLogSite);
                  readSuccess = false;
                }

                if (readSuccess)
                {
                  if (currentEnableHTTPS)
                  {
                    readSuccess = combo.enableHTTPS;
                    if (readSuccess)
                    {
                      JSCLog('warning', `Site configuration: Site ${getSiteNameOrNoName(siteName)} is HTTPS, and would be sharing HTTPS port ${sitePort} with ${getSiteNameOrNoName(combo.siteName)}`, jscLogBase);
                      JSCLog('warning', `Site configuration: Site ${getSiteNameOrNoName(siteName)} is using HTTPS in an already assigned HTTPS port, ${sitePort}`, jscLogSite);
                    }
                    else
                    {
                      JSCLog('error', `Site configuration: Site ${getSiteNameOrNoName(siteName)} is HTTPS, and would be sharing HTTP port ${sitePort} with ${getSiteNameOrNoName(combo.siteName)}`, jscLogBase);
                      JSCLog('error', `Site configuration: Site ${getSiteNameOrNoName(siteName)} is attempting to use HTTPS in an already assigned HTTP port, ${sitePort}`, jscLogSite);
                    }
                  }
                  else if (combo.enableHTTPS)
                  {
                    JSCLog('warning', `Site configuration: Site ${getSiteNameOrNoName(siteName)} is HTTP, and is sharing HTTPS port ${sitePort} with ${getSiteNameOrNoName(combo.siteName)}`, jscLogBase);
                    JSCLog('warning', `Site configuration: Site ${getSiteNameOrNoName(siteName)} is using HTTP in an already assigned HTTPS port, ${sitePort}`, jscLogSite);
                  }
                  
                  if (currentSiteHostName === combo.siteHostName.toLowerCase())
                  {
                    JSCLog('error', `Site configuration: Both sites ${getSiteNameOrNoName(combo.siteName)} and ${getSiteNameOrNoName(siteName)} have the same host name and port combination - '${currentSiteHostName}', ${sitePort}`, jscLogBase);
                    JSCLog('error', `Site configuration: ${getSiteNameOrNoName(siteName)}, ${sitePort} is already in use`, jscLogSite);
                    readSuccess = false;
                  }
                }
              }
            });

            if (readSuccess)
            {
              allConfigCombos.push(Object.assign({}, siteConfig));
            }
          }

          let filePathsList;
          let jscmFilesList;
          if (readSuccess)
          {
            let state =
            {
              directoriesProcessedSoFar: 0,
              cachedStaticFilesSoFar: 0,
              directoriesToProcess: [ { dirElements: [''] } ],
              siteConfig,
              pushedFiles: 0,
              soFarSoGood: true
            };

            // Let's read the files.
            readSuccess = false;
            filePathsList = [];
            jscmFilesList = [];

            const websiteRoot = fsPath.join(siteJSONFilePath, JSCAUSE_WEBSITE_PATH);

            const maxFilesOrDirInDirectory = (isTestMode) ? jscTestGlobal.maxUserFilesOrDirs || MAX_FILES_OR_DIRS_IN_DIRECTORY : MAX_FILES_OR_DIRS_IN_DIRECTORY;

            do
            {
              let currentDirectoryPath;
              const { symlinkSourceDirElements: currentSymlinkSourceDirectoryElements, dirElements: currentDirectoryElements } = state.directoriesToProcess.shift();
              const directoryPath = fsPath.join(...currentDirectoryElements);
              if (fsPath.isAbsolute(directoryPath)) // It can happen if more directories were inserted during this iteration.
              {
                currentDirectoryPath = directoryPath;
              }
              else
              {
                currentDirectoryPath = fsPath.join(siteJSONFilePath, JSCAUSE_WEBSITE_PATH, directoryPath);
              }

              state.soFarSoGood = false;
              const isWebsiteRoot = (websiteRoot === currentDirectoryPath);

              if (!isWebsiteRoot)
              {
                state.pushedFiles++;
              }

              if (state.pushedFiles > maxFilesOrDirInDirectory)
              {
                JSCLog('error', `Site ${getSiteNameOrNoName(siteName)}: Too many files and/or directories (> ${maxFilesOrDirInDirectory}) in directory:`, jscLogSite);
                JSCLog('error', `- ${currentDirectoryPath}`, jscLogSite);
                break;
              }

              let allFiles;
              try
              {
                allFiles = fs.readdirSync(currentDirectoryPath);
                state.soFarSoGood = true;
              }
              catch(e)
              {
                JSCLog('error', `Site ${getSiteNameOrNoName(siteName)}: could not read directory: ${currentDirectoryPath}`, Object.assign({ e }, jscLogBaseWithSite));
              }

              if (state.soFarSoGood)
              {
                if (Array.isArray(allFiles))
                {
                  allFiles = allFiles.map(fileName => ({ fileName }));
                }

                let stats;
                let fullPath;
                while (allFiles.length)
                {
                  const { fileName, symlinkTarget } = allFiles.shift();
                  if (fileName.substr(0, 1) === '.')
                  {
                    // Assumed hidden file.  Skip it.
                    continue;
                  }

                  if (!isWebsiteRoot && ((fileName === 'error4xx.jscp') ||
                    (fileName === 'error4xx.html') ||
                    (fileName === 'error5xx.jscp') ||
                    (fileName === 'error5xx.html')))
                  {
                    JSCLog('warning', `Site ${getSiteNameOrNoName(siteName)}: ${fileName} detected in ${currentDirectoryPath} subdirectory. Only error files in the root directory will be used to display custom errors.`, jscLogBaseWithSite);
                  }
            
                  if (symlinkTarget)
                  {
                    fullPath = symlinkTarget;
                  }
                  else
                  {
                    fullPath = fsPath.join(currentDirectoryPath, fileName);
                  }

                  try
                  {
                    stats = fs.lstatSync(fullPath);
                  }
                  catch (e)
                  {
                    state.soFarSoGood = false;
                    JSCLog('error', `Site ${getSiteNameOrNoName(siteName)}: Cannot find ${fullPath}`, Object.assign({ e }, jscLogBaseWithSite));
                  }

                  if (state.soFarSoGood)
                  {
                    Object.assign(state, analyzeFileStats(state, siteConfig, fileName, currentDirectoryPath, allFiles, fullPath, stats, filePathsList, jscmFilesList, currentDirectoryElements, currentSymlinkSourceDirectoryElements, maxFilesOrDirInDirectory, jscLogBaseWithSite));
                  }
                  else
                  {
                    break;
                  }
                }
              }
            }
            while(state.directoriesToProcess.length && state.soFarSoGood);

            readSuccess = state.soFarSoGood;
          }

          if (readSuccess)
          {
            siteConfig.staticFiles = {};
            siteConfig.compiledFiles = {};

            // Make sure that modules compile. If we don't do this, then 
            // the user would get a runtime error.  Better to fail as soon as possible instead.
            jscmFilesList.every(({ filePath }) =>
            {
              readSuccess = (typeof(processSourceFile(filePath, siteJSONFilePath, jscLogBaseWithSite)) !== 'undefined');
              return readSuccess;
            });

            if (readSuccess)
            {
              filePathsList.every((fileEntry) =>
              {
                const { filePath, symlinkSourceFilePath, fileType, fileContentType, fileContents, fullPath, fileSize } = fileEntry;
    
                const webPath = encodeURI((symlinkSourceFilePath || filePath).join('/').normalize('NFD'));
                if (fileType === 'jscp')
                {
                  const processedSourceFile = processSourceFile(filePath, siteJSONFilePath, jscLogBaseWithSite);
                  if (typeof(processedSourceFile) === 'undefined')
                  {
                    readSuccess = false;
                  }
                  else {
                    siteConfig.compiledFiles[webPath] = processedSourceFile;
                  }
                }
                else
                {
                  // fileType assumed 'static'
                  siteConfig.staticFiles[webPath] = { fileContentType, fileContents, fullPath, fileSize };
                }
    
                return readSuccess;
              });
            }
          }

          if (readSuccess)
          {
            if (setTempWorkDirectory(siteConfig, jscLogBaseWithSite))
            {
              // All is well so far.
              if ((siteConfig.maxPayloadSizeBytes || 0) < 0)
              {
                siteConfig.canUpload = false;
              }

              allSiteConfigs.push(siteConfig);
            }
            else
            {
              readSuccess = false;
            }
          }
        }
        else if (readSuccess)
        {
          JSCLog('error', 'Site configuration: invalid or missing rootDirectoryName.', jscLogBaseWithSite);
          readSuccess = false;
        }

        if (readSuccess)
        {
          allReadySiteNames.push(siteName);
        }
        else
        {
          JSCLog('error', `Site ${getSiteNameOrNoName(siteName)} not started.`, jscLogBaseWithSite);
        }
      }
      else
      {
        break;
      }
    }
  }

  allSiteNames = null;

  serverConfig.sites = allSiteConfigs || [];
  serverConfig.sites.forEach((site) =>
  {
    if (startServer(site, jscLogBase, options))
    {
      atLeastOneSiteStarted = true;
    }
    else
    {
      const { siteName } = site;
      allReadySiteNames.splice(allReadySiteNames.indexOf(siteName), 1);

      JSCLog('error', `Site ${getSiteNameOrNoName(siteName)} not started.`, jscLogBase);
      allFailedSiteNames.push(siteName);
    }
  });

  serverConfig.requestTimeoutSecs = requestTimeoutSecs;

  JSCLog('info', '************ All sites\' configuration read at this point ********************', jscLogBase);

  if (allReadySiteNames.length)
  {
    JSCLog('info', 'The following sites were set up successfully:', jscLogBase);
    allReadySiteNames.forEach((name) =>
    {
      JSCLog('info', getSiteNameOrNoName(name), jscLogBase);
    });
  }

  if (allFailedSiteNames.length)
  {
    JSCLog('error', 'The following sites failed to run:', jscLogBase);
    allFailedSiteNames.forEach((name) =>
    {
      JSCLog('error', `- ${getSiteNameOrNoName(name)}`, jscLogBase);
    });
  }

  if (atLeastOneSiteStarted)
  {
    JSCLog('info', 'Will start listening.', jscLogBase);
  }
  else
  {
    JSCLog('error', 'Server not started.  No sites are running.', jscLogBase);
    JSCLogTerminate({ onTerminateComplete: options.onServerError });
  }

  if (!isTestMode)
  {
    process.on('SIGINT', function()
    {
      exitApplication();
    });

    process.on('SIGTERM', function()
    {
      exitApplication();
    });
  }
}

function exitApplication(options = {})
{
  processExitAttempts++;
  if (processExitAttempts === 1)
  {
    if (!isTestMode)
    {
      console.log('\nReceived interrupt signal.  Cleaning up before exiting...');
    }

    JSCLogTerminate(options);
  }
  else if (processExitAttempts === 2)
  {
    console.log('\nStill cleaning on exit.  Try again to exit right away...');
    if (isTestMode)
    {
      console.log('\nWARNING - WARNING - WARNING:  Were we supposed to get here during testing?');
    }
  }
  else
  {
    console.log('\nForcefully terminated.');
    process.exit();
  }
}

function getAllElementsToSupportTesting()
{
  const allElementsToSupportTesting =
  {
    JSCLOG_DATA,
    dateToYYYMMDD_HH0000,
    exitApplication,
    formatLogMessage,
    getCurrentLogFileName,
    processStaticFile,
    startApplication,
    sanitizeForHTMLOutput
  };
  return allElementsToSupportTesting;
}

function runTesting()
{
  console.info('JSCause - Testing mode');

  let jscTest;
  try
  {
    jscTest = require('./jsctest/jsctest.js');
  }
  catch(e)
  {
    console.error('Could not initiate testing.');
    console.error(e);
  }

  if (jscTest)
  {
    jscTest.start(jscTestGlobal, () =>
    {
      console.info('Testing ended.');
      process.exit();
    });
  }
  else {
    console.error('Testing did not run.');
    process.exit(1);
  }
}
