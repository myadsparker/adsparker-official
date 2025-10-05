// components/LogoutButton.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

export default function LogoutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleLogout = async () => {
    await fetch('/api/logout', {
      method: 'POST',
    });
    startTransition(() => {
      router.push('/login');
    });
  };

  return (
    <button
      onClick={handleLogout}
      disabled={isPending}
      className='text-sm text-red-400 hover:underline'
      style={{
        color: '#fff',
        height: '28px',
        paddingInline: '20px',
        display: 'flex',
        alignItems: 'center',
        borderRadius: '4px',
      }}
    >
      {isPending ? 'Logging out...' : 'Logout'}
    </button>
  );
}
