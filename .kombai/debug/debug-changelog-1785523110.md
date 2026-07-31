## Changes Made

### 1. Removed stale Sidebar search-state render branch
- **File:** `src/app/layout/Sidebar.tsx`
- **Change:** Removed the conditional block referencing `normalizedQuery`, which was no longer declared after the search UI was removed.
- **Why:** Authenticated renders of `Sidebar` threw `ReferenceError: normalizedQuery is not defined`, causing the dashboard shell to disappear.
- **Revert:** Restore the removed block only after reintroducing a declared and wired search query state.

### 2. Added a visible dashboard error boundary
- **File:** `src/app/App.tsx`
- **Change:** Wrapped `DashboardPage` in the existing `ErrorBoundary` with a dashboard-specific fallback.
- **Why:** Prevents future dashboard render exceptions from presenting as a blank page and gives the user an actionable recovery message.
- **Revert:** Replace the `ErrorBoundary` wrapper with the previous direct `<DashboardPage />` return.

## Revert Status
- [ ] Change 1 - Restore only with a valid search state implementation
- [ ] Change 2 - Keep unless intentionally removing dashboard-level error recovery
