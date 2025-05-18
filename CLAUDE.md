# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Next.js project using:

- Next.js 15.3.2 (App Router)
- React 18
- TypeScript
- TailwindCSS 4
- ShadCN UI components
- MongoDB with Mongoose
- Docker for development
- NextAuth.js for authentication
- OpenTelemetry for monitoring

## Common Commands

```bash
# Development
npm run dev                  # Start dev server
npm run dev:full             # Start MongoDB + migrations + Next.js
npm run dev:stop             # Stop environment
npm run build                # Build for production
npm run start                # Run production server
npm run lint                 # Check code issues

# Docker
docker-compose up -d         # Start MongoDB
docker-compose down          # Stop MongoDB

# Database
npm run db:migrate           # Apply pending migrations
npm run db:rollback          # Roll back last migration
npm run db:status            # Show migration status
npm run db:create-migration name  # Create new migration
npm run db:seed              # Seed development data
npm run db:reset             # Roll back and reapply all migrations
```

## Project Structure

- `/src/app/` - App Router code, pages, API routes
- `/src/components/` - React components (UI, auth, entity components)
- `/src/lib/` - Utilities, API clients, hooks
- `/src/models/` - Mongoose models
- `/src/db/` - Database migrations and utilities
- `/src/telemetry/` - OpenTelemetry setup

## Database Configuration

- Local: MongoDB in Docker
- Production: AWS DocumentDB

```typescript
import { connectToDatabase } from '@/lib/db/mongoose';

async function someFunction() {
  await connectToDatabase();
  // Database operations
}
```

## Authentication

NextAuth.js with username/password:

```typescript
// Client components
import { useAuth, login, register, logout } from '@/lib/auth/auth';

// Check auth status
const { isAuthenticated, user, isLoading } = useAuth();

// Actions
await login(username, password);
await register(username, email, password);
await logout();
```

Environment variables:

```
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here-change-in-production
```

## UI Components

ShadCN UI components (based on Radix UI + Tailwind):

```tsx
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
```

Add new components: `npx shadcn@latest add [component-name]`

## Database Migrations

Create and run migrations with migrate-mongo:

```javascript
// Example migration
module.exports = {
  async up(db, client) {
    await db
      .collection('users')
      .updateMany({ role: { $exists: false } }, { $set: { role: 'user' } });
  },
  async down(db, client) {
    await db.collection('users').updateMany({}, { $unset: { role: '' } });
  },
};
```

Best practices:

1. Implement both `up` and `down` functions
2. Make migrations idempotent
3. Keep migrations small and focused
4. Test before production

## OpenTelemetry

Monitoring setup for API routes and database operations:

```typescript
import { createApiSpan, createDatabaseSpan } from '@/telemetry/utils';

// Wrap API handlers
export async function GET(request) {
  return await createApiSpan('example.get', async () => {
    // API logic
    const result = await createDatabaseSpan('find', 'users', async () => {
      return await User.find();
    });
    return NextResponse.json({ data: result });
  });
}
```

Access monitoring at:

- Jaeger UI: http://localhost:16686
- OpenTelemetry Collector: http://localhost:4318

## TypeScript Guidelines

1. **Never use `any`, `typeof` for type checking, or type assertions**

   - Use `unknown` with proper type narrowing instead
   - Use type predicates and Zod schemas for validation

2. **Use proper typing for parameters and return values**

   - Be specific with generics and interfaces
   - For object maps, use `Record<K, V>` with specific types

3. **Data validation with Zod**

   ```typescript
   const userSchema = z.object({
     id: z.string(),
     name: z.string(),
     email: z.string().email(),
   });

   function processUser(data: unknown) {
     const result = userSchema.safeParse(data);
     if (result.success) {
       const user = result.data;
       // User is now properly typed
     }
   }
   ```

## React Query Best Practices

1. **Mutation hooks with proper invalidation**

   ```typescript
   function useCreateResource() {
     const queryClient = useQueryClient();
     return useMutation({
       mutationFn: createResource,
       onSuccess: data => {
         queryClient.invalidateQueries({ queryKey: ['resources'] });
         toast.success('Resource created');
       },
     });
   }
   ```

2. **Never use direct refetch in components**
   - Let React Query handle data invalidation
   - Place toast notifications in mutation hooks only

## Component Guidelines

1. **Create shared components for repeated patterns**

   - Domain-specific: `@/components/areas/`, `@/components/organizations/`
   - Cross-domain: `@/components/shared/`
   - Base UI: `@/components/ui/`

2. **Make components configurable through props**

   - Avoid nearly identical components with small variations
   - Use consistent prop names and patterns

3. **Extract common logic to custom hooks**
   - Keep components focused on presentation

## Route Parameters

Use the custom `useTypedParams` hook for type-safe route parameters:

```typescript
import { useTypedParams } from '@/lib/utils';

type LocationParams = {
  id: string; // Organization ID
  locationId: string; // Location ID
};

const { id, locationId } = useTypedParams<LocationParams>();
```

## Toast Notifications

1. **Show toasts in mutation hooks only**

   - Not in components

2. **Avoid duplicate notifications**

   - Group related actions into one summary toast
   - For multi-step processes, show toast at completion

3. **Set appropriate durations**
   - Info: shorter duration
   - Errors: longer duration or manual dismissal
