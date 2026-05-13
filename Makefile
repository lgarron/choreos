.PHONY: dev
dev: setup
	bun x -- bun-dx --package vite vite -- ./src/

.PHONY: dev-host
dev-host: setup
	bun x -- bun-dx --package vite vite -- --host localhost ./src/

.PHONY: check
check: lint build

.PHONY: build
build: build-vite

.PHONY: build-vite
build-vite: setup
	bun x -- bun-dx --package vite vite -- build --emptyOutDir --outDir ../dist/web/garron.net/dance/choreo/ ./src/

.PHONY: lint
lint: lint-biome lint-typescript

.PHONY: lint-biome
lint-biome: setup
	bun x -- bun-dx --package @biomejs/biome biome -- check

.PHONY: lint-typescript
lint-typescript: setup
	bun x -- bun-dx --package @typescript/native-preview tsgo -- --project ./tsconfig.json

.PHONY: setup
setup:
	bun install --frozen-lockfile

.PHONY: format
format: setup
	bun x -- bun-dx --package @biomejs/biome biome -- check --write

RM_RF = bun -e 'process.argv.slice(1).map(p => process.getBuiltinModule("node:fs").rmSync(p, {recursive: true, force: true, maxRetries: 5}))' --

.PHONY: clean
clean:
	${RM_RF} ./dist/

.PHONY: reset
reset: clean
	${RM_RF} ./node_modules/

.PHOHY: deploy
deploy: setup build
	bun x -- bun-dx --package @cubing/deploy deploy --
