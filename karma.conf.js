// Karma configuration file, see link for more information
// https://karma-runner.github.io/1.0/config/configuration-file.html

module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage')
    ],
    client: {
      clearContext: false // leave Jasmine Spec Runner output visible in browser
    },
    jasmineHtmlReporter: {
      suppressAll: true
    },
    coverageReporter: {
      dir: require('path').join(__dirname, './coverage/kickbase-calculator'),
      subdir: '.',
      reporters: [
        { type: 'html' },
        { type: 'text-summary' }
      ]
    },
    reporters: ['progress', 'kjhtml'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    // Browser-Konsole (console.error, uncaught exceptions, etc.) ins
    // Terminal spiegeln - Standardmaessig zeigt Karma das nicht immer
    // vollstaendig an, obwohl genau da der eigentliche Fehler steckt,
    // wenn der Browser sich verbindet aber keine Testresultate meldet.
    browserConsoleLogOptions: {
      level: 'debug',
      terminal: true
    },
    // Grosszuegigere Timeouts, damit wir sehen ob es wirklich haengt
    // oder nur langsam ist (Standard: 10s Capture, 10s NoActivity).
    captureTimeout: 60000,
    browserDisconnectTimeout: 10000,
    browserDisconnectTolerance: 1,
    browserNoActivityTimeout: 60000,
    customLaunchers: {
      // Standard ChromeHeadless bleibt in Containern/CI/Root-Umgebungen oft
      // beim Start haengen, weil der Chrome-Sandbox nicht funktioniert.
      // Dieser Launcher deaktiviert den Sandbox und ein paar weitere
      // Stolperfallen (kleiner /dev/shm in Docker, GPU nicht vorhanden).
      ChromeHeadlessCI: {
        base: 'ChromeHeadless',
        flags: [
          '--no-sandbox',
          '--disable-gpu',
          '--disable-dev-shm-usage',
          '--disable-extensions'
        ]
      }
    },
    browsers: ['ChromeHeadlessCI'],
    singleRun: false,
    restartOnFileChange: true
  });
};
