import { NextResponse } from 'next/server';
import { withAuthAndPermission } from '@/lib/auth';
import {
  sanitizePayload,
  getClientIp,
  registrarAuditoria,
  mapCategoriasFromDb,
} from '@/lib/supabase';

export const GET = withAuthAndPermission(
  async (_request, _context, { db }) => {
    const [catRes, subcatRes] = await Promise.all([
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

    if (catRes.error) {
      return NextResponse.json({ error: catRes.error.message }, { status: 400 });
    }

    const categories = mapCategoriasFromDb(catRes.data || [], subcatRes.data || []);
    return NextResponse.json({ categories });
  },
  'financeiro',
  'access'
);

export const POST = withAuthAndPermission(
  async (request, _context, { session, db }) => {
    const ip = getClientIp(request);
    const rawBody = await request.json();
    const body = sanitizePayload(rawBody);

    // Inclusão de subcategoria em uma categoria existente
    if (body?.action === 'create_subcategory' || body?.categoryId || body?.categoria_id) {
      const categoryId = body?.categoryId || body?.categoria_id;
      const subName = (body?.name || body?.nome || '').trim();

      if (!categoryId || !subName) {
        return NextResponse.json(
          { error: 'Categoria pai e nome da subcategoria são obrigatórios.' },
          { status: 400 }
        );
      }

      const { data: createdSub, error: subErr } = await db
        .from('subcategorias_financeiras')
        .insert({
          categoria_id: categoryId,
          nome: subName,
          ativo: true,
          eliminado: false,
        })
        .select('id, categoria_id, nome, ativo, eliminado')
        .single();

      if (subErr || !createdSub) {
        return NextResponse.json(
          { error: subErr?.message || 'Erro ao adicionar subcategoria.' },
          { status: 400 }
        );
      }

      await registrarAuditoria(db, {
        usuarioId: session.sub,
        modulo: 'financeiro',
        acao: 'create',
        tabelaAfetada: 'subcategorias_financeiras',
        registroId: createdSub.id,
        dadosNovos: createdSub,
        ipEndereco: ip,
      });

      return NextResponse.json({ subcategory: createdSub }, { status: 201 });
    }

    // Inclusão de nova categoria principal ('entrada' | 'saida')
    const tipo = body?.type || body?.tipo || 'entrada';
    const nome = (body?.name || body?.nome || '').trim();

    if (!nome || !['entrada', 'saida'].includes(tipo)) {
      return NextResponse.json(
        { error: 'Informe um tipo válido ("entrada" ou "saida") e o nome da categoria.' },
        { status: 400 }
      );
    }

    const { data: createdCat, error: catErr } = await db
      .from('categorias_financeiras')
      .insert({
        tipo,
        nome,
        ativo: true,
        eliminado: false,
      })
      .select('id, tipo, nome, ativo, eliminado')
      .single();

    if (catErr || !createdCat) {
      return NextResponse.json(
        { error: catErr?.message || 'Erro ao cadastrar categoria financeira.' },
        { status: 400 }
      );
    }

    // Insere subcategoria padrão 'Geral'
    const defaultSubName = 'Geral';
    await db.from('subcategorias_financeiras').insert({
      categoria_id: createdCat.id,
      nome: defaultSubName,
      ativo: true,
      eliminado: false,
    });

    await registrarAuditoria(db, {
      usuarioId: session.sub,
      modulo: 'financeiro',
      acao: 'create',
      tabelaAfetada: 'categorias_financeiras',
      registroId: createdCat.id,
      dadosNovos: createdCat,
      ipEndereco: ip,
    });

    return NextResponse.json(
      {
        category: {
          id: createdCat.id,
          name: createdCat.nome,
          type: createdCat.tipo,
          subcategories: [defaultSubName],
        },
      },
      { status: 201 }
    );
  },
  'financeiro',
  'create'
);

