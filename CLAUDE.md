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
  - `utils.ts` - Utility functions for styling and other operations
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

2. **Avoid Unused Imports**
   - Remove any unused components or utility imports
   - ESLint will flag these with the `no-unused-vars` rule

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

For data mutations (create, update, delete), use `useMutation`:

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createResource } from '@/lib/api/resource';

export function useCreateResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createResource,
    onSuccess: () => {
      // Invalidate related queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['resources'] });
    },
  });
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

3. **Proper Query Invalidation**

   - When mutating data, invalidate only the relevant queries
   - For collection queries, invalidate the queryKey without parameters

   ```typescript
   // Invalidate all 'resources' queries
   queryClient.invalidateQueries({ queryKey: ['resources'] });

   // Remove specific resource from cache
   queryClient.removeQueries({ queryKey: ['resource', id] });
   ```

4. **Consistent Error Handling**

   - The API client already standardizes error objects in the `ApiResponse<T>` type
   - Simply check `response.error` to handle errors consistently

   ```typescript
   if (response.error) {
     throw new Error(response.error.message || 'Operation failed');
   }
   ```

## Notes

- The project uses Geist font from Google Fonts (both sans and mono variants)
- TailwindCSS is configured with custom theme variables for light and dark mode
- ShadCN UI components are fully customizable through the source files in `/src/components/ui/`
- The project structure follows Next.js App Router conventions
- For production, set the MONGODB_URI environment variable to your AWS DocumentDB connection string
- Database migrations are managed with migrate-mongo and custom utility functions
- API monitoring is handled by OpenTelemetry with automatic and custom instrumentation
