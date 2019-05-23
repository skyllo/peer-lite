import babel from 'rollup-plugin-babel';
import typescript2 from 'rollup-plugin-typescript2';
import commonjs from 'rollup-plugin-commonjs';
import nodeResolve from 'rollup-plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';
import typescript from 'typescript';

const isTest = process.env.NODE_ENV === 'test';

export default {
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
      clean: true,
      typescript,
      useTsconfigDeclarationDir: true,
    }),
    isTest ? [] : babel(),
    nodeResolve(),
    commonjs(),
    terser(),
  ],
};
