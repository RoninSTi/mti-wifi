/**
 * API client utilities for making requests to the backend with error handling
 */

type RequestOptions = {
  headers?: Record<string, string>;
  cache?: RequestCache;
};

export type ApiError = {
  error: string;
  message: string;
  details?: unknown;
  status: number;
};

export type ApiResponse<T> = {
  data?: T;
  error?: ApiError;
};

/**
 * Handles API response with error checking and type safety
 * @param response Fetch response object
 * @returns Typed API response
 */
async function handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
  const contentType = response.headers.get('content-type');

  // Handle JSON responses
  if (contentType && contentType.includes('application/json')) {
    const data = await response.json();

    // Handle error responses
    if (!response.ok) {
      return {
        error: {
          error: data.error || 'Unknown error',
          message: data.message || 'An unexpected error occurred',
          details: data.details,
          status: response.status,
        },
      };
    }

    // Handle successful responses
    return { data: data.data || data };
  }

  // Handle non-JSON responses (rare in our API)
  if (!response.ok) {
    return {
      error: {
        error: `${response.status} ${response.statusText}`,
        message: 'An unexpected error occurred',
        status: response.status,
      },
    };
  }

  // For successful non-JSON responses, try to convert to text
  const textData = await response.text();
  return { data: textData as unknown as T };
}

/**
 * Generic API client for making HTTP requests
 */
export const apiClient = {
  /**
   * Make a GET request
   * @param url API endpoint URL
   * @param options Additional request options
   * @returns Typed API response
   */
  async get<T>(url: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        cache: options?.cache || 'default',
      });

      return handleResponse<T>(response);
    } catch (error) {
      return {
        error: {
          error: 'Request Failed',
          message: error instanceof Error ? error.message : 'Network request failed',
          status: 0, // Use 0 to indicate network/client error
        },
      };
    }
  },

  /**
   * Make a POST request
   * @param url API endpoint URL
   * @param data Request body data
   * @param options Additional request options
   * @returns Typed API response
   */
  async post<T, D = unknown>(
    url: string,
    data: D,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        body: JSON.stringify(data),
      });

      return handleResponse<T>(response);
    } catch (error) {
      return {
        error: {
          error: 'Request Failed',
          message: error instanceof Error ? error.message : 'Network request failed',
          status: 0,
        },
      };
    }
  },

  /**
   * Make a PUT request
   * @param url API endpoint URL
   * @param data Request body data
   * @param options Additional request options
   * @returns Typed API response
   */
  async put<T, D = unknown>(
    url: string,
    data: D,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        body: JSON.stringify(data),
      });

      return handleResponse<T>(response);
    } catch (error) {
      return {
        error: {
          error: 'Request Failed',
          message: error instanceof Error ? error.message : 'Network request failed',
          status: 0,
        },
      };
    }
  },

  /**
   * Make a DELETE request
   * @param url API endpoint URL
   * @param options Additional request options
   * @returns Typed API response
   */
  async delete<T>(url: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      return handleResponse<T>(response);
    } catch (error) {
      return {
        error: {
          error: 'Request Failed',
          message: error instanceof Error ? error.message : 'Network request failed',
          status: 0,
        },
      };
    }
  },
};
