import { createClient } from '@supabase/supabase-js';

const getSupabaseConfig = () => {
  try {
    const configStr = localStorage.getItem('supabase_config');
    if (configStr) {
      const config = JSON.parse(configStr);
      if (config && config.url && config.anonKey) {
        return config;
      }
    }
  } catch (e) {
    console.error('Error reading Supabase config from localStorage:', e);
  }
  return null;
};

const config = getSupabaseConfig();

export const supabase = config
  ? createClient(config.url, config.anonKey)
  : null;
