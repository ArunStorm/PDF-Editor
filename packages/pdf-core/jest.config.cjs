module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  moduleNameMapper: {
    '^@pdf-editor/(.*)$': '<rootDir>/../$1/src',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};
