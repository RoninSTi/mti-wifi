# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js project bootstrapped with `create-next-app`. It uses:

- Next.js 15.3.2 with the App Router
- React 18
- TypeScript
- TailwindCSS 4
- ShadCN UI components
- ESLint 9
- MongoDB with Mongoose for database operations
- Docker for local development environment
- NextAuth.js for authentication
- next-themes for dark mode support
- migrate-mongo for database migrations
- OpenTelemetry for API monitoring and observability

## Common Commands

### Development

```bash
# Start development server with hot module reloading
npm run dev

# Start complete development environment (MongoDB + migrations + Next.js server)
npm run dev:full

# Stop development environment and shut down MongoDB
npm run dev:stop

# Build the application for production
npm run build

# Start production server
npm run start

# Run ESLint to check for code issues
npm run lint

# Start local MongoDB Docker container manually
docker-compose up -d

# Stop local MongoDB Docker container manually
docker-compose down

# Database migrations
npm run db:migrate        # Apply all pending migrations
npm run db:rollback       # Roll back the last applied migration
npm run db:status         # Show migration status
npm run db:create-migration my-migration-name  # Create a new migration
npm run db:seed           # Seed database with development data
npm run db:reset          # Roll back all migrations and reapply them
```

## Project Structure

- `/src/app/` - Main application code using Next.js App Router
  - `layout.tsx` - Root layout component that wraps all pages
  - `page.tsx` - Homepage component
  - `globals.css` - Global CSS styles with Tailwind imports
  - `providers.tsx` - React context providers (NextAuth, ThemeProvider)
  - `api/auth/[...nextauth]/route.ts` - Next Auth API endpoint
  - `api/auth/register/route.ts` - User registration API endpoint
  - `auth/signin/page.tsx` - Sign in page
  - `auth/register/page.tsx` - Registration page
- `/src/components/` - Reusable React components
  - `Header.tsx` - Main header with navigation
  - `auth/` - Authentication-related components
  - `ui/` - ShadCN UI components
    - Component files like `button.tsx`, `input.tsx`, etc.
    - `mode-toggle.tsx` - Theme switcher component
- `/src/lib/` - Utility functions and configurations
  - `utils.ts` - Utility functions for styling and operations including useTypedParams hook
  - `db/` - Database connection utilities
    - `mongoose.ts` - MongoDB connection with Mongoose
    - `config.ts` - Database configuration for different environments
    - `migration-utils.js` - Helper functions for database migrations
  - `auth/` - Authentication utilities
    - `auth.ts` - Client-side authentication hooks and functions
    - `auth-options.ts` - Next Auth configuration
- `/src/telemetry/` - OpenTelemetry configuration and utilities
  - `index.ts` - OpenTelemetry initialization and configuration
  - `utils.ts` - Helper functions for creating spans and metrics
- `/src/models/` - Mongoose models
  - `User.ts` - User model for authentication
- `/src/db/` - Database-related code
  - `migrations/` - Database migration files
  - `seed.js` - Seed script for development data

## Configuration Files

- `next.config.ts` - Next.js configuration
- `tsconfig.json` - TypeScript configuration with path aliases (`@/*` maps to `./src/*`)
- `postcss.config.mjs` - PostCSS configuration for Tailwind
- `eslint.config.mjs` - ESLint configuration
- `docker-compose.yml` - Docker configuration for local MongoDB
- `components.json` - ShadCN UI configuration
- `migrate-mongo-config.js` - Database migration configuration
- `instrumentation.ts` - OpenTelemetry instrumentation entry point
- `middleware.ts` - Next.js middleware for request tracing
- `.env.local.example` - Example local environment variables
- `.env.production.example` - Example production environment variables

## Database Configuration

The project is set up with dual database configurations:

- Local development: MongoDB running in Docker
- Production: AWS DocumentDB (MongoDB-compatible)

To connect to the database:

```typescript
import { connectToDatabase } from '@/lib/db/mongoose';

async function someFunction() {
  await connectToDatabase();
  // Your database operations here
}
```

## Authentication

The application uses NextAuth.js for authentication with username/password credentials:

### User Model

```typescript
// User model schema in /src/models/User.ts
interface IUser extends Document {
  username: string;
  email: string;
  password: string; // Stored as bcrypt hash
  comparePassword(candidatePassword: string): Promise<boolean>;
}
```

### Client-Side Authentication

```typescript
// In client components
import { useAuth, login, register, logout } from '@/lib/auth/auth';

// Check authentication status
const { isAuthenticated, user, isLoading } = useAuth();

// Login a user
await login(username, password);

// Register a new user
await register(username, email, password);

// Logout
await logout();
```

### Environment Variables

Required environment variables for authentication:

```
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here-change-in-production
```

## UI Components

The project uses ShadCN UI, which provides accessible, customizable React components built on top of Radix UI and styled with Tailwind CSS.

### Using ShadCN Components

```tsx
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Example usage
function MyComponent() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>My Card</CardTitle>
      </CardHeader>
      <CardContent>
        <Input placeholder="Enter text..." />
        <Button>Submit</Button>
      </CardContent>
    </Card>
  );
}
```

### Adding New ShadCN Components

To add more ShadCN components to the project:

```bash
npx shadcn@latest add [component-name]

# Examples
npx shadcn@latest add table
npx shadcn@latest add toast
```

### Theme Switching

The application supports theme switching (light/dark/system) using next-themes:

```tsx
import { useTheme } from 'next-themes';

function ThemeSwitcher() {
  const { setTheme } = useTheme();

  return (
    <div>
      <button onClick={() => setTheme('light')}>Light</button>
      <button onClick={() => setTheme('dark')}>Dark</button>
      <button onClick={() => setTheme('system')}>System</button>
    </div>
  );
}
```

## Database Migrations

The project uses migrate-mongo for database schema migrations, allowing for versioned database changes.

### Creating Migrations

Create a new migration file:

```bash
npm run db:create-migration add-user-role-field
```

This creates a timestamped migration file in `/src/db/migrations/` with `up` and `down` functions:

```javascript
// Example migration
module.exports = {
  async up(db, client) {
    // Update all users to have a default role
    await db
      .collection('users')
      .updateMany({ role: { $exists: false } }, { $set: { role: 'user' } });

    // Create an index on the role field
    await db.collection('users').createIndex({ role: 1 }, { background: true });
  },

  async down(db, client) {
    // Remove the role field from all users
    await db.collection('users').updateMany({}, { $unset: { role: '' } });

    // Drop the index
    await db.collection('users').dropIndex('role_1');
  },
};
```

### Running Migrations

Apply all pending migrations:

```bash
npm run db:migrate
```

Check migration status:

```bash
npm run db:status
```

Rollback the most recent migration:

```bash
npm run db:rollback
```

### Migration Best Practices

1. Always implement both `up` and `down` functions
2. Make migrations idempotent (can be run multiple times without side effects)
3. Keep migrations small and focused on specific changes
4. Use transactions where possible for atomicity
5. Test migrations in development before applying to production
6. Document complex migrations with comments

## OpenTelemetry Integration

The application is instrumented with OpenTelemetry for monitoring and observability of API routes and database operations.

### Local Development Setup

The project includes a complete local OpenTelemetry monitoring stack:

1. **OpenTelemetry Collector**: Receives, processes, and exports telemetry data
2. **Jaeger**: UI for visualizing and exploring traces

When you run `npm run dev:full`, the entire stack is automatically started. Access the monitoring interfaces at:

- Jaeger UI: http://localhost:16686
- OpenTelemetry Collector: http://localhost:4318

### Environment Variables

Configure OpenTelemetry with these environment variables:

```
# Local development
OTEL_SERVICE_NAME=nextjs-starter
OTEL_COLLECTOR_URL=http://localhost:4318
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_EXPORTER_OTLP_PROTOCOL=http/json
OTEL_TRACES_SAMPLER=always_on
OTEL_LOGS_EXPORTER=otlp

# Production (AWS)
# For production, configure to use AWS X-Ray or other AWS monitoring services
```

### Using Custom Spans

Create custom spans in your API routes or services:

```typescript
import { createApiSpan, createDatabaseSpan, addSpanAttributes } from '@/telemetry/utils';

// Wrap API handlers with spans
export async function GET(request: NextRequest) {
  return await createApiSpan('example.get', async () => {
    // Your API logic here

    // Add custom attributes to spans
    addSpanAttributes({ 'custom.attribute': 'value' });

    // Create spans for database operations
    const result = await createDatabaseSpan('find', 'users', async () => {
      // Database query here
      return await User.find();
    });

    return NextResponse.json({ data: result });
  });
}
```

### Instrumentation

The application is automatically instrumented for:

- HTTP requests and responses
- MongoDB/Mongoose operations
- Express/Next.js API routes
- Fetch/API calls

All telemetry data is sent to the configured OpenTelemetry collector endpoint, which forwards it to Jaeger for local development or AWS services in production.

### Docker Configuration

The OpenTelemetry setup is defined in:

- `docker-compose.yml` - Container definitions for collector and Jaeger
- `otel-collector-config.yaml` - Collector configuration

When switching to production, the OpenTelemetry configuration should be updated to forward telemetry data to your AWS monitoring services instead of the local Jaeger instance.

## TypeScript and Code Style Guidelines

### TypeScript Guidelines

1. **NEVER Use `any`, `typeof`, or Type Assertions**

   - Never use `any` type - it defeats TypeScript's purpose
   - Never use `typeof` for type checking in code - use proper type definitions instead
   - Never use type assertions (`as SomeType`) - rely on TypeScript's inference
   - Use type predicates and schema validation for runtime type checking
   - For dynamic or unknown types, use `unknown` with proper type narrowing:

   ```typescript
   // INCORRECT
   function handleError(error: any) {
     console.error(error.message); // Unsafe - error might not have a message property
   }

   // INCORRECT - using typeof
   function handleValue(value: unknown) {
     if (typeof value === 'string') {
       return value.toUpperCase();
     }
     return String(value);
   }

   // INCORRECT - using type assertions
   function processData(data: unknown) {
     const user = data as User;
     return user.name;
   }

   // CORRECT - using type predicates
   function isError(value: unknown): value is Error {
     return value instanceof Error;
   }

   function handleError(error: unknown) {
     if (isError(error)) {
       console.error(error.message);
     } else {
       console.error(String(error));
     }
   }

   // CORRECT - using Zod for validation
   import { z } from 'zod';

   const userSchema = z.object({
     name: z.string(),
     email: z.string().email(),
   });

   function processUserData(data: unknown) {
     const result = userSchema.safeParse(data);
     if (result.success) {
       // TypeScript knows this is a valid user
       return result.data.name;
     }
     throw new Error('Invalid user data');
   }
   ```

2. **Type Attributes and Parameters Properly**

   - For object maps, use `Record<K, V>` with specific types instead of `Record<string, any>`
   - Example:

   ```typescript
   // INCORRECT
   function addAttributes(attributes: Record<string, any>) {
     // Implementation
   }

   // CORRECT
   function addAttributes(
     attributes: Record<string, string | number | boolean | string[] | number[]>
   ) {
     // Implementation
   }
   ```

3. **Use Generic Types for Better Type Safety**

   - For functions that can work with different data types, use generics:

   ```typescript
   // Correct use of generics
   async function fetchData<T>(url: string): Promise<T> {
     const response = await fetch(url);
     return response.json();
   }

   // Usage
   const user = await fetchData<User>('/api/user');
   ```

4. **Prefer Zod for Runtime Type Validation**

   - Use Zod schemas for validating data at runtime:

   ```typescript
   // Define a schema
   const userSchema = z.object({
     id: z.string(),
     name: z.string(),
     email: z.string().email(),
   });

   // Parse and validate data
   function processUser(data: unknown) {
     const result = userSchema.safeParse(data);
     if (result.success) {
       // TypeScript knows this is a valid user
       const user = result.data;
       sendEmail(user.email);
     } else {
       // Handle validation errors
       console.error(result.error);
     }
   }
   ```

5. **Prefer Interface Merging for API Response Types**

   - Use interfaces for API responses to allow for declaration merging:

   ```typescript
   // Can be extended elsewhere
   interface ApiResponse<T> {
     data: T;
     meta: ResponseMetadata;
   }

   // Usage with specific data type
   interface UserResponse extends ApiResponse<User> {
     // Additional fields specific to user responses
   }
   ```

### JSX and React Guidelines

1. **Use Proper HTML Entities in JSX**

   - Replace apostrophes with `&apos;` or `&#39;`
   - Replace quotes with `&quot;`

   ```tsx
   // INCORRECT
   <p>Don't forget to check the user's profile</p>

   // CORRECT
   <p>Don&apos;t forget to check the user&apos;s profile</p>
   ```

2. **Remove Unused Imports**

   - Always remove unused imports completely, not comment them out
   - Delete unused imports entirely, never leave commented out imports
   - ESLint will flag these with the `no-unused-vars` rule

3. **Use Next.js Navigation APIs Instead of Direct DOM Manipulation**

   - Never use `window.location.href` for client-side navigation
   - Always use Next.js's navigation APIs for routing

   ```tsx
   // INCORRECT
   const handleClick = () => {
     window.location.href = '/dashboard';
   };

   // CORRECT - Using useRouter hook
   import { useRouter } from 'next/navigation';

   const MyComponent = () => {
     const router = useRouter();

     const handleClick = () => {
       router.push('/dashboard');
     };

     // rest of component...
   };

   // CORRECT - Using Link component for declarative navigation
   import Link from 'next/link';

   const MyComponent = () => {
     return <Link href="/dashboard">Go to Dashboard</Link>;
   };
   ```

### Code Validation and Type Checking

- All TypeScript code must pass strict type checking with no errors
- Run TypeScript checks with `npx tsc --noEmit --pretty` to verify type correctness
- Prefer explicit return types for functions, especially those exported from modules
- Use type assertions sparingly and only when the type is guaranteed

### TypeScript Config Strictness

The project uses strict TypeScript settings:

- `strict: true` - Enables all strict type checking options
- `noImplicitAny: true` - Raise error on expressions and declarations with an implied 'any' type
- `strictNullChecks: true` - Enable strict null checks
- `strictFunctionTypes: true` - Enable strict checking of function types

### ESLint and Code Style

- The project uses Prettier for code formatting
- ESLint is configured for TypeScript and React best practices
- Use the `npm run lint` command to verify ESLint compliance
- Pre-commit hooks automatically format and lint code before commits
- The code should follow all ESLint rules without disabling them
- Never use `// eslint-disable-next-line` comments without team approval

### Validation Checklist

Before submitting code:

1. Run type checking: `npx tsc --noEmit`
2. Run linting: `npm run lint`
3. Ensure no TypeScript or ESLint errors
4. Verify that shared types match between frontend and backend
5. Confirm all API responses are properly validated with Zod schemas

## API Client and Data Fetching

The application implements a standardized way of handling API requests using shared types and validation with Zod.

### API Client Architecture

We use a centralized API client with specialized methods for common request patterns:

```typescript
// Basic request pattern
export const apiClient = {
  async get<T>(url: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        cache: options?.cache || 'default',
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

  // Additional methods for POST, PUT, DELETE, etc.
};
```

### Response Validation with Zod

Always validate API responses using Zod schemas for runtime type safety:

```typescript
// Define a schema that matches the expected API response
const userSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string().email(),
  role: z.enum(['user', 'admin']),
});

// Validate the response
const response = await apiClient.get('/api/users/123');
const result = userSchema.safeParse(response.data);

if (result.success) {
  // Validated data with proper types
  const user = result.data;
} else {
  // Handle validation errors
  console.error('Invalid response data:', result.error);
}
```

### Paginated Responses

For paginated API endpoints, use specialized client methods and response types:

```typescript
// Paginated response schema
export const paginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    meta: z.object({
      currentPage: z.number(),
      totalPages: z.number(),
      totalItems: z.number(),
      itemsPerPage: z.number(),
      hasNextPage: z.boolean(),
      hasPreviousPage: z.boolean(),
    }),
  });

// API client method for paginated endpoints
async getPaginated<T>(url: string, params = {}): Promise<ApiResponse<PaginatedResponse<T>>> {
  // Implementation that handles pagination parameters
}
```

## React Query and Custom Hooks

The application uses React Query for data fetching and state management.

### Setting Up React Query

The React Query provider is set up in `src/app/providers.tsx`:

```tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function Providers({ children }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            retry: 1,
          },
        },
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
```

### Creating Data Hooks

Custom hooks should follow these patterns:

1. **Type Safety**: Use proper TypeScript generics and return types
2. **Shared Types**: Import types from a central location
3. **Error Handling**: Provide standardized error handling
4. **Pagination Support**: Handle pagination metadata when needed

Example resource hook:

```typescript
import { useQuery } from '@tanstack/react-query';
import { getResource } from '@/lib/api/resource';
import type { ResourceResponse } from '@/types/api-types';
import type { ApiResponse } from '@/lib/api/api-client';

export function useResource(id: string) {
  return useQuery<ApiResponse<ResourceResponse>, Error>({
    queryKey: ['resource', id],
    queryFn: () => getResource(id),
    // Other options like staleTime, retry, etc.
  });
}
```

Example paginated hook:

```typescript
export function useResourceList(params: ResourceListParams = {}) {
  const { data, isLoading, isError, error, refetch } = useQuery<
    ApiResponse<PaginatedResponse<ResourceResponse>>,
    Error
  >({
    queryKey: ['resources', params],
    queryFn: () => getResourceList(params),
  });

  // Extract normalized data from the response
  const resources = data?.data?.data || [];
  const pagination = data?.data?.meta || null;

  return {
    resources,
    pagination,
    isLoading,
    isError,
    error,
    refetch,
  };
}
```

### Mutation Hooks

For data mutations (create, update, delete), use `useMutation` with proper query invalidation:

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createResource } from '@/lib/api/resource';

export function useCreateResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createResource,
    onSuccess: () => {
      // Invalidate related queries to refresh data automatically
      queryClient.invalidateQueries({ queryKey: ['resources'] });
    },
  });
}
```

### Query Invalidation vs. Manual Refetching

React Query is designed to manage the fetching, caching, and updating of data automatically. The refetch method should almost never be needed directly in components. Always follow these best practices:

1. **NEVER use manual refetch calls directly in components - this is a code smell**

   ```typescript
   // INCORRECT - Using manual refetch in component
   const { data, refetch } = useResources();

   const handleSubmit = async () => {
     await createResource(newResource);
     // Don't do this - it bypasses React Query's automatic updates
     refetch();
   };

   // CORRECT - Let React Query handle updates via invalidation
   const queryClient = useQueryClient();
   const { data } = useResources();
   const { mutate } = useCreateResource(); // This mutation internally invalidates the query

   const handleSubmit = async () => {
     mutate(newResource);
     // No refetch needed - query will update automatically when invalidated
   };
   ```

2. **Use query invalidation in mutation hooks**

   Make sure all mutation hooks (create/update/delete) properly invalidate related queries:

   ```typescript
   // In useCreateResource.ts
   export function useCreateResource() {
     const queryClient = useQueryClient();

     return useMutation({
       mutationFn: createResource,
       onSuccess: (data, variables) => {
         // Invalidate all resource list queries
         queryClient.invalidateQueries({ queryKey: ['resources'] });

         // Optionally update specific queries directly in the cache
         queryClient.setQueryData(['resource', data._id], data);
       },
     });
   }

   // In useUpdateResource.ts
   export function useUpdateResource() {
     const queryClient = useQueryClient();

     return useMutation({
       mutationFn: updateResource,
       onSuccess: data => {
         // Invalidate all resource list queries
         queryClient.invalidateQueries({ queryKey: ['resources'] });

         // Update specific resource in the cache
         queryClient.setQueryData(['resource', data._id], data);
       },
     });
   }

   // In useDeleteResource.ts
   export function useDeleteResource() {
     const queryClient = useQueryClient();

     return useMutation({
       mutationFn: deleteResource,
       onSuccess: (_, variables) => {
         // Invalidate all resource list queries
         queryClient.invalidateQueries({ queryKey: ['resources'] });

         // Remove the deleted item from cache
         queryClient.removeQueries({ queryKey: ['resource', variables.id] });
       },
     });
   }
   ```

3. **Invalidation patterns for related entities**

   When updating data that affects multiple entity types, invalidate all related queries:

   ```typescript
   // When adding a location to an organization
   queryClient.invalidateQueries({ queryKey: ['organizations'] });
   queryClient.invalidateQueries({ queryKey: ['locations'] });

   // When updating a nested entity, invalidate the parent too
   queryClient.invalidateQueries({ queryKey: ['equipment', equipmentId] });
   queryClient.invalidateQueries({ queryKey: ['areas', areaId] });
   ```

4. **Only include refetch in query hook return values when absolutely necessary**

   ```typescript
   // CORRECT - Don't expose refetch in normal cases
   export function useResources(params) {
     const query = useQuery({
       queryKey: ['resources', params],
       queryFn: () => getResources(params),
     });

     // Only return what components actually need
     return {
       resources: query.data?.data || [],
       isLoading: query.isLoading,
       isError: query.isError,
       error: query.error,
     };
   }
   ```

5. **Proper error state retry handling**

   When showing error states with retry buttons, use query invalidation instead of direct refetch calls:

   ```typescript
   // INCORRECT - Using refetch directly in error state
   {isError && (
     <div className="error-container">
       <p>Failed to load data</p>
       <Button onClick={() => refetch()}>Retry</Button>
     </div>
   )}

   // CORRECT - Using query invalidation for retry
   import { useQueryClient } from '@tanstack/react-query';

   function MyComponent() {
     const queryClient = useQueryClient();
     const { data, isError } = useResources(params);

     return (
       <>
         {isError && (
           <div className="error-container">
             <p>Failed to load data</p>
             <Button
               onClick={() => queryClient.invalidateQueries({
                 queryKey: ['resources', params]
               })}
             >
               Retry
             </Button>
           </div>
         )}
       </>
     );
   }
   ```

### Best Practices for React Query Hooks

1. **Never Recreate API Types or Schemas**

   - Use the existing types and schemas defined in the API files
   - Import these types and schemas rather than redefining them in the hooks
   - API response types are already defined in `src/app/api/*/schemas.ts` files

   ```typescript
   // INCORRECT - Recreating schemas in the hook
   const deleteResponseSchema = z.object({
     success: z.boolean(),
     message: z.string().optional(),
   });

   // CORRECT - Import and use existing schemas
   import { SuccessResponseSchema } from '@/app/api/common/schemas';
   import type { DeleteResponse } from '@/app/api/resources/schemas';
   ```

2. **Use the Existing API Client**

   - The API client in `src/lib/api/api-client.ts` already handles response structure and errors
   - It returns an `ApiResponse<T>` type that you should use directly

3. **Proper Query Invalidation Strategies**

   Use these query invalidation patterns for different situations:

   ```typescript
   // Broad invalidation (invalidates all queries for an entity type)
   queryClient.invalidateQueries({ queryKey: ['resources'] });

   // Targeted invalidation (invalidates specific instance)
   queryClient.invalidateQueries({ queryKey: ['resource', id] });

   // Exact match invalidation (only invalidates an exact query)
   queryClient.invalidateQueries({
     queryKey: ['resources', { status: 'active' }],
     exact: true,
   });

   // Remove a query from cache (when entity is deleted)
   queryClient.removeQueries({ queryKey: ['resource', id] });

   // Update a specific query directly without refetching
   queryClient.setQueryData(['resource', id], updatedResource);
   ```

4. **Consistent Error Handling**

   - The API client already standardizes error objects in the `ApiResponse<T>` type
   - Simply check `response.error` to handle errors consistently

   ```typescript
   if (response.error) {
     throw new Error(response.error.message || 'Operation failed');
   }
   ```

## Component Reusability and Consistency

Maintaining consistency across the application is paramount. Always follow these guidelines to ensure that components are reusable and consistent:

### Shared Component Guidelines

1. **Create Shared Components for Repeated Patterns**

   - Any UI pattern that appears in more than one place should be extracted into a shared component
   - Place shared components in logical folders:
     - Domain-specific components in folders like `@/components/areas/`, `@/components/organizations/`, etc.
     - Cross-domain shared components in `@/components/shared/`
     - Base UI components in `@/components/ui/`

   ```tsx
   // INCORRECT: Duplicating the same UI pattern in multiple components
   // In PageA.tsx
   <div className="flex items-center gap-2 my-4">
     <SomeIcon />
     <h2 className="text-lg font-medium">{title}</h2>
     <Badge>{status}</Badge>
   </div>

   // In PageB.tsx (duplicated code)
   <div className="flex items-center gap-2 my-4">
     <SomeIcon />
     <h2 className="text-lg font-medium">{otherTitle}</h2>
     <Badge>{otherStatus}</Badge>
   </div>

   // CORRECT: Extract to a shared component
   // In @/components/shared/SectionHeader.tsx
   export function SectionHeader({ title, status, icon }: SectionHeaderProps) {
     return (
       <div className="flex items-center gap-2 my-4">
         {icon}
         <h2 className="text-lg font-medium">{title}</h2>
         {status && <Badge>{status}</Badge>}
       </div>
     );
   }

   // Used consistently in both pages
   <SectionHeader title={title} status={status} icon={<SomeIcon />} />
   ```

2. **Make Components Configurable, Not Duplicated**

   - Use props to configure behavior and appearance rather than creating similar components
   - Avoid creating nearly identical components with slight variations

   ```tsx
   // INCORRECT: Creating multiple similar components
   export function UserTable() { /* ... */ }
   export function AdminTable() { /* ... */ } // Nearly identical to UserTable
   export function GuestTable() { /* ... */ } // Nearly identical to UserTable

   // CORRECT: One configurable component
   export function DataTable({
     role,
     columns,
     actions,
     emptyState
   }: DataTableProps) {
     // Render different columns, actions, etc. based on props
   }

   // Used with different configurations
   <DataTable role="user" columns={userColumns} actions={userActions} />
   <DataTable role="admin" columns={adminColumns} actions={adminActions} />
   ```

3. **Maintain Consistent Component APIs**

   - Use consistent prop names and patterns across similar components
   - Follow common React patterns for props like `onClick`, `className`, etc.
   - Allow forwarding of common props like `className` via spread operator

   ```tsx
   // Consistent prop naming across components
   interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
     variant?: 'primary' | 'secondary' | 'outline';
     size?: 'sm' | 'md' | 'lg';
     isLoading?: boolean;
   }

   interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
     variant?: 'standard' | 'filled' | 'outlined';
     size?: 'sm' | 'md' | 'lg';
     error?: string;
   }

   // Component implementation with proper prop forwarding
   export function Button({
     variant = 'primary',
     size = 'md',
     isLoading,
     children,
     className,
     ...props
   }: ButtonProps) {
     return (
       <button
         className={cn(getVariantClasses(variant), getSizeClasses(size), className)}
         disabled={isLoading || props.disabled}
         {...props}
       >
         {isLoading ? <Spinner size="sm" /> : children}
       </button>
     );
   }
   ```

4. **Implement Compound Components for Complex UIs**

   - For complex components, use the compound component pattern
   - This allows flexible composition while maintaining consistent styling and behavior

   ```tsx
   // Compound component example
   export function Tabs({ children, defaultValue }: TabsProps) {
     // Implementation
   }

   export function TabsList({ children }: TabsListProps) {
     // Implementation
   }

   export function TabsTrigger({ value, children }: TabsTriggerProps) {
     // Implementation
   }

   export function TabsContent({ value, children }: TabsContentProps) {
     // Implementation
   }

   // Usage
   <Tabs defaultValue="account">
     <TabsList>
       <TabsTrigger value="account">Account</TabsTrigger>
       <TabsTrigger value="password">Password</TabsTrigger>
     </TabsList>
     <TabsContent value="account">Account settings here</TabsContent>
     <TabsContent value="password">Password settings here</TabsContent>
   </Tabs>;
   ```

5. **Create and Use Entity-Specific Components Consistently**

   - For domain entities like Organizations, Areas, etc., create standard component sets
   - Implement consistent patterns for tables, forms, details, etc.

   ```tsx
   // For each entity, implement consistent component sets
   // Example organization structure:
   // - OrganizationsTable.tsx (list view)
   // - OrganizationDetails.tsx (detail view)
   // - CreateOrganizationDialog.tsx (creation form)
   // - EditOrganizationDialog.tsx (edit form)

   // Apply the same pattern consistently for other entities:
   // - AreasTable, AreaDetails, CreateAreaDialog, EditAreaDialog
   // - LocationsTable, LocationDetails, CreateLocationDialog, EditLocationDialog
   // - etc.
   ```

6. **Share Logic with Custom Hooks**

   - Extract common component logic into custom hooks
   - Keep components focused on presentation, hooks on logic

   ```tsx
   // Custom hook for managing pagination state
   export function usePagination(totalItems: number, itemsPerPage = 10) {
     const [page, setPage] = useState(1);
     const totalPages = Math.ceil(totalItems / itemsPerPage);

     const nextPage = () => setPage(p => Math.min(p + 1, totalPages));
     const prevPage = () => setPage(p => Math.max(p - 1, 1));
     const goToPage = (newPage: number) => setPage(Math.min(Math.max(newPage, 1), totalPages));

     return {
       page,
       totalPages,
       nextPage,
       prevPage,
       goToPage,
     };
   }

   // Used consistently in any component that needs pagination
   const { page, totalPages, nextPage, prevPage, goToPage } = usePagination(100);
   ```

### Approaches to Prevent Duplication

1. **Regularly Audit Components for Similarity**

   - Review existing components before creating new ones
   - Look for opportunities to refactor similar components into shared ones
   - Use the DRY (Don't Repeat Yourself) principle for component logic and styles

2. **Document Components and Their Use Cases**

   - Maintain documentation of shared components
   - Include examples of how to use them correctly
   - Make it easy for team members to find and reuse existing components

3. **Extract Common Patterns into Utility Functions**

   - For common styling patterns, create utility functions
   - Use consistent formatting helpers across components

   ```tsx
   // Extract common utilities
   const formatCurrency = (value: number) => `$${value.toFixed(2)}`;
   const formatDate = (date: Date) => date.toLocaleDateString();

   // Use consistently throughout components
   <p>{formatCurrency(product.price)}</p>
   <span>{formatDate(order.createdAt)}</span>
   ```

4. **Create Templates for Common Page Layouts**

   - Extract common page layouts into reusable templates
   - This ensures consistent structure across similar pages

   ```tsx
   // Template for entity detail pages
   export function EntityDetailTemplate({
     title,
     breadcrumbs,
     actions,
     tabs,
     children,
   }: EntityDetailTemplateProps) {
     return (
       <div>
         <div className="flex items-center justify-between mb-6">
           <div>
             {breadcrumbs}
             <h1 className="text-2xl font-bold">{title}</h1>
           </div>
           <div className="flex gap-2">{actions}</div>
         </div>
         {tabs}
         <div className="mt-6">{children}</div>
       </div>
     );
   }

   // Used consistently across entity detail pages
   <EntityDetailTemplate
     title={organization.name}
     breadcrumbs={<OrganizationBreadcrumbs id={organization.id} />}
     actions={<OrganizationActions organization={organization} />}
     tabs={<OrganizationTabs activeTab="details" id={organization.id} />}
   >
     <OrganizationDetails organization={organization} />
   </EntityDetailTemplate>;
   ```

## Route Parameters

### Type-Safe Route Parameters with useTypedParams

The application includes a custom hook called `useTypedParams` for handling route parameters in a type-safe way. This hook wraps the standard Next.js `useParams` hook to provide better type safety and error handling.

```typescript
import { useTypedParams } from '@/lib/utils';

// Define your route parameter types
type LocationParams = {
  id: string; // Organization ID
  locationId: string; // Location ID
};

// Use the hook with your type
const { id, locationId } = useTypedParams<LocationParams>();
// id and locationId are now guaranteed to be strings, not string[] | undefined
```

#### Benefits of useTypedParams

- Eliminates the need for manual type guards in page components
- Automatically converts potential array values to strings
- Throws helpful error messages for missing or invalid parameters
- Provides better TypeScript type inference
- Makes detail pages more concise and consistent

#### Example: Before and After

Before (with manual type guards):

```typescript
// Manual type narrowing with standard useParams
const params = useParams();
const id = params?.id;
const locationId = params?.locationId;

if (!id || Array.isArray(id) || !locationId || Array.isArray(locationId)) {
  throw new Error('Missing or invalid route parameters');
}

// Now TypeScript knows these are strings
const organizationId = id;
```

After (with useTypedParams):

```typescript
// Type-safe params with useTypedParams
type LocationDetailParams = {
  id: string; // Organization ID
  locationId: string; // Location ID
};
const { id: organizationId, locationId } = useTypedParams<LocationDetailParams>();
```

This approach should be used in all page components that need to access route parameters.

## Toast Notification Best Practices

The application uses the Sonner toast library for user notifications. Follow these guidelines to ensure a consistent user experience:

### Toast Location and Placement

```tsx
// Imports
import { toast } from 'sonner';

// Showing a toast
toast.success('Operation completed successfully');
toast.error('Operation failed');
toast.info('Informational message');
toast.warning('Warning message');
```

### Preventing Duplicate Toasts

Always follow these rules to prevent duplicate toast notifications:

1. **Show toasts in a single location only**

   - Place toast calls in mutation hooks' `onSuccess` or `onError` callbacks
   - Don't call toast functions in both the component and the hook
   - For React Query mutations, toast notifications should be in the mutation definition, not the component using the mutation

   ```typescript
   // CORRECT: Toast in mutation hook only
   const createSensorsMutation = useMutation({
     mutationFn: async (sensors: SensorAssociation[]) => {
       // Implementation
     },
     onSuccess: data => {
       // Single place to show success toast
       toast.success(`${data.length} sensor(s) created successfully`);

       // Other success handling...
       queryClient.invalidateQueries({ queryKey: ['sensors'] });
     },
     onError: error => {
       // Single place to show error toast
       toast.error(`Operation failed: ${error.message}`);
     },
   });

   // The component using this mutation should NOT show additional toasts
   // for the same operation
   ```

2. **Group related actions to avoid multiple toasts**

   - When performing a sequence of related operations, show one summary toast instead of multiple individual toasts
   - Use more specific messages for grouped operations

   ```typescript
   // INCORRECT: Multiple separate toasts
   await updateUser(userData);
   toast.success('User updated');
   await updatePermissions(permissions);
   toast.success('Permissions updated');
   await sendNotification(notification);
   toast.success('Notification sent');

   // CORRECT: One summary toast for the entire operation
   await Promise.all([
     updateUser(userData),
     updatePermissions(permissions),
     sendNotification(notification),
   ]);
   toast.success('User profile and permissions updated');
   ```

3. **Handle multi-step processes appropriately**

   - For multi-step wizards or workflows, show a single toast at completion
   - Avoid showing redundant toasts for intermediate steps that are obvious to the user
   - Exception: Show toasts for long-running background operations to confirm progress

   ```typescript
   // In a multi-step process like sensor discovery:
   // Step 1: Connect to gateway
   // Step 2: Discover sensors - Toast OK here to confirm discovery
   toast.success(`Found ${sensors.length} sensors`);
   // Step 3: Select sensors - No toast needed for selection
   // Step 4: Create/associate sensors - Final success toast
   toast.success(`${selectedSensors.length} sensor(s) created successfully`);
   ```

4. **Use proper dismissal and duration settings**

   - Set appropriate duration based on message importance
   - Allow users to dismiss toasts manually
   - For critical errors, use longer durations or require manual dismissal

   ```typescript
   // Informational toast with shorter duration
   toast.info('Filters applied', { duration: 3000 });

   // Error toast with longer duration
   toast.error('Failed to save changes', { duration: 5000 });

   // Critical error requiring manual dismissal
   toast.error('Connection lost. Please refresh the page.', {
     duration: Infinity,
     dismissible: true,
   });
   ```

## Notes

- The project uses Geist font from Google Fonts (both sans and mono variants)
- TailwindCSS is configured with custom theme variables for light and dark mode
- ShadCN UI components are fully customizable through the source files in `/src/components/ui/`
- The project structure follows Next.js App Router conventions
- For production, set the MONGODB_URI environment variable to your AWS DocumentDB connection string
- Database migrations are managed with migrate-mongo and custom utility functions
- API monitoring is handled by OpenTelemetry with automatic and custom instrumentation
