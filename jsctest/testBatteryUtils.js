'use strict';

// If there is only one test, then there will be no need to put it in an array.
module.exports = {
  makeFromBaseTest: (testName) =>
  {
    return {
      only: false,
      testName,
      onTestBeforeStart()
      {
        // Here we set up the test.  Config files, sample files, etc.
      },
      onExpectedLogMessagesPass()
      {
        // We got all the sequence of log messages we were expecting.
        // It's generally a good thing.  But it will depened on the test.
        this.testPassed = true;
      },
      onServerStarted()
      {
        // The server started okay.  It might be good or bad, depending on the test.
      },
      onServerError()
      {
        // return 'The server emitted an error.  It might be good or bad, depending on the test.';
      },
      onServerStartedOrError()
      {
        // Useful call for when dealing with more than one server and some cleanup needs to happen when all have been invoked.
        // Usually combined with this.numberOfServersInvokedSofar
      },
      onUnitTestStarted()
      {
        // Called when this.isUnitTest is assigned a value of true - usually in onTestBeforeStart()
        // Here we can individually test application functions and set this.testPassed accordingly.
      },
      onReadyForRequests()
      {
        // Called when this.isRequestsTest is set to true in onTestBeforeStart, when the server
        // has finished starting up, setting up all sites and is ready to take client requests.
        // You can use http.request() and/or https.request() here.
        // When you get a response and you're done with the request (either on a pass or fail capacity),
        // call this.doneRequestsTesting()
      },
      onAllRequestsEnded()
      {
        // Called when all requests and responses invoked in onReadyForRequests() have completed.
        // this.terminateApplication({ onComplete: this.waitForDoneSignal() });
        // waitForDoneSignal() is crucial above so that application terminates before we move on to the next test.
      },
      onBeforeTestEnd()
      {
        // Called just before checking whether the test passed or failed.
        // It's for last-minute checks.
        // For example, after the server has been terminated and all messages have been logged.
        // Happens after onExpectedLogMessagesPass(), onServerStarted(), onServerError()
        // Do not call functions here that may trigger signalTestEnd() (e.g. this.terminateApplication())
        // Do use this.waitForDoneSignal() here.
        //
        // this.testPassed = true;
      },
      onTestEnd()
      {
        // Here we tear down the test.  Config files, sample files, etc
        // that are no longer needed.
      }
    };
  },
  jsCauseCertPemFileContents:
    [
      '-----BEGIN CERTIFICATE-----',
      'MIICxDCCAawCCQCCWEbD52d/6zANBgkqhkiG9w0BAQUFADAkMRAwDgYDVQQKDAdK',
      'U0NhdXNlMRAwDgYDVQQDDAdqc2NhdXNlMB4XDTE5MDExMjA4NDExMVoXDTE5MDIx',
      'MTA4NDExMVowJDEQMA4GA1UECgwHSlNDYXVzZTEQMA4GA1UEAwwHanNjYXVzZTCC',
      'ASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBALFog8e2f0ckBtzr3LwIlKR/',
      'wjPEWBRmKVc2YJjhMLX4Vg6ZlxgWJPBnXDwB1n1VfXG8EZW99KUKmlcsfayZrx3y',
      'UwUNjz7YbdolRl+L6EVE2YerkuVggqjd7dWhaWP20CMzOqWLIWAjT2uK/puRoJ1C',
      'A8I2qgMMktPcc+oB4OZ4PEOfTHQqaLEE8K//6iDOZuG4/h2s70tLaCWoGwImFJHv',
      'fS5yy+r67CjHObC7AD37HrOQUFTlO0gtfsbtGierEYhPpJiNjaL5QbHFvl20yx2j',
      'YSInDK9pDhAMYOlCRd346fUqItzlXY79pvfqpp2Vpm+JpMf97/TXdZOpu8thz9sC',
      'AwEAATANBgkqhkiG9w0BAQUFAAOCAQEAaMzMOy/ENd6ymiAt7Nk0uqjHCqyc4eDV',
      'bnA4KDOA2EC4qLWqbswIcu70H2rcXPnaG4+X2QqAD8UoRFf80Z8b5W5PamCy6U6f',
      'K1QkRYdsm35NlIX1aH3l6itvT1uvg1IBeXCzFc1FltM8HMZfKVorlTnC5UEvzeSS',
      'UysXFXhaIBNajvjoWD4JSv5kv15wttNZDpCirs4dX+KsxNT6h436KJ1DgUxuX1wz',
      'jPRnhsHeDNQxdFN+cRpafTbS9mTct3S3TR1/vQoClBe9g2ALqQkcfm6hqUxDCoIh',
      'YERt+t9Pz1ZeBdNyffACUHSvpXN4JsnR9I0oe24G1Mfop9bQ/Z1Rpg==',
      '-----END CERTIFICATE-----',
      ''
    ].join('\n'),
  jsCauseKeyFileContents:
    [
      '-----BEGIN RSA PRIVATE KEY-----',
      'MIIEpAIBAAKCAQEAsWiDx7Z/RyQG3OvcvAiUpH/CM8RYFGYpVzZgmOEwtfhWDpmX',
      'GBYk8GdcPAHWfVV9cbwRlb30pQqaVyx9rJmvHfJTBQ2PPtht2iVGX4voRUTZh6uS',
      '5WCCqN3t1aFpY/bQIzM6pYshYCNPa4r+m5GgnUIDwjaqAwyS09xz6gHg5ng8Q59M',
      'dCposQTwr//qIM5m4bj+HazvS0toJagbAiYUke99LnLL6vrsKMc5sLsAPfses5BQ',
      'VOU7SC1+xu0aJ6sRiE+kmI2NovlBscW+XbTLHaNhIicMr2kOEAxg6UJF3fjp9Soi',
      '3OVdjv2m9+qmnZWmb4mkx/3v9Nd1k6m7y2HP2wIDAQABAoIBAF1d7vTddBDBwibk',
      'ru/66BfG8TMDY4Og3KL8iEwNP/CU+N2IMb/Ib7ph+2XNZc/ifTmtS+ft5+IwOVgl',
      'nyKGY2Y0UUL4huoBR5cmROomHKDQAlfnkVDMwRcUbYYgA/JLQ/Eylevn1DHfg33K',
      '0gKX2trIkmfVExa1uFRt0kdWo8FGp5hR1saqqMay8G7JEVaZquA3ERybdbW3aRXo',
      'M2MHUBoS7gDzny6Dc/lcTl1euBZSwOnXPDsH4EyUF/faKCDh8pU0XZQCwhVW13Ct',
      'ItVmxAKu2dzX9911gQU+Od5yNKGbudajrHQNWMa6kwqSzjxC4IYYNe7L/tGF/Rdf',
      '4E4zBnECgYEA3e43TrotO4MNj/vRV03B+DM3dkNOqVUSRcFIQWsaUNmBuXzI9z09',
      'ict4hGKvPJLkkhoigigjOh0ORZPR5howQ1ewIX4X+4HtVb0KBIfFzprFY5qikd1V',
      'MOZMAgA5Zg1A32+w8engK2LhTzRCYm1lsX0cVZkMoy6HbQZfZ9+0GuMCgYEAzKSX',
      'Obd0ay6i7TsbW0G03IRCU/d1iiQdKVRa6XjNeAStU+qJB+2ac514c+6rczu7zaaW',
      'YdSj70cKnYLsiFMGgMwYyvwdXUg4vR4uog7so0zVmWQVxaIr+4tMyJkJkGBpGjd4',
      'LHX8qWUcXebALqQZcmH/9wHcSlnlyX9WOHkAsKkCgYAkHKcTQGgrzt9eFnOx6Q0u',
      '/eaAb+NU2mrmvtSrEGpvzXS2Yf+xe12QFnO91vD8wko/G9GRrEZPJns0ByGYd5py',
      '2snmKUZtvm6IDQKcSht9yuFjm73oTkOWeWLU0ISGfpGXyezY8F1xsd1HrhE/Qt3R',
      'S7JYm1bbFq8ipm7P0C7WUQKBgQCwmJxzzy+kytMIm4gpARO9dFj0ssh41F9h6gym',
      'C3xsRMT6dJuZ/t3ZRZvLl7vWrkaL2mVNuT1a4Fh1wqSxo8wp23bNvDDu7cMg2Gnv',
      'qadl6IkvXKI5MZB4+yXgucf6EmjAmfuXip3l5H5NPjK8TRo0jgNgOffLJbbZYoya',
      'ITmKOQKBgQDZe7bJk30R7WdIcdcqnXV2I9xOmtjm1tfO1OrsB5ce7zdt7F4n7lN7',
      'Zx6sqGwPXc9oeW7a4dgz7HDp9M5w9HrNSwrMAFjiQ8iQy3zLfBd23vSeXNYInXMt',
      'YinAQZIGJFBgv2w8aeDrmH7SU0f6uVot+DFVRxrqR02De7S/9C1kEQ==',
      '-----END RSA PRIVATE KEY-----',
      ''
    ].join('\n'),
  jsCauseCertPemFileBadContents:
    [
      '-----BEGIN CERTIFICATE-----',
      'BAD CONTENTS',
      '-----END CERTIFICATE-----',
      ''
    ].join('\n'),
  jsCauseKeyFileBadContents:
    [
      '-----BEGIN RSA PRIVATE KEY-----',
      'BAD CONTENTS',
      '-----END RSA PRIVATE KEY-----',
      ''
    ].join('\n')
};
