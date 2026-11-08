import { SignJWT, jwtVerify } from 'jose';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabaseWithContext, mapPermissoesFromDb } from './supabase';

export const COOKIE_NAME = 'uply_token';
export const INITIAL_EXP_SECONDS = 30 * 60; // 30 minutos exatos
export const RENEWAL_THRESHOLD_SECONDS = 5 * 60; // Últimos 5 minutos (300 segundos)
export const RENEWED_EXP_SECONDS = 28 * 60 * 60; // +28 horas (100.800 segundos)

function getJwtSecretKey() {
  const secret =
    process.env.JWT_SECRET || 'uply_erp_super_secret_jwt_key_2026_production_secure_hash';
  return new TextEncoder().encode(secret);
}

/**
 * Gera um JWT assinado (HS256) compatível com Edge Runtime.
 * Por padrão expira em exatos 30 minutos (1800s).
 */
export async function signJwtToken(payload, durationSeconds = INITIAL_EXP_SECONDS) {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const expSeconds = nowSeconds + durationSeconds;

  const token = await new SignJWT({
    sub: String(payload.sub || payload.id),
    username: payload.username,
    name: payload.name,
    role: payload.role,
    email: payload.email || '',
    phone: payload.phone || '',
    cpf: payload.cpf || '',
    hasSavedPassword: Boolean(payload.hasSavedPassword),
    permissions: payload.permissions || {},
    sessionToken: payload.sessionToken,
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt(nowSeconds)
    .setExpirationTime(expSeconds)
    .sign(getJwtSecretKey());

  return { token, expSeconds, maxAge: durationSeconds };
}

/**
 * Verifica a assinatura e validade temporal do token JWT.
 */
export async function verifyJwtToken(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey());
    return payload;
  } catch {
    return null;
  }
}

/**
 * Extrai o token JWT do cookie HttpOnly `uply_token` ou do header `Authorization: Bearer <token>`.
 */
export async function extractTokenFromRequest(request) {
  const authHeader = request?.headers?.get?.('authorization');
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    const bearer = authHeader.slice(7).trim();
    if (bearer) return bearer;
  }

  const reqCookie = request?.cookies?.get?.(COOKIE_NAME)?.value;
  if (reqCookie) return reqCookie;

  try {
    const cookieStore = await cookies();
    return cookieStore.get(COOKIE_NAME)?.value || null;
  } catch {
    return null;
  }
}

/**
 * Configura o cookie HttpOnly `uply_token` em uma resposta NextResponse.
 */
export function setAuthCookie(response, token, maxAgeSeconds = INITIAL_EXP_SECONDS) {
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeSeconds,
  });
  return response;
}

/**
 * Remove o cookie HttpOnly `uply_token` da resposta.
 */
export function clearAuthCookie(response) {
  response.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}

// ==========================================
// MAPEAMENTO DE AÇÕES RBAC (PORTUGUÊS / INGLÊS)
// ==========================================

const ACTION_TO_DB_COLUMN = {
  access: 'acessar',
  acessar: 'acessar',
  create: 'incluir',
  incluir: 'incluir',
  edit: 'editar',
  editar: 'editar',
  delete: 'deletar',
  deletar: 'deletar',
};

const ACTION_TO_PERM_KEY = {
  access: 'access',
  acessar: 'access',
  create: 'create',
  incluir: 'create',
  edit: 'edit',
  editar: 'edit',
  delete: 'delete',
  deletar: 'delete',
};

const ACTION_LABEL_PT = {
  access: 'acessar',
  create: 'incluir registros em',
  edit: 'editar registros em',
  delete: 'excluir registros em',
};

/**
 * Verifica se o usuário autenticado possui a permissão solicitada (modulo, acao).
 * Consulta primeiro `public.permissoes_usuarios` no banco e sincroniza/valida com o payload.
 */
export async function requirePermission(session, db, modulo, acao = 'access') {
  if (!session || !session.sub) {
    return {
      allowed: false,
      status: 401,
      message: 'Sessão inválida ou expirada. Faça login novamente.',
    };
  }

  const permKey = ACTION_TO_PERM_KEY[acao] || 'access';
  const dbCol = ACTION_TO_DB_COLUMN[acao] || 'acessar';

  // Tenta validar diretamente na tabela public.permissoes_usuarios
  try {
    const { data: permRows, error } = await db
      .from('permissoes_usuarios')
      .select('modulo, acessar, incluir, editar, deletar, eliminado')
      .eq('usuario_id', session.sub)
      .eq('eliminado', false);

    if (!error && Array.isArray(permRows) && permRows.length > 0) {
      // Atualiza matriz em memória da requisição com dados frescos do banco
      session.permissions = mapPermissoesFromDb(permRows);
      const modRow = permRows.find((r) => r.modulo === modulo && !r.eliminado);
      const hasAccess = Boolean(modRow?.acessar);
      const hasAction = permKey === 'access' ? hasAccess : hasAccess && Boolean(modRow?.[dbCol]);

      if (!hasAction) {
        return {
          allowed: false,
          status: 403,
          message: `Acesso negado (403): seu perfil não possui permissão para ${
            ACTION_LABEL_PT[permKey] || permKey
          } o módulo "${modulo}".`,
        };
      }
      return { allowed: true };
    }
  } catch {
    // Segue para validação via payload assinado do JWT
  }

  const modPerm = session.permissions?.[modulo];
  const hasAccess = Boolean(modPerm?.access);
  const hasAction = permKey === 'access' ? hasAccess : hasAccess && Boolean(modPerm?.[permKey]);

  if (!hasAction) {
    return {
      allowed: false,
      status: 403,
      message: `Acesso negado (403): seu perfil não possui permissão para ${
        ACTION_LABEL_PT[permKey] || permKey
      } o módulo "${modulo}".`,
    };
  }

  return { allowed: true };
}

/**
 * Valida a sessão ativa (JWT + tabela `public.sessoes_ativas`) e executa a
 * Regra Crítica de Renovação Automática (Sliding Window: últimos 5 min -> +28h).
 */
export async function validateSessionAndSlideWindow(request) {
  const rawToken = await extractTokenFromRequest(request);
  if (!rawToken) {
    return {
      valid: false,
      status: 401,
      error: 'Não autenticado. Token de sessão ausente.',
    };
  }

  const payload = await verifyJwtToken(rawToken);
  if (!payload || !payload.sub || !payload.sessionToken) {
    return {
      valid: false,
      status: 401,
      error: 'Token JWT inválido ou expirado. Faça login novamente.',
    };
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const remainingSeconds = (payload.exp || 0) - nowSeconds;

  if (remainingSeconds <= 0) {
    return {
      valid: false,
      status: 401,
      error: 'Sua sessão expirou. Faça login novamente.',
    };
  }

  const db = getSupabaseWithContext(payload);

  // Verifica no banco se a sessão foi revogada ou eliminada (quando visível pelo RLS)
  try {
    const { data: sessaoRows } = await db
      .from('sessoes_ativas')
      .select('id, usuario_id, token_sessao, expira_em, revogada, eliminado')
      .eq('token_sessao', payload.sessionToken)
      .limit(1);

    if (Array.isArray(sessaoRows) && sessaoRows.length > 0) {
      const sessao = sessaoRows[0];
      const expiredInDb =
        sessao.expira_em && new Date(sessao.expira_em).getTime() <= Date.now();
      if (sessao.revogada || sessao.eliminado || expiredInDb) {
        return {
          valid: false,
          status: 401,
          error: 'Sessão encerrada ou revogada no servidor. Faça login novamente.',
        };
      }
    }

    // Verifica se o usuário continua ativo e não eliminado
    const { data: userRows } = await db
      .from('usuarios')
      .select('id, nome_completo, nome_usuario, email, telefone, cpf, cargo, possui_senha_salva, ativo, eliminado')
      .eq('id', payload.sub)
      .limit(1);

    if (Array.isArray(userRows) && userRows.length > 0) {
      const u = userRows[0];
      if (u.eliminado || u.ativo === false) {
        return {
          valid: false,
          status: 401,
          error: 'Usuário inativo ou removido do sistema.',
        };
      }
      // Sincroniza dados básicos do perfil
      payload.name = u.nome_completo || payload.name;
      payload.username = u.nome_usuario || payload.username;
      payload.role = u.cargo || payload.role;
      payload.email = u.email || payload.email;
      payload.phone = u.telefone || payload.phone;
      payload.cpf = u.cpf || payload.cpf;
      payload.hasSavedPassword = Boolean(u.possui_senha_salva);
    }
  } catch {
    // Continua com validação criptográfica do JWT
  }

  // Regra Crítica: se faltarem 5 minutos (300s) ou menos para expirar, renova por +28 horas
  let renewedJwt = null;
  if (remainingSeconds <= RENEWAL_THRESHOLD_SECONDS && remainingSeconds > 0) {
    const newExpDateIso = new Date(Date.now() + RENEWED_EXP_SECONDS * 1000).toISOString();
    const nowIso = new Date().toISOString();

    try {
      await db
        .from('sessoes_ativas')
        .update({
          expira_em: newExpDateIso,
          ultimo_acesso_em: nowIso,
        })
        .eq('token_sessao', payload.sessionToken)
        .eq('eliminado', false);
    } catch {
      // Ignora erro caso RLS bloqueie update direto sem service role
    }

    renewedJwt = await signJwtToken(payload, RENEWED_EXP_SECONDS);
    payload.exp = renewedJwt.expSeconds;
  } else {
    // Atualiza ultimo_acesso_em de forma assíncrona sem bloquear a requisição
    db.from('sessoes_ativas')
      .update({ ultimo_acesso_em: new Date().toISOString() })
      .eq('token_sessao', payload.sessionToken)
      .then(() => {})
      .catch(() => {});
  }

  return {
    valid: true,
    session: payload,
    db,
    renewedJwt,
  };
}

/**
 * Wrapper central para Route Handlers autenticados com verificação opcional de RBAC
 * e aplicação automática da renovação do cookie HttpOnly (+28h nos últimos 5 min).
 */
export function withAuthAndPermission(handler, modulo = null, acao = 'access') {
  return async function wrappedHandler(request, context) {
    const authResult = await validateSessionAndSlideWindow(request);

    if (!authResult.valid) {
      const res = NextResponse.json(
        {
          error: authResult.error || 'Não autorizado.',
          forceLogout: true,
        },
        { status: authResult.status || 401 }
      );
      return clearAuthCookie(res);
    }

    const { session, db, renewedJwt } = authResult;

    if (modulo) {
      const permCheck = await requirePermission(session, db, modulo, acao);
      if (!permCheck.allowed) {
        const res = NextResponse.json(
          {
            error: permCheck.message,
            forceLogout: permCheck.status === 401,
          },
          { status: permCheck.status }
        );
        if (renewedJwt) {
          setAuthCookie(res, renewedJwt.token, renewedJwt.maxAge);
        }
        return res;
      }
    }

    try {
      const response = await handler(request, context, { session, db, renewedJwt });

      if (renewedJwt && response instanceof NextResponse) {
        setAuthCookie(response, renewedJwt.token, renewedJwt.maxAge);
        response.headers.set('x-session-renewed', 'true');
        response.headers.set('x-session-expires-at', String(renewedJwt.expSeconds));
      }

      return response;
    } catch (err) {
      console.error('[UPLY API Error]:', err);
      return NextResponse.json(
        {
          error: err?.message || 'Erro interno ao processar a requisição no servidor.',
        },
        { status: 500 }
      );
    }
  };
}

export function withAuth(handler) {
  return withAuthAndPermission(handler, null, null);
}

// ==========================================
// RATE LIMITING EM MEMÓRIA (PROTEÇÃO LOGIN)
// ==========================================

const loginAttemptsMap = new Map();
const MAX_LOGIN_ATTEMPTS = 8;
const LOCKOUT_WINDOW_MS = 10 * 60 * 1000; // 10 minutos

export function checkLoginRateLimit(ip) {
  const key = ip || '127.0.0.1';
  const now = Date.now();
  const record = loginAttemptsMap.get(key);

  if (!record) {
    return { allowed: true, remaining: MAX_LOGIN_ATTEMPTS };
  }

  if (now - record.firstAttemptAt > LOCKOUT_WINDOW_MS) {
    loginAttemptsMap.delete(key);
    return { allowed: true, remaining: MAX_LOGIN_ATTEMPTS };
  }

  if (record.count >= MAX_LOGIN_ATTEMPTS) {
    const waitSeconds = Math.ceil((LOCKOUT_WINDOW_MS - (now - record.firstAttemptAt)) / 1000);
    return {
      allowed: false,
      retryAfterSeconds: waitSeconds,
      message: `Muitas tentativas de login. Aguarde ${waitSeconds} segundos antes de tentar novamente.`,
    };
  }

  return { allowed: true, remaining: MAX_LOGIN_ATTEMPTS - record.count };
}

export function recordLoginFailure(ip) {
  const key = ip || '127.0.0.1';
  const now = Date.now();
  const record = loginAttemptsMap.get(key);

  if (!record || now - record.firstAttemptAt > LOCKOUT_WINDOW_MS) {
    loginAttemptsMap.set(key, { count: 1, firstAttemptAt: now });
  } else {
    record.count += 1;
    loginAttemptsMap.set(key, record);
  }
}

export function resetLoginRateLimit(ip) {
  const key = ip || '127.0.0.1';
  loginAttemptsMap.delete(key);
}

