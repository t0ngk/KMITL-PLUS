/* eslint-disable @typescript-eslint/no-explicit-any */
import { defineConfig, Plugin } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.config';
import * as path from 'path';

const vite5Manifest: Plugin & { renderCrxManifest: (manifest: any, bundle: any) => void } = {
	// Workaround from https://github.com/crxjs/chrome-extension-tools/issues/846#issuecomment-1861880919.
	name: 'vite5Manifest',
	renderCrxManifest(_manifest, bundle) {
		bundle['manifest.json'] = bundle['.vite/manifest.json'];
		bundle['manifest.json'].fileName = 'manifest.json';
		delete bundle['.vite/manifest.json'];
	}
};

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [svelte(), vite5Manifest, crx({ manifest })],
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src')
		}
	}
});
