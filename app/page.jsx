import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';

const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1] || 'assinatura-digital-despesas';
const assetBasePath = process.env.GITHUB_ACTIONS === 'true' ? `/${repositoryName}` : '';
const apiBase = process.env.NEXT_PUBLIC_API_BASE ?? 'https://assinatura-digital-despesas.onrender.com';

export default function HomePage() {
  return (
    <>
      <main id="app" className="shell min-h-screen" data-api-base={apiBase}>
        <section id="login-view" className="login-layout">
          <div className="login-intro">
            <a className="brand" href="./"><span className="brand-mark">A</span> assina<span>despesas</span></a>
            <div className="intro-copy">
              <span className="eyebrow">CONTROLE FINANCEIRO · ASSINATURA DIGITAL</span>
              <h1>Despesas sob controle.<br /><em>Decisões com confiança.</em></h1>
              <p>Envie recibos, acompanhe validações e assine relatórios com uma trilha verificável de integridade.</p>
              <div className="trust-note"><span className="lock-icon">⌑</span><span>Chave privada criada no navegador e mantida neste dispositivo.</span></div>
            </div>
            <div className="intro-footer">PROTÓTIPO ACADÊMICO · SEGURANÇA DESDE A CONCEPÇÃO</div>
          </div>
          <div className="login-panel">
            <div className="form-wrap">
              <span className="eyebrow">BEM-VINDO DE VOLTA</span>
              <h2>Acesse sua conta</h2>
              <p className="muted">Entre para continuar no painel de despesas.</p>
              <form id="login-form" className="grid gap-3">
                <TextField name="email" type="email" label="E-mail" autoComplete="username" placeholder="voce@empresa.com" required fullWidth size="small" />
                <TextField name="password" type="password" label="Senha" autoComplete="current-password" placeholder="Sua senha" required fullWidth size="small" />
                <Button className="!mt-2" type="submit" variant="contained" fullWidth sx={{ borderRadius: 2, py: 1.2, textTransform: 'none', fontWeight: 700 }}>Entrar <span aria-hidden="true">→</span></Button>
                <div id="login-error" className="feedback" role="alert" />
              </form>
              <div className="demo-box"><span className="demo-dot" /><div><strong>Ambiente de demonstração</strong><small>As contas de demonstração são configuradas no backend local.</small></div></div>
            </div>
            <div className="login-foot">ACESSO SEGURO · SESSÃO COM EXPIRAÇÃO AUTOMÁTICA</div>
          </div>
        </section>
        <section id="dashboard-view" className="dashboard hidden">
          <aside className="sidebar">
            <a className="brand" href="#"><span className="brand-mark">A</span> assina<span>despesas</span></a>
            <div className="workspace-label">WORKSPACE <span>EMPRESA DEMO</span></div>
            <nav id="navigation" />
            <div className="sidebar-bottom">
              <div className="secure-badge"><span>◈</span><div><strong>Ambiente protegido</strong><small>Criptografia ativa</small></div></div>
              <button id="logout" className="logout">↪ &nbsp;Sair da conta</button>
              <small className="version">ASSINADESPESAS · V1.0</small>
            </div>
          </aside>
          <section className="main-area">
            <header className="topbar">
              <div className="breadcrumb">Workspace <span>/</span> <strong id="page-name">Visão geral</strong></div>
              <div className="top-actions"><span className="secure-top">◈ &nbsp;Sessão protegida</span><div className="avatar" id="avatar">MC</div><div className="user-label"><strong id="user-name">Marina Costa</strong><small id="user-role">GERENTE</small></div></div>
            </header>
            <div id="content" className="content" />
          </section>
        </section>
      </main>
      <div id="toast" className="toast" role="status" />
      <script src={`${assetBasePath}/client-controller.js`} defer />
    </>
  );
}
