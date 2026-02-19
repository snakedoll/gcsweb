import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.role === 'admin';

  if (!session) {
    redirect('/login');
  }

  if (!isAdmin) {
    redirect('/');
  }

  return <>{children}</>;
}
