#!/usr/bin/env -S just --justfile

set lazy
set guards

export PATH := join(justfile_directory(), "node_modules", ".bin") + ":" + env('PATH')

build:
	tsc
	rolldown src/index.ts -p node -f cjs -o dist/index.cjs --strict --exports named \
		--external vite --external svgo --external xml2js --external magic-string \
		--no-comments.legal --banner "`head -n27 src/index.ts`"

publish: build
	pnpm stage publish --no-git-checks
