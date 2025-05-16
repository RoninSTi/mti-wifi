import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongoose';
import User from '@/models/User';
import { createApiSpan } from '@/telemetry/utils';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { z } from 'zod';

// Define schema for profile update
// Moved export to type only to fix Next.js route handler constraints
const updateProfileSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username cannot exceed 20 characters')
    .optional(),
  email: z.string().email('Invalid email address').optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8, 'Password must be at least 8 characters').optional(),
});

// Define type locally without exporting it
type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

/**
 * GET /api/users/profile - Get the profile of the currently authenticated user
 * Returns the user data without the password
 */
export async function GET(request: NextRequest) {
  return await createApiSpan('users.profile.get', async () => {
    try {
      // Get the authenticated user from the session
      const session = await getServerSession(authOptions);

      if (!session || !session.user) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'You must be logged in to access your profile' },
          { status: 401 }
        );
      }

      await connectToDatabase();

      // Find the user by email from the session
      const user = await User.findOne({ email: session.user.email }, { password: 0 }); // Exclude password

      if (!user) {
        return NextResponse.json(
          { error: 'Not Found', message: 'User profile not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ data: user });
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return NextResponse.json(
        { error: 'Server Error', message: 'Failed to fetch user profile' },
        { status: 500 }
      );
    }
  });
}

/**
 * PUT /api/users/profile - Update the profile of the currently authenticated user
 * Requires authentication
 * Body can include: username, email, currentPassword (required for password change), newPassword
 */
export async function PUT(request: NextRequest) {
  return await createApiSpan('users.profile.update', async () => {
    try {
      // Get the authenticated user from the session
      const session = await getServerSession(authOptions);

      if (!session || !session.user) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'You must be logged in to update your profile' },
          { status: 401 }
        );
      }

      await connectToDatabase();

      // Find the user by email from the session
      const user = await User.findOne({ email: session.user.email });

      if (!user) {
        return NextResponse.json(
          { error: 'Not Found', message: 'User profile not found' },
          { status: 404 }
        );
      }

      // Parse and validate the request body
      const body = await request.json();

      try {
        const validatedData = updateProfileSchema.parse(body);

        // Handle password change if requested
        if (validatedData.newPassword) {
          // Current password is required when changing password
          if (!validatedData.currentPassword) {
            return NextResponse.json(
              {
                error: 'Validation Error',
                message: 'Current password is required when changing password',
              },
              { status: 400 }
            );
          }

          // Verify the current password
          const isPasswordValid = await user.comparePassword(validatedData.currentPassword);

          if (!isPasswordValid) {
            return NextResponse.json(
              { error: 'Validation Error', message: 'Current password is incorrect' },
              { status: 400 }
            );
          }

          // Set the new password
          user.password = validatedData.newPassword;
        }

        // Update other fields if provided
        if (validatedData.username) {
          // Check if the new username is already taken (by another user)
          const existingUser = await User.findOne({
            username: validatedData.username,
            _id: { $ne: user._id }, // Exclude the current user
          });

          if (existingUser) {
            return NextResponse.json(
              { error: 'Validation Error', message: 'Username is already taken' },
              { status: 400 }
            );
          }

          user.username = validatedData.username;
        }

        if (validatedData.email) {
          // Check if the new email is already taken (by another user)
          const existingUser = await User.findOne({
            email: validatedData.email,
            _id: { $ne: user._id }, // Exclude the current user
          });

          if (existingUser) {
            return NextResponse.json(
              { error: 'Validation Error', message: 'Email is already taken' },
              { status: 400 }
            );
          }

          user.email = validatedData.email;
        }

        // Save the updated user
        await user.save();

        // Return the updated user without the password
        const updatedUser = await User.findById(user._id, { password: 0 });

        return NextResponse.json({ data: updatedUser });
      } catch (validationError) {
        // Handle validation errors from Zod
        if (validationError instanceof z.ZodError) {
          return NextResponse.json(
            {
              error: 'Validation Error',
              message: 'Invalid profile data',
              details: validationError.errors,
            },
            { status: 400 }
          );
        }
        throw validationError;
      }
    } catch (error) {
      console.error('Error updating user profile:', error);
      return NextResponse.json(
        { error: 'Server Error', message: 'Failed to update user profile' },
        { status: 500 }
      );
    }
  });
}
