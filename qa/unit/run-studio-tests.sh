#!/usr/bin/env bash
# Compiles the pure studio module and runs its unit tests.
set -euo pipefail
cd "$(dirname "$0")/../.."
rm -rf /tmp/studio-test && mkdir -p /tmp/studio-test
./node_modules/.bin/tsc src/lib/studio-core.ts --outDir /tmp/studio-test --module commonjs --target es2020 --skipLibCheck --strict --noEmitOnError
echo '{"type":"commonjs"}' > /tmp/studio-test/package.json
node --test qa/unit/studio-core.test.mjs
