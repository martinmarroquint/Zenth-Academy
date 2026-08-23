// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rpphjdgalniijuktnorf.supabase.co';
const supabaseAnonKey = 'sb_publishable_1Pj5H7k5iftkB1cVa83gUA_9StlMaI6';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);