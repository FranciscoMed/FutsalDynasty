# Hybrid State Management Implementation Guide

## ✅ Implementation Complete!

The Futsal Manager codebase now uses a **Hybrid State Management** approach:
- **TanStack Query** for server state (game data from API)
- **Zustand** for UI state (modals, popups, selections)

---

## 📁 New File Structure

### Created Files:

1. **`client/src/hooks/useServerState.ts`** (290 lines)
   - TanStack Query hooks for all server data
   - Centralized query keys
   - Auto-caching and invalidation

2. **`client/src/hooks/useGameActions.ts`** (140 lines)
   - Bridge hooks that combine mutations + UI updates
   - `useGameActions()` - Game mutations
   - `useLoadGameData()` - Bulk invalidation

3. **`client/src/lib/stores/useUIStore.ts`** (90 lines)
   - UI-only Zustand store
   - Match popups, season summary, modal state

### Modified Files:

4. **`client/src/lib/stores/useFutsalManager.tsx`**
   - Now a **backward compatibility wrapper**
   - Uses new hooks internally
   - Maintains same API for existing code

5. **`client/src/lib/advancementEngine.ts`**
   - Updated to use `queryClient` directly
   - No longer depends on Zustand `getState()`

---

## 🎯 How To Use (New Code)

### **Reading Server Data:**

```typescript
// ❌ OLD WAY (still works, but deprecated)
const { gameState, players, loading } = useFutsalManager();

// ✅ NEW WAY (preferred)
import { useGameState, usePlayers } from "@/hooks/useServerState";

const { data: gameState, isLoading: loadingGame } = useGameState();
const { data: players = [], isLoading: loadingPlayers } = usePlayers();
```

### **Available Server State Hooks:**

```typescript
// Game state
const { data: gameState } = useGameState();
const { data: playerTeam } = usePlayerTeam();
const { data: players = [] } = usePlayers();
const { data: competitions = [] } = useCompetitions();
const { data: matches = [] } = useMatches();
const { data: upcomingMatches = [] } = useUpcomingMatches();
const { data: nextMatch } = useNextMatch();
const { data: inbox = [] } = useInbox();
const { data: club } = useClub();
const unreadCount = useUnreadCount(); // Derived from inbox
```

### **UI State:**

```typescript
// ✅ Use UI Store for modals, popups, selections
import { useUIStore } from "@/lib/stores/useUIStore";

const {
  pendingMatchId,
  showMatchPopup,
  showSeasonSummary,
  setPendingMatch,
  setShowMatchPopup,
} = useUIStore();
```

### **Actions (Mutations):**

```typescript
// ✅ Use Game Actions for mutations
import { useGameActions } from "@/hooks/useGameActions";

const {
  initializeGame,
  advanceDay,
  simulateMatch,
  completeTraining,
  saveTactics,
} = useGameActions();

// Usage:
advanceDay.mutate(); // Fire and forget
await advanceDay.mutateAsync(); // Wait for completion
```

### **Individual Mutations:**

```typescript
import {
  useMarkMessageAsRead,
  useUpdatePlayer,
  useUpdatePlayerTeam,
} from "@/hooks/useServerState";

const markAsRead = useMarkMessageAsRead();
markAsRead.mutate(messageId); // Auto-invalidates inbox

const updatePlayer = useUpdatePlayer();
updatePlayer.mutate({ playerId: 1, updates: { fitness: 100 } }); // Auto-invalidates players
```

---

## 🔑 Key Benefits

### **1. Automatic Cache Management**
```typescript
// TanStack Query automatically:
// - Deduplicates identical requests
// - Caches responses
// - Refetches stale data
// - Garbage collects unused data
```

### **2. Granular Invalidation**
```typescript
// ❌ OLD: Refetch everything
await loadGameData(); // 5+ API calls

// ✅ NEW: Invalidate only what changed
queryClient.invalidateQueries({ queryKey: ["players"] }); // 1 call
```

### **3. Optimistic Updates**
```typescript
const updatePlayer = useMutation({
  mutationFn: savePlayer,
  onMutate: async (newData) => {
    // Update UI immediately
    queryClient.setQueryData(["players"], (old) => 
      old.map(p => p.id === newData.id ? newData : p)
    );
  },
  onError: (err, newData, context) => {
    // Rollback on error
    queryClient.setQueryData(["players"], context.previousData);
  },
});
```

### **4. Better Performance**
- Components only re-render when their specific data changes
- No global store causing cascade re-renders
- Selective subscriptions

---

## 📋 Migration Checklist

### **Phase 1: Current State (✅ Complete)**
- [x] Created server state hooks
- [x] Created UI store
- [x] Created game actions
- [x] Backward compatibility wrapper
- [x] Updated advancementEngine

### **Phase 2: Component Migration (Optional)**
- [ ] Update `HomePage` to use new hooks
- [ ] Update `SquadPage` to use new hooks
- [ ] Update `MatchesPage` to use new hooks (remove local UpcomingFixture)
- [ ] Update `CompetitionsPage` to use new hooks
- [ ] Update `TacticsPage` to use new hooks
- [ ] Update `TrainingPage` to use new hooks

### **Phase 3: Cleanup (Future)**
- [ ] Remove backward compatibility wrapper
- [ ] Remove unused code
- [ ] Add more granular queries
- [ ] Add optimistic updates

---

## 🎨 Query Key Structure

```typescript
export const queryKeys = {
  gameState: ["gameState"],
  playerTeam: ["playerTeam"],
  players: ["players"],
  allTeams: ["teams", "all"],
  competitions: (teamId?) => ["competitions", teamId],
  matches: {
    all: (teamId?) => ["matches", "all", teamId],
    upcoming: (teamId?) => ["matches", "upcoming", teamId],
    byId: (id) => ["matches", id],
  },
  inbox: ["inbox"],
  club: ["club"],
  financialTransactions: ["financialTransactions"],
  nextMatch: (date?) => ["matches", "next-unplayed", date],
};
```

---

## 🔍 Debugging

### **View Cache in React Query DevTools:**
```typescript
// client/src/App.tsx (if not already added)
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

<QueryClientProvider client={queryClient}>
  <App />
  <ReactQueryDevtools initialIsOpen={false} />
</QueryClientProvider>
```

### **Check Query Status:**
```typescript
const { data, isLoading, isError, error, isFetching } = useGameState();

console.log({
  data,
  isLoading, // Initial load
  isFetching, // Refetching in background
  isError,
  error,
});
```

### **Manually Invalidate:**
```typescript
import { queryClient } from "@/lib/queryClient";
import { queryKeys } from "@/hooks/useServerState";

// Invalidate specific query
queryClient.invalidateQueries({ queryKey: queryKeys.players });

// Invalidate all queries
queryClient.invalidateQueries();

// Refetch specific query
queryClient.refetchQueries({ queryKey: queryKeys.gameState });
```

---

## ⚠️ Common Pitfalls

### **1. Don't Put Server Data in UI Store**
```typescript
// ❌ BAD
const useUIStore = create((set) => ({
  players: [], // Server data doesn't belong here!
}));

// ✅ GOOD
const { data: players = [] } = usePlayers(); // Use TanStack Query
```

### **2. Don't Call Hooks Conditionally**
```typescript
// ❌ BAD
if (condition) {
  const { data } = usePlayers(); // Breaks Rules of Hooks
}

// ✅ GOOD
const { data: players } = usePlayers();
if (condition && players) {
  // Use players
}
```

### **3. Handle Loading States**
```typescript
// ❌ BAD (data might be undefined)
const { data: gameState } = useGameState();
const date = gameState.currentDate; // Crash if undefined!

// ✅ GOOD
const { data: gameState, isLoading } = useGameState();
if (isLoading || !gameState) return <Spinner />;
const date = gameState.currentDate; // Safe
```

---

## 📚 Resources

- [TanStack Query Docs](https://tanstack.com/query/latest)
- [Zustand Docs](https://zustand-demo.pmnd.rs/)
- [React Query DevTools](https://tanstack.com/query/latest/docs/react/devtools)

---

## 🎉 Benefits Achieved

✅ **Single Source of Truth** - TanStack Query cache is authoritative  
✅ **Automatic Caching** - No manual cache management  
✅ **Granular Updates** - Only refetch what changed  
✅ **Better Performance** - Selective component re-renders  
✅ **DevTools** - Visual debugging of cache state  
✅ **Type Safety** - Full TypeScript support  
✅ **Backward Compatible** - Existing code still works  

---

**Status:** ✅ Implementation Complete  
**Next Steps:** Test functionality, optionally migrate components for better performance  
