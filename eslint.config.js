import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    /**
     * Files that drive the Three.js render loop.
     *
     * `react-hooks/immutability` and `react-hooks/refs` come from the React
     * Compiler, and they assume everything a hook returns is reactive state. Three.js
     * objects are not: uniforms, materials, and geometries live outside React's
     * reconciliation entirely, and react-three-fiber's documented pattern is to
     * mutate them imperatively inside `useFrame` — sixty times a second, without
     * ever re-rendering. There is no way to express that within the rules, and
     * routing every animated value through React state would defeat the purpose of
     * the library.
     *
     * Scoped deliberately to the two files that own the render loop, so the rules
     * stay in force for the rest of the codebase. Add a file here only if it
     * genuinely animates Three.js objects per frame.
     */
    files: ['src/hooks/useNeuralAnimation.ts', 'src/components/NebulaBackdrop.tsx'],
    rules: {
      'react-hooks/immutability': 'off',
      'react-hooks/refs': 'off',
    },
  }
);
