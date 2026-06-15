import eslint from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/coverage/**',
      '**/.turbo/**',
      '**/node_modules/**',
      'core/scripts/**',
      'examples/**',
      'docs/.vitepress/**',
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
  },
  {
    files: ['**/*.mjs', '**/*.cjs'],
    ...tseslint.configs.disableTypeChecked,
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
