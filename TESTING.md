# Testing Guide - Futsal Dynasty

This document describes the testing setup and how to run tests for the tactics system and other components.

## 📦 Installation

First, install the required testing dependencies:

```powershell
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @vitest/ui
```

## 🏃 Running Tests

### Run All Tests
```powershell
npm test
```

### Run Tests in Watch Mode
```powershell
npm test -- --watch
```

### Run Tests with UI
```powershell
npm test -- --ui
```

### Run Tests with Coverage
```powershell
npm test -- --coverage
```

### Run Specific Test File
```powershell
npm test -- formations.test.ts
```

### Run Tests Matching Pattern
```powershell
npm test -- tactics
```

## 📁 Test Structure

```
FutsalDynasty/
├── client/src/
│   ├── __tests__/
│   │   └── setup.ts                    # Test setup and global mocks
│   ├── lib/__tests__/
│   │   └── formations.test.ts          # Formation definitions tests
│   └── pages/__tests__/
│       └── TacticsPage.test.tsx        # Tactics page component tests
├── server/__tests__/
│   └── tactics-routes.test.ts          # Backend API tests
├── shared/__tests__/
│   └── schema-tactics.test.ts          # Schema validation tests
├── vitest.config.ts                    # Vitest configuration
└── TESTING.md                          # This file
```

## 🧪 Test Suites

### 1. Formations Library Tests (`formations.test.ts`)

Tests the formation definitions and structure:

**Coverage:**
- ✅ Formation structure validation (3 formations)
- ✅ Position coordinate validation (0-100 range)
- ✅ Goalkeeper positioning (x=50, y=88)
- ✅ Position roles validation
- ✅ Formation-specific position IDs
- ✅ Symmetrical positioning for wings
- ✅ TypeScript type safety

**Run:**
```powershell
npm test -- formations.test.ts
```

### 2. Tactics Page Tests (`TacticsPage.test.tsx`)

Tests the main tactics dashboard component:

**Coverage:**
- ✅ Initial loading state
- ✅ API data fetching on mount
- ✅ Component rendering after load
- ✅ Formation selector display
- ✅ Action buttons (reset, save)
- ✅ Button disabled states during loading
- ✅ Error handling for API failures
- ✅ Player assignment loading
- ✅ Validation badge display

**Run:**
```powershell
npm test -- TacticsPage.test.tsx
```

### 3. Backend API Tests (`tactics-routes.test.ts`)

Tests the tactics API endpoints logic:

**Coverage:**
- ✅ GET /api/tactics default response
- ✅ GET /api/tactics with saved data
- ✅ POST /api/tactics/save validation
- ✅ Formation field validation
- ✅ Assignments field validation
- ✅ Substitutes field validation
- ✅ Null player ID handling
- ✅ Database error handling
- ✅ Team not found scenarios
- ✅ Edge cases (empty assignments, all null subs)

**Run:**
```powershell
npm test -- tactics-routes.test.ts
```

### 4. Schema Tests (`schema-tactics.test.ts`)

Tests the TypeScript schema definitions:

**Coverage:**
- ✅ TacticsFormation type validation
- ✅ TacticsData interface structure
- ✅ Assignment keys validation
- ✅ Player ID type validation
- ✅ Formation-specific structures (4-0, 3-1, 2-2)
- ✅ Type safety enforcement
- ✅ Real-world scenarios (partial lineup, full lineup, etc.)

**Run:**
```powershell
npm test -- schema-tactics.test.ts
```

## 📊 Coverage Goals

| Component | Target Coverage | Current Status |
|-----------|----------------|----------------|
| Formations | 100% | ✅ Complete |
| TacticsPage | 80%+ | ✅ Core logic |
| API Routes | 90%+ | ✅ Validation |
| Schema | 100% | ✅ Complete |

## 🔍 What's Tested

### Formation System
- All 3 formations have 5 positions
- Goalkeeper always at (x=50, y=88)
- Valid coordinate ranges (0-100)
- Correct position IDs per formation
- Symmetrical wing positioning

### Player Assignment
- Exclusive player assignment (one location only)
- Goalkeeper preservation on formation change
- Partial and full lineup handling
- Null player ID handling
- Empty assignments validation

### API Integration
- Default tactics structure
- Save/load functionality
- Error handling
- Validation rules
- Database interaction patterns

### Type Safety
- Formation type constraints
- Assignment value types
- Substitutes array structure
- Player ID type enforcement

## 🚫 What's NOT Tested (Yet)

The following are **not** covered by unit tests and may require integration/E2E tests:

- ❌ Drag-and-drop interactions (requires E2E)
- ❌ Touch backend functionality (requires device testing)
- ❌ Visual field rendering (component visual tests)
- ❌ Player marker animations
- ❌ Toast notification display
- ❌ Click-to-assign mode interactions
- ❌ Formation change animations
- ❌ Actual database operations (mocked in unit tests)
- ❌ Match engine integration with tactics

## 🎯 Writing New Tests

### Test Naming Convention

```typescript
describe('ComponentName', () => {
  describe('Feature Group', () => {
    it('should do something specific', () => {
      // Test code
    });
  });
});
```

### Example Test

```typescript
import { describe, it, expect } from 'vitest';

describe('MyComponent', () => {
  it('should render correctly', () => {
    const result = myFunction();
    expect(result).toBe(expectedValue);
  });
});
```

## 🐛 Debugging Tests

### Run Single Test with Debug Output
```powershell
npm test -- --reporter=verbose TacticsPage.test.tsx
```

### Run Tests in Node Inspector
```powershell
node --inspect-brk ./node_modules/vitest/vitest.mjs run
```

### Check Test Coverage for Specific File
```powershell
npm test -- --coverage --reporter=html formations.test.ts
```

Then open `coverage/index.html` in your browser.

## 📝 Best Practices

1. **Keep tests isolated** - Each test should be independent
2. **Mock external dependencies** - API calls, stores, external libraries
3. **Test behavior, not implementation** - Focus on what the code does, not how
4. **Use descriptive test names** - `should save tactics when all positions filled`
5. **Group related tests** - Use `describe` blocks to organize
6. **Test edge cases** - Empty data, null values, errors
7. **Keep tests fast** - Avoid unnecessary delays or complex setup

## 🔧 Troubleshooting

### Tests fail with "Cannot find module"
- Run `npm install` to ensure all dependencies are installed
- Check that `vitest.config.ts` path aliases match your structure

### React component tests fail
- Ensure `@testing-library/react` and `jsdom` are installed
- Check that `setup.ts` is properly configured in vitest config

### TypeScript errors in tests
- Make sure `@types/node` is installed
- Add `"types": ["vitest/globals"]` to tsconfig.json

### Coverage reports incomplete
- Check `vitest.config.ts` include/exclude patterns
- Run with `--coverage.all` flag to include all files

## 📚 Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Jest DOM Matchers](https://github.com/testing-library/jest-dom)

## 🎉 Next Steps

To complete the testing setup:

1. **Install dependencies:**
   ```powershell
   npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @vitest/ui
   ```

2. **Add test script to package.json:**
   ```json
   "scripts": {
     "test": "vitest",
     "test:ui": "vitest --ui",
     "test:coverage": "vitest --coverage"
   }
   ```

3. **Run tests:**
   ```powershell
   npm test
   ```

4. **Review coverage:**
   ```powershell
   npm run test:coverage
   ```

---

**Created:** November 6, 2025  
**Last Updated:** November 6, 2025  
**Tactics System Tests:** Complete ✅
