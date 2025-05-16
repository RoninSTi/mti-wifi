'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, User as UserIcon, Mail, Key, Calendar, Save, X, Pencil } from 'lucide-react';
import { useProfile, useUpdateProfile } from '@/hooks';
import { toast } from 'sonner';
// Import from the API type instead of directly from the route file
import type { UpdateProfileInput } from '@/lib/api/users';

interface ProfileDialogProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ProfileDialog({ trigger, open: controlledOpen, onOpenChange }: ProfileDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showPasswordFields, setShowPasswordFields] = useState(false);

  // Form data state
  const [formData, setFormData] = useState<UpdateProfileInput>({
    username: '',
    email: '',
    currentPassword: '',
    newPassword: '',
  });

  // Use controlled state if provided, otherwise use internal state
  const open = controlledOpen !== undefined ? controlledOpen : uncontrolledOpen;
  const setOpen = (newOpen: boolean) => {
    if (onOpenChange) {
      onOpenChange(newOpen);
    } else {
      setUncontrolledOpen(newOpen);
    }
  };

  // Fetch profile data
  const { profile, isLoading, isError, error, refetch } = useProfile();

  // Update profile mutation
  const { updateProfile: updateProfileMutation, isLoading: isUpdating } = useUpdateProfile();

  // Format date helper
  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Handle dialog close
  const handleClose = () => {
    setIsEditMode(false);
    setShowPasswordFields(false);
    setOpen(false);
  };

  // Handle edit mode toggle
  const handleEditToggle = () => {
    if (isEditMode) {
      // Exiting edit mode, reset form
      setIsEditMode(false);
      setShowPasswordFields(false);
    } else {
      // Entering edit mode, initialize form with current values
      if (profile) {
        setFormData({
          username: profile.username,
          email: profile.email,
          currentPassword: '',
          newPassword: '',
        });
      }
      setIsEditMode(true);
    }
  };

  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Clean up empty fields
      const dataToSubmit: UpdateProfileInput = {};

      if (formData.username && formData.username !== profile?.username) {
        dataToSubmit.username = formData.username;
      }

      if (formData.email && formData.email !== profile?.email) {
        dataToSubmit.email = formData.email;
      }

      if (showPasswordFields && formData.newPassword) {
        if (!formData.currentPassword) {
          toast.error('Current password is required to change your password');
          return;
        }
        dataToSubmit.currentPassword = formData.currentPassword;
        dataToSubmit.newPassword = formData.newPassword;
      }

      // Only proceed if there are changes
      if (Object.keys(dataToSubmit).length === 0) {
        toast.info('No changes to save');
        setIsEditMode(false);
        return;
      }

      await updateProfileMutation(dataToSubmit);

      // Reset states on success
      setIsEditMode(false);
      setShowPasswordFields(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred';
      toast.error(message);
    }
  };

  // View mode content
  const renderViewMode = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
          <p className="text-sm text-muted-foreground">Loading profile...</p>
        </div>
      );
    }

    if (isError) {
      return (
        <div className="text-center py-8">
          <p className="text-destructive mb-2">Failed to load profile</p>
          <p className="text-sm text-muted-foreground mb-4">
            {error instanceof Error ? error.message : 'An unknown error occurred'}
          </p>
          <Button variant="outline" onClick={() => refetch()}>
            Try Again
          </Button>
        </div>
      );
    }

    if (!profile) {
      return (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Profile not found</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-lg font-medium">
            <UserIcon className="h-5 w-5 text-muted-foreground" />
            Username
          </div>
          <p>{profile.username}</p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-lg font-medium">
            <Mail className="h-5 w-5 text-muted-foreground" />
            Email
          </div>
          <p>{profile.email}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-lg font-medium">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              Account Created
            </div>
            <p>{formatDate(profile.createdAt)}</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-lg font-medium">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              Last Updated
            </div>
            <p>{formatDate(profile.updatedAt)}</p>
          </div>
        </div>
      </div>
    );
  };

  // Edit mode content
  const renderEditMode = () => {
    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            name="username"
            value={formData.username}
            onChange={handleChange}
            placeholder="Enter your username"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Enter your email"
            required
          />
        </div>

        {!showPasswordFields ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowPasswordFields(true)}
            className="w-full"
          >
            <Key className="mr-2 h-4 w-4" />
            Change Password
          </Button>
        ) : (
          <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium">Change Password</h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowPasswordFields(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                name="currentPassword"
                type="password"
                value={formData.currentPassword}
                onChange={handleChange}
                placeholder="Enter your current password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                name="newPassword"
                type="password"
                value={formData.newPassword}
                onChange={handleChange}
                placeholder="Enter your new password"
                minLength={8}
              />
              <p className="text-xs text-muted-foreground">
                Password must be at least 8 characters long
              </p>
            </div>
          </div>
        )}
      </form>
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserIcon className="h-5 w-5" />
            {isEditMode ? 'Edit Profile' : 'Your Profile'}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4">{isEditMode ? renderEditMode() : renderViewMode()}</div>

        <DialogFooter className="mt-6 flex gap-2 justify-end">
          {isEditMode ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handleEditToggle}
                disabled={isUpdating}
              >
                Cancel
              </Button>
              <Button type="button" onClick={handleSubmit} disabled={isUpdating}>
                {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={handleClose}>
                Close
              </Button>
              <Button type="button" onClick={handleEditToggle}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit Profile
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
