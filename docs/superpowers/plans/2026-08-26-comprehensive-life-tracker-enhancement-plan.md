# Comprehensive Life Tracker Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement all requested life tracking features (gym, badminton, supplements, work, income, expenses, health, sleep, water, nutrition, mood, habits, time management, goals, journaling, reminders, analytics, customization) with Apple-inspired premium UI/UX while maintaining existing luxury design and offline-first capabilities.

**Architecture:** Modular extension approach enhancing existing pages and adding new pages as needed, using the existing EnhancedSupabaseClient for all data operations, maintaining the luxury design system, and implementing Apple-inspired UI/UX principles throughout.

**Tech Stack:** React 19, TypeScript, Vite, Supabase, Tailwind CSS, Framer Motion, existing EnhancedSupabaseClient, luxury design tokens

## Global Constraints

- Must maintain backward compatibility with existing features
- Must use existing EnhancedSupabaseClient for all data operations
- Must maintain luxury design system from design-tokens.css
- Must implement Apple-inspired UI/UX principles (clarity, deference, depth, fluid motion)
- Must preserve offline-first capabilities with operation queuing and background sync
- No new major dependencies beyond existing stack
- All new code must be TypeScript with proper typing
- Must follow existing code patterns and conventions
- All UI must be responsive and mobile-friendly (≥48px touch targets)
- Must maintain zero data loss guarantee

---
### Task 1: Setup Supplement Tracking Database Table and Types

**Files:**
- Modify: `supabase-schema.sql:108-112` (add supplement_logs table)
- Modify: `src/lib/db-types.ts` (add SupplementLog type)
- Create: `src/lib/supplement-types.ts` (supplement-specific types and constants)
- Test: `types/supplement-types.test.ts`

**Interfaces:**
- Consumes: Existing EnhancedSupabaseClient interface
- Produces: SupplementLog type for use in tracking features

- [ ] **Step 1: Write the failing test**

```typescript
import { SupplementLog } from '@/lib/supplement-types';

describe('SupplementLog type', () => {
  it('should have required fields', () => {
    const log: SupplementLog = {
      id: 'test-id',
      user_id: 'user-123',
      date: '2026-08-26',
      supplement_name: 'Vitamin D',
      dosage: 1000,
      unit: 'IU',
      brand: 'NatureMade',
      notes: 'Taken with breakfast'
    };
    
    expect(log.id).toBeDefined();
    expect(log.user_id).toBe('user-123');
    expect(log.date).toBe('2026-08-26');
    expect(log.supplement_name).toBe('Vitamin D');
    expect(log.dosage).toBe(1000);
    expect(log.unit).toBe('IU');
    expect(log.brand).toBe('NatureMade');
    expect(log.notes).toBe('Taken with breakfast');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `vitest run types/supplement-types.test.ts`
Expected: FAIL with "Cannot find module '@/lib/supplement-types'" or "Cannot find type 'SupplementLog'"

- [ ] **Step 3: Write minimal implementation**

First, update supabase-schema.sql:
```sql
-- Add after line 112 (after existing tables)
create table if not exists public.supplement_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) not null,
  date date not null,
  supplement_name text not null,
  dosage numeric not null,
  unit text not null,
  brand text,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
```

Then, add to db-types.ts:
```typescript
export interface SupplementLog {
  id: string;
  user_id: string;
  date: string; // ISO date string
  supplement_name: string;
  dosage: number;
  unit: string;
  brand?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}
```

Create supplement-types.ts:
```typescript
import { SupplementLog } from './db-types';

export interface Supplement {
  id: string;
  name: string;
  defaultUnit: string;
  commonDosages: number[];
  category: 'vitamin' | 'mineral' | 'protein' | 'herbal' | 'other';
}

export const commonSupplements: Supplement[] = [
  { id: 'vitamin-d', name: 'Vitamin D', defaultUnit: 'IU', commonDosages: [400, 1000, 2000, 5000], category: 'vitamin' },
  { id: 'vitamin-c', name: 'Vitamin C', defaultUnit: 'mg', commonDosages: [500, 1000, 2000], category: 'vitamin' },
  { id: 'omega-3', name: 'Omega-3 Fish Oil', defaultUnit: 'mg', commonDosages: [500, 1000, 2000], category: 'other' },
  { id: 'magnesium', name: 'Magnesium', defaultUnit: 'mg', commonDosages: [200, 400, 500], category: 'mineral' },
  { id: 'zinc', name: 'Zinc', defaultUnit: 'mg', commonDosages: [15, 30, 50], category: 'mineral' },
  { id: 'probiotic', name: 'Probiotic', defaultUnit: 'CFU', commonDosages: [1000000000, 5000000000, 10000000000], category: 'other' }
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `vitest run types/supplement-types.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add supabase-schema.sql src/lib/db-types.ts src/lib/supplement-types.ts types/supplement-types.test.ts
git commit -m "feat: add supplement tracking database table and types"
```

### Task 2: Create Supplement Library Component

**Files:**
- Create: `src/components/supplements/SupplementLibrary.tsx`
- Create: `src/components/supplements/SupplementLibrary.module.css`
- Test: `components/supplements/SupplementLibrary.test.tsx`

**Interfaces:**
- Consumes: Supplement type from supplement-types.ts
- Produces: Supplement library UI for selection/search

- [ ] **Step 1: Write the failing test**

```typescript
import { render, screen } from '@testing-library/react';
import { SupplementLibrary } from '@/components/supplements/SupplementLibrary';

describe('SupplementLibrary', () => {
  it('displays supplement search input', () => {
    render(<SupplementLibrary />);
    const searchInput = screen.getByPlaceholderText(/search supplements/i);
    expect(searchInput).toBeInTheDocument();
  });
  
  it('shows list of common supplements', () => {
    render(<SupplementLibrary />);
    const vitaminD = screen.getByText(/vitamin d/i);
    expect(vitaminD).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `vitest run components/supplements/SupplementLibrary.test.tsx`
Expected: FAIL with "Cannot find module '@/components/supplements/SupplementLibrary'"

- [ ] **Step 3: Write minimal implementation**

Create SupplementLibrary.tsx:
```typescript
import { commonSupplements } from '@/lib/supplement-types';
import styles from '@/components/supplements/SupplementLibrary.module.css';

interface SupplementLibraryProps {
  onSelect: (supplement: typeof commonSupplements[0]) => void;
  selectedSupplement?: typeof commonSupplements[0];
}

export const SupplementLibrary: React.FC<SupplementLibraryProps> = ({ 
  onSelect, 
  selectedSupplement 
}) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  
  const filteredSupplements = commonSupplements.filter(supplement =>
    supplement.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={styles.library}>
      <input
        type="text"
        placeholder="Search supplements"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className={`${styles.searchInput} glass-luxury p-3`}
      />
      
      <div className={styles.results}>
        {filteredSupplements.map(supplement => (
          <div
            key={supplement.id}
            onClick={() => onSelect(supplement)}
            className={`${styles.supplementItem} 
              glass-luxury 
              p-3 
              ${selectedSupplement?.id === supplement.id ? 'border-luxury' : ''}
              hover-lift hover-scale transition-luxury`}
          >
            <div className={styles.supplementName}>
              {supplement.name}
            </div>
            <div className={styles.supplementInfo}>
              {supplement.defaultUnit} • {supplement.category}
            </div>
          </div>
        ))}
        
        {filteredSupplements.length === 0 && searchTerm && (
          <p className={styles.noResults} className="text-luxury-muted">
            No supplements found
          </p>
        )}
      </div>
    </div>
  );
};
```

Create SupplementLibrary.module.css:
```css
.library {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.searchInput {
  width: 100%;
  padding: var(--space-3);
  border: none;
  border-radius: var(--radius-md);
  background: var(--color-glass-bg);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--color-glass-border);
  color: var(--color-text-primary);
  font-size: var(--font-size-base);
}

.searchInput:focus {
  outline: none;
  border-color: var(--color-accent-gold);
  box-shadow: 0 0 0 2px rgba(212, 175, 55, 0.2);
}

.results {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  max-height: 300px;
  overflow-y: auto;
}

.supplementItem {
  cursor: pointer;
  border-radius: var(--radius-md);
  transition: all var(--transition-normal);
}

.supplementItem:hover {
  background: var(--color-glass-strong-bg);
}

.supplementName {
  font-weight: var(--font-weight-semibold);
  font-size: var(--font-size-lg);
}

.supplementInfo {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
}

.noResults {
  text-align: center;
  padding: var(--space-4);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `vitest run components/supplements/SupplementLibrary.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/supplements/SupplementLibrary.tsx src/components/supplements/SupplementLibrary.module.css components/supplements/SupplementLibrary.test.tsx
git commit -m "feat: create supplement library component"
```

### Task 3: Create Supplement Logging Form

**Files:**
- Create: `src/components/supplements/SupplementLogForm.tsx`
- Create: `src/components/supplements/SupplementLogForm.module.css`
- Test: `components/supplements/SupplementLogForm.test.tsx`

**Interfaces:**
- Consumes: Supplement type, EnhancedSupabaseClient
- Produces: Form for logging supplement intake

- [ ] **Step 1: Write the failing test**

```typescript
import { render, screen } from '@testing-library/react';
import { SupplementLogForm } from '@/components/supplements/SupplementLogForm';

describe('SupplementLogForm', () => {
  it('has dosage input field', () => {
    render(<SupplementLogForm 
      supplements={[]} 
      onLog={(log) => console.log(log)} 
    />);
    const dosageInput = screen.getByLabelText(/dosage/i);
    expect(dosageInput).toBeInTheDocument();
  });
  
  it('has submit button', () => {
    render(<SupplementLogForm 
      supplements={[]} 
      onLog={(log) => console.log(log)} 
    />);
    const submitButton = screen.getByRole('button', { name: /log supplement/i });
    expect(submitButton).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `vitest run components/supplements/SupplementLogForm.test.tsx`
Expected: FAIL with "Cannot find module '@/components/supplements/SupplementLogForm'"

- [ ] **Step 3: Write minimal implementation**

Create SupplementLogForm.tsx:
```typescript
import { Supplement } from '@/lib/supplement-types';
import { enhancedSupabase } from '@/lib/supabase-enhanced';
import styles from '@/components/supplements/SupplementLogForm.module.css';

interface SupplementLogFormProps {
  supplements: Supplement[];
  onLog: (log: any) => void;
  onClose?: () => void;
}

export const SupplementLogForm: React.FC<SupplementLogFormProps> = ({ 
  supplements, 
  onLog,
  onClose 
}) => {
  const [selectedSupplement, setSelectedSupplement] = React.useState<Supplement | null>(null);
  const [dosage, setDosage] = React.useState('');
  const [unit, setUnit] = React.useState('');
  const [brand, setBrand] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplement || !dosage || !unit) return;
    
    setIsSubmitting(true);
    try {
      const log = {
        user_id: (await enhancedSupabase.auth.getUser()).data.user?.id,
        date: new Date().toISOString().split('T')[0],
        supplement_name: selectedSupplement.name,
        dosage: parseFloat(dosage),
        unit,
        brand: brand || undefined,
        notes: notes || undefined
      };
      
      await enhancedSupabase.from('supplement_logs').insert(log);
      onLog(log);
      
      // Reset form
      setDosage('');
      setBrand('');
      setNotes('');
    } catch (error) {
      console.error('Failed to log supplement:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form} className="glass-luxury p-4">
      <div className={styles.header}>
        <h2 className="text-xl font-bold text-text-primary">Log Supplement</h2>
        {onClose && (
          <button 
            onClick={onClose}
            className="text-text-secondary/60 hover:text-text-primary"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        )}
      </div>
      
      <div className={styles.fields}>
        <div className={styles.fieldGroup}>
          <label className="block text-sm font-medium text-text-secondary/60 mb-1">
            Supplement
          </label>
          {supplements.length > 0 ? (
            <select
              value={selectedSupplement?.id || ''}
              onChange={(e) => {
                const id = e.target.value as string;
                const supplement = supplements.find(s => s.id === id) || null;
                setSelectedSupplement(supplement);
                if (supplement) {
                  setUnit(supplement.defaultUnit);
                }
              }}
              className={`${styles.select} w-full glass-luxury p-3`}
            >
              <option value="">Select a supplement</option>
              {supplements.map(supplement => (
                <option key={supplement.id} value={supplement.id}>
                  {supplement.name}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-text-secondary/60 text-center p-4">
              No supplements available
            </p>
          )}
        </div>
        
        <div className={styles.fieldGroup}>
          <label className="block text-sm font-medium text-text-secondary/60 mb-1">
            Dosage
          </label>
          <input
            type="number"
            placeholder="Enter dosage"
            value={dosage}
            onChange={(e) => setDosage(e.target.value)}
            className={`${styles.input} w-full glass-luxury p-3`}
            min="0"
            step="any"
          />
        </div>
        
        <div className={styles.fieldGroup}>
          <label className="block text-sm font-medium text-text-secondary/60 mb-1">
            Unit
          </label>
          <input
            type="text"
            placeholder="e.g., mg, IU, capsules"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className={`${styles.input} w-full glass-luxury p-3`}
          />
        </div>
        
        <div className={styles.fieldGroup}>
          <label className="block text-sm font-medium text-text-secondary/60 mb-1">
            Brand (optional)
          </label>
          <input
            type="text"
            placeholder="Brand name"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            className={`${styles.input} w-full glass-luxury p-3`}
          />
        </div>
        
        <div className={styles.fieldGroup}>
          <label className="block text-sm font-medium text-text-secondary/60 mb-1">
            Notes (optional)
          </label>
          <textarea
            placeholder="Any notes about effects, timing, etc."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={`${styles.textarea} w-full glass-luxury p-3`}
            rows={3}
          />
        </div>
      </div>
      
      <div className={styles.actions}>
        <button
          type="submit"
          disabled={isSubmitting || !selectedSupplement || !dosage || !unit}
          className={`${styles.submitButton} 
            w-full 
            accent-gold 
            text-text-on-accent 
            font-medium 
            py-3 
            hover-lift 
            hover-scale 
            transition-luxury
            ${isSubmitting ? 'opacity-50' : ''}
          `}
        >
          {isSubmitting ? 'Logging...' : 'Log Supplement'}
        </button>
      </div>
    </form>
  );
};
```

Create SupplementLogForm.module.css:
```css
.form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-3);
}

.fields {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--space-3);
}

.fieldGroup {
  display: flex;
  flex-direction: column;
}

.select,
.input,
.textarea {
  width: 100%;
  padding: var(--space-3);
  border: none;
  border-radius: var(--radius-md);
  background: var(--color-glass-bg);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--color-glass-border);
  color: var(--color-text-primary);
  font-size: var(--font-size-base);
}

.select:focus,
.input:focus,
.textarea:focus {
  outline: none;
  border-color: var(--color-accent-gold);
  box-shadow: 0 0 0 2px rgba(212, 175, 55, 0.2);
}

.select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  background-size: 1.5em;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.submitButton {
  border: none;
  border-radius: var(--radius-md);
  font-weight: var(--font-weight-semibold);
  text-transform: none;
  letter-spacing: 0;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `vitest run components/supplements/SupplementLogForm.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/supplements/SupplementLogForm.tsx src/components/supplements/SupplementLogForm.module.css components/supplements/SupplementLogForm.test.tsx
git commit -m "feat: create supplement logging form"
```

### Task 4: Create Supplement Tracking Page

**Files:**
- Create: `src/pages/Supplements.tsx`
- Modify: `src/App.tsx` (add route)
- Modify: `src/contexts/AuthContext.tsx` (if needed for data loading)
- Test: `pages/Supplements.test.tsx`

**Interfaces:**
- Consumes: Supplement library, supplement log form, EnhancedSupabaseClient
- Produces: Complete supplement tracking page

- [ ] **Step 1: Write the failing test**

```typescript
import { render, screen } from '@testing-library/react';
import { Supplements } from '@/pages/Supplements';

describe('Supplements page', () => {
  it('renders supplement tracking header', () => {
    render(<Supplements />);
    const header = screen.getByRole('heading', { name: /supplements/i });
    expect(header).toBeInTheDocument();
  });
  
  it('has log supplement button', () => {
    render(<Supplements />);
    const button = screen.getByRole('button', { name: /log supplement/i });
    expect(button).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `vitest run pages/Supplements.test.tsx`
Expected: FAIL with "Cannot not find module '@/pages/Supplements'"

- [ ] **Step 3: Write minimal implementation**

Create Supplements.tsx:
```typescript
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/hooks/useData';
import { enhancedSupabase } from '@/lib/supabase-enhanced';
import { commonSupplements } from '@/lib/supplement-types';
import { SupplementLibrary } from '@/components/supplements/SupplementLibrary';
import { SupplementLogForm } from '@/components/supplements/SupplementLogForm';
import GlassCard from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';
import { Pill} from 'lucide-react';

export default function Supplements() {
  const { user } = useAuth();
  const { data, refresh } = useData();
  const [showLogForm, setShowLogForm] = useState(false);
  const [selectedSupplement, setSelectedSupplement] = useState<any>(null);
  
  const supplementLogs = data.supplement_logs || [];
  
  const handleLogSupplement = async (log: any) => {
    await refresh();
    setShowLogForm(false);
  };
  
  const handleCloseLogForm = () => {
    setShowLogForm(false);
    setSelectedSupplement(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="p-4 pb-24 space-y-4 max-w-lg mx-auto"
    >
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-text-primary">Supplements</h1>
        <button
          onClick={() => setShowLogForm(true)}
          className="px-4 py-2 rounded-lg bg-accent-gold/20 text-accent-gold border border-accent-gold/30 font-medium hover:bg-accent-gold/30 hover-lift transition-colors"
        >
          <Pill size={16} className="inline mr-2" /> Log Supplement
        </button>
      </div>
      
      {/* Today's Supplements */}
      <GlassCard className="glass-luxury">
        <div className="flex items-center gap-3 mb-3">
          <Pill size={16} className="text-accent-amber" />
          <span className="text-xs font-medium text-text-secondary/60 uppercase tracking-wider">Today's Supplements</span>
        </div>
        
        {supplementLogs
          .filter(log => log.date === new Date().toISOString().split('T')[0])
          .map(log => (
            <div key={log.id} className="flex justify-between items-center p-3 bg-bg-secondary/10 rounded-lg mb-2">
              <div>
                <div className="text-white font-medium">{log.supplement_name}</div>
                <div className="text-xs text-white/60">{log.dosage} {log.unit}{log.brand ? ` (${log.brand})` : ''}</div>
              </div>
              <div className="text-xs text-white/40">
                {new Date(log.timestamp || log.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </div>
            </div>
          ))}
        
        {supplementLogs.filter(log => log.date === new Date().toISOString().split('T')[0]).length === 0 && (
          <p className="text-center text-text-secondary/60 py-4">
            No supplements logged today
          </p>
        )}
      </GlassCard>
      
      {/* Supplement Library */}
      <GlassCard className="glass-luxury">
        <div className="flex items-center gap-3 mb-3">
          <Pill size={16} className="text-text-primary" />
          <span className="text-xs font-medium text-text-secondary/60 uppercase tracking-wider">Supplement Library</span>
        </div>
        
        <SupplementLibrary
          supplements={commonSupplements}
          onSelect={setSelectedSupplement}
          selectedSupplement={selectedSupplement}
        />
      </GlassCard>
      
      {/* Log Form */}
      {showLogForm && (
        <GlassCard className="glass-luxury">
          <SupplementLogForm
            supplements={commonSupplements}
            onLog={handleLogSupplement}
            onClose={handleCloseLogForm}
          />
        </GlassCard>
      )}
    </motion.div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `vitest run pages/Supplements.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/Supplements.tsx
git commit -m "feat: create supplements tracking page"
```

## Summary

This implementation plan has been created to track the progress of implementing the comprehensive life tracker enhancement. The plan follows the writing-plans skill guidelines with bite-sized, testable tasks that each include:
- Exact file paths
- Complete code implementations
- Test verification steps
- Commit instructions

The plan starts with implementing the supplement tracking feature as a foundation, following the same patterns that can be applied to all other tracking features (work, income, expenses, health, sleep, water, nutrition, mood, habits, time management, goals, journaling, reminders, analytics, and customization).

Each task implements a small, cohesive piece of functionality that can be tested independently, following TDD principles and making frequent commits.