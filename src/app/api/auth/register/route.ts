import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongoose';
import User from '@/models/User';

export async function POST(req: NextRequest) {
  try {
    console.log('Registration endpoint called');

    // Parse request body
    const { username, email, password } = await req.json();
    console.log(`Registering user: ${username}, email: ${email}`);

    // Validate required fields
    if (!username || !email || !password) {
      console.log('Missing required fields');
      return NextResponse.json(
        { error: 'Username, email, and password are required' },
        { status: 400 }
      );
    }

    // Connect to the database
    console.log('Attempting to connect to database...');
    try {
      await connectToDatabase();
      console.log('Database connection successful');
    } catch (dbError) {
      console.error('Database connection failed:', dbError);
      return NextResponse.json(
        { error: 'Database connection failed', details: String(dbError) },
        { status: 500 }
      );
    }

    // Check if user already exists
    console.log('Checking for existing user...');
    let existingUser;
    try {
      existingUser = await User.findOne({
        $or: [{ email }, { username }],
      });
      console.log(
        'Existing user check complete',
        existingUser ? 'User exists' : 'No existing user'
      );
    } catch (findError) {
      console.error('Error checking for existing user:', findError);
      return NextResponse.json(
        { error: 'Error checking for existing user', details: String(findError) },
        { status: 500 }
      );
    }

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email or username already exists' },
        { status: 409 }
      );
    }

    // Create new user
    console.log('Creating new user...');
    const newUser = new User({
      username,
      email,
      password,
    });

    // Save user to database
    console.log('Saving user to database...');
    try {
      await newUser.save();
      console.log('User saved successfully');
    } catch (saveError) {
      console.error('Error saving user:', saveError);
      // Define MongoDB error type
      interface MongoError extends Error {
        code?: number;
        // Name is already defined in Error interface as non-optional string
      }

      // Check if it's a duplicate key error (MongoDB code 11000)
      if (
        saveError instanceof Error &&
        'code' in saveError &&
        (saveError as MongoError).code === 11000
      ) {
        return NextResponse.json(
          { error: 'User with this email or username already exists' },
          { status: 409 }
        );
      }

      // Check for specific validation errors not caught earlier
      if (
        saveError instanceof Error &&
        'name' in saveError &&
        (saveError as MongoError).name === 'ValidationError'
      ) {
        const validationError = saveError as unknown as {
          errors: Record<string, { message: string }>;
        };
        const validationErrors = Object.values(validationError.errors).map(err => err.message);
        return NextResponse.json(
          { error: 'Validation failed', details: validationErrors },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Error saving user', details: String(saveError) },
        { status: 500 }
      );
    }

    // Return success response (omit password)
    console.log('Returning successful response');
    return NextResponse.json(
      {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        createdAt: newUser.createdAt,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Registration error:', error);

    // Provide more detailed error information
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('Error details:', { message: errorMessage, stack: errorStack });

    // Type guard to handle MongoDB validation errors
    if (
      error &&
      typeof error === 'object' &&
      'name' in error &&
      error.name === 'ValidationError' &&
      'errors' in error
    ) {
      const validationError = error as { errors: Record<string, { message: string }> };
      const validationErrors = Object.values(validationError.errors).map(err => err.message);

      return NextResponse.json(
        { error: 'Validation failed', details: validationErrors },
        { status: 400 }
      );
    }

    // Handle other errors with more detail
    return NextResponse.json(
      {
        error: 'Registration failed',
        details: errorMessage,
        path: '/api/auth/register',
      },
      { status: 500 }
    );
  }
}
