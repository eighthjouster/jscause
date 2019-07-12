'use strict';

const testUtils = require('./testBatteryUtils');

const prepareProcessStaticFileParams = ({ fileSize, maxCacheableFileSizeBytes, maxCachedFilesPerSite, cachedStaticFilesSoFar }) =>
{
  const preparedParams =
    {
      state: { soFarSoGood: true, cachedStaticFilesSoFar },
      siteConfig: { mimeTypes: { list: {} } },
      fileEntry: {},
      stats: { size: fileSize },
      jscLogConfig: { toConsole: false },
      unitTestingContext:
        {
          JSCLog: () => {},
          maxCacheableFileSizeBytes,
          maxCachedFilesPerSite
        }
    };

  return preparedParams;
};

const test_018_001_processStaticFile_maxCacheableFileSize_noThresholdPassed = Object.assign(testUtils.makeFromBaseTest('processStaticFile - max cacheable file size; no threshold passed; smaller size'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const fileName = 'some_static_file_name';
      const fullPathComponents = ['.', fileName];

      this.doEmptyTestDirectory();
      this.tempTestData =
      {
        fileName,
        fullPathComponents
      };
      this.createFile(fullPathComponents, 'some file contents; size irrelevant since it is established elsewhere');
      this.isUnitTest = true;
    },
    onUnitTestStarted()
    {
      const maxCacheableFileSizeBytes = Math.floor(Math.random() * 20) + 10;
      const testFileSize = maxCacheableFileSizeBytes - 1;
      const { jscLib: { processStaticFile } } = this;
      const { fileName, fullPathComponents } = this.tempTestData;
      const fullPath = this.getTestFilePath(fullPathComponents, 'onUnitTestStarted');

      if (fullPath)
      {
        const cacheStateParams = {
          cachedStaticFilesSoFar: 7,
          fileSize: testFileSize,
          maxCacheableFileSizeBytes
        };

        const { state, siteConfig, fileEntry, stats, jscLogConfig, unitTestingContext } = prepareProcessStaticFileParams(cacheStateParams);
        const { soFarSoGood, cachedStaticFilesSoFar } = processStaticFile(state, siteConfig, fileEntry, fileName, stats, fullPath, jscLogConfig, unitTestingContext) || {};
        
        this.testPassed = soFarSoGood && !!fileEntry.fileContents && (cachedStaticFilesSoFar === 8);
      }
    }
  }
);

const test_018_002_processStaticFile_maxCacheableFileSize_noThresholdPassed_pt2 = Object.assign(testUtils.makeFromBaseTest('processStaticFile - max cacheable file size; no threshold passed; same size'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const fileName = 'some_static_file_name_2';
      const fullPathComponents = ['.', fileName];

      this.doEmptyTestDirectory();
      this.tempTestData =
      {
        fileName,
        fullPathComponents
      };
      this.createFile(fullPathComponents, 'some file contents; size irrelevant since it is established elsewhere');
      this.isUnitTest = true;
    },
    onUnitTestStarted()
    {
      const maxCacheableFileSizeBytes = Math.floor(Math.random() * 20) + 10;
      const testFileSize = maxCacheableFileSizeBytes;
      const { jscLib: { processStaticFile } } = this;
      const { fileName, fullPathComponents } = this.tempTestData;
      const fullPath = this.getTestFilePath(fullPathComponents, 'onUnitTestStarted');

      if (fullPath)
      {
        const cacheStateParams = {
          cachedStaticFilesSoFar: 7,
          fileSize: testFileSize,
          maxCacheableFileSizeBytes
        };

        const { state, siteConfig, fileEntry, stats, jscLogConfig, unitTestingContext } = prepareProcessStaticFileParams(cacheStateParams);
        const { soFarSoGood, cachedStaticFilesSoFar } = processStaticFile(state, siteConfig, fileEntry, fileName, stats, fullPath, jscLogConfig, unitTestingContext) || {};
        
        this.testPassed = soFarSoGood && !!fileEntry.fileContents && (cachedStaticFilesSoFar === 8);
      }
    }
  }
);

const test_018_003_processStaticFile_maxCacheableFileSize_thresholdPassed = Object.assign(testUtils.makeFromBaseTest('processStaticFile - max cacheable file size; threshold passed; bigger size'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const fileName = 'some_static_file_name_2';
      const fullPathComponents = ['.', fileName];

      this.doEmptyTestDirectory();
      this.tempTestData =
      {
        fileName,
        fullPathComponents
      };
      this.createFile(fullPathComponents, 'some file contents; size irrelevant since it is established elsewhere');
      this.isUnitTest = true;
    },
    onUnitTestStarted()
    {
      const maxCacheableFileSizeBytes = Math.floor(Math.random() * 20) + 10;
      const testFileSize = maxCacheableFileSizeBytes + 1;
      const { jscLib: { processStaticFile } } = this;
      const { fileName, fullPathComponents } = this.tempTestData;
      const fullPath = this.getTestFilePath(fullPathComponents, 'onUnitTestStarted');

      if (fullPath)
      {
        const cacheStateParams = {
          cachedStaticFilesSoFar: 7,
          fileSize: testFileSize,
          maxCacheableFileSizeBytes
        };

        const { state, siteConfig, fileEntry, stats, jscLogConfig, unitTestingContext } = prepareProcessStaticFileParams(cacheStateParams);
        const { soFarSoGood, cachedStaticFilesSoFar } = processStaticFile(state, siteConfig, fileEntry, fileName, stats, fullPath, jscLogConfig, unitTestingContext) || {};
        
        this.testPassed = soFarSoGood && !fileEntry.fileContents && (cachedStaticFilesSoFar === 7);
      }
    }
  }
);

const test_018_004_processStaticFile_maxCachedFilesPerSite_noThresholdPassed = Object.assign(testUtils.makeFromBaseTest('processStaticFile - max number of cached files per site; no threshold passed; fewer files, no warning'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const filesPath = [ '.' ];
      const fileName = 'some_static_file_name';
      const fullPathComponents = filesPath.concat(fileName);

      this.doEmptyTestDirectory();
      this.tempTestData =
      {
        fileName,
        fullPathComponents
      };
      this.createFile(fullPathComponents, 'some file contents; size irrelevant since it is established elsewhere');
      this.isUnitTest = true;
    },
    onUnitTestStarted()
    {
      const maxCacheableFileSizeBytes = 10;
      const testFileSize = maxCacheableFileSizeBytes - 1;

      const maxCachedFilesPerSite = Math.floor(Math.random() * 10) + 30;
      const initialCachedStaticFilesSoFar = maxCachedFilesPerSite - 2;
      const targetCachedStaticFilesSoFar = initialCachedStaticFilesSoFar + 1;

      const { jscLib: { processStaticFile } } = this;
      const { fileName, fullPathComponents } = this.tempTestData;
      const fullPath = this.getTestFilePath(fullPathComponents, 'onUnitTestStarted');

      if (fullPath)
      {
        const cacheStateParams = {
          cachedStaticFilesSoFar: initialCachedStaticFilesSoFar,
          fileSize: testFileSize,
          maxCacheableFileSizeBytes,
          maxCachedFilesPerSite
        };

        const { state, siteConfig, fileEntry, stats, jscLogConfig, unitTestingContext } = prepareProcessStaticFileParams(cacheStateParams);
        const { soFarSoGood, cachedStaticFilesSoFar } = processStaticFile(state, siteConfig, fileEntry, fileName, stats, fullPath, jscLogConfig, unitTestingContext) || {};
        this.testPassed = soFarSoGood && !!fileEntry.fileContents && (cachedStaticFilesSoFar === targetCachedStaticFilesSoFar);
      }
    }
  }
);

const test_018_005_processStaticFile_maxCachedFilesPerSite_noThresholdPassed_pt2 = Object.assign(testUtils.makeFromBaseTest('processStaticFile - max number of cached files per site; no threshold passed; fewer files, with warning'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const filesPath = [ '.' ];
      const fileName = 'some_static_file_name';
      const fullPathComponents = filesPath.concat(fileName);

      this.doEmptyTestDirectory();
      this.tempTestData =
      {
        fileName,
        fullPathComponents
      };
      this.createFile(fullPathComponents, 'some file contents; size irrelevant since it is established elsewhere');
      this.isUnitTest = true;
    },
    onUnitTestStarted()
    {
      const maxCacheableFileSizeBytes = 10;
      const testFileSize = maxCacheableFileSizeBytes - 1;

      const maxCachedFilesPerSite = Math.floor(Math.random() * 10) + 30;
      const initialCachedStaticFilesSoFar = maxCachedFilesPerSite - 1;
      const targetCachedStaticFilesSoFar = initialCachedStaticFilesSoFar + 1;

      const { jscLib: { processStaticFile } } = this;
      const { fileName, fullPathComponents } = this.tempTestData;
      const fullPath = this.getTestFilePath(fullPathComponents, 'onUnitTestStarted');

      if (fullPath)
      {
        const cacheStateParams = {
          cachedStaticFilesSoFar: initialCachedStaticFilesSoFar,
          fileSize: testFileSize,
          maxCacheableFileSizeBytes,
          maxCachedFilesPerSite
        };

        const { state, siteConfig, fileEntry, stats, jscLogConfig, unitTestingContext } = prepareProcessStaticFileParams(cacheStateParams);

        let gotThresholdWarning = false;
        unitTestingContext.JSCLog = (type, message) =>
        {
          if ((type === 'warning') && (message === `Site (no name): Reached the maximum amount of cached static files (${maxCachedFilesPerSite}). The rest of static files will be loaded and served upon request.`))
          {
            gotThresholdWarning = true;

          }
          console.log('lol', type, message);//__RP
        };
        const { soFarSoGood, cachedStaticFilesSoFar } = processStaticFile(state, siteConfig, fileEntry, fileName, stats, fullPath, jscLogConfig, unitTestingContext) || {};
        this.testPassed = soFarSoGood && gotThresholdWarning && !!fileEntry.fileContents && (cachedStaticFilesSoFar === targetCachedStaticFilesSoFar);
      }
    }
  }
);

const test_018_006_processStaticFile_maxCachedFilesPerSite_thresholdPassed = Object.assign(testUtils.makeFromBaseTest('processStaticFile - max number of cached files per site; threshold passed; same amount of files'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const filesPath = [ '.' ];
      const fileName = 'some_static_file_name';
      const fullPathComponents = filesPath.concat(fileName);

      this.doEmptyTestDirectory();
      this.tempTestData =
      {
        fileName,
        fullPathComponents
      };
      this.createFile(fullPathComponents, 'some file contents; size irrelevant since it is established elsewhere');
      this.isUnitTest = true;
    },
    onUnitTestStarted()
    {
      const maxCacheableFileSizeBytes = 10;
      const testFileSize = maxCacheableFileSizeBytes - 1;

      const maxCachedFilesPerSite = Math.floor(Math.random() * 10) + 30;
      const initialCachedStaticFilesSoFar = maxCachedFilesPerSite;
      const targetCachedStaticFilesSoFar = initialCachedStaticFilesSoFar;

      const { jscLib: { processStaticFile } } = this;
      const { fileName, fullPathComponents } = this.tempTestData;
      const fullPath = this.getTestFilePath(fullPathComponents, 'onUnitTestStarted');

      if (fullPath)
      {
        const cacheStateParams = {
          cachedStaticFilesSoFar: initialCachedStaticFilesSoFar,
          fileSize: testFileSize,
          maxCacheableFileSizeBytes,
          maxCachedFilesPerSite
        };

        const { state, siteConfig, fileEntry, stats, jscLogConfig, unitTestingContext } = prepareProcessStaticFileParams(cacheStateParams);
        const { soFarSoGood, cachedStaticFilesSoFar } = processStaticFile(state, siteConfig, fileEntry, fileName, stats, fullPath, jscLogConfig, unitTestingContext) || {};

        this.testPassed = soFarSoGood && !fileEntry.fileContents && (cachedStaticFilesSoFar === targetCachedStaticFilesSoFar);
      }
    }
  }
);

const test_018_007_processStaticFile_maxCachedFilesPerSite_thresholdPassed_pt2 = Object.assign(testUtils.makeFromBaseTest('processStaticFile - max number of cached files per site; threshold passed; bigger amount of files'),
  {
    // only: true,
    onTestBeforeStart()
    {
      const filesPath = [ '.' ];
      const fileName = 'some_static_file_name';
      const fullPathComponents = filesPath.concat(fileName);

      this.doEmptyTestDirectory();
      this.tempTestData =
      {
        fileName,
        fullPathComponents
      };
      this.createFile(fullPathComponents, 'some file contents; size irrelevant since it is established elsewhere');
      this.isUnitTest = true;
    },
    onUnitTestStarted()
    {
      const maxCacheableFileSizeBytes = 10;
      const testFileSize = maxCacheableFileSizeBytes - 1;

      const maxCachedFilesPerSite = Math.floor(Math.random() * 10) + 30;
      const initialCachedStaticFilesSoFar = maxCachedFilesPerSite + 1;
      const targetCachedStaticFilesSoFar = initialCachedStaticFilesSoFar;

      const { jscLib: { processStaticFile } } = this;
      const { fileName, fullPathComponents } = this.tempTestData;
      const fullPath = this.getTestFilePath(fullPathComponents, 'onUnitTestStarted');

      if (fullPath)
      {
        const cacheStateParams = {
          cachedStaticFilesSoFar: initialCachedStaticFilesSoFar,
          fileSize: testFileSize,
          maxCacheableFileSizeBytes,
          maxCachedFilesPerSite
        };

        const { state, siteConfig, fileEntry, stats, jscLogConfig, unitTestingContext } = prepareProcessStaticFileParams(cacheStateParams);
        const { soFarSoGood, cachedStaticFilesSoFar } = processStaticFile(state, siteConfig, fileEntry, fileName, stats, fullPath, jscLogConfig, unitTestingContext) || {};

        this.testPassed = soFarSoGood && !fileEntry.fileContents && (cachedStaticFilesSoFar === targetCachedStaticFilesSoFar);
      }
    }
  }
);

module.exports = [
  test_018_001_processStaticFile_maxCacheableFileSize_noThresholdPassed,
  test_018_002_processStaticFile_maxCacheableFileSize_noThresholdPassed_pt2,
  test_018_003_processStaticFile_maxCacheableFileSize_thresholdPassed,
  test_018_004_processStaticFile_maxCachedFilesPerSite_noThresholdPassed,
  test_018_005_processStaticFile_maxCachedFilesPerSite_noThresholdPassed_pt2,
  test_018_006_processStaticFile_maxCachedFilesPerSite_thresholdPassed,
  test_018_007_processStaticFile_maxCachedFilesPerSite_thresholdPassed_pt2
];
