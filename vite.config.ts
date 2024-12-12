import * as path from 'node:path';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import { nodeExternals } from 'rollup-plugin-node-externals';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [
        nodeResolve({
            preferBuiltins: true,
        }),
        typescript({
            declaration: true,
            declarationDir: './dist',
            rootDir: './src',
        }),
        nodeExternals(),
    ],
    build: {
        lib: {
            entry: {
                index: path.resolve(__dirname, 'src/index.ts'),
            },
            formats: ['es', 'cjs'],
        },
        rollupOptions: {
            output: {
                preserveModules: true,
                dir: 'dist',
            },
        },
        minify: false,
    },
});
