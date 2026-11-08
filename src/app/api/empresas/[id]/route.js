import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { withAuthAndPermission } from '@/lib/auth';
import {
  sanitizePayload,
  getClientIp,
  registrarAuditoria,
  mapEmpresaFromDb,
} from '@/lib/supabase';

function createSlug(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

async function handleUpdateCompany(request, context, { session, db }) {
  const { id } = await context.params;
  const ip = getClientIp(request);
  const rawBody = await request.json();
  const body = sanitizePayload(rawBody);

  const personType = body?.personType || body?.tipo_pessoa || 'CNPJ';
  const document = (body?.document || body?.documento || '').trim();
  const name = (body?.name || body?.nome_razao_social || '').trim();
  const tradeName = (body?.tradeName || body?.nome_fantasia || '').trim();
  const email = (body?.email || '').trim();

  if (!name || !document || !email) {
    return NextResponse.json(
      { error: 'CPF/CNPJ, Nome/Razão Social e E-mail são obrigatórios.' },
      { status: 400 }
    );
  }

  const industryName = (body?.industry || body?.ramo_atividade_nome || '').trim();
  let industryId = body?.industryId || body?.ramo_atividade_id || null;
  if (industryName && !industryId) {
    const { data: foundRamo } = await db
      .from('ramos_atividade')
      .select('id, nome')
      .ilike('nome', industryName)
      .eq('eliminado', false)
      .limit(1);

    if (Array.isArray(foundRamo) && foundRamo.length > 0) {
      industryId = foundRamo[0].id;
    } else {
      const { data: newRamo } = await db
        .from('ramos_atividade')
        .insert({ nome: industryName, eliminado: false })
        .select('id, nome')
        .single();
      if (newRamo) industryId = newRamo.id;
    }
  }

  const defaultExpCatName = (
    body?.defaultExpenseCategory ||
    body?.categoria_despesa_padrao_nome ||
    ''
  ).trim();
  let defaultExpCatId = body?.defaultExpenseCategoryId || body?.categoria_despesa_padrao_id || null;
  if (defaultExpCatName && !defaultExpCatId) {
    const { data: foundCat } = await db
      .from('categorias_financeiras')
      .select('id')
      .eq('tipo', 'saida')
      .ilike('nome', defaultExpCatName)
      .eq('eliminado', false)
      .limit(1);
    if (Array.isArray(foundCat) && foundCat.length > 0) {
      defaultExpCatId = foundCat[0].id;
    }
  }

  const cleanedResponsibles = Array.isArray(body?.responsibles)
    ? body.responsibles.map((r) => String(r).trim()).filter(Boolean)
    : [];
  const primaryResp =
    cleanedResponsibles[0] ||
    (body?.responsibleName || body?.nome_responsavel_principal || '').trim();

  if (primaryResp && cleanedResponsibles.length === 0) {
    cleanedResponsibles.push(primaryResp);
  }

  const acquiredByType = body?.acquiredByType || body?.tipo_origem_comercial || 'user';
  const acquiredByUserId =
    acquiredByType === 'user' && (body?.acquiredByUserId || body?.captado_por_usuario_id)
      ? body.acquiredByUserId || body.captado_por_usuario_id
      : null;

  const nowIso = new Date().toISOString();
  const updateFields = {
    tipo_pessoa: personType,
    documento: document,
    nome_razao_social: name,
    nome_fantasia: tradeName || null,
    cep: body?.cep || null,
    logradouro: body?.street || body?.logradouro || null,
    cidade: body?.city || body?.cidade || null,
    estado: body?.state || body?.estado || null,
    ramo_atividade_id: industryId,
    ramo_atividade_nome: industryName || null,
    nome_responsavel_principal: primaryResp || null,
    email,
    telefone: body?.phone || body?.telefone || null,
    slug: createSlug(body?.slug || tradeName || name) || `empresa-${id.slice(0, 6)}`,
    chave_pix: body?.pixKey || body?.chave_pix || null,
    categoria_despesa_padrao_id: defaultExpCatId,
    categoria_despesa_padrao_nome: defaultExpCatName || null,
    tipo_cadastro: body?.registrationType || body?.tipo_cadastro || 'Cliente',
    tipo_origem_comercial: acquiredByType,
    captado_por_usuario_id: acquiredByUserId,
    captado_por_externo_nome:
      acquiredByType === 'external'
        ? body?.acquiredByExternalName || body?.captado_por_externo_nome || null
        : null,
    atualizado_em: nowIso,
  };

  const rawPortalPassword = body?.initialPassword || body?.senha_portal || '';
  if (rawPortalPassword && rawPortalPassword.trim().length > 0) {
    updateFields.senha_portal_hash = await bcrypt.hash(rawPortalPassword.trim(), 10);
    updateFields.possui_senha_salva = true;
  }

  const { data: updatedCompany, error: compErr } = await db
    .from('empresas')
    .update(updateFields)
    .eq('id', id)
    .eq('eliminado', false)
    .select(
      'id, tipo_pessoa, documento, nome_razao_social, nome_fantasia, cep, logradouro, cidade, estado, ramo_atividade_id, ramo_atividade_nome, nome_responsavel_principal, email, telefone, possui_senha_salva, slug, chave_pix, categoria_despesa_padrao_id, categoria_despesa_padrao_nome, tipo_cadastro, tipo_origem_comercial, captado_por_usuario_id, captado_por_externo_nome, ativo, eliminado'
    )
    .single();

  if (compErr || !updatedCompany) {
    return NextResponse.json(
      { error: compErr?.message || 'Erro ao atualizar cadastro da empresa.' },
      { status: 400 }
    );
  }

  // Sincronização limpa de empresas_responsaveis (soft-delete dos antigos + inserção dos atuais)
  await db
    .from('empresas_responsaveis')
    .update({ eliminado: true, atualizado_em: nowIso })
    .eq('empresa_id', id)
    .eq('eliminado', false);

  let insertedResps = [];
  if (cleanedResponsibles.length > 0) {
    const respPayloads = cleanedResponsibles.map((respName, idx) => ({
      empresa_id: id,
      nome_responsavel: respName,
      principal: idx === 0,
      ordem: idx + 1,
      eliminado: false,
    }));
    const { data: rData } = await db
      .from('empresas_responsaveis')
      .insert(respPayloads)
      .select('id, empresa_id, nome_responsavel, principal, ordem, eliminado');
    insertedResps = rData || respPayloads;
  }

  // Sincronização limpa de empresas_produtos_vinculados (soft-delete dos antigos + inserção dos atuais)
  await db
    .from('empresas_produtos_vinculados')
    .update({ eliminado: true, atualizado_em: nowIso })
    .eq('empresa_id', id)
    .eq('eliminado', false);

  const linkedProducts = Array.isArray(body?.linkedProducts) ? body.linkedProducts : [];
  let insertedProds = [];
  if (linkedProducts.length > 0) {
    const prodPayloads = linkedProducts
      .filter((lp) => lp && (lp.type || lp.tipo_produto || lp.description || lp.descricao))
      .map((lp) => ({
        empresa_id: id,
        tipo_produto: lp.type || lp.tipo_produto || 'Sistema',
        descricao: lp.description || lp.descricao || '',
        eliminado: false,
      }));
    if (prodPayloads.length > 0) {
      const { data: pData } = await db
        .from('empresas_produtos_vinculados')
        .insert(prodPayloads)
        .select('id, empresa_id, tipo_produto, descricao, eliminado');
      insertedProds = pData || prodPayloads;
    }
  }

  await registrarAuditoria(db, {
    usuarioId: session.sub,
    modulo: 'empresas',
    acao: 'edit',
    tabelaAfetada: 'empresas',
    registroId: id,
    dadosNovos: updatedCompany,
    ipEndereco: ip,
  });

  const companyDto = mapEmpresaFromDb(updatedCompany, insertedResps, insertedProds);
  return NextResponse.json({ company: companyDto });
}

export const PUT = withAuthAndPermission(handleUpdateCompany, 'empresas', 'edit');
export const PATCH = withAuthAndPermission(handleUpdateCompany, 'empresas', 'edit');

export const DELETE = withAuthAndPermission(
  async (request, context, { session, db }) => {
    const { id } = await context.params;
    const ip = getClientIp(request);
    const nowIso = new Date().toISOString();

    const { error } = await db
      .from('empresas')
      .update({
        eliminado: true,
        ativo: false,
        atualizado_em: nowIso,
      })
      .eq('id', id);

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Erro ao excluir empresa.' },
        { status: 400 }
      );
    }

    await Promise.all([
      db
        .from('empresas_responsaveis')
        .update({ eliminado: true, atualizado_em: nowIso })
        .eq('empresa_id', id),
      db
        .from('empresas_produtos_vinculados')
        .update({ eliminado: true, atualizado_em: nowIso })
        .eq('empresa_id', id),
    ]);

    await registrarAuditoria(db, {
      usuarioId: session.sub,
      modulo: 'empresas',
      acao: 'delete',
      tabelaAfetada: 'empresas',
      registroId: id,
      ipEndereco: ip,
    });

    return NextResponse.json({ success: true });
  },
  'empresas',
  'delete'
);

