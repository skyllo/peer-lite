import { RollupOptions } from 'rollup';
import babel from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import typescript2 from '@rollup/plugin-typescript';
import { terser } from 'rollup-plugin-terser';
import typescript from 'typescript';

const isTest = process.env.NODE_ENV === 'test';

const rollupConfig: RollupOptions = {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/index.js',
      format: 'umd',
      name: 'Peer',
      sourcemap: true,
      interop: false,
    },
    {
      file: 'dist/index.es.js',
      format: 'es',
      sourcemap: true,
      interop: false,
    },
  ],
  plugins: [
    typescript2({
      typescript,
      tsconfig: './tsconfig.json',
      include: ['./src/**.*'],
    }),
    !isTest && babel({ babelHelpers: 'bundled' }),
    nodeResolve(),
    commonjs(),
    terser(),
  ],
};

export default rollupConfig;
