// ============================================================
// supabaseClient.js — Initialize Supabase
// IMPORTANT: Replace these with your own project credentials
// from https://supabase.com/dashboard/project/_/settings/api
// ============================================================

// supabaseClient.js

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://uyqpunldvvmxyydtxtnp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_h6Ry_TZDIcCnTGKxj0KuDQ_IMqCUDZh';

const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export { supabaseClient };
