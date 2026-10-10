# Testing Guide

## Validation commands

Run these from the project root:

```powershell
npm run check
npm test
npm run build
```

`npm test` runs Vitest once using a single worker thread. This avoids worker
startup timeouts in constrained environments while retaining normal test
failures and stack traces.

For development, use `npm run test:watch`. To run one test file:

```powershell
npm test -- client/src/lib/__tests__/formations.test.ts
```

For coverage, run `npm run test:coverage`.

## Test locations

- `client/src/hooks/__tests__/useContinue.test.tsx` — continuation hook behavior
- `client/src/lib/__tests__/formations.test.ts` — formation definitions
- `client/src/pages/__tests__/TacticsPage.test.tsx` — tactics page behavior
- `server/__tests__/matchEngine-phase1.test.ts` — match simulation behavior
- `server/__tests__/tactics-routes.test.ts` — tactics API behavior
- `shared/__tests__/schema-tactics.test.ts` — tactics schema behavior

Vitest setup and configuration live in `client/src/__tests__/setup.ts` and
`vitest.config.ts`.

## Known simulation failures

The current suite collects and runs all test files, but three assertions in
`server/__tests__/matchEngine-phase1.test.ts` still fail against the current
match simulation: average goals exceed the test's upper bound, and two
fly-goalkeeper scenarios miss their expected possession/counter-attack outcomes.
These are gameplay behavior failures, not test-runner or collection errors.

## Troubleshooting

- Run `npm install` if project dependencies are missing.
- Test files containing JSX must use the `.tsx` extension.
- Tests that fail after collection report their assertion and stack trace;
  worker or transform errors should be fixed rather than treated as passing
  tests.
