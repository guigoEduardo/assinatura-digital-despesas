'use client';

import { useEffect } from 'react';

export default function ClientRuntime() {
  useEffect(() => {
    window.APP_API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://assinatura-digital-despesas.onrender.com';
    import('../lib/client-controller.js').catch((error) => {
      console.error('Não foi possível iniciar a interface:', error);
    });
  }, []);

  return null;
}
