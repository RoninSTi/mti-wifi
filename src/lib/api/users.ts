import { ApiResponse, apiClient } from './api-client';
import { UpdateProfileInput } from '@/app/api/users/profile/route';

export interface UserProfile {
  _id: string;
  username: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Get the current user's profile
 * @returns Promise with user profile data
 */
export async function getProfile(): Promise<ApiResponse<UserProfile>> {
  return await apiClient.get<UserProfile>('/api/users/profile');
}

/**
 * Update the current user's profile
 * @param data Profile data to update
 * @returns Promise with updated user profile data
 */
export async function updateProfile(data: UpdateProfileInput): Promise<ApiResponse<UserProfile>> {
  return await apiClient.put<UserProfile, UpdateProfileInput>('/api/users/profile', data);
}
