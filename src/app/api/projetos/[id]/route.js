import { NextResponse } from 'next/server';
import { withAuthAndPermission } from '@/lib/auth';
import {
  sanitizePayload,
  getClientIp,
  registrarAuditoria,
  mapProjetoFromDb,
} from '@/lib/supabase';

async function handleUpdateProject(request, context, { session, db }) {
  const { id } = await context.params;
  const ip = getClientIp(request);
  const rawBody = await request.json();
  const body = sanitizePayload(rawBody);

  const updateFields = {
    atualizado_em: new Date().toISOString(),
  };

  if (body?.name !== undefined || body?.nome !== undefined) {
    updateFields.nome = (body.name ?? body.nome ?? '').trim();
  }
  if (body?.companyId !== undefined || body?.empresa_id !== undefined) {
    updateFields.empresa_id = body.companyId || body.empresa_id || null;
  }
  if (body?.responsibleId !== undefined || body?.responsavel_id !== undefined) {
    updateFields.responsavel_id = body.responsibleId || body.responsavel_id || null;
  }
  if (body?.deadline !== undefined || body?.prazo_estimado !== undefined) {
    updateFields.prazo_estimado = body.deadline || body.prazo_estimado || null;
  }
  if (body?.value !== undefined || body?.valor !== undefined) {
    updateFields.valor = Number(body.value ?? body.valor ?? 0);
  }
  if (body?.description !== undefined || body?.descricao_escopo !== undefined) {
    updateFields.descricao_escopo = body.description ?? body.descricao_escopo ?? null;
  }

  if (body?.stage !== undefined || body?.etapa_nome !== undefined) {
    const stageName = (body.stage ?? body.etapa_nome ?? '').trim();
    updateFields.etapa_nome = stageName;

    const { data: stageRows } = await db
      .from('etapas_kanban')
      .select('id, nome')
      .ilike('nome', stageName)
      .eq('eliminado', false)
      .limit(1);
    if (Array.isArray(stageRows) && stageRows.length > 0) {
      updateFields.etapa_id = stageRows[0].id;
    }
  }

  const { data: updated, error } = await db
    .from('projetos')
    .update(updateFields)
    .eq('id', id)
    .eq('eliminado', false)
    .select(
      'id, nome, empresa_id, responsavel_id, etapa_id, etapa_nome, prazo_estimado, valor, descricao_escopo, eliminado'
    )
    .single();

  if (error || !updated) {
    return NextResponse.json(
      { error: error?.message || 'Erro ao atualizar projeto.' },
      { status: 400 }
    );
  }

  await registrarAuditoria(db, {
    usuarioId: session.sub,
    modulo: 'kanban',
    acao: 'edit',
    tabelaAfetada: 'projetos',
    registroId: id,
    dadosNovos: updated,
    ipEndereco: ip,
  });

  return NextResponse.json({ project: mapProjetoFromDb(updated) });
}

export const PUT = withAuthAndPermission(handleUpdateProject, 'kanban', 'edit');
export const PATCH = withAuthAndPermission(handleUpdateProject, 'kanban', 'edit');

export const DELETE = withAuthAndPermission(
  async (request, context, { session, db }) => {
    const { id } = await context.params;
    const ip = getClientIp(request);

    const { error } = await db
      .from('projetos')
      .update({
        eliminado: true,
        atualizado_em: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Erro ao excluir projeto.' },
        { status: 400 }
      );
    }

    await registrarAuditoria(db, {
      usuarioId: session.sub,
      modulo: 'kanban',
      acao: 'delete',
      tabelaAfetada: 'projetos',
      registroId: id,
      ipEndereco: ip,
    });

    return NextResponse.json({ success: true });
  },
  'kanban',
  'delete'
);

