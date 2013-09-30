module.exports = function (config) {
  config.set({
    basePath: '../../',

    files: [
      'static/e2e/*.js'
    ],

    frameworks: ['ng-scenario'],

    autoWatch: false,

    browsers: ['Chrome'],

    singleRun: true,

    proxies: {
      '/': 'http://localhost:8081/'
    },

    junitReporter: {
      outputFile: 'test_out/e2e.xml',
      suite: 'e2e'
    }
  });
};
