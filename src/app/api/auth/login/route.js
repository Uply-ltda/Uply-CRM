import { NextResponse } from 'next/server';
import {
  supabase,
  getSupabaseWithContext,
  sanitizeString,
  getClientIp,
  registrarAuditoria,
} from '@/lib/supabase';
import {
  signJwtToken,
  setAuthCookie,
  INITIAL_EXP_SECONDS,
  checkLoginRateLimit,
  recordLoginFailure,
  resetLoginRateLimit,
} from '@/lib/auth';

export async function POST(request) {
  const ip = getClientIp(request);
  const userAgent = request.headers.get('user-agent') || 'UPLY-Web-Client';

  const rateLimit = checkLoginRateLimit(ip);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: rateLimit.message },
      {
        status: 429,
        headers: { 'Retry-After': String(rateLimit.retryAfterSeconds || 60) },
      }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Formato de requisição inválido.' },
      { status: 400 }
    );
  }

  const rawUsername = sanitizeString(body?.username || body?.nome_usuario || '');
  const rawPassword = typeof body?.password === 'string' ? body.password : typeof body?.senha === 'string' ? body.senha : '';

  if (!rawUsername || !rawPassword.trim()) {
    return NextResponse.json(
      { error: 'Informe o nome de usuário e a senha para acessar o sistema.' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase.rpc('rpc_autenticar_usuario', {
    p_nome_usuario: rawUsername.toLowerCase(),
    p_senha: rawPassword,
    p_ip: ip,
    p_user_agent: userAgent,
  });

  if (error || !data || !data.usuario || !data.token_sessao) {
    recordLoginFailure(ip);
    return NextResponse.json(
      {
        error:
          error?.message ||
          'Usuário não encontrado ou senha inválida. Verifique suas credenciais.',
      },
      { status: 401 }
    );
  }

  resetLoginRateLimit(ip);

  const u = data.usuario;
  const sessionToken = data.token_sessao;

  const userDto = {
    id: u.id,
    name: u.name || u.nome_completo || '',
    username: u.username || u.nome_usuario || rawUsername.toLowerCase(),
    email: u.email || '',
    phone: u.phone || u.telefone || '',
    cpf: u.cpf || '',
    role: u.role || u.cargo || 'Usuário',
    hasSavedPassword: Boolean(u.hasSavedPassword ?? u.possui_senha_salva ?? true),
    permissions: u.permissions || {},
  };

  const { token, expSeconds } = await signJwtToken(
    {
      sub: userDto.id,
      username: userDto.username,
      name: userDto.name,
      role: userDto.role,
      email: userDto.email,
      phone: userDto.phone,
      cpf: userDto.cpf,
      hasSavedPassword: userDto.hasSavedPassword,
      permissions: userDto.permissions,
      sessionToken,
    },
    INITIAL_EXP_SECONDS
  );

  // Registra log de auditoria e garante expiração inicial de 30m na sessão
  const db = getSupabaseWithContext({ sub: userDto.id, sessionToken });
  const expIso = new Date(expSeconds * 1000).toISOString();
  db.from('sessoes_ativas')
    .update({ expira_em: expIso, ultimo_acesso_em: new Date().toISOString() })
    .eq('token_sessao', sessionToken)
    .then(() => {})
    .catch(() => {});

  registrarAuditoria(db, {
    usuarioId: userDto.id,
    modulo: 'usuarios',
    acao: 'login',
    tabelaAfetada: 'sessoes_ativas',
    registroId: userDto.id,
    dadosNovos: { username: userDto.username, ip },
    ipEndereco: ip,
  });

  const response = NextResponse.json({
    user: userDto,
    token,
    expiresAt: expSeconds,
  });

  return setAuthCookie(response, token, INITIAL_EXP_SECONDS);
}

