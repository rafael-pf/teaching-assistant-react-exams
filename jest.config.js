module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.steps.ts', '**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
      }
    }]
  }
};