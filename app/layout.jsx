import './globals.css';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v16-appRouter';

export const metadata = {
  title: 'AssinaDespesas | Controle com confiança',
  description: 'Gestão de despesas com validação e assinatura digital demonstrativa.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        <AppRouterCacheProvider options={{ enableCssLayer: true }}>
          {children}
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
