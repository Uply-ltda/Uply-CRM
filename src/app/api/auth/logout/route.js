import { NextResponse } from 'next/server';
import { getSupabaseWithContext, getClientIp, registrarAuditoria } from '@/lib/supabase';
import { extractTokenFromRequest, verifyJwtToken, clearAuthCookie } from '@/lib/auth';

export async function POST(request) {
  const ip = getClientIp(request);
  const rawToken = await extractTokenFromRequest(request);

  if (rawToken) {
    const payload = await verifyJwtToken(rawToken);
    if (payload?.sessionToken) {
      const db = getSupabaseWithContext(payload);
      try {
        await db
          .from('sessoes_ativas')
          .update({
            revogada: true,
            eliminado: true,
            ultimo_acesso_em: new Date().toISOString(),
          })
          .eq('token_sessao', payload.sessionToken);

        await registrarAuditoria(db, {
          usuarioId: payload.sub,
          modulo: 'usuarios',
          acao: 'logout',
          tabelaAfetada: 'sessoes_ativas',
          registroId: payload.sub,
          ipEndereco: ip,
        });
      } catch {
        // Continua limpeza de cookie mesmo se falhar no banco
      }
    }
  }

  const response = NextResponse.json({ success: true, message: 'Sessão encerrada com segurança.' });
  return clearAuthCookie(response);
}

