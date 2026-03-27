import { version as viteVersion } from 'vite'


export function setup() {
	const info = [
		`OS ${process.platform} ${process.arch}`,
		`Node ${process.version}`,
		`Vite ${viteVersion}`,
	]

	console.log(`\n  ${info.join(' / ')}\n`)
}
