import { createRequire } from 'node:module'
import { version as viteVersion } from 'vite'

const require = createRequire(import.meta.url)
const { version: vitestVersion } = require('vitest/package.json') as { version: string }

export function setup() {
	const info = [
		`Node ${process.version}`,
		`Vite ${viteVersion}`,
		`Vitest ${vitestVersion}`,
	]

	console.log(`\n  ${info.join(' / ')}\n`)
}
