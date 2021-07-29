module.exports = {
    verbose: true,
    testMatch: [
        "**/tests/**/*.test.js"
    ],
    reporters: [
        'default',
        ['./node_modules/jest-html-reporter', {
            'outputPath': './tests/test-report.html',
            'pageTitle': 'Sunorhc Test Report'
        }]
    ]
}