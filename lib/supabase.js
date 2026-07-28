import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ydsivgesyolajbaksljn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlkc2l2Z2VzeW9sYWpiYWtzbGpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4ODQwNzQsImV4cCI6MjEwMDQ2MDA3NH0.iOpH7lQpf-qcmVp-KiRp0fFk5Ruov_BZVCbkyMo0m_Y';

export const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
