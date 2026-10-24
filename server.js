import express from 'express';
import helmet from 'helmet';
import multer from 'multer';
import { MongoClient, ObjectId } from 'mongodb';
import nodemailer from 'nodemailer';
import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual, verify as verifySignature } from 'node:crypto';
import { mkdirSync, unlinkSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT || 3000);
const secret = process.env.JWT_SECRET;
if (!secret || secret.length < 32) throw new Error('JWT_SECRET precisa ter pelo menos 32 caracteres.');
const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017');
await client.connect();
const db = client.db(process.env.MONGODB_DB || 'assinatura_despesas');
const employees = db.collection('employees');
const expenses = db.collection('expenses');
await employees.createIndex({ email: 1 }, { unique: true });
await expenses.createIndex({ createdAt: -1 });
const loginAttempts = new Map();

const demoUsersEnabled = process.env.NODE_ENV !== 'production' || process.env.DEMO_USERS_ENABLED === 'true';
const starterUsers = [
  { name: 'Marina Costa', email: 'gerente@demo.local', role: 'manager', department: 'Financeiro', password: process.env.DEMO_MANAGER_PASSWORD || (process.env.NODE_ENV === 'production' ? '' : 'Gerente123!') },
  { name: 'Rafael Lima', email: 'colaborador@demo.local', role: 'employee', department: 'Operacoes', password: process.env.DEMO_EMPLOYEE_PASSWORD || (process.env.NODE_ENV === 'production' ? '' : 'Colab123!') }
];
if (process.env.NODE_ENV === 'production' && demoUsersEnabled && starterUsers.some(user => !user.password)) {
  throw new Error('Defina DEMO_MANAGER_PASSWORD e DEMO_EMPLOYEE_PASSWORD ou desative DEMO_USERS_ENABLED.');
}
if (demoUsersEnabled) {
  for (const seed of starterUsers) {
    if (!seed.password) {
      console.warn(`Conta demonstrativa ${seed.email} nao iniciada: configure uma senha exclusiva.`);
      continue;
    }
    const existing = await employees.findOne({ email: seed.email });
    if (!existing) await employees.insertOne({ name: seed.name, email: seed.email, role: seed.role, department: seed.department, passwordHash: hashPassword(seed.password), active: true, publicKey: null, createdAt: new Date() });
    else await employees.updateOne({ _id: existing._id }, { $set: { passwordHash: hashPassword(seed.password), active: true } });
  }
}

mkdirSync(path.join(root, 'uploads'), { recursive: true });
app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' }, contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'"], imgSrc: ["'self'", 'data:'], objectSrc: ["'none'"], upgradeInsecureRequests: null } } }));
app.use((req, res, next) => {
  const allowedOrigin = process.env.WEB_ORIGIN;
  if (allowedOrigin && req.headers.origin === allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, OPTIONS');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(root, 'out'), { extensions: ['html'] }));
app.get('/api/health', (_req, res) => res.json({ ok: true }));

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}
function checkPassword(password, stored) {
  if (!stored || typeof password !== 'string') return false;
  const [salt, digest] = stored.split(':');
  const expected = Buffer.from(digest || '', 'hex');
  const actual = scryptSync(password, salt || '', 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
function tokenFor(user) {
  const head = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ sub: user._id.toString(), role: user.role, exp: Date.now() + 8 * 60 * 60 * 1000 })).toString('base64url');
  const data = `${head}.${payload}`;
  return `${data}.${createHmac('sha256', secret).update(data).digest('base64url')}`;
}
async function auth(req, res, next) {
  try {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
    const [head, payload, signature] = (token || '').split('.');
    const data = `${head}.${payload}`;
    const expected = createHmac('sha256', secret).update(data).digest();
    const actual = Buffer.from(signature || '', 'base64url');
    if (!head || !payload || actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error('token');
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (claims.exp < Date.now()) throw new Error('expired');
    req.user = await employees.findOne({ _id: new ObjectId(claims.sub), active: true });
    if (!req.user) throw new Error('user');
    next();
  } catch { res.status(401).json({ error: 'Sessao invalida ou expirada. Entre novamente.' }); }
}
const managerOnly = (req, res, next) => req.user.role === 'manager' ? next() : res.status(403).json({ error: 'Acesso exclusivo do gerente.' });
const viewEmployee = ({ _id, name, email, role, department, active, publicKey, createdAt }) => ({ id: _id.toString(), name, email, role, department, active, hasKey: Boolean(publicKey), createdAt });
const upload = multer({ dest: path.join(root, 'uploads'), limits: { fileSize: 8 * 1024 * 1024 }, fileFilter: (_req, file, cb) => ['application/pdf', 'image/jpeg', 'image/png'].includes(file.mimetype) ? cb(null, true) : cb(new Error('Envie um PDF, JPG ou PNG.')) });
const mailer = process.env.SMTP_HOST ? nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: Number(process.env.SMTP_PORT) === 465, auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined }) : null;
async function notify(subject, text) {
  if (!mailer) return;
  const recipients = (await employees.find({ active: true }).project({ email: 1 }).toArray()).map(x => x.email);
  if (recipients.length) {
    try { await mailer.sendMail({ from: process.env.MAIL_FROM, to: recipients, subject, text }); }
    catch (error) { console.warn('Notificacao por e-mail nao enviada:', error.message); }
  }
}
const signedPayload = expense => JSON.stringify({ id: expense._id.toString(), employeeId: expense.employeeId, title: expense.title, amount: Number(expense.amount), description: expense.description, receiptHash: expense.receiptHash, createdAt: new Date(expense.createdAt).toISOString(), validatedAt: new Date(expense.validatedAt).toISOString() });

app.post('/api/login', async (req, res) => {
  const address = req.ip;
  const attempts = loginAttempts.get(address);
  if (attempts && attempts.until > Date.now() && attempts.count >= 8) return res.status(429).json({ error: 'Muitas tentativas. Aguarde 15 minutos e tente novamente.' });
  const { email, password } = req.body || {};
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!demoUsersEnabled && ['gerente@demo.local', 'colaborador@demo.local'].includes(normalizedEmail)) return res.status(401).json({ error: 'Contas demonstrativas desativadas neste ambiente.' });
  const user = await employees.findOne({ email: normalizedEmail, active: true });
  if (!user || !checkPassword(password, user.passwordHash)) {
    const recent = attempts?.until > Date.now() ? attempts : { count: 0, until: Date.now() + 15 * 60 * 1000 };
    recent.count += 1; loginAttempts.set(address, recent);
    return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
  }
  loginAttempts.delete(address);
  res.json({ token: tokenFor(user), employee: viewEmployee(user) });
});
app.get('/api/me', auth, (req, res) => res.json({ employee: viewEmployee(req.user) }));
app.get('/api/employees', auth, managerOnly, async (_req, res) => res.json({ employees: (await employees.find().sort({ name: 1 }).toArray()).map(viewEmployee) }));
app.post('/api/employees', auth, managerOnly, async (req, res) => {
  const { name, email, department, role, password } = req.body || {};
  if (!name?.trim() || !/^\S+@\S+\.\S+$/.test(email || '') || !department?.trim() || !['employee', 'manager'].includes(role) || !password || password.length < 10) return res.status(400).json({ error: 'Informe nome, e-mail valido, departamento, perfil e senha com ao menos 10 caracteres.' });
  try {
    const result = await employees.insertOne({ name: name.trim(), email: email.toLowerCase(), department: department.trim(), role, passwordHash: hashPassword(password), active: true, publicKey: null, createdAt: new Date() });
    res.status(201).json({ employee: viewEmployee(await employees.findOne({ _id: result.insertedId })) });
  } catch (error) { res.status(error.code === 11000 ? 409 : 500).json({ error: error.code === 11000 ? 'Este e-mail ja esta cadastrado.' : 'Nao foi possivel cadastrar.' }); }
});
app.patch('/api/employees/:id', auth, managerOnly, async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'Funcionario invalido.' });
  const { name, email, department, role, active } = req.body || {};
  const updates = {};
  if (typeof name === 'string' && name.trim()) updates.name = name.trim();
  if (typeof email === 'string' && email.includes('@')) updates.email = email.toLowerCase();
  if (typeof department === 'string' && department.trim()) updates.department = department.trim();
  if (['employee', 'manager'].includes(role)) updates.role = role;
  if (typeof active === 'boolean') updates.active = active;
  await employees.updateOne({ _id: new ObjectId(req.params.id) }, { $set: updates });
  const employee = await employees.findOne({ _id: new ObjectId(req.params.id) });
  employee ? res.json({ employee: viewEmployee(employee) }) : res.status(404).json({ error: 'Funcionario nao encontrado.' });
});
app.put('/api/me/public-key', auth, async (req, res) => {
  const key = req.body?.publicKey;
  if (typeof key !== 'string' || key.length > 2000 || !key.startsWith('-----BEGIN PUBLIC KEY-----')) return res.status(400).json({ error: 'Chave publica invalida.' });
  await employees.updateOne({ _id: req.user._id }, { $set: { publicKey: key } });
  res.json({ ok: true });
});
app.get('/api/expenses', auth, async (req, res) => {
  const query = req.user.role === 'manager' ? {} : { employeeId: req.user._id.toString() };
  const list = await expenses.find(query).sort({ createdAt: -1 }).toArray();
  res.json({ expenses: list.map(({ _id, employeeName, employeeId, title, amount, description, receiptName, status, createdAt, validatedAt, signedAt, signature, publicKey, receiptHash }) => ({ id: _id.toString(), employeeName, employeeId, title, amount, description, receiptName, status, createdAt, validatedAt, signedAt, signature, publicKey, receiptHash })) });
});
app.post('/api/expenses', auth, upload.single('receipt'), async (req, res) => {
  const { title, amount, description } = req.body || {};
  if (!title?.trim() || !Number.isFinite(Number(amount)) || Number(amount) <= 0 || !description?.trim() || !req.file) {
    if (req.file) unlinkSync(req.file.path);
    return res.status(400).json({ error: 'Preencha o relatorio e anexe um recibo PDF, JPG ou PNG.' });
  }
  const bytes = await readFile(req.file.path);
  const validBytes = req.file.mimetype === 'application/pdf' ? bytes.subarray(0, 5).toString() === '%PDF-' : req.file.mimetype === 'image/png' ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) : bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255]));
  if (!validBytes) { unlinkSync(req.file.path); return res.status(400).json({ error: 'O conteudo do arquivo nao corresponde ao formato informado.' }); }
  const record = { employeeId: req.user._id.toString(), employeeName: req.user.name, title: title.trim().slice(0, 120), amount: Number(Number(amount).toFixed(2)), description: description.trim().slice(0, 1200), receiptName: req.file.originalname.slice(0, 180), receiptPath: req.file.filename, receiptHash: createHash('sha256').update(bytes).digest('hex'), status: 'pending', createdAt: new Date() };
  const result = await expenses.insertOne(record);
  await notify('Novo relatorio aguardando validacao', `${record.employeeName} enviou "${record.title}" para validacao.`);
  res.status(201).json({ expense: { ...record, id: result.insertedId.toString() } });
});
app.get('/api/expenses/:id/receipt', auth, async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) return res.sendStatus(404);
  const item = await expenses.findOne({ _id: new ObjectId(req.params.id) });
  if (!item || (req.user.role !== 'manager' && item.employeeId !== req.user._id.toString())) return res.sendStatus(404);
  res.download(path.join(root, 'uploads', path.basename(item.receiptPath)), item.receiptName);
});
app.post('/api/expenses/:id/validate', auth, managerOnly, async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'Relatorio invalido.' });
  const item = await expenses.findOne({ _id: new ObjectId(req.params.id) });
  if (!item || item.status !== 'pending') return res.status(409).json({ error: 'Este relatorio nao esta aguardando validacao.' });
  const validatedAt = new Date();
  await expenses.updateOne({ _id: item._id }, { $set: { status: 'validated', validatedAt, validatedBy: req.user._id.toString() } });
  await notify('Relatorio validado e aguardando assinatura', `O relatorio "${item.title}" de ${item.employeeName} foi validado pelo gerente.`);
  res.json({ ok: true, validatedAt });
});
app.post('/api/expenses/:id/sign', auth, async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'Relatorio invalido.' });
  const item = await expenses.findOne({ _id: new ObjectId(req.params.id), employeeId: req.user._id.toString(), status: 'validated' });
  if (!item || !req.user.publicKey) return res.status(409).json({ error: 'Gere sua chave de assinatura e confirme que o gerente validou o relatorio.' });
  const payload = signedPayload(item);
  try {
    const key = req.user.publicKey.replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----|\s/g, '');
    const ok = verifySignature('sha256', Buffer.from(payload), { key: Buffer.from(key, 'base64'), format: 'der', type: 'spki', dsaEncoding: 'ieee-p1363' }, Buffer.from(req.body?.signature || '', 'base64'));
    if (!ok) return res.status(400).json({ error: 'Assinatura nao confere com o conteudo do relatorio.' });
    await expenses.updateOne({ _id: item._id }, { $set: { status: 'signed', signature: req.body.signature, publicKey: req.user.publicKey, signedAt: new Date(), signedBy: req.user._id.toString(), signedPayload: payload } });
    await notify('Relatorio assinado digitalmente', `${req.user.name} assinou o relatorio "${item.title}".`);
    res.json({ ok: true });
  } catch { res.status(400).json({ error: 'Assinatura ou chave publica invalida.' }); }
});
app.get('/api/expenses/:id/verify', auth, managerOnly, async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'Relatorio invalido.' });
  const item = await expenses.findOne({ _id: new ObjectId(req.params.id) });
  if (!item || !item.signature || !item.publicKey || !item.signedPayload) return res.status(404).json({ error: 'O relatorio ainda nao foi assinado.' });
  let signatureValid = false;
  try { const key = item.publicKey.replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----|\s/g, ''); signatureValid = verifySignature('sha256', Buffer.from(item.signedPayload), { key: Buffer.from(key, 'base64'), format: 'der', type: 'spki', dsaEncoding: 'ieee-p1363' }, Buffer.from(item.signature, 'base64')); } catch {}
  let receiptValid = false;
  try { receiptValid = createHash('sha256').update(await readFile(path.join(root, 'uploads', path.basename(item.receiptPath)))).digest('hex') === item.receiptHash; } catch {}
  const valid = signatureValid && receiptValid;
  res.json({ valid, signatureValid, receiptValid, signer: item.employeeName, signedAt: item.signedAt, digest: createHash('sha256').update(item.signedPayload).digest('hex'), message: valid ? 'Assinatura valida e recibo identico ao arquivo registrado.' : !receiptValid ? 'O recibo armazenado nao corresponde ao hash registrado.' : 'Assinatura invalida: o conteudo ou a chave podem ter sido alterados.' });
});
app.use((error, _req, res, _next) => { console.error(error.message); res.status(error instanceof multer.MulterError ? 400 : 500).json({ error: error instanceof multer.MulterError ? 'Arquivo excede 8 MB ou e invalido.' : error.message.includes('Envie um PDF') ? error.message : 'Erro interno. Tente novamente.' }); });
app.listen(port, '0.0.0.0', () => console.log(`AssinaDespesas disponivel na porta ${port}`));
