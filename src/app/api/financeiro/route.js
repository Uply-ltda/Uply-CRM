import { NextResponse } from 'next/server';
import { withAuthAndPermission } from '@/lib/auth';
import {
  sanitizePayload,
  getClientIp,
  registrarAuditoria,
  mapLancamentoFromDb,
  mapCategoriasFromDb,
} from '@/lib/supabase';

async function resolveCategoryAndSubcategoryIds(db, typeFin, catName, subcatName) {
  const catType = typeFin === 'receber' ? 'entrada' : 'saida';
  let categoriaId = null;
  let subcategoriaId = null;

  if (catName) {
    const { data: catRows } = await db
      .from('categorias_financeiras')
      .select('id, nome')
      .eq('tipo', catType)
      .ilike('nome', catName)
      .eq('eliminado', false)
      .limit(1);

    if (Array.isArray(catRows) && catRows.length > 0) {
      categoriaId = catRows[0].id;

      if (subcatName) {
        const { data: subRows } = await db
          .from('subcategorias_financeiras')
          .select('id, nome')
          .eq('categoria_id', categoriaId)
          .ilike('nome', subcatName)
          .eq('eliminado', false)
          .limit(1);
        if (Array.isArray(subRows) && subRows.length > 0) {
          subcategoriaId = subRows[0].id;
        }
      }
    }
  }

  return { categoriaId, subcategoriaId };
}

export const GET = withAuthAndPermission(
  async (_request, _context, { db }) => {
    const [finRes, catRes, subcatRes] = await Promise.all([
      db
        .from('lancamentos_financeiros')
        .select(
          'id, lote_parcelamento_id, numero_parcela, total_parcelas, tipo, categoria_id, subcategoria_id, categoria_nome, subcategoria_nome, empresa_id, descricao, observacoes, valor, data_vencimento, data_liquidacao, situacao, eliminado'
        )
        .eq('eliminado', false)
        .order('data_vencimento', { ascending: true }),
      db
        .from('categorias_financeiras')
        .select('id, tipo, nome, ativo, eliminado')
        .eq('eliminado', false)
        .order('nome', { ascending: true }),
      db
        .from('subcategorias_financeiras')
        .select('id, categoria_id, nome, ativo, eliminado')
        .eq('eliminado', false)
        .order('nome', { ascending: true }),
    ]);

    if (finRes.error) {
      return NextResponse.json({ error: finRes.error.message }, { status: 400 });
    }

    const finances = (finRes.data || []).map((f) => mapLancamentoFromDb(f));
    const categories = mapCategoriasFromDb(catRes.data || [], subcatRes.data || []);

    return NextResponse.json({ finances, categories });
  },
  'financeiro',
  'access'
);

export const POST = withAuthAndPermission(
  async (request, _context, { session, db }) => {
    const ip = getClientIp(request);
    const rawBody = await request.json();
    const body = sanitizePayload(rawBody);

    const type = body?.type || body?.tipo || 'receber';
    const categoryName = (body?.category || body?.categoria_nome || '').trim();
    const subcategoryName = (body?.subcategory || body?.subcategoria_nome || '').trim();
    const companyId = body?.companyId || body?.empresa_id || null;
    const description = (body?.description || body?.descricao || '').trim();
    const notes = body?.notes ?? body?.observacoes ?? '';
    const totalValue = Number(body?.value ?? body?.valor ?? 0);
    const dueDate = body?.dueDate || body?.data_vencimento || new Date().toISOString().split('T')[0];
    const status = body?.status || body?.situacao || 'pendente';

    if (!description || !companyId || totalValue <= 0) {
      return NextResponse.json(
        { error: 'Descrição, empresa relacionada e valor maior que R$ 0,00 são obrigatórios.' },
        { status: 400 }
      );
    }

    const { categoriaId, subcategoriaId } = await resolveCategoryAndSubcategoryIds(
      db,
      type,
      categoryName,
      subcategoryName
    );

    const generateInstallments = Boolean(body?.generateInstallments);
    const installments = Array.isArray(body?.installments) ? body.installments : [];

    // Caso 1: Lote de Parcelamento
    if (generateInstallments && installments.length > 1) {
      const rule = body?.installmentRule || body?.regra_repeticao || '15dias';
      const customInterval =
        rule === 'personalizada' ? Number(body?.customInterval || 1) : null;
      const customUnit =
        rule === 'personalizada' ? body?.customUnit || 'meses' : null;

      const { data: createdBatch, error: batchErr } = await db
        .from('lotes_parcelamento')
        .insert({
          tipo: type,
          empresa_id: companyId,
          descricao_base: description,
          valor_total: totalValue,
          quantidade_parcelas: installments.length,
          regra_repeticao: rule,
          intervalo_personalizado: customInterval,
          unidade_personalizada: customUnit,
          criado_por_usuario_id: session.sub,
          eliminado: false,
        })
        .select('id')
        .single();

      if (batchErr) {
        return NextResponse.json(
          { error: batchErr.message || 'Erro ao registrar lote de parcelamento.' },
          { status: 400 }
        );
      }

      const batchId = createdBatch?.id || null;
      const todayIso = new Date().toISOString().split('T')[0];

      const rowsToInsert = installments.map((inst, idx) => ({
        lote_parcelamento_id: batchId,
        numero_parcela: Number(inst.number || idx + 1),
        total_parcelas: installments.length,
        tipo: type,
        categoria_id: categoriaId,
        subcategoria_id: subcategoriaId,
        categoria_nome: categoryName,
        subcategoria_nome: subcategoryName || null,
        empresa_id: companyId,
        descricao: inst.description || `${description} (Parcela ${idx + 1}/${installments.length})`,
        observacoes: notes || null,
        valor: Number(inst.value || 0),
        data_vencimento: inst.dueDate || dueDate,
        data_liquidacao: status === 'pago' ? todayIso : null,
        situacao: status,
        eliminado: false,
      }));

      const { data: createdRows, error: rowsErr } = await db
        .from('lancamentos_financeiros')
        .insert(rowsToInsert)
        .select(
          'id, lote_parcelamento_id, numero_parcela, total_parcelas, tipo, categoria_id, subcategoria_id, categoria_nome, subcategoria_nome, empresa_id, descricao, observacoes, valor, data_vencimento, data_liquidacao, situacao, eliminado'
        );

      if (rowsErr || !createdRows) {
        return NextResponse.json(
          { error: rowsErr?.message || 'Erro ao gerar parcelas financeiras.' },
          { status: 400 }
        );
      }

      await registrarAuditoria(db, {
        usuarioId: session.sub,
        modulo: 'financeiro',
        acao: 'create',
        tabelaAfetada: 'lotes_parcelamento',
        registroId: batchId,
        dadosNovos: { batchId, count: createdRows.length, totalValue },
        ipEndereco: ip,
      });

      return NextResponse.json(
        {
          finances: createdRows.map((r) => mapLancamentoFromDb(r)),
          batchId,
        },
        { status: 201 }
      );
    }

    // Caso 2: Lançamento Único
    const todayIso = new Date().toISOString().split('T')[0];
    const singlePayload = {
      lote_parcelamento_id: null,
      numero_parcela: 1,
      total_parcelas: 1,
      tipo: type,
      categoria_id: categoriaId,
      subcategoria_id: subcategoriaId,
      categoria_nome: categoryName,
      subcategoria_nome: subcategoryName || null,
      empresa_id: companyId,
      descricao: description,
      observacoes: notes || null,
      valor: totalValue,
      data_vencimento: dueDate,
      data_liquidacao: status === 'pago' ? todayIso : null,
      situacao: status,
      eliminado: false,
    };

    const { data: createdSingle, error: singleErr } = await db
      .from('lancamentos_financeiros')
      .insert(singlePayload)
      .select(
        'id, lote_parcelamento_id, numero_parcela, total_parcelas, tipo, categoria_id, subcategoria_id, categoria_nome, subcategoria_nome, empresa_id, descricao, observacoes, valor, data_vencimento, data_liquidacao, situacao, eliminado'
      )
      .single();

    if (singleErr || !createdSingle) {
      return NextResponse.json(
        { error: singleErr?.message || 'Erro ao salvar lançamento financeiro.' },
        { status: 400 }
      );
    }

    await registrarAuditoria(db, {
      usuarioId: session.sub,
      modulo: 'financeiro',
      acao: 'create',
      tabelaAfetada: 'lancamentos_financeiros',
      registroId: createdSingle.id,
      dadosNovos: createdSingle,
      ipEndereco: ip,
    });

    return NextResponse.json(
      { finance: mapLancamentoFromDb(createdSingle) },
      { status: 201 }
    );
  },
  'financeiro',
  'create'
);

