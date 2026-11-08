import { NextResponse } from 'next/server';
import { withAuthAndPermission } from '@/lib/auth';
import {
  sanitizePayload,
  getClientIp,
  registrarAuditoria,
  mapTarefaFromDb,
} from '@/lib/supabase';

export const GET = withAuthAndPermission(
  async (_request, _context, { db }) => {
    const { data, error } = await db
      .from('tarefas')
      .select(
        'id, responsavel_id, descricao, data_tarefa, hora_tarefa, prioridade, observacoes, status, eliminado'
      )
      .eq('eliminado', false)
      .order('data_tarefa', { ascending: true })
      .order('hora_tarefa', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const tasks = (data || []).map((t) => mapTarefaFromDb(t));
    return NextResponse.json({ tasks });
  },
  'tasks',
  'access'
);

export const POST = withAuthAndPermission(
  async (request, _context, { session, db }) => {
    const ip = getClientIp(request);
    const rawBody = await request.json();
    const body = sanitizePayload(rawBody);

    const userId = body?.userId || body?.responsavel_id || session.sub;
    const description = (body?.description || body?.descricao || '').trim();
    const date = body?.date || body?.data_tarefa || '';
    const time = body?.time || body?.hora_tarefa || '';
    const priority = body?.priority || body?.prioridade || 'Média';
    const notes = body?.notes ?? body?.observacoes ?? '';
    const status = body?.status || 'pendente';

    if (!description || !userId || !date || !time) {
      return NextResponse.json(
        { error: 'Responsável, descrição, data e hora da task são obrigatórios.' },
        { status: 400 }
      );
    }

    const insertPayload = {
      responsavel_id: userId,
      descricao: description,
      data_tarefa: date,
      hora_tarefa: time,
      prioridade: priority,
      observacoes: notes || null,
      status,
      eliminado: false,
    };

    const { data: created, error } = await db
      .from('tarefas')
      .insert(insertPayload)
      .select(
        'id, responsavel_id, descricao, data_tarefa, hora_tarefa, prioridade, observacoes, status, eliminado'
      )
      .single();

    if (error || !created) {
      return NextResponse.json(
        { error: error?.message || 'Erro ao cadastrar task.' },
        { status: 400 }
      );
    }

    await registrarAuditoria(db, {
      usuarioId: session.sub,
      modulo: 'tasks',
      acao: 'create',
      tabelaAfetada: 'tarefas',
      registroId: created.id,
      dadosNovos: created,
      ipEndereco: ip,
    });

    return NextResponse.json({ task: mapTarefaFromDb(created) }, { status: 201 });
  },
  'tasks',
  'create'
);

