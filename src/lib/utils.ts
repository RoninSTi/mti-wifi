import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useParams as useNextParams } from 'next/navigation';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Type-safe wrapper for Next.js useParams hook
 *
 * @example
 * // Define your route parameter types
 * type LocationParams = {
 *   id: string;       // Organization ID
 *   locationId: string;
 * };
 *
 * // Use the hook with your type
 * const { id, locationId } = useTypedParams<LocationParams>();
 * // id and locationId are now guaranteed to be strings, not string[] | undefined
 */
export function useTypedParams<T extends Record<string, string>>(): T {
  const params = useNextParams();

  if (!params) {
    throw new Error('No route parameters found');
  }

  // Convert potential arrays or undefined values to strings
  const typedParams = {} as T;

  // Iterate over all params and ensure they are strings
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined) {
      throw new Error(`Required parameter '${key}' is missing`);
    }

    if (Array.isArray(value)) {
      // For array values, join into a single string
      // This typically shouldn't happen with normal route params but could occur with catch-all routes
      Object.assign(typedParams, { [key]: value.join('/') });
    } else {
      // For string values, use as-is
      Object.assign(typedParams, { [key]: value });
    }
  });

  return typedParams;
}
