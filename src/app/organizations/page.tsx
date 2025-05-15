import { OrganizationDashboard } from '@/components/organizations/OrganizationDashboard';

export const metadata = {
  title: 'Organizations Dashboard',
  description: 'Manage all your organizations in one place',
};

export default function OrganizationsPage() {
  return <OrganizationDashboard />;
}
