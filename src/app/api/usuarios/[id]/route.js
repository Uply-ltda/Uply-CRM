import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { withAuthAndPermission } from '@/lib/auth';
import {
  sanitizePayload,
  getClientIp,
  registrarAuditoria,
  mapUsuarioFromDb,
  SYSTEM_MODULE_IDS,
} from '@/lib/supabase';

async function handleUpdateUser(request, context, { session, db }) {
  const { id } = await context.params;
  const ip = getClientIp(request);
  const rawBody = await request.json();
  const body = sanitizePayload(rawBody);

  const name = body?.name || body?.nome_completo;
  const username = (body?.username || body?.nome_usuario || '').toLowerCase().trim();
  const email = (body?.email || '').toLowerCase().trim();
  const phone = body?.phone ?? body?.telefone ?? '';
  const cpf = body?.cpf ?? '';
  const role = body?.role ?? body?.cargo ?? '';
  const rawPassword = body?.passwordInput || body?.password || body?.senha || '';
  const permissions = body?.permissions;

  if (!name || !username || !email) {
    return NextResponse.json(
      { error: 'Nome completo, nome de usuário e e-mail são obrigatórios.' },
      { status: 400 }
    );
  }

  const updateFields = {
    nome_completo: name,
    nome_usuario: username,
    email,
    telefone: phone || null,
    cpf: cpf || null,
    cargo: role,
    atualizado_em: new Date().toISOString(),
  };

  if (rawPassword && rawPassword.trim().length > 0) {
    updateFields.senha_hash = await bcrypt.hash(rawPassword.trim(), 10);
    updateFields.possui_senha_salva = true;
  }

  const { data: updatedUser, error: updateErr } = await db
    .from('usuarios')
    .update(updateFields)
    .eq('id', id)
    .eq('eliminado', false)
    .select(
      'id, nome_completo, nome_usuario, email, telefone, cpf, cargo, possui_senha_salva, ativo, eliminado, ultimo_login_em'
    )
    .single();

  if (updateErr || !updatedUser) {
    return NextResponse.json(
      { error: updateErr?.message || 'Erro ao atualizar dados do usuário.' },
      { status: 400 }
    );
  }

  let currentPerms = [];
  if (permissions && typeof permissions === 'object') {
    for (const mod of SYSTEM_MODULE_IDS) {
      const p = permissions[mod] || {};
      const acessar = Boolean(p.access);
      const permData = {
        usuario_id: id,
        modulo: mod,
        acessar,
        incluir: acessar && Boolean(p.create),
        editar: acessar && Boolean(p.edit),
        deletar: acessar && Boolean(p.delete),
        eliminado: false,
        atualizado_em: new Date().toISOString(),
      };

      const { data: existing } = await db
        .from('permissoes_usuarios')
        .select('id')
        .eq('usuario_id', id)
        .eq('modulo', mod)
        .limit(1);

      if (Array.isArray(existing) && existing.length > 0) {
        await db.from('permissoes_usuarios').update(permData).eq('id', existing[0].id);
      } else {
        await db.from('permissoes_usuarios').insert(permData);
      }
      currentPerms.push(permData);
    }
  } else {
    const { data: fetchedPerms } = await db
      .from('permissoes_usuarios')
      .select('id, usuario_id, modulo, acessar, incluir, editar, deletar, eliminado')
      .eq('usuario_id', id)
      .eq('eliminado', false);
    currentPerms = fetchedPerms || [];
  }

  await registrarAuditoria(db, {
    usuarioId: session.sub,
    modulo: 'usuarios',
    acao: 'edit',
    tabelaAfetada: 'usuarios',
    registroId: id,
    dadosNovos: { ...updatedUser, permissions },
    ipEndereco: ip,
  });

  const userDto = mapUsuarioFromDb(updatedUser, currentPerms);
  return NextResponse.json({ user: userDto });
}

export const PUT = withAuthAndPermission(handleUpdateUser, 'usuarios', 'edit');
export const PATCH = withAuthAndPermission(handleUpdateUser, 'usuarios', 'edit');

export const DELETE = withAuthAndPermission(
  async (request, context, { session, db }) => {
    const { id } = await context.params;
    const ip = getClientIp(request);

    if (id === session.sub) {
      return NextResponse.json(
        { error: 'Não é permitido excluir o próprio usuário autenticado.' },
        { status: 400 }
      );
    }

    const nowIso = new Date().toISOString();

    const { error } = await db
      .from('usuarios')
      .update({
        eliminado: true,
        ativo: false,
        atualizado_em: nowIso,
      })
      .eq('id', id);

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Erro ao excluir usuário.' },
        { status: 400 }
      );
    }

    await Promise.all([
      db
        .from('permissoes_usuarios')
        .update({ eliminado: true, atualizado_em: nowIso })
        .eq('usuario_id', id),
      db
        .from('sessoes_ativas')
        .update({ revogada: true, eliminado: true, ultimo_acesso_em: nowIso })
        .eq('usuario_id', id),
    ]);

    await registrarAuditoria(db, {
      usuarioId: session.sub,
      modulo: 'usuarios',
      acao: 'delete',
      tabelaAfetada: 'usuarios',
      registroId: id,
      ipEndereco: ip,
    });

    return NextResponse.json({ success: true });
  },
  'usuarios',
  'delete'
);

