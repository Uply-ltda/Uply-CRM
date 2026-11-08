import { NextResponse } from 'next/server';
import { withAuthAndPermission } from '@/lib/auth';
import {
  sanitizePayload,
  getClientIp,
  registrarAuditoria,
  mapCompromissoFromDb,
} from '@/lib/supabase';

async function handleUpdateAppointment(request, context, { session, db }) {
  const { id } = await context.params;
  const ip = getClientIp(request);
  const rawBody = await request.json();
  const body = sanitizePayload(rawBody);

  const title = (body?.title || body?.titulo || '').trim();
  const description = body?.description ?? body?.descricao ?? '';
  const date = body?.date || body?.data_compromisso || '';
  const time = body?.time || body?.hora_compromisso || '';
  const projectId = body?.projectId || body?.projeto_id || null;
  const companyId = body?.companyId || body?.empresa_id || null;
  const userId = body?.userId || body?.responsavel_id || session.sub;

  if (!title || !date || !time) {
    return NextResponse.json(
      { error: 'Título, data e horário do compromisso são obrigatórios.' },
      { status: 400 }
    );
  }

  const updateFields = {
    titulo: title,
    descricao: description || null,
    data_compromisso: date,
    hora_compromisso: time,
    projeto_id: projectId || null,
    empresa_id: companyId || null,
    responsavel_id: userId || null,
    atualizado_em: new Date().toISOString(),
  };

  const { data: updated, error } = await db
    .from('compromissos_agenda')
    .update(updateFields)
    .eq('id', id)
    .eq('eliminado', false)
    .select(
      'id, titulo, descricao, data_compromisso, hora_compromisso, projeto_id, empresa_id, responsavel_id, eliminado'
    )
    .single();

  if (error || !updated) {
    return NextResponse.json(
      { error: error?.message || 'Erro ao atualizar compromisso.' },
      { status: 400 }
    );
  }

  await registrarAuditoria(db, {
    usuarioId: session.sub,
    modulo: 'agenda',
    acao: 'edit',
    tabelaAfetada: 'compromissos_agenda',
    registroId: id,
    dadosNovos: updated,
    ipEndereco: ip,
  });

  return NextResponse.json({ appointment: mapCompromissoFromDb(updated) });
}

export const PUT = withAuthAndPermission(handleUpdateAppointment, 'agenda', 'edit');
export const PATCH = withAuthAndPermission(handleUpdateAppointment, 'agenda', 'edit');

export const DELETE = withAuthAndPermission(
  async (request, context, { session, db }) => {
    const { id } = await context.params;
    const ip = getClientIp(request);

    const { error } = await db
      .from('compromissos_agenda')
      .update({
        eliminado: true,
        atualizado_em: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Erro ao excluir compromisso.' },
        { status: 400 }
      );
    }

    await registrarAuditoria(db, {
      usuarioId: session.sub,
      modulo: 'agenda',
      acao: 'delete',
      tabelaAfetada: 'compromissos_agenda',
      registroId: id,
      ipEndereco: ip,
    });

    return NextResponse.json({ success: true });
  },
  'agenda',
  'delete'
);

