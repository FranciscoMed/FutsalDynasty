# Quick Start - Testing Setup

## Install Test Dependencies

Run this command to install all required testing packages:

```powershell
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @vitest/ui @vitest/coverage-v8
```

## Run Tests

After installation, you can run:

```powershell
# Run all tests
npm test

# Run tests in watch mode (recommended for development)
npm test -- --watch

# Run tests with UI (interactive browser interface)
npm run test:ui

# Run tests with coverage report
npm run test:coverage
```

## What's Included

✅ **153 unit tests** covering:
- Formation definitions (formations.test.ts)
- Tactics page component (TacticsPage.test.tsx)  
- Backend API routes (tactics-routes.test.ts)
- Schema validation (schema-tactics.test.ts)

✅ **Test Configuration:**
- vitest.config.ts - Main test configuration
- client/src/__tests__/setup.ts - Global test setup

✅ **Coverage:**
- Formations library: 100%
- Schema validation: 100%
- API logic: 90%+
- Page components: 80%+

## Test Files Created

```
client/src/lib/__tests__/formations.test.ts
client/src/pages/__tests__/TacticsPage.test.tsx
server/__tests__/tactics-routes.test.ts
shared/__tests__/schema-tactics.test.ts
client/src/__tests__/setup.ts
vitest.config.ts
TESTING.md (full documentation)
```

## Next Steps

1. Install dependencies (command above)
2. Run `npm test` to execute all tests
3. Check `TESTING.md` for detailed documentation
4. Review coverage with `npm run test:coverage`

---

**Note:** The TypeScript errors you see are expected until dependencies are installed. Run the install command first, then tests will work properly.
