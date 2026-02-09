import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const missingVars = [
  !SUPABASE_URL ? 'VITE_SUPABASE_URL' : null,
  !SUPABASE_PUBLISHABLE_KEY ? 'VITE_SUPABASE_PUBLISHABLE_KEY' : null,
].filter(Boolean) as string[];

if (missingVars.length > 0) {
  throw new Error(
    `Configuração do Supabase ausente: ${missingVars.join(', ')}. ` +
      `Defina essas variáveis no ambiente (ex.: Vercel > Project Settings > Environment Variables) ` +
      `ou em um arquivo .env local (não commitar).`
  );
}

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});