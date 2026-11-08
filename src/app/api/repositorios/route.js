import { NextResponse } from 'next/server';
import { withAuthAndPermission } from '@/lib/auth';
import {
  sanitizePayload,
  getClientIp,
  registrarAuditoria,
  mapRepositorioFromDb,
} from '@/lib/supabase';

export const GET = withAuthAndPermission(
  async (_request, _context, { db }) => {
    const [reposRes, filesRes] = await Promise.all([
      db
        .from('repositorios_github')
        .select(
          'id, projeto_id, nome_repositorio, url_repositorio, versao_release, descricao, observacoes, eliminado'
        )
        .eq('eliminado', false)
        .order('criado_em', { ascending: false }),
      db
        .from('arquivos_repositorio')
        .select('id, repositorio_id, titulo, url_arquivo, ordem, eliminado')
        .eq('eliminado', false)
        .order('ordem', { ascending: true }),
    ]);

    if (reposRes.error) {
      return NextResponse.json({ error: reposRes.error.message }, { status: 400 });
    }

    const files = filesRes.data || [];
    const repos = (reposRes.data || []).map((r) => mapRepositorioFromDb(r, files));

    return NextResponse.json({ repos });
  },
  'arquivos',
  'access'
);

export const POST = withAuthAndPermission(
  async (request, _context, { session, db }) => {
    const ip = getClientIp(request);
    const rawBody = await request.json();
    const body = sanitizePayload(rawBody);

    const projectId = body?.projectId || body?.projeto_id || null;
    const repoName = (body?.repoName || body?.nome_repositorio || '').trim();
    const repoUrl = (body?.repoUrl || body?.url_repositorio || '').trim();
    const version = (body?.version || body?.versao_release || 'v1.0.0').trim();
    const description = body?.description ?? body?.descricao ?? '';
    const notes = body?.notes ?? body?.observacoes ?? '';
    const files = Array.isArray(body?.files) ? body.files : [];

    if (!repoName || !repoUrl) {
      return NextResponse.json(
        { error: 'O nome e a URL do repositório no GitHub são obrigatórios.' },
        { status: 400 }
      );
    }

    const { data: createdRepo, error: repoErr } = await db
      .from('repositorios_github')
      .insert({
        projeto_id: projectId || null,
        nome_repositorio: repoName,
        url_repositorio: repoUrl,
        versao_release: version || 'v1.0.0',
        descricao: description || null,
        observacoes: notes || null,
        eliminado: false,
      })
      .select(
        'id, projeto_id, nome_repositorio, url_repositorio, versao_release, descricao, observacoes, eliminado'
      )
      .single();

    if (repoErr || !createdRepo) {
      return NextResponse.json(
        { error: repoErr?.message || 'Erro ao registrar repositório.' },
        { status: 400 }
      );
    }

    let insertedFiles = [];
    const validFiles = files.filter((f) => f && (f.title || f.titulo) && (f.url || f.url_arquivo));
    if (validFiles.length > 0) {
      const filePayloads = validFiles.map((f, idx) => ({
        repositorio_id: createdRepo.id,
        titulo: (f.title || f.titulo).trim(),
        url_arquivo: (f.url || f.url_arquivo).trim(),
        ordem: idx + 1,
        eliminado: false,
      }));
      const { data: fData } = await db
        .from('arquivos_repositorio')
        .insert(filePayloads)
        .select('id, repositorio_id, titulo, url_arquivo, ordem, eliminado');
      insertedFiles = fData || filePayloads;
    }

    await registrarAuditoria(db, {
      usuarioId: session.sub,
      modulo: 'arquivos',
      acao: 'create',
      tabelaAfetada: 'repositorios_github',
      registroId: createdRepo.id,
      dadosNovos: { ...createdRepo, files: insertedFiles },
      ipEndereco: ip,
    });

    return NextResponse.json(
      { repo: mapRepositorioFromDb(createdRepo, insertedFiles) },
      { status: 201 }
    );
  },
  'arquivos',
  'create'
);

