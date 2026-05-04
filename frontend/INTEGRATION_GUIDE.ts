// ============================================================
// GuerillaGenics v2 — Supabase Frontend Integration Guide
//
// STEP 1: Install the Supabase JS client
// ============================================================
//
// PowerShell from guerillagenicsv2/frontend/:
//   npm install @supabase/supabase-js
//
// ============================================================
// STEP 2: Add env variables to frontend/.env.local
// ============================================================
//
//   VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
//   VITE_SUPABASE_ANON_KEY=your_anon_key_from_supabase_dashboard
//
// ============================================================
// STEP 3: Copy the new files into frontend/src/
// ============================================================
//
// From the zip you downloaded, copy:
//
//   src/lib/supabase.ts          → frontend/src/lib/supabase.ts
//   src/lib/AuthContext.tsx      → frontend/src/lib/AuthContext.tsx
//   src/types/database.ts       → frontend/src/types/database.ts
//   src/hooks/useNeedleAlerts.ts → frontend/src/hooks/useNeedleAlerts.ts
//   src/hooks/useFuturesEdge.ts  → frontend/src/hooks/useFuturesEdge.ts
//   src/hooks/useWatchlist.ts    → frontend/src/hooks/useWatchlist.ts
//   src/hooks/useOddsHistory.ts  → frontend/src/hooks/useOddsHistory.ts
//   src/hooks/useModelSnapshot.ts→ frontend/src/hooks/useModelSnapshot.ts
//   src/components/auth/TierGate.tsx  → frontend/src/components/auth/TierGate.tsx
//   src/components/auth/AuthModal.tsx → frontend/src/components/auth/AuthModal.tsx
//
// ============================================================
// STEP 4: Wrap your app in AuthProvider in main.jsx
// ============================================================
//
// Replace your current main.jsx with:
//
//   import React from 'react'
//   import ReactDOM from 'react-dom/client'
//   import App from './App.jsx'
//   import { AuthProvider } from './lib/AuthContext'
//
//   ReactDOM.createRoot(document.getElementById('root')).render(
//     <React.StrictMode>
//       <AuthProvider>
//         <App />
//       </AuthProvider>
//     </React.StrictMode>
//   )
//
// ============================================================
// STEP 5: Use auth in App.jsx
// ============================================================
//
// At the top of App.jsx, add:
//
//   import { useAuth } from './lib/AuthContext'
//   import { AuthModal } from './components/auth/AuthModal'
//
// Inside the App component:
//
//   const { user, tier, isOperative, isCommand, signOut } = useAuth()
//   const [showAuth, setShowAuth] = useState(false)
//
// Add sign in button to your nav:
//
//   {user ? (
//     <button onClick={signOut}>Sign Out</button>
//   ) : (
//     <button onClick={() => setShowAuth(true)}>Sign In</button>
//   )}
//   <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
//
// ============================================================
// STEP 6: Replace existing hooks with Supabase-powered ones
// ============================================================
//
// useNeedles.js  → replace with useNeedleAlerts from hooks/useNeedleAlerts.ts
// useFutures.js  → replace with useFuturesEdge from hooks/useFuturesEdge.ts
// useWatchlist.js→ replace with useWatchlist from hooks/useWatchlist.ts
//
// ============================================================
// STEP 7: Gate features by tier
// ============================================================
//
// Wrap Operative-only components:
//
//   import { TierGate } from './components/auth/TierGate'
//
//   <TierGate required="operative">
//     <FuturesLeaderboard />
//   </TierGate>
//
//   <TierGate required="command">
//     <ModelSnapshot marketId={id} />
//   </TierGate>
//
// Or use the hook for conditional logic:
//
//   import { useTierAccess } from './components/auth/TierGate'
//   const canSeeEdge = useTierAccess('operative')
//
// ============================================================
// STEP 8: Generate types automatically (optional but recommended)
// ============================================================
//
// Install Supabase CLI, then:
//   supabase gen types typescript --project-id YOUR_PROJECT_REF \
//     --schema public > frontend/src/types/database.ts
//
// Run this after every schema migration to keep types in sync.
//
// ============================================================
// STEP 9: Verify everything works
// ============================================================
//
//   cd frontend
//   npm run dev
//
// Open http://localhost:5173 and:
//   1. Sign up with a test email
//   2. Confirm in Supabase dashboard → Authentication → Users
//   3. Check Database → Table Editor → profiles (auto-created row)
//   4. Sign in and verify useAuth() returns your user
//   5. Try useNeedleAlerts() — should return empty array (no data yet)
//   6. Try useWatchlist() — should return empty array
//
// ============================================================

export {}  // makes this a module
