import eslint from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const disableTypeCheckedRules = tseslint.configs.disableTypeChecked.rules;

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/coverage/**',
      '**/.turbo/**',
      '**/node_modules/**',
      '**/.next/**',
      '**/.venv/**',
      'core/scripts/**',
      'examples/**',
      'docs/.vitepress/**',
      'apps/console/dist/**',
      'apps/console/e2e/**',
      'packages/ui/dist/**',
      'packages/observability-client/dist/**',
      'integrate/mcp-oacp/dist/**',
      // Sibling / gitignored trees at repo root — not part of OACP v1 ship surface
      '/MCPLab/**',
      '/ATDN/**',
      'lint-report.json',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  eslintConfigPrettier,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
    },
  },
  {
    files: [
      '**/*.mjs',
      '**/*.cjs',
      'scripts/**/*.js',
      'docker/**/*.js',
      'benchmarks/**/*.js',
      'eslint.config.mjs',
      'prettier.config.mjs',
    ],
    ...tseslint.configs.disableTypeChecked,
    languageOptions: {
      ...tseslint.configs.disableTypeChecked.languageOptions,
      globals: globals.node,
    },
  },
  {
    files: ['benchmarks/k6/**/*.js'],
    ...tseslint.configs.disableTypeChecked,
    languageOptions: {
      ...tseslint.configs.disableTypeChecked.languageOptions,
      globals: {
        ...globals.node,
        __ENV: 'readonly',
      },
    },
  },
  {
    files: [
      'apps/console/playwright.config.ts',
      'apps/console/vite.config.ts',
      'apps/console/vitest.config.ts',
    ],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    files: ['server/tests/**/*.ts', '**/*.test.ts', '**/*.spec.ts', 'integrate/**/*.test.ts'],
    ...tseslint.configs.disableTypeChecked,
    rules: {
      ...disableTypeCheckedRules,
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  {
    files: ['**/*.d.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  {
    files: ['integrate/mcp-oacp/**/*.ts'],
    rules: {
      '@typescript-eslint/no-deprecated': 'off',
    },
  },
  {
    files: ['core/src/protocol/validator.ts'],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    files: [
      'server/src/storage/**/*.ts',
      'server/tests/memory-*.test.ts',
      'server/src/app.ts',
      'server/src/api/http/routes.ts',
      'server/src/config.ts',
      'server/src/server.ts',
    ],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    files: ['sdk/typescript/src/agent.ts'],
    ...tseslint.configs.disableTypeChecked,
  },
);
