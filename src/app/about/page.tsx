export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold mb-6">About This Project</h1>

      <div className="prose prose-lg dark:prose-invert">
        <p className="lead">
          This is a Next.js starter template with authentication, database connectivity, telemetry,
          and more.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Core Features</h2>

        <ul>
          <li>
            <strong>Next.js 15</strong> with the App Router
          </li>
          <li>
            <strong>TypeScript</strong> for type safety
          </li>
          <li>
            <strong>TailwindCSS 4</strong> for styling
          </li>
          <li>
            <strong>ShadCN UI</strong> for accessible components
          </li>
          <li>
            <strong>MongoDB</strong> with Mongoose for database operations
          </li>
          <li>
            <strong>NextAuth.js</strong> for authentication
          </li>
          <li>
            <strong>OpenTelemetry</strong> for API monitoring
          </li>
          <li>
            <strong>Zod</strong> for form validation
          </li>
          <li>
            <strong>ESLint</strong> for code quality
          </li>
        </ul>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Getting Started</h2>

        <p>To start development, run:</p>

        <pre className="bg-muted p-4 rounded-md">npm run dev</pre>

        <p>For the full development environment with MongoDB and telemetry:</p>

        <pre className="bg-muted p-4 rounded-md">npm run dev:full</pre>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Documentation</h2>

        <p>
          Refer to the <code>CLAUDE.md</code> file in the root directory for comprehensive
          documentation about the project structure and features.
        </p>
      </div>
    </div>
  );
}
