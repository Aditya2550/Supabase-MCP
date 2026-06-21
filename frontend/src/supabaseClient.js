const defaultApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Custom Postgrest Client that makes queries through our local FastAPI proxy
class PostgrestClient {
  constructor(url) {
    this.url = url;
  }

  from(tableName) {
    return new PostgrestQueryBuilder(this.url, tableName);
  }
}

class PostgrestQueryBuilder {
  constructor(url, tableName) {
    this.url = url;
    this.tableName = tableName;
    this.params = new URLSearchParams();
    this.headers = {
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
      const url = `${this.url}/${this.tableName}?${this.params.toString()}`;
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

// Wrapper for creating client targeting the backend proxy URL
export function createClient(apiUrl) {
  const url = apiUrl || defaultApiUrl;
  return new PostgrestClient(`${url}/api/db`);
}

export const supabase = createClient(defaultApiUrl);

// Dynamically discover table names from proxy's database spec endpoint
export async function fetchTables(apiUrl) {
  const url = apiUrl || defaultApiUrl;
  const fetchUrl = `${url}/api/db/`;

  try {
    const response = await fetch(fetchUrl);
    
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
