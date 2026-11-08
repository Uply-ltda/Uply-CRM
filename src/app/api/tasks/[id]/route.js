import { NextResponse } from 'next/server';
import { withAuthAndPermission } from '@/lib/auth';
import {
  sanitizePayload,
  getClientIp,
  registrarAuditoria,
  mapTarefaFromDb,
} from '@/lib/supabase';

async function handleUpdateTask(request, context, { session, db }) {
  const { id } = await context.params;
  const ip = getClientIp(request);
  const rawBody = await request.json();
  const body = sanitizePayload(rawBody);

  const updateFields = {
    atualizado_em: new Date().toISOString(),
  };

  if (body?.userId !== undefined || body?.responsavel_id !== undefined) {
    updateFields.responsavel_id = body.userId || body.responsavel_id;
  }
  if (body?.description !== undefined || body?.descricao !== undefined) {
    updateFields.descricao = (body.description ?? body.descricao ?? '').trim();
  }
  if (body?.date !== undefined || body?.data_tarefa !== undefined) {
    updateFields.data_tarefa = body.date || body.data_tarefa;
  }
  if (body?.time !== undefined || body?.hora_tarefa !== undefined) {
    updateFields.hora_tarefa = body.time || body.hora_tarefa;
  }
  if (body?.priority !== undefined || body?.prioridade !== undefined) {
    updateFields.prioridade = body.priority || body.prioridade;
  }
  if (body?.notes !== undefined || body?.observacoes !== undefined) {
    updateFields.observacoes = body.notes ?? body.observacoes ?? null;
  }
  if (body?.status !== undefined) {
    updateFields.status = body.status;
  }

  const { data: updated, error } = await db
    .from('tarefas')
    .update(updateFields)
    .eq('id', id)
    .eq('eliminado', false)
    .select(
      'id, responsavel_id, descricao, data_tarefa, hora_tarefa, prioridade, observacoes, status, eliminado'
    )
    .single();

  if (error || !updated) {
    return NextResponse.json(
      { error: error?.message || 'Erro ao atualizar task.' },
      { status: 400 }
    );
  }

  await registrarAuditoria(db, {
    usuarioId: session.sub,
    modulo: 'tasks',
    acao: 'edit',
    tabelaAfetada: 'tarefas',
    registroId: id,
    dadosNovos: updated,
    ipEndereco: ip,
  });

  return NextResponse.json({ task: mapTarefaFromDb(updated) });
}

export const PUT = withAuthAndPermission(handleUpdateTask, 'tasks', 'edit');
export const PATCH = withAuthAndPermission(handleUpdateTask, 'tasks', 'edit');

export const DELETE = withAuthAndPermission(
  async (request, context, { session, db }) => {
    const { id } = await context.params;
    const ip = getClientIp(request);

    const { error } = await db
      .from('tarefas')
      .update({
        eliminado: true,
        atualizado_em: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Erro ao excluir task.' },
        { status: 400 }
      );
    }

    await registrarAuditoria(db, {
      usuarioId: session.sub,
      modulo: 'tasks',
      acao: 'delete',
      tabelaAfetada: 'tarefas',
      registroId: id,
      ipEndereco: ip,
    });

    return NextResponse.json({ success: true });
  },
  'tasks',
  'delete'
);

