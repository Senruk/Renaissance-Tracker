import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://ohtcaqzgfzboscjdrbvp.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9odGNhcXpnZnpib3NjamRyYnZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0NDQ3ODgsImV4cCI6MjA5NjQyMDc4OH0.oqSkdBW5mDfaW8UODCbT9hzpGW2H1Fb76shfnALgqbg'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
