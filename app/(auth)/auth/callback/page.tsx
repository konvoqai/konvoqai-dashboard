'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const query = searchParams.toString();
    const url = query ? `/api/auth/google/callback?${query}` : '/api/auth/google/callback';
    router.replace(url);
  }, [router, searchParams]);

  return null;
}
