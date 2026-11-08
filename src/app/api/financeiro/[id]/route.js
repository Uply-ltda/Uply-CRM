import { NextResponse } from 'next/server';
import { withAuthAndPermission } from '@/lib/auth';
import {
  sanitizePayload,
  getClientIp,
  registrarAuditoria,
  mapLancamentoFromDb,
} from '@/lib/supabase';

async function handleUpdateFinance(request, context, { session, db }) {
  const { id } = await context.params;
  const ip = getClientIp(request);
  const rawBody = await request.json();
  const body = sanitizePayload(rawBody);

  const type = body?.type || body?.tipo || 'receber';
  const categoryName = (body?.category || body?.categoria_nome || '').trim();
  const subcategoryName = (body?.subcategory || body?.subcategoria_nome || '').trim();
  const companyId = body?.companyId || body?.empresa_id || null;
  const description = (body?.description || body?.descricao || '').trim();
  const notes = body?.notes ?? body?.observacoes ?? '';
  const value = Number(body?.value ?? body?.valor ?? 0);
  const dueDate = body?.dueDate || body?.data_vencimento || '';
  const status = body?.status || body?.situacao || 'pendente';

  if (!description || !companyId || value <= 0) {
    return NextResponse.json(
      { error: 'Descrição, empresa relacionada e valor maior que R$ 0,00 são obrigatórios.' },
      { status: 400 }
    );
  }

  const catType = type === 'receber' ? 'entrada' : 'saida';
  let categoriaId = null;
  let subcategoriaId = null;

  if (categoryName) {
    const { data: catRows } = await db
      .from('categorias_financeiras')
      .select('id, nome')
      .eq('tipo', catType)
      .ilike('nome', categoryName)
      .eq('eliminado', false)
      .limit(1);

    if (Array.isArray(catRows) && catRows.length > 0) {
      categoriaId = catRows[0].id;
      if (subcategoryName) {
        const { data: subRows } = await db
          .from('subcategorias_financeiras')
          .select('id, nome')
          .eq('categoria_id', categoriaId)
          .ilike('nome', subcategoryName)
          .eq('eliminado', false)
          .limit(1);
        if (Array.isArray(subRows) && subRows.length > 0) {
          subcategoriaId = subRows[0].id;
        }
      }
    }
  }

  const todayIso = new Date().toISOString().split('T')[0];
  const updateFields = {
    tipo: type,
    categoria_id: categoriaId,
    subcategoria_id: subcategoriaId,
    categoria_nome: categoryName,
    subcategoria_nome: subcategoryName || null,
    empresa_id: companyId,
    descricao: description,
    observacoes: notes || null,
    valor: value,
    data_vencimento: dueDate,
    data_liquidacao: status === 'pago' ? body?.paidAt || todayIso : null,
    situacao: status,
    atualizado_em: new Date().toISOString(),
  };

  const { data: updated, error } = await db
    .from('lancamentos_financeiros')
    .update(updateFields)
    .eq('id', id)
    .eq('eliminado', false)
    .select(
      'id, lote_parcelamento_id, numero_parcela, total_parcelas, tipo, categoria_id, subcategoria_id, categoria_nome, subcategoria_nome, empresa_id, descricao, observacoes, valor, data_vencimento, data_liquidacao, situacao, eliminado'
    )
    .single();

  if (error || !updated) {
    return NextResponse.json(
      { error: error?.message || 'Erro ao atualizar lançamento financeiro.' },
      { status: 400 }
    );
  }

  await registrarAuditoria(db, {
    usuarioId: session.sub,
    modulo: 'financeiro',
    acao: 'edit',
    tabelaAfetada: 'lancamentos_financeiros',
    registroId: id,
    dadosNovos: updated,
    ipEndereco: ip,
  });

  return NextResponse.json({ finance: mapLancamentoFromDb(updated) });
}

export const PUT = withAuthAndPermission(handleUpdateFinance, 'financeiro', 'edit');
export const PATCH = withAuthAndPermission(handleUpdateFinance, 'financeiro', 'edit');

export const DELETE = withAuthAndPermission(
  async (request, context, { session, db }) => {
    const { id } = await context.params;
    const ip = getClientIp(request);

    const { error } = await db
      .from('lancamentos_financeiros')
      .update({
        eliminado: true,
        atualizado_em: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Erro ao excluir lançamento financeiro.' },
        { status: 400 }
      );
    }

    await registrarAuditoria(db, {
      usuarioId: session.sub,
      modulo: 'financeiro',
      acao: 'delete',
      tabelaAfetada: 'lancamentos_financeiros',
      registroId: id,
      ipEndereco: ip,
    });

    return NextResponse.json({ success: true });
  },
  'financeiro',
  'delete'
);

