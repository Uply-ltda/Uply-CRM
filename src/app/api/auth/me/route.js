import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { mapPermissoesFromDb } from '@/lib/supabase';

export const GET = withAuth(async (_request, _context, { session, db, renewedJwt }) => {
  let permissions = session.permissions || {};

  try {
    const { data: permRows } = await db
      .from('permissoes_usuarios')
      .select('modulo, acessar, incluir, editar, deletar, eliminado')
      .eq('usuario_id', session.sub)
      .eq('eliminado', false);

    if (Array.isArray(permRows) && permRows.length > 0) {
      permissions = mapPermissoesFromDb(permRows);
    }
  } catch {
    // Mantém permissões validadas no JWT
  }

  return NextResponse.json({
    user: {
      id: session.sub,
      name: session.name || '',
      username: session.username || '',
      email: session.email || '',
      phone: session.phone || '',
      cpf: session.cpf || '',
      role: session.role || 'Usuário',
      hasSavedPassword: Boolean(session.hasSavedPassword ?? true),
      permissions,
    },
    expiresAt: renewedJwt ? renewedJwt.expSeconds : session.exp,
    renewed: Boolean(renewedJwt),
  });
});

