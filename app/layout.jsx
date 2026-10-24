import './globals.css';

export const metadata = {
  title: 'AssinaDespesas | Controle com confiança',
  description: 'Gestão de despesas com validação e assinatura digital demonstrativa.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
