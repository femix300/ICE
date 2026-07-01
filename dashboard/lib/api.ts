const BASE = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');

export const api = {
  get: async <T>(path: string, key?: string): Promise<T> => {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };
    if (key) {
      headers['Authorization'] = `Bearer ${key}`;
    }

    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const response = await fetch(`${BASE}${cleanPath}`, {
      method: 'GET',
      headers,
    });

    if (response.status === 401) {
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      let errorMessage = `HTTP error! Status: ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData) {
          if (typeof errorData.message === 'string') {
            errorMessage = errorData.message;
          } else if (typeof errorData.error === 'string') {
            errorMessage = errorData.error;
          } else if (errorData.data && typeof errorData.data.message === 'string') {
            errorMessage = errorData.data.message;
          }
        }
      } catch {
        // Fallback to default message
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    if (result && typeof result === 'object' && 'ok' in result && 'data' in result) {
      return result.data as T;
    }
    return result as T;
  },

  post: async <T>(path: string, body: unknown, key?: string): Promise<T> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (key) {
      headers['Authorization'] = `Bearer ${key}`;
    }

    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const response = await fetch(`${BASE}${cleanPath}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (response.status === 401) {
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      let errorMessage = `HTTP error! Status: ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData) {
          if (typeof errorData.message === 'string') {
            errorMessage = errorData.message;
          } else if (typeof errorData.error === 'string') {
            errorMessage = errorData.error;
          } else if (errorData.data && typeof errorData.data.message === 'string') {
            errorMessage = errorData.data.message;
          }
        }
      } catch {
        // Fallback to default message
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    if (result && typeof result === 'object' && 'ok' in result && 'data' in result) {
      return result.data as T;
    }
    return result as T;
  },
};