module.exports = {
  default: {
    paths: ['src/features/**/*.feature'],
    require: ['src/step-definitions/**/*.ts'],
    requireModule: ['ts-node/register/transpile-only'],
    format: [
      'progress-bar',
      'json:reports/cucumber_report.json',
      'html:reports/cucumber_report.html'
    ],
    formatOptions: {
      snippetInterface: 'async-await'
    }
  }
};