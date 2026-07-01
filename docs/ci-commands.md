# CI commands

Use these CI commands for internal release and marketplace readiness checks.

## Required verification

```bash
node ./node_modules/typescript/bin/tsc --outDir dist --rootDir src --module NodeNext --moduleResolution NodeNext --target ES2022 --jsx react-jsx --skipLibCheck && npm test
```

This command compiles the TypeScript source into `dist` with NodeNext module settings and then runs the Node test suite.

## Optional Twenty dry run

```bash
yarn twenty dev --once --dry-run
```

Run this only when the local Twenty CLI/package script and a reachable Twenty server are available. If the command is unavailable or cannot reach the server, record the blocker in release evidence and continue with the required verification command.

## GitHub Actions

The `.github/workflows/release-artifacts.yml` workflow installs dependencies, runs the required TypeScript/test command, and attempts the Twenty dry run as a non-fatal diagnostic step so CI captures marketplace sync readiness without failing when no local server exists.
