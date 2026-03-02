import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin-auth';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await requireAdmin();
  if (!auth.ok && auth.reason === 'UNAUTHORIZED') {
    redirect('/login');
  }
  if (!auth.ok && auth.reason === 'FORBIDDEN') {
    redirect('/');
  }

  return <>{children}</>;
}
