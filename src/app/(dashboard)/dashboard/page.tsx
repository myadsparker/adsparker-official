import { createServerSupabaseClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className='min-h-screen bg-gray-900 p-8 text-white'>
      <h1 className='text-3xl font-bold'>Welcome {session.user.email}</h1>
      <p className='mt-4'>
        Your session is active and will persist across tabs.
      </p>
    </div>
  );
}
