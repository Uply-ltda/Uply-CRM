import { NextResponse } from 'next/server';
import { withAuthAndPermission } from '@/lib/auth';
import {
  sanitizePayload,
  getClientIp,
  registrarAuditoria,
  mapRepositorioFromDb,
} from '@/lib/supabase';

async function handleUpdateRepo(request, context, { session, db }) {
  const { id } = await context.params;
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

  const nowIso = new Date().toISOString();
  const { data: updatedRepo, error: repoErr } = await db
    .from('repositorios_github')
    .update({
      projeto_id: projectId || null,
      nome_repositorio: repoName,
      url_repositorio: repoUrl,
      versao_release: version || 'v1.0.0',
      descricao: description || null,
      observacoes: notes || null,
      atualizado_em: nowIso,
    })
    .eq('id', id)
    .eq('eliminado', false)
    .select(
      'id, projeto_id, nome_repositorio, url_repositorio, versao_release, descricao, observacoes, eliminado'
    )
    .single();

  if (repoErr || !updatedRepo) {
    return NextResponse.json(
      { error: repoErr?.message || 'Erro ao atualizar repositório.' },
      { status: 400 }
    );
  }

  // Sincroniza arquivos_repositorio (soft-delete anteriores e insere atuais)
  await db
    .from('arquivos_repositorio')
    .update({ eliminado: true, atualizado_em: nowIso })
    .eq('repositorio_id', id)
    .eq('eliminado', false);

  let insertedFiles = [];
  const validFiles = files.filter((f) => f && (f.title || f.titulo) && (f.url || f.url_arquivo));
  if (validFiles.length > 0) {
    const filePayloads = validFiles.map((f, idx) => ({
      repositorio_id: id,
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
    acao: 'edit',
    tabelaAfetada: 'repositorios_github',
    registroId: id,
    dadosNovos: { ...updatedRepo, files: insertedFiles },
    ipEndereco: ip,
  });

  return NextResponse.json({ repo: mapRepositorioFromDb(updatedRepo, insertedFiles) });
}

export const PUT = withAuthAndPermission(handleUpdateRepo, 'arquivos', 'edit');
export const PATCH = withAuthAndPermission(handleUpdateRepo, 'arquivos', 'edit');

export const DELETE = withAuthAndPermission(
  async (request, context, { session, db }) => {
    const { id } = await context.params;
    const ip = getClientIp(request);
    const nowIso = new Date().toISOString();

    const { error } = await db
      .from('repositorios_github')
      .update({
        eliminado: true,
        atualizado_em: nowIso,
      })
      .eq('id', id);

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Erro ao remover repositório.' },
        { status: 400 }
      );
    }

    await db
      .from('arquivos_repositorio')
      .update({
        eliminado: true,
        atualizado_em: nowIso,
      })
      .eq('repositorio_id', id);

    await registrarAuditoria(db, {
      usuarioId: session.sub,
      modulo: 'arquivos',
      acao: 'delete',
      tabelaAfetada: 'repositorios_github',
      registroId: id,
      ipEndereco: ip,
    });

    return NextResponse.json({ success: true });
  },
  'arquivos',
  'delete'
);

