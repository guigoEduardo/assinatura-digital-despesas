const state = { token: null, employee: null, page: 'overview', expenses: [], employees: [] };
const API_BASE = String(document.getElementById('app')?.dataset.apiBase || '').replace(/\/$/, '');
const $ = (selector, parent = document) => parent.querySelector(selector);
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const initials = name => String(name || '?').split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase();
const roleName = role => role === 'manager' ? 'GERENTE' : 'COLABORADOR';
const statusLabel = status => ({ pending: 'Aguardando validacao', validated: 'Aguardando assinatura', signed: 'Assinado', rejected: 'Recusado' })[status] || status;
const money = amount => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(amount || 0));
const date = value => value ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : '—';
const api = async (url, options = {}) => {
  const headers = new Headers(options.headers || {});
  if (state.token) headers.set('Authorization', `Bearer ${state.token}`);
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  const response = await fetch(`${API_BASE}${url}`, { ...options, headers });
  const data = response.headers.get('content-type')?.includes('application/json') ? await response.json() : null;
  if (response.status === 401) { logout(); throw new Error(data?.error || 'Entre novamente.'); }
  if (!response.ok) throw new Error(data?.error || 'Nao foi possivel concluir a operacao.');
  return data;
};
function toast(message) { const el = $('#toast'); el.textContent = message; el.classList.add('show'); clearTimeout(toast.timer); toast.timer = setTimeout(() => el.classList.remove('show'), 3200); }
function showFeedback(selector, message) { const el = $(selector); if (el) el.textContent = message || ''; }
function showLogin() { $('#login-view').classList.remove('hidden'); $('#dashboard-view').classList.add('hidden'); }
function showDashboard() { $('#login-view').classList.add('hidden'); $('#dashboard-view').classList.remove('hidden'); $('#user-name').textContent = state.employee.name; $('#user-role').textContent = roleName(state.employee.role); $('#avatar').textContent = initials(state.employee.name); renderNav(); navigate('overview'); }
function logout() { state.token = null; state.employee = null; state.expenses = []; showLogin(); }

$('#login-form').addEventListener('submit', async event => {
  event.preventDefault(); const form = new FormData(event.currentTarget); showFeedback('#login-error', '');
  const button = $('button[type="submit"]', event.currentTarget); button.disabled = true; button.textContent = 'Acessando...';
  try { const data = await api('/api/login', { method: 'POST', body: JSON.stringify({ email: form.get('email'), password: form.get('password') }) }); state.token = data.token; state.employee = data.employee; showDashboard(); }
  catch (error) { showFeedback('#login-error', error.message); }
  finally { button.disabled = false; button.innerHTML = 'Entrar <span>→</span>'; }
});
$('#logout').addEventListener('click', logout);

function renderNav() {
  const manager = state.employee.role === 'manager';
  const items = [['overview', '⌂', 'Visao geral'], ['expenses', '▤', manager ? 'Relatorios' : 'Minhas despesas'], ...(manager ? [['employees', '♙', 'Funcionarios']] : [['submit', '+', 'Nova despesa']]), ['security', '◈', 'Seguranca']];
  $('#navigation').innerHTML = items.map(([id, icon, title]) => `<a href="#${id}" class="nav-item ${state.page === id ? 'active' : ''}" data-page="${id}"><span class="nav-icon">${icon}</span>${title}${id === 'expenses' && state.expenses.filter(x => x.status === 'pending').length ? `<span class="nav-count">${state.expenses.filter(x => x.status === 'pending').length}</span>` : ''}</a>`).join('');
  $('#navigation').onclick = event => { const link = event.target.closest('[data-page]'); if (link) { event.preventDefault(); navigate(link.dataset.page); } };
}
async function refreshData() {
  const [expenseData, employeeData] = await Promise.all([api('/api/expenses'), state.employee.role === 'manager' ? api('/api/employees') : Promise.resolve({ employees: [] })]);
  state.expenses = expenseData.expenses; state.employees = employeeData.employees;
}
async function navigate(page) {
  state.page = page; $('#page-name').textContent = ({ overview: 'Visao geral', expenses: 'Relatorios de despesas', employees: 'Funcionarios', submit: 'Nova despesa', security: 'Seguranca da conta' })[page] || 'Visao geral';
  renderNav(); $('#content').innerHTML = '<div class="empty-state">Carregando dados...</div>';
  try { await refreshData(); const view = { overview: renderOverview, expenses: renderExpenses, employees: renderEmployees, submit: renderSubmit, security: renderSecurity }[page] || renderOverview; $('#content').innerHTML = view(); bindContent(); }
  catch (error) { $('#content').innerHTML = `<div class="notice warning">${escapeHtml(error.message)}</div>`; }
}
function header(title, description, action = '') { return `<div class="page-head"><div><h1>${title}</h1><p>${description}</p></div>${action ? `<div class="head-actions">${action}</div>` : ''}</div>`; }
function reportRows(items, opts = {}) {
  if (!items.length) return `<div class="empty-state"><strong>Nenhum relatorio por aqui</strong>Quando novos relatorios forem enviados, eles aparecerao nesta lista.</div>`;
  return `<div class="table-wrap"><table><thead><tr><th>RELATORIO</th>${state.employee.role === 'manager' ? '<th>COLABORADOR</th>' : ''}<th>DATA</th><th>VALOR</th><th>STATUS</th><th>ACOES</th></tr></thead><tbody>${items.map(item => `<tr><td><strong>${escapeHtml(item.title)}</strong><br><a class="receipt-link" target="_blank" href="${API_BASE}/api/expenses/${item.id}/receipt" data-receipt="${item.id}">${escapeHtml(item.receiptName || 'Ver recibo ↗')}</a></td>${state.employee.role === 'manager' ? `<td>${escapeHtml(item.employeeName)}</td>` : ''}<td>${date(item.createdAt)}</td><td><strong>${money(item.amount)}</strong></td><td><span class="status ${item.status}">${statusLabel(item.status)}</span></td><td><div class="row-actions">${item.status === 'pending' && state.employee.role === 'manager' ? `<button class="small-btn" data-validate="${item.id}">Validar</button>` : ''}${item.status === 'validated' && item.employeeId === state.employee.id ? `<button class="small-btn" data-sign="${item.id}">Assinar</button>` : ''}${item.status === 'signed' && state.employee.role === 'manager' ? `<button class="small-btn" data-verify="${item.id}">Verificar</button>` : ''}<button class="small-btn" data-detail="${item.id}">Detalhes</button></div></td></tr>`).join('')}</tbody></table></div>`;
}
function renderOverview() {
  const total = state.expenses.reduce((sum, item) => sum + Number(item.amount), 0);
  const pending = state.expenses.filter(x => x.status === 'pending').length;
  const validated = state.expenses.filter(x => x.status === 'validated').length;
  const signed = state.expenses.filter(x => x.status === 'signed').length;
  const manager = state.employee.role === 'manager';
  return `${header(`Ola, ${escapeHtml(state.employee.name.split(' ')[0])}`, 'Acompanhe as despesas e assinaturas da sua organizacao.', `<button class="button primary" data-action="${manager ? 'employees' : 'submit'}">${manager ? '+ Adicionar funcionario' : '+ Nova despesa'}</button>`)}
  <div class="stats"><div class="stat-card"><span class="stat-icon">▤</span><div class="stat-label">${manager ? 'Relatorios' : 'Minhas despesas'}</div><div class="stat-value">${state.expenses.length}</div><div class="stat-sub">No sistema</div></div><div class="stat-card"><span class="stat-icon">◷</span><div class="stat-label">Aguardando validacao</div><div class="stat-value">${pending}</div><div class="stat-sub">Pendentes de revisao</div></div><div class="stat-card"><span class="stat-icon">✎</span><div class="stat-label">Aguardando assinatura</div><div class="stat-value">${validated}</div><div class="stat-sub">Relatorios validados</div></div><div class="stat-card"><span class="stat-icon">✓</span><div class="stat-label">Total registrado</div><div class="stat-value">${money(total)}</div><div class="stat-sub">${signed} relatorio(s) assinado(s)</div></div></div>
  <div class="section-grid"><section class="panel"><div class="panel-head"><h3>Atividade recente</h3><a data-action="expenses">Ver todos →</a></div>${state.expenses.length ? `<div class="expense-list">${state.expenses.slice(0, 5).map(x => `<div class="expense-row"><div class="expense-icon">▤</div><div><strong>${escapeHtml(x.title)}</strong><small>${escapeHtml(x.employeeName)} · ${date(x.createdAt)}</small></div><div><div class="amount">${money(x.amount)}</div><span class="status ${x.status}">${statusLabel(x.status)}</span></div></div>`).join('')}</div>` : '<div class="empty-state">Seus relatorios recentes aparecerao aqui.</div>'}</section><section class="panel"><div class="panel-head"><h3>Acesso rapido</h3></div><div class="quick-actions"><button class="quick-action" data-action="${manager ? 'employees' : 'submit'}"><span>${manager ? '♙' : '+'}</span><span><strong>${manager ? 'Gerenciar funcionarios' : 'Enviar uma despesa'}</strong><small>${manager ? 'Cadastro e edicao da equipe' : 'Envie os dados e anexe o recibo'}</small></span></button><button class="quick-action" data-action="expenses"><span>✓</span><span><strong>${manager ? 'Validar relatorios' : 'Acompanhar relatorios'}</strong><small>${manager ? `${pending} aguardando sua revisao` : 'Consulte o andamento das assinaturas'}</small></span></button><button class="quick-action" data-action="security"><span>◈</span><span><strong>Minhas chaves</strong><small>Assinatura protegida no navegador</small></span></button></div><div class="notice info">A verificacao criptografica confirma integridade do conteudo assinado. Este prototipo nao substitui certificado ICP-Brasil nem parecer juridico.</div></section></div>`;
}
function renderExpenses() {
  const manager = state.employee.role === 'manager';
  return `${header(manager ? 'Relatorios de despesas' : 'Minhas despesas', manager ? 'Revise, valide e verifique as assinaturas enviadas pela equipe.' : 'Acompanhe cada etapa dos seus relatorios.', manager ? '' : '<button class="button primary" data-action="submit">+ Enviar relatorio</button>')}<section class="table-card"><div class="table-toolbar"><strong>${state.expenses.length} relatorio(s)</strong><input class="search" id="report-search" placeholder="Buscar relatorio..."></div><div id="report-table">${reportRows(state.expenses)}</div></section>`;
}
function renderEmployees() {
  return `${header('Funcionarios', 'Cadastre e mantenha os acessos da equipe.', '<button class="button primary" data-action="new-employee">+ Novo funcionario</button>')}<section class="table-card"><div class="table-toolbar"><strong>${state.employees.length} pessoa(s)</strong><input class="search" id="employee-search" placeholder="Buscar funcionario..."></div><div class="table-wrap"><table><thead><tr><th>COLABORADOR</th><th>DEPARTAMENTO</th><th>PERFIL</th><th>CHAVE DE ASSINATURA</th><th>STATUS</th><th>ACOES</th></tr></thead><tbody>${state.employees.map(person => `<tr><td><strong>${escapeHtml(person.name)}</strong><br><span class="muted">${escapeHtml(person.email)}</span></td><td>${escapeHtml(person.department)}</td><td>${roleName(person.role)}</td><td><span class="key-badge ${person.hasKey ? '' : 'none'}">${person.hasKey ? 'Chave registrada' : 'Nao configurada'}</span></td><td><span class="status ${person.active ? 'signed' : 'rejected'}">${person.active ? 'Ativo' : 'Desativado'}</span></td><td><button class="small-btn" data-edit-employee="${person.id}">Editar</button></td></tr>`).join('')}</tbody></table></div>${state.employees.length ? '' : '<div class="empty-state">Cadastre o primeiro funcionario para comecar.</div>'}</section>`;
}
function renderSubmit() {
  return `${header('Enviar relatorio de despesa', 'Preencha os dados e anexe o recibo para iniciar a validacao.')}<section class="panel" style="max-width:760px"><form id="expense-form"><div class="form-grid"><label class="field">Titulo da despesa<input name="title" placeholder="Ex.: Passagem para reuniao" required maxlength="120"></label><label class="field">Valor (R$)<input name="amount" type="number" min="0.01" step="0.01" placeholder="0,00" required></label><label class="field full">Descricao<textarea name="description" rows="3" maxlength="1200" placeholder="Informe o motivo e os detalhes da despesa" required></textarea></label><label class="field full">Recibo (PDF, JPG ou PNG; maximo 8 MB)<input type="file" name="receipt" accept="application/pdf,image/jpeg,image/png" required><small class="helper">O sistema calcula o resumo SHA-256 do arquivo recebido para permitir conferencia de integridade.</small></label></div><div class="feedback" id="expense-feedback"></div><button class="button primary" type="submit">Enviar para validacao →</button></form></section>`;
}
function renderSecurity() {
  return `${header('Seguranca da conta', 'Gerencie a chave usada para assinar relatorios neste dispositivo.')}<section class="panel" style="max-width:760px"><div class="profile-card"><div class="profile-avatar">${initials(state.employee.name)}</div><div><strong>${escapeHtml(state.employee.name)}</strong><small>${escapeHtml(state.employee.email)} · ${roleName(state.employee.role)}</small></div></div><div class="panel-head" style="margin-top:24px"><h3>Assinatura digital</h3><span id="key-status" class="key-badge">Verificando...</span></div><p class="helper">Um par de chaves ECDSA P-256 e criado pelo Web Crypto do navegador. A chave privada e nao exportavel e permanece no armazenamento local deste dispositivo. O servidor armazena apenas a chave publica.</p><div class="notice warning">Uma chave criada neste prototipo identifica apenas a conta e este navegador. Ela nao e um certificado digital ICP-Brasil e, por si so, nao oferece presuncao legal de autoria ou nao repudio.</div><button class="button primary" id="generate-key">Gerar / vincular chave neste dispositivo</button><div id="security-feedback" class="feedback"></div><div class="notice info">A assinatura digital cobre o identificador, titular, descricao, valor, data de envio e hash SHA-256 do recibo. O backend valida a assinatura antes de registrar o relatorio como assinado.</div></section>`;
}
function bindContent() {
  $('#content').onclick = async event => {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'submit' || action === 'overview' || action === 'expenses' || action === 'employees' || action === 'security') return navigate(action === 'overview' ? 'overview' : action);
    if (action === 'new-employee') return employeeModal();
    const validate = event.target.closest('[data-validate]')?.dataset.validate; if (validate) return validateExpense(validate);
    const sign = event.target.closest('[data-sign]')?.dataset.sign; if (sign) return signExpense(sign);
    const verify = event.target.closest('[data-verify]')?.dataset.verify; if (verify) return verifyExpense(verify);
    const details = event.target.closest('[data-detail]')?.dataset.detail; if (details) return detailModal(details);
    const edit = event.target.closest('[data-edit-employee]')?.dataset.editEmployee; if (edit) return employeeModal(state.employees.find(x => x.id === edit));
  };
  $('#content').oninput = event => {
    if (event.target.id === 'report-search') { const query = event.target.value.toLowerCase(); const list = state.expenses.filter(x => `${x.title} ${x.employeeName}`.toLowerCase().includes(query)); $('#report-table').innerHTML = reportRows(list); }
    if (event.target.id === 'employee-search') { const query = event.target.value.toLowerCase(); $$('tbody tr', $('#content')).forEach(row => row.classList.toggle('hidden', !row.textContent.toLowerCase().includes(query))); }
  };
  const expenseForm = $('#expense-form'); if (expenseForm) expenseForm.onsubmit = submitExpense;
  const generate = $('#generate-key'); if (generate) { checkKey().then(exists => { $('#key-status').textContent = exists ? 'Chave ativa neste dispositivo' : 'Nenhuma chave neste dispositivo'; $('#key-status').classList.toggle('none', !exists); }); generate.onclick = generateKey; }
}
function $$(selector, parent = document) { return [...parent.querySelectorAll(selector)]; }
async function submitExpense(event) {
  event.preventDefault(); const button = $('button[type="submit"]', event.currentTarget); button.disabled = true; button.textContent = 'Enviando...'; showFeedback('#expense-feedback', '');
  try { await api('/api/expenses', { method: 'POST', body: new FormData(event.currentTarget) }); toast('Relatorio enviado para validacao.'); await navigate('expenses'); }
  catch (error) { showFeedback('#expense-feedback', error.message); button.disabled = false; button.textContent = 'Enviar para validacao →'; }
}
function modal(title, subtitle, body, onReady) {
  const backdrop = document.createElement('div'); backdrop.className = 'modal-backdrop'; backdrop.innerHTML = `<section class="modal" role="dialog" aria-modal="true"><h2>${title}</h2><p>${subtitle}</p>${body}</section>`; document.body.append(backdrop); backdrop.addEventListener('click', event => { if (event.target === backdrop) backdrop.remove(); }); onReady?.(backdrop); return backdrop;
}
function employeeModal(person) {
  const editing = Boolean(person);
  const el = modal(editing ? 'Editar funcionario' : 'Novo funcionario', editing ? 'Atualize os dados e o acesso desta pessoa.' : 'O funcionario recebera acesso ao painel com o perfil selecionado.', `<form id="employee-form"><div class="form-grid"><label class="field full">Nome completo<input name="name" value="${escapeHtml(person?.name || '')}" required></label><label class="field full">E-mail<input name="email" type="email" value="${escapeHtml(person?.email || '')}" required></label><label class="field">Departamento<input name="department" value="${escapeHtml(person?.department || '')}" required></label><label class="field">Perfil<select name="role"><option value="employee" ${person?.role === 'employee' ? 'selected' : ''}>Colaborador</option><option value="manager" ${person?.role === 'manager' ? 'selected' : ''}>Gerente</option></select></label>${editing ? `<label class="field full">Acesso<select name="active"><option value="true" ${person.active ? 'selected' : ''}>Ativo</option><option value="false" ${!person.active ? 'selected' : ''}>Desativado</option></select></label>` : '<label class="field full">Senha inicial<input name="password" type="password" minlength="10" autocomplete="new-password" placeholder="Minimo 10 caracteres" required></label>'}</div><div class="feedback" id="modal-feedback"></div><div class="modal-actions"><button type="button" class="button outline" data-close>Cancelar</button><button class="button primary" type="submit">${editing ? 'Salvar alteracoes' : 'Cadastrar funcionario'}</button></div></form>`, backdrop => {
    $('[data-close]', backdrop).onclick = () => backdrop.remove();
    $('#employee-form', backdrop).onsubmit = async event => { event.preventDefault(); const data = Object.fromEntries(new FormData(event.currentTarget)); if (editing) data.active = data.active === 'true'; try { await api(editing ? `/api/employees/${person.id}` : '/api/employees', { method: editing ? 'PATCH' : 'POST', body: JSON.stringify(data) }); backdrop.remove(); toast(editing ? 'Cadastro atualizado.' : 'Funcionario cadastrado.'); await navigate('employees'); } catch (error) { showFeedback('#modal-feedback', error.message); } };
  }); return el;
}
async function validateExpense(id) { try { await api(`/api/expenses/${id}/validate`, { method: 'POST', body: '{}' }); toast('Relatorio validado. O colaborador ja pode assinar.'); await navigate('expenses'); } catch (error) { toast(error.message); } }

const DB_NAME = 'assina-despesas-keys';
function openKeyDb() { return new Promise((resolve, reject) => { const request = indexedDB.open(DB_NAME, 1); request.onupgradeneeded = () => request.result.createObjectStore('keys'); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); }
async function storeKey(key) { const db = await openKeyDb(); return new Promise((resolve, reject) => { const tx = db.transaction('keys', 'readwrite'); tx.objectStore('keys').put(key, state.employee.id); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); }); }
async function loadKey() { const db = await openKeyDb(); return new Promise((resolve, reject) => { const tx = db.transaction('keys', 'readonly'); const request = tx.objectStore('keys').get(state.employee.id); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); }
async function checkKey() { try { return Boolean(await loadKey()); } catch { return false; } }
function pemFromDer(buffer) { const bytes = new Uint8Array(buffer); let binary = ''; bytes.forEach(byte => binary += String.fromCharCode(byte)); const encoded = btoa(binary).match(/.{1,64}/g).join('\n'); return `-----BEGIN PUBLIC KEY-----\n${encoded}\n-----END PUBLIC KEY-----`; }
async function generateKey() {
  const button = $('#generate-key'); button.disabled = true; showFeedback('#security-feedback', '');
  try {
    let key = await loadKey();
    if (!key) { const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify']); key = pair.privateKey; await storeKey(key); window.currentSigningPair = pair; }
    let publicKey;
    if (window.currentSigningPair?.privateKey === key) publicKey = window.currentSigningPair.publicKey;
    else { // IndexedDB persists the private key; create and register its public key during first generation.
      const record = await keyMetadata(); publicKey = record?.publicKey;
    }
    if (!publicKey) { // Existing non-exportable keys need a retained public half; this state is reported explicitly.
      throw new Error('A chave privada ja existe, mas a chave publica nao esta disponivel neste navegador. Faca login em outro perfil e gere uma nova chave.');
    }
    const spki = await crypto.subtle.exportKey('spki', publicKey);
    await saveKeyMetadata(publicKey);
    await api('/api/me/public-key', { method: 'PUT', body: JSON.stringify({ publicKey: pemFromDer(spki) }) });
    $('#key-status').textContent = 'Chave ativa neste dispositivo'; $('#key-status').classList.remove('none'); toast('Chave publica vinculada a sua conta.');
  } catch (error) { showFeedback('#security-feedback', error.message); }
  finally { button.disabled = false; }
}
function keyMetadata() { return new Promise(async (resolve, reject) => { try { const db = await openKeyDb(); const tx = db.transaction('keys', 'readonly'); const request = tx.objectStore('keys').get(`public:${state.employee.id}`); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); } catch (error) { reject(error); } }); }
async function saveKeyMetadata(publicKey) { const db = await openKeyDb(); return new Promise((resolve, reject) => { const tx = db.transaction('keys', 'readwrite'); tx.objectStore('keys').put({ publicKey }, `public:${state.employee.id}`); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); }); }
async function signExpense(id) {
  try {
    const key = await loadKey(); const metadata = await keyMetadata();
    if (!key || !metadata?.publicKey) { toast('Gere ou vincule a chave na pagina Seguranca antes de assinar.'); return; }
    const item = state.expenses.find(x => x.id === id);
    const payload = JSON.stringify({ id: item.id, employeeId: item.employeeId, title: item.title, amount: Number(item.amount), description: item.description, receiptHash: item.receiptHash, createdAt: new Date(item.createdAt).toISOString(), validatedAt: new Date(item.validatedAt).toISOString() });
    const signature = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(payload));
    let binary = ''; new Uint8Array(signature).forEach(byte => binary += String.fromCharCode(byte));
    await api(`/api/expenses/${id}/sign`, { method: 'POST', body: JSON.stringify({ signature: btoa(binary) }) }); toast('Assinatura registrada e validada pelo servidor.'); await navigate('expenses');
  } catch (error) { toast(error.message); }
}
async function verifyExpense(id) {
  try { const result = await api(`/api/expenses/${id}/verify`); const item = state.expenses.find(x => x.id === id); modal('Verificacao de assinatura', `Relatorio: ${escapeHtml(item?.title || id)}`, `<div class="verify-result ${result.valid ? '' : 'invalid'}"><strong>${result.valid ? '✓ Assinatura valida' : '✕ Assinatura invalida'}</strong><br>${escapeHtml(result.message)}</div><div class="notice info">Assinante: ${escapeHtml(result.signer)}<br>Data da assinatura: ${date(result.signedAt)}<br>Resumo SHA-256 do conteudo: <span style="word-break:break-all">${result.digest}</span></div><div class="modal-actions"><button class="button primary" data-close>Fechar</button></div>`, el => $('[data-close]', el).onclick = () => el.remove()); }
  catch (error) { toast(error.message); }
}
function detailModal(id) {
  const item = state.expenses.find(x => x.id === id); if (!item) return;
  modal('Detalhes do relatorio', 'Dados registrados na trilha de despesas.', `<div class="notice info"><strong>${escapeHtml(item.title)}</strong><br>${escapeHtml(item.description)}<br><br>Colaborador: ${escapeHtml(item.employeeName)}<br>Valor: ${money(item.amount)}<br>Enviado: ${date(item.createdAt)}<br>Validado: ${date(item.validatedAt)}<br>Assinado: ${date(item.signedAt)}<br>Recibo SHA-256: <span style="word-break:break-all">${item.receiptHash}</span><br>Status: ${statusLabel(item.status)}</div><div class="modal-actions"><button class="button primary" data-close>Fechar</button></div>`, el => $('[data-close]', el).onclick = () => el.remove());
}
$('#content').addEventListener('click', event => { const receipt = event.target.closest('[data-receipt]'); if (receipt) { event.preventDefault(); const tab = window.open('about:blank', '_blank'); fetch(receipt.href, { headers: { Authorization: `Bearer ${state.token}` } }).then(async response => { if (!response.ok) throw new Error('Nao foi possivel abrir o recibo.'); const blob = await response.blob(); const url = URL.createObjectURL(blob); if (tab) { tab.opener = null; tab.location = url; } else { const link = document.createElement('a'); link.href = url; link.download = receipt.textContent; link.click(); } setTimeout(() => URL.revokeObjectURL(url), 30000); }).catch(error => { tab?.close(); toast(error.message); }); } });

window.addEventListener('keydown', event => { if (event.key === 'Escape') $('.modal-backdrop')?.remove(); });
