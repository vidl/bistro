module.exports = function (config) {
  config.set({
    basePath: '../../',

    files: [
      'static/js/lib/jquery-2.0.3.min.js',
      'static/js/lib/bootstrap-2.3.2.min.js',
      'static/js/lib/angular-1.1.5.min.js',
      'test/lib/angular-mocks-1.1.5.js',
      'static/js/*.js',
      'test/unit/**/*.js'
    ],

    frameworks: ['jasmine'],

    autoWatch: true,

    browsers: ['Chrome'],

    junitReporter: {
      outputFile: 'test_out/unit.xml',
      suite: 'unit'
    }
  });
};
