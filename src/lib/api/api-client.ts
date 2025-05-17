/**
 * API client utilities for making requests to the backend with error handling
 */
import { z } from 'zod';
import type { PaginatedResponse } from '@/lib/pagination/types';

// API request options
type RequestOptions = {
  headers?: Record<string, string>;
  cache?: RequestCache;
};

// API error schema and type
const apiErrorSchema = z.object({
  error: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
  status: z.number(),
});

export type ApiError = z.infer<typeof apiErrorSchema>;

// Standard API response schema and type
export type ApiResponse<T> = {
  data?: T;
  error?: ApiError;
};

// Pagination metadata schema
const paginationMetaSchema = z.object({
  currentPage: z.number(),
  totalPages: z.number(),
  totalItems: z.number(),
  itemsPerPage: z.number(),
  hasNextPage: z.boolean(),
  hasPreviousPage: z.boolean(),
});

// Schema for paginated responses - this matches the format from our API
export const paginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    meta: paginationMetaSchema,
  });

// Types for paginated responses
export type PaginationMetaResponse = z.infer<typeof paginationMetaSchema>;
export type PaginatedApiResponse<T> = ApiResponse<PaginatedResponse<T>>;

/**
 * Determines if an object looks like a PaginatedResponse (has 'data' array and 'meta' object)
 */
function isPaginatedResponse(obj: unknown): obj is PaginatedResponse<unknown> {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    'data' in obj &&
    Array.isArray((obj as Record<string, unknown>).data) &&
    'meta' in obj &&
    typeof (obj as Record<string, unknown>).meta === 'object'
  );
}

/**
 * Handles API response with error checking and type safety
 * @param response Fetch response object
 * @returns Typed API response
 */
async function handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
  const contentType = response.headers.get('content-type');
  console.log('Response content type:', contentType);

  // Handle JSON responses
  if (contentType && contentType.includes('application/json')) {
    const rawText = await response.text();
    console.log('Raw response text:', rawText);

    let rawData;
    try {
      rawData = JSON.parse(rawText);
      console.log('Parsed response data:', rawData);
    } catch (e) {
      console.error('Error parsing JSON response:', e);
      return {
        error: {
          error: 'Invalid JSON',
          message: 'Server returned invalid JSON',
          status: response.status,
        },
      };
    }

    // Handle error responses
    if (!response.ok) {
      // Validate error structure with Zod
      try {
        const validatedError = apiErrorSchema.parse({
          error: rawData.error || 'Unknown error',
          message: rawData.message || 'An unexpected error occurred',
          details: rawData.details,
          status: response.status,
        });
        return { error: validatedError };
      } catch {
        // Fallback for invalid error structure
        return {
          error: {
            error: 'Validation Error',
            message: 'Server returned an invalid error response',
            status: response.status,
          },
        };
      }
    }

    // Handle successful responses

    console.log(
      'Processing successful response, data type:',
      typeof rawData,
      'Is Array:',
      Array.isArray(rawData)
    );

    // Check if this is a paginated response
    if (isPaginatedResponse(rawData)) {
      // It's already in the correct structure, don't add extra nesting
      return { data: rawData as unknown as T };
    } else if (rawData && typeof rawData === 'object' && 'data' in rawData) {
      // It may have a 'data' property, but not be paginated
      const typedData = rawData as Record<string, unknown>;
      return { data: typedData.data as T };
    } else {
      // Return the raw data
      return { data: rawData as T };
    }
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
   * Make a GET request for paginated data
   * @param url API endpoint URL
   * @param params Pagination parameters
   * @param options Additional request options
   * @returns Typed paginated API response
   */
  async getPaginated<T>(
    url: string,
    params: {
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      [key: string]: string | number | boolean | undefined;
    } = {},
    options?: RequestOptions
  ): Promise<ApiResponse<PaginatedResponse<T>>> {
    try {
      // Build query parameters
      const queryParams = new URLSearchParams();

      // Add pagination parameters
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

      // Add any other parameters
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && !['page', 'limit', 'sortBy', 'sortOrder'].includes(key)) {
          queryParams.append(key, String(value));
        }
      });

      // Build the URL with query parameters
      const fullUrl = `${url}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        cache: options?.cache || 'default',
      });

      return handleResponse<PaginatedResponse<T>>(response);
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
      console.log('API client POST request:', { url, data });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        body: JSON.stringify(data),
      });

      console.log('API client POST raw response status:', response.status);
      const result = await handleResponse<T>(response);
      console.log('API client POST processed response:', result);
      return result;
    } catch (error) {
      console.error('API client POST error:', error);
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

  /**
   * Make a PATCH request
   * @param url API endpoint URL
   * @param data Request body data
   * @param options Additional request options
   * @returns Typed API response
   */
  async patch<T, D = unknown>(
    url: string,
    data: D,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(url, {
        method: 'PATCH',
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
};
