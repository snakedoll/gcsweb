import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin-auth';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    redirect(auth.response.status === 401 ? '/login' : '/');
  }

  return <>{children}</>;
}
