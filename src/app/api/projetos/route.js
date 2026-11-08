import { NextResponse } from 'next/server';
import { withAuthAndPermission } from '@/lib/auth';
import {
  sanitizePayload,
  getClientIp,
  registrarAuditoria,
  mapProjetoFromDb,
} from '@/lib/supabase';

export const GET = withAuthAndPermission(
  async (_request, _context, { db }) => {
    const { data, error } = await db
      .from('projetos')
      .select(
        'id, nome, empresa_id, responsavel_id, etapa_id, etapa_nome, prazo_estimado, valor, descricao_escopo, eliminado'
      )
      .eq('eliminado', false)
      .order('criado_em', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const projects = (data || []).map((p) => mapProjetoFromDb(p));
    return NextResponse.json({ projects });
  },
  'kanban',
  'access'
);

export const POST = withAuthAndPermission(
  async (request, _context, { session, db }) => {
    const ip = getClientIp(request);
    const rawBody = await request.json();
    const body = sanitizePayload(rawBody);

    const name = (body?.name || body?.nome || '').trim();
    const companyId = body?.companyId || body?.empresa_id || null;
    const responsibleId = body?.responsibleId || body?.responsavel_id || null;
    const stageName = (body?.stage || body?.etapa_nome || 'Projeção').trim();
    const deadline = body?.deadline || body?.prazo_estimado || null;
    const value = Number(body?.value ?? body?.valor ?? 0);
    const description = body?.description ?? body?.descricao_escopo ?? '';

    if (!name || !companyId || !responsibleId) {
      return NextResponse.json(
        { error: 'Nome do projeto, cliente e responsável são obrigatórios.' },
        { status: 400 }
      );
    }

    let stageId = body?.stageId || body?.etapa_id || null;
    if (stageName && !stageId) {
      const { data: stageRows } = await db
        .from('etapas_kanban')
        .select('id, nome')
        .ilike('nome', stageName)
        .eq('eliminado', false)
        .limit(1);
      if (Array.isArray(stageRows) && stageRows.length > 0) {
        stageId = stageRows[0].id;
      }
    }

    const insertPayload = {
      nome: name,
      empresa_id: companyId,
      responsavel_id: responsibleId,
      etapa_id: stageId,
      etapa_nome: stageName,
      prazo_estimado: deadline || null,
      valor: value,
      descricao_escopo: description || null,
      eliminado: false,
    };

    const { data: created, error } = await db
      .from('projetos')
      .insert(insertPayload)
      .select(
        'id, nome, empresa_id, responsavel_id, etapa_id, etapa_nome, prazo_estimado, valor, descricao_escopo, eliminado'
      )
      .single();

    if (error || !created) {
      return NextResponse.json(
        { error: error?.message || 'Erro ao cadastrar projeto no Kanban.' },
        { status: 400 }
      );
    }

    await registrarAuditoria(db, {
      usuarioId: session.sub,
      modulo: 'kanban',
      acao: 'create',
      tabelaAfetada: 'projetos',
      registroId: created.id,
      dadosNovos: created,
      ipEndereco: ip,
    });

    return NextResponse.json({ project: mapProjetoFromDb(created) }, { status: 201 });
  },
  'kanban',
  'create'
);

