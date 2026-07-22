'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/admin/stats');
  }, [router]);

  return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <div className="animate-spin w-6 h-6 border-2 border-primary-400 border-t-transparent rounded-full" />
    </div>
  );
}
