import { NextResponse } from 'next/server';
import { withAuthAndPermission } from '@/lib/auth';
import { sanitizePayload, getClientIp, registrarAuditoria } from '@/lib/supabase';

export const GET = withAuthAndPermission(
  async (_request, _context, { db }) => {
    const { data, error } = await db
      .from('etapas_kanban')
      .select('id, nome, ordem, cor_hex, exige_confirmacao_critica, eliminado')
      .eq('eliminado', false)
      .order('ordem', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      stages: (data || []).map((s) => s.nome),
      stageObjects: data || [],
    });
  },
  'kanban',
  'access'
);

export const POST = withAuthAndPermission(
  async (request, _context, { session, db }) => {
    const ip = getClientIp(request);
    const rawBody = await request.json();
    const body = sanitizePayload(rawBody);

    const nome = (body?.name || body?.nome || '').trim();
    if (!nome) {
      return NextResponse.json(
        { error: 'Informe o nome da nova etapa do Kanban.' },
        { status: 400 }
      );
    }

    const { data: allStages } = await db
      .from('etapas_kanban')
      .select('id, nome, ordem, eliminado')
      .order('ordem', { ascending: true });

    const existingActive = (allStages || []).find(
      (s) => !s.eliminado && s.nome.toLowerCase() === nome.toLowerCase()
    );
    if (existingActive) {
      return NextResponse.json(
        { error: 'Já existe uma etapa ativa com este nome no Kanban.' },
        { status: 400 }
      );
    }

    const maxOrder = (allStages || [])
      .filter((s) => !s.eliminado)
      .reduce((acc, cur) => Math.max(acc, Number(cur.ordem) || 0), 0);

    const existingDeleted = (allStages || []).find(
      (s) => s.eliminado && s.nome.toLowerCase() === nome.toLowerCase()
    );

    const exigeConfirmacao = ['Cancelado', 'Faturado', 'Concluído'].includes(nome);
    let stageObj = null;

    if (existingDeleted) {
      const { data: restored, error: rErr } = await db
        .from('etapas_kanban')
        .update({
          nome,
          ordem: maxOrder + 1,
          eliminado: false,
          exige_confirmacao_critica: exigeConfirmacao,
          atualizado_em: new Date().toISOString(),
        })
        .eq('id', existingDeleted.id)
        .select('id, nome, ordem, cor_hex, exige_confirmacao_critica')
        .single();

      if (rErr) {
        return NextResponse.json({ error: rErr.message }, { status: 400 });
      }
      stageObj = restored;
    } else {
      const { data: created, error: cErr } = await db
        .from('etapas_kanban')
        .insert({
          nome,
          ordem: maxOrder + 1,
          cor_hex: body?.cor_hex || '#22d3ee',
          exige_confirmacao_critica: exigeConfirmacao,
          eliminado: false,
        })
        .select('id, nome, ordem, cor_hex, exige_confirmacao_critica')
        .single();

      if (cErr) {
        return NextResponse.json({ error: cErr.message }, { status: 400 });
      }
      stageObj = created;
    }

    await registrarAuditoria(db, {
      usuarioId: session.sub,
      modulo: 'kanban',
      acao: 'create',
      tabelaAfetada: 'etapas_kanban',
      registroId: stageObj?.id,
      dadosNovos: stageObj,
      ipEndereco: ip,
    });

    return NextResponse.json({ stage: stageObj?.nome || nome, stageObject: stageObj }, { status: 201 });
  },
  'kanban',
  'create'
);

export const DELETE = withAuthAndPermission(
  async (request, _context, { session, db }) => {
    const ip = getClientIp(request);
    const { searchParams } = new URL(request.url);
    let nomeEtapa = searchParams.get('name') || searchParams.get('nome') || '';

    if (!nomeEtapa) {
      try {
        const body = await request.json();
        nomeEtapa = body?.name || body?.nome || body?.p_nome_etapa || '';
      } catch {
        // Sem body
      }
    }

    nomeEtapa = String(nomeEtapa || '').trim();
    if (!nomeEtapa) {
      return NextResponse.json(
        { error: 'Informe o nome da etapa a ser removida.' },
        { status: 400 }
      );
    }

    // 1. Tenta executar a RPC nativa do banco: rpc_remover_etapa_kanban
    const { data: rpcData, error: rpcErr } = await db.rpc('rpc_remover_etapa_kanban', {
      p_nome_etapa: nomeEtapa,
    });

    if (rpcErr) {
      // Fallback: move os projetos vinculados para a primeira etapa disponível e aplica Soft Delete
      const { data: activeStages } = await db
        .from('etapas_kanban')
        .select('id, nome, ordem')
        .eq('eliminado', false)
        .order('ordem', { ascending: true });

      const remaining = (activeStages || []).filter(
        (s) => s.nome.toLowerCase() !== nomeEtapa.toLowerCase()
      );
      if (remaining.length === 0) {
        return NextResponse.json(
          { error: 'O Kanban precisa manter pelo menos uma etapa ativa.' },
          { status: 400 }
        );
      }

      const fallback = remaining[0];
      const nowIso = new Date().toISOString();

      await db
        .from('projetos')
        .update({
          etapa_id: fallback.id,
          etapa_nome: fallback.nome,
          atualizado_em: nowIso,
        })
        .eq('etapa_nome', nomeEtapa)
        .eq('eliminado', false);

      const { error: delErr } = await db
        .from('etapas_kanban')
        .update({ eliminado: true, atualizado_em: nowIso })
        .eq('nome', nomeEtapa);

      if (delErr) {
        return NextResponse.json({ error: delErr.message || rpcErr.message }, { status: 400 });
      }
    }

    await registrarAuditoria(db, {
      usuarioId: session.sub,
      modulo: 'kanban',
      acao: 'delete',
      tabelaAfetada: 'etapas_kanban',
      dadosAnteriores: { nome: nomeEtapa },
      dadosNovos: rpcData || null,
      ipEndereco: ip,
    });

    return NextResponse.json({ success: true, removedStage: nomeEtapa, details: rpcData || null });
  },
  'kanban',
  'delete'
);

