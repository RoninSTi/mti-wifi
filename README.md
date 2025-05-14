# Next.js Starter Project

This is a [Next.js](https://nextjs.org) starter project with advanced features including MongoDB integration, NextAuth authentication, ShadCN UI, and OpenTelemetry instrumentation.

## Features

- **Next.js 15.3.2** with App Router
- **React 18** with TypeScript
- **TailwindCSS 4** for styling
- **ShadCN UI** components for accessible UI
- **MongoDB** integration with Mongoose
- **Docker** for local development environment
- **NextAuth.js** for authentication
- **Dark Mode** support with next-themes
- **Database Migrations** with migrate-mongo
- **OpenTelemetry** for API monitoring and observability

## Getting Started

### Complete Development Environment

For local development with MongoDB, OpenTelemetry, and Jaeger:

```bash
# Start the complete development environment
npm run dev:full

# Stop all containers when done
npm run dev:stop
```

This will:
1. Start MongoDB, OpenTelemetry Collector, and Jaeger containers
2. Run database migrations
3. Start the Next.js development server

### Next.js Development Only

If you already have MongoDB running or want to use a remote database:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Database Operations

```bash
# Apply pending migrations
npm run db:migrate

# Roll back the last migration
npm run db:rollback

# Check migration status
npm run db:status

# Create a new migration
npm run db:create-migration migration-name

# Seed the database with sample data
npm run db:seed

# Reset the database (roll back all migrations and reapply)
npm run db:reset
```

## Authentication

The project includes NextAuth.js for authentication with username/password credentials:

- Sign in page: `/auth/signin`
- Registration page: `/auth/register`
- API routes: `/api/auth/[...nextauth]` and `/api/auth/register`

## OpenTelemetry Monitoring

This project includes a complete OpenTelemetry setup for API monitoring:

### Local Development Monitoring

When running `npm run dev:full`, you can access:

- **Jaeger UI**: [http://localhost:16686](http://localhost:16686)
- **OpenTelemetry Collector**: [http://localhost:4318](http://localhost:4318)

### Testing OpenTelemetry

A test endpoint is available at `/api/test-telemetry` to demonstrate OpenTelemetry instrumentation.

For more details on testing the OpenTelemetry setup, see [OTEL-TESTING.md](./OTEL-TESTING.md).

## Environment Variables

Copy `.env.local.example` to `.env.local` and update the values:

```
# MongoDB
MONGODB_URI=mongodb://root:password@localhost:27017/nextjs_db

# Authentication
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# OpenTelemetry
OTEL_SERVICE_NAME=nextjs-starter
OTEL_COLLECTOR_URL=http://localhost:4318
```

## Project Structure

- `/src/app/` - Next.js App Router pages and API routes
- `/src/components/` - React components
- `/src/lib/` - Utility functions and configurations
- `/src/models/` - Mongoose models
- `/src/db/` - Database migrations and seed data
- `/src/telemetry/` - OpenTelemetry configuration

## Learn More

For more detailed information about the project setup, please refer to [CLAUDE.md](./CLAUDE.md).

## License

This project is MIT licensed.