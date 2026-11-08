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

export const GET = withAuthAndPermission(
  async (_request, _context, { db }) => {
    const [usersRes, permsRes] = await Promise.all([
      db
        .from('usuarios')
        .select(
          'id, nome_completo, nome_usuario, email, telefone, cpf, cargo, possui_senha_salva, ativo, eliminado, ultimo_login_em'
        )
        .eq('eliminado', false)
        .order('nome_completo', { ascending: true }),
      db
        .from('permissoes_usuarios')
        .select('id, usuario_id, modulo, acessar, incluir, editar, deletar, eliminado')
        .eq('eliminado', false),
    ]);

    if (usersRes.error) {
      return NextResponse.json({ error: usersRes.error.message }, { status: 400 });
    }

    const permRows = permsRes.data || [];
    const users = (usersRes.data || []).map((u) => mapUsuarioFromDb(u, permRows));

    return NextResponse.json({ users });
  },
  'usuarios',
  'access'
);

export const POST = withAuthAndPermission(
  async (request, _context, { session, db }) => {
    const ip = getClientIp(request);
    const rawBody = await request.json();
    const body = sanitizePayload(rawBody);

    const name = body?.name || body?.nome_completo || '';
    const username = (body?.username || body?.nome_usuario || '').toLowerCase().trim();
    const email = (body?.email || '').toLowerCase().trim();
    const phone = body?.phone || body?.telefone || '';
    const cpf = body?.cpf || '';
    const role = body?.role || body?.cargo || 'Colaborador';
    const rawPassword = body?.passwordInput || body?.password || body?.senha || '';
    const permissions = body?.permissions || {};

    if (!name || !username || !email) {
      return NextResponse.json(
        { error: 'Nome completo, nome de usuário e e-mail são obrigatórios.' },
        { status: 400 }
      );
    }

    const passwordToHash = rawPassword.trim() || '123456';
    const senhaHash = await bcrypt.hash(passwordToHash, 10);

    const insertPayload = {
      nome_completo: name,
      nome_usuario: username,
      email,
      telefone: phone || null,
      cpf: cpf || null,
      cargo: role,
      senha_hash: senhaHash,
      possui_senha_salva: true,
      ativo: true,
      eliminado: false,
    };

    const { data: createdUser, error: userErr } = await db
      .from('usuarios')
      .insert(insertPayload)
      .select(
        'id, nome_completo, nome_usuario, email, telefone, cpf, cargo, possui_senha_salva, ativo, eliminado, ultimo_login_em'
      )
      .single();

    if (userErr || !createdUser) {
      return NextResponse.json(
        { error: userErr?.message || 'Erro ao cadastrar usuário no banco de dados.' },
        { status: 400 }
      );
    }

    // Sincroniza matriz de permissões na tabela public.permissoes_usuarios
    const permInserts = SYSTEM_MODULE_IDS.map((mod) => {
      const p = permissions?.[mod] || {};
      const acessar = Boolean(p.access);
      return {
        usuario_id: createdUser.id,
        modulo: mod,
        acessar,
        incluir: acessar && Boolean(p.create),
        editar: acessar && Boolean(p.edit),
        deletar: acessar && Boolean(p.delete),
        eliminado: false,
      };
    });

    // Remove eventuais permissões default criadas por trigger e insere matriz exata
    await db.from('permissoes_usuarios').delete().eq('usuario_id', createdUser.id);
    const { data: insertedPerms } = await db
      .from('permissoes_usuarios')
      .insert(permInserts)
      .select('id, usuario_id, modulo, acessar, incluir, editar, deletar, eliminado');

    await registrarAuditoria(db, {
      usuarioId: session.sub,
      modulo: 'usuarios',
      acao: 'create',
      tabelaAfetada: 'usuarios',
      registroId: createdUser.id,
      dadosNovos: { ...createdUser, permissions },
      ipEndereco: ip,
    });

    const userDto = mapUsuarioFromDb(createdUser, insertedPerms || permInserts);
    return NextResponse.json({ user: userDto }, { status: 201 });
  },
  'usuarios',
  'create'
);

