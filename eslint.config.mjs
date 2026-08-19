// ESLint flat config（ESLint 10+）
// 目前仅覆盖纯 JS 文件；.ts / .astro 的 lint 可在接入
// typescript-eslint 与 eslint-plugin-astro 后扩展。
export default [
  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    rules: {
      'no-undef': 'error',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-constant-condition': ['error', { checkLoops: false }],
      'no-dupe-keys': 'error',
      'no-duplicate-case': 'error',
      'no-unreachable': 'error',
      'no-extra-semi': 'error',
      'no-func-assign': 'error',
      'no-obj-calls': 'error',
      'no-invalid-regexp': 'error',
      'no-sparse-arrays': 'error',
    },
  },
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      '.astro/**',
      'public/**',
      '.husky/**',
      'certs/**',
    ],
  },
];
