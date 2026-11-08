import { NextResponse } from 'next/server';
import { withAuthAndPermission } from '@/lib/auth';
import {
  sanitizePayload,
  getClientIp,
  registrarAuditoria,
  mapCompromissoFromDb,
} from '@/lib/supabase';

export const GET = withAuthAndPermission(
  async (_request, _context, { db }) => {
    const { data, error } = await db
      .from('compromissos_agenda')
      .select(
        'id, titulo, descricao, data_compromisso, hora_compromisso, projeto_id, empresa_id, responsavel_id, eliminado'
      )
      .eq('eliminado', false)
      .order('data_compromisso', { ascending: true })
      .order('hora_compromisso', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const appointments = (data || []).map((a) => mapCompromissoFromDb(a));
    return NextResponse.json({ appointments });
  },
  'agenda',
  'access'
);

export const POST = withAuthAndPermission(
  async (request, _context, { session, db }) => {
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

    const insertPayload = {
      titulo: title,
      descricao: description || null,
      data_compromisso: date,
      hora_compromisso: time,
      projeto_id: projectId || null,
      empresa_id: companyId || null,
      responsavel_id: userId || null,
      eliminado: false,
    };

    const { data: created, error } = await db
      .from('compromissos_agenda')
      .insert(insertPayload)
      .select(
        'id, titulo, descricao, data_compromisso, hora_compromisso, projeto_id, empresa_id, responsavel_id, eliminado'
      )
      .single();

    if (error || !created) {
      return NextResponse.json(
        { error: error?.message || 'Erro ao agendar compromisso.' },
        { status: 400 }
      );
    }

    await registrarAuditoria(db, {
      usuarioId: session.sub,
      modulo: 'agenda',
      acao: 'create',
      tabelaAfetada: 'compromissos_agenda',
      registroId: created.id,
      dadosNovos: created,
      ipEndereco: ip,
    });

    return NextResponse.json({ appointment: mapCompromissoFromDb(created) }, { status: 201 });
  },
  'agenda',
  'create'
);

