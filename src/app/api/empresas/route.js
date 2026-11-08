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

export const GET = withAuthAndPermission(
  async (_request, _context, { db }) => {
    const [empRes, respRes, prodRes, ramosRes] = await Promise.all([
      db
        .from('empresas')
        .select(
          'id, tipo_pessoa, documento, nome_razao_social, nome_fantasia, cep, logradouro, cidade, estado, ramo_atividade_id, ramo_atividade_nome, nome_responsavel_principal, email, telefone, possui_senha_salva, slug, chave_pix, categoria_despesa_padrao_id, categoria_despesa_padrao_nome, tipo_cadastro, tipo_origem_comercial, captado_por_usuario_id, captado_por_externo_nome, ativo, eliminado'
        )
        .eq('eliminado', false)
        .order('criado_em', { ascending: false }),
      db
        .from('empresas_responsaveis')
        .select('id, empresa_id, nome_responsavel, principal, ordem, eliminado')
        .eq('eliminado', false)
        .order('ordem', { ascending: true }),
      db
        .from('empresas_produtos_vinculados')
        .select('id, empresa_id, tipo_produto, descricao, eliminado')
        .eq('eliminado', false),
      db
        .from('ramos_atividade')
        .select('id, nome, eliminado')
        .eq('eliminado', false)
        .order('nome', { ascending: true }),
    ]);

    if (empRes.error) {
      return NextResponse.json({ error: empRes.error.message }, { status: 400 });
    }

    const companies = (empRes.data || []).map((e) =>
      mapEmpresaFromDb(e, respRes.data || [], prodRes.data || [])
    );
    const industries = (ramosRes.data || []).map((r) => r.nome);

    return NextResponse.json({ companies, industries });
  },
  'empresas',
  'access'
);

export const POST = withAuthAndPermission(
  async (request, _context, { session, db }) => {
    const ip = getClientIp(request);
    const rawBody = await request.json();
    const body = sanitizePayload(rawBody);

    // Suporte direto para criar apenas um novo ramo de atividade
    if (body?.action === 'create_industry') {
      const industryName = (body?.name || body?.nome || '').trim();
      if (!industryName) {
        return NextResponse.json(
          { error: 'Informe o nome do ramo de atividade.' },
          { status: 400 }
        );
      }

      const { data: existingRamo } = await db
        .from('ramos_atividade')
        .select('id, nome, eliminado')
        .ilike('nome', industryName)
        .limit(1);

      let ramoRow = null;
      if (Array.isArray(existingRamo) && existingRamo.length > 0) {
        const found = existingRamo[0];
        if (found.eliminado) {
          const { data: restored } = await db
            .from('ramos_atividade')
            .update({ eliminado: false, nome: industryName, atualizado_em: new Date().toISOString() })
            .eq('id', found.id)
            .select('id, nome')
            .single();
          ramoRow = restored;
        } else {
          ramoRow = found;
        }
      } else {
        const { data: created, error: rErr } = await db
          .from('ramos_atividade')
          .insert({ nome: industryName, eliminado: false })
          .select('id, nome')
          .single();

        if (rErr) {
          return NextResponse.json({ error: rErr.message }, { status: 400 });
        }
        ramoRow = created;
      }

      return NextResponse.json({ industry: ramoRow?.nome || industryName, industryObject: ramoRow }, { status: 201 });
    }

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

    // Resolve ou cria ramo_atividade
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

    // Resolve categoria_despesa_padrao_id se existir pelo nome
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

    const rawPortalPassword = body?.initialPassword || body?.senha_portal || '';
    const senhaPortalHash = rawPortalPassword.trim()
      ? await bcrypt.hash(rawPortalPassword.trim(), 10)
      : null;

    const baseSlug = createSlug(body?.slug || tradeName || name) || `empresa-${Date.now()}`;
    const acquiredByType = body?.acquiredByType || body?.tipo_origem_comercial || 'user';
    const acquiredByUserId =
      acquiredByType === 'user' && (body?.acquiredByUserId || body?.captado_por_usuario_id)
        ? body.acquiredByUserId || body.captado_por_usuario_id
        : null;

    const insertCompany = {
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
      senha_portal_hash: senhaPortalHash,
      possui_senha_salva: Boolean(senhaPortalHash),
      slug: baseSlug,
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
      ativo: true,
      eliminado: false,
    };

    const { data: createdCompany, error: compErr } = await db
      .from('empresas')
      .insert(insertCompany)
      .select(
        'id, tipo_pessoa, documento, nome_razao_social, nome_fantasia, cep, logradouro, cidade, estado, ramo_atividade_id, ramo_atividade_nome, nome_responsavel_principal, email, telefone, possui_senha_salva, slug, chave_pix, categoria_despesa_padrao_id, categoria_despesa_padrao_nome, tipo_cadastro, tipo_origem_comercial, captado_por_usuario_id, captado_por_externo_nome, ativo, eliminado'
      )
      .single();

    if (compErr || !createdCompany) {
      return NextResponse.json(
        { error: compErr?.message || 'Erro ao cadastrar empresa.' },
        { status: 400 }
      );
    }

    // Sincroniza empresas_responsaveis
    let insertedResps = [];
    if (cleanedResponsibles.length > 0) {
      const respPayloads = cleanedResponsibles.map((respName, idx) => ({
        empresa_id: createdCompany.id,
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

    // Sincroniza empresas_produtos_vinculados
    const linkedProducts = Array.isArray(body?.linkedProducts) ? body.linkedProducts : [];
    let insertedProds = [];
    if (linkedProducts.length > 0) {
      const prodPayloads = linkedProducts
        .filter((lp) => lp && (lp.type || lp.tipo_produto || lp.description || lp.descricao))
        .map((lp) => ({
          empresa_id: createdCompany.id,
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
      acao: 'create',
      tabelaAfetada: 'empresas',
      registroId: createdCompany.id,
      dadosNovos: createdCompany,
      ipEndereco: ip,
    });

    const companyDto = mapEmpresaFromDb(createdCompany, insertedResps, insertedProds);
    return NextResponse.json({ company: companyDto }, { status: 201 });
  },
  'empresas',
  'create'
);

