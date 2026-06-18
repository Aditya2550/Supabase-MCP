import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Dynamically fetches the list of public tables by querying the PostgREST OpenAPI specification.
 * Falls back to a predefined list (e.g. ['products']) if query fails or returns empty.
 */
export async function fetchTables(customUrl, customKey) {
  const url = customUrl || supabaseUrl;
  const key = customKey || supabaseAnonKey;

  if (!url || !key) {
    console.warn('Supabase URL or Anon Key is missing. Dynamic table discovery may fail.');
    return ['products'];
  }

  try {
    const response = await fetch(`${url}/rest/v1/`, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch PostgREST OpenAPI spec: ${response.statusText}`);
    }
    
    const data = await response.json();
    const tables = [];
    
    // Parse tables from Swagger definitions or paths
    if (data.definitions) {
      tables.push(...Object.keys(data.definitions));
    } else if (data.components?.schemas) {
      tables.push(...Object.keys(data.components.schemas));
    } else if (data.paths) {
      Object.keys(data.paths).forEach(path => {
        if (path !== '/' && !path.startsWith('/rpc/')) {
          // Extract table name from route, e.g., "/products" -> "products"
          tables.push(path.substring(1));
        }
      });
    }
    
    // Deduplicate and filter out internal/empty paths
    const uniqueTables = [...new Set(tables)].filter(t => t && !t.startsWith('_') && t !== 'rpc');
    
    if (uniqueTables.length === 0) {
      return ['products'];
    }
    return uniqueTables;
  } catch (error) {
    console.error('Error fetching tables dynamically:', error);
    // Return standard fallback
    return ['products'];
  }
}
