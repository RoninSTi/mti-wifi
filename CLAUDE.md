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

1. **Avoid the `any` Type**

   - Never use `any` type unless absolutely necessary
   - Use proper type definitions for improved safety and IDE support
   - For dynamic or unknown types, use `unknown` with proper type narrowing:

   ```typescript
   // INCORRECT
   function handleError(error: any) {
     console.error(error.message); // Unsafe - error might not have a message property
   }

   // CORRECT
   function handleError(error: unknown) {
     if (error instanceof Error) {
       console.error(error.message);
     } else {
       console.error(String(error));
     }
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

### Code Style and Formatting

- The project uses Prettier for code formatting
- ESLint is configured for TypeScript and React best practices
- Pre-commit hooks automatically format and lint code before commits
- The code should follow all ESLint rules without disabling them

## Notes

- The project uses Geist font from Google Fonts (both sans and mono variants)
- TailwindCSS is configured with custom theme variables for light and dark mode
- ShadCN UI components are fully customizable through the source files in `/src/components/ui/`
- The project structure follows Next.js App Router conventions
- For production, set the MONGODB_URI environment variable to your AWS DocumentDB connection string
- Database migrations are managed with migrate-mongo and custom utility functions
- API monitoring is handled by OpenTelemetry with automatic and custom instrumentation
