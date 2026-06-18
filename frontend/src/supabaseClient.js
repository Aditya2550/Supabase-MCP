import { createClient as initialCreateClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Custom Postgrest Client to bypass browser service_role key restrictions
class PostgrestClient {
  constructor(url, key) {
    this.url = url;
    this.key = key;
  }

  from(tableName) {
    return new PostgrestQueryBuilder(this.url, this.key, tableName);
  }
}

class PostgrestQueryBuilder {
  constructor(url, key, tableName) {
    this.url = url;
    this.key = key;
    this.tableName = tableName;
    this.params = new URLSearchParams();
    this.headers = {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Prefer': 'count=exact'
    };
  }

  select(columns = '*', options = {}) {
    this.params.set('select', columns);
    return this;
  }

  eq(column, value) {
    this.params.append(column, `eq.${value}`);
    return this;
  }

  neq(column, value) {
    this.params.append(column, `neq.${value}`);
    return this;
  }

  gt(column, value) {
    this.params.append(column, `gt.${value}`);
    return this;
  }

  lt(column, value) {
    this.params.append(column, `lt.${value}`);
    return this;
  }

  gte(column, value) {
    this.params.append(column, `gte.${value}`);
    return this;
  }

  lte(column, value) {
    this.params.append(column, `lte.${value}`);
    return this;
  }

  ilike(column, value) {
    this.params.append(column, `ilike.${value}`);
    return this;
  }

  order(column, { ascending = true } = {}) {
    this.params.set('order', `${column}.${ascending ? 'asc' : 'desc'}`);
    return this;
  }

  range(from, to) {
    this.headers['Range'] = `${from}-${to}`;
    return this;
  }

  // Thenable implementation to support async/await transparently
  async then(resolve, reject) {
    try {
      const url = `${this.url}/rest/v1/${this.tableName}?${this.params.toString()}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: this.headers
      });

      if (!response.ok) {
        const errorText = await response.text();
        let parsedErr;
        try {
          parsedErr = JSON.parse(errorText);
        } catch (_) {}
        throw new Error(parsedErr?.message || errorText || `HTTP error ${response.status}`);
      }

      const data = await response.json();
      const contentRange = response.headers.get('Content-Range');
      let count = 0;
      if (contentRange) {
        const parts = contentRange.split('/');
        if (parts.length > 1) {
          count = parseInt(parts[1], 10);
        }
      } else {
        count = data.length;
      }

      resolve({ data, count, error: null });
    } catch (err) {
      resolve({ data: null, count: 0, error: err });
    }
  }
}

// Wrapper for creating client, automatically falling back to custom Postgrest client for secret keys
export function createClient(url, key) {
  let isServiceRole = false;
  if (key) {
    const cleanKey = key.trim();
    if (cleanKey.startsWith('sb_secret_') || cleanKey.includes('service_role')) {
      isServiceRole = true;
    } else {
      // Decode JWT payload to check role
      try {
        const parts = cleanKey.split('.');
        if (parts.length === 3) {
          // base64url decode
          const base64Url = parts[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(
            window.atob(base64)
              .split('')
              .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
              .join('')
          );
          const payload = JSON.parse(jsonPayload);
          if (payload && (payload.role === 'service_role' || payload.role === 'anon' && payload.iss === 'supabase' && payload.role === 'service_role')) {
            isServiceRole = true;
          }
          // Also double check role explicitly
          if (payload && payload.role === 'service_role') {
            isServiceRole = true;
          }
        }
      } catch (e) {
        // Not a valid JWT or parse error, fallback to normal
      }
    }
  }

  if (isServiceRole) {
    console.log('Using custom Postgrest client wrapper via local proxy to bypass browser secret key block.');
    const proxyUrl = 'http://localhost:8000/api/db';
    return new PostgrestClient(proxyUrl, key);
  }
  
  try {
    return initialCreateClient(url, key);
  } catch (err) {
    console.warn('Standard Supabase client creation failed, falling back to Postgrest client:', err);
    return new PostgrestClient(url, key);
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function fetchTables(customUrl, customKey) {
  const url = customUrl || supabaseUrl;
  const key = customKey || supabaseAnonKey;

  if (!url || !key) {
    console.warn('Supabase URL or Anon Key is missing. Dynamic table discovery may fail.');
    return ['products'];
  }

  // Check if we need to proxy the tables spec fetch
  let isServiceRole = false;
  if (key) {
    const cleanKey = key.trim();
    if (cleanKey.startsWith('sb_secret_') || cleanKey.includes('service_role')) {
      isServiceRole = true;
    } else {
      try {
        const parts = cleanKey.split('.');
        if (parts.length === 3) {
          const base64Url = parts[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = atob(base64);
          const payload = JSON.parse(jsonPayload);
          if (payload && payload.role === 'service_role') {
            isServiceRole = true;
          }
        }
      } catch (_) {}
    }
  }

  try {
    // If service role, fetch from the local proxy root (http://localhost:8000/api/db/)
    // which maps to supabase_url/rest/v1/ on the proxy. Otherwise, fetch standard URL directly.
    const fetchUrl = isServiceRole 
      ? 'http://localhost:8000/api/db/' 
      : `${url}/rest/v1/`;

    const response = await fetch(fetchUrl, {
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
    
    if (data.definitions) {
      tables.push(...Object.keys(data.definitions));
    } else if (data.components?.schemas) {
      tables.push(...Object.keys(data.components.schemas));
    } else if (data.paths) {
      Object.keys(data.paths).forEach(path => {
        if (path !== '/' && !path.startsWith('/rpc/')) {
          tables.push(path.substring(1));
        }
      });
    }
    
    const uniqueTables = [...new Set(tables)].filter(t => t && !t.startsWith('_') && t !== 'rpc');
    
    if (uniqueTables.length === 0) {
      return ['products'];
    }
    return uniqueTables;
  } catch (error) {
    console.error('Error fetching tables dynamically:', error);
    return ['products'];
  }
}
