import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import {
  mapUsuarioFromDb,
  mapEmpresaFromDb,
  mapProjetoFromDb,
  mapCompromissoFromDb,
  mapTarefaFromDb,
  mapCategoriasFromDb,
  mapLancamentoFromDb,
  mapRepositorioFromDb,
  mapPermissoesFromDb,
} from '@/lib/supabase';

export const GET = withAuth(async (_request, _context, { session, db }) => {
  // Atualiza permissões do usuário logado se possível
  try {
    const { data: myPermRows } = await db
      .from('permissoes_usuarios')
      .select('modulo, acessar, incluir, editar, deletar, eliminado')
      .eq('usuario_id', session.sub)
      .eq('eliminado', false);

    if (Array.isArray(myPermRows) && myPermRows.length > 0) {
      session.permissions = mapPermissoesFromDb(myPermRows);
    }
  } catch {
    // Mantém session.permissions
  }

  const canAccess = (mod) => Boolean(session.permissions?.[mod]?.access);
  const hasPainel = canAccess('painel');

  // Executa consultas em paralelo filtrando obrigatoriamente .eq('eliminado', false)
  // Nunca seleciona senha_hash nem senha_portal_hash
  const [
    etapasRes,
    ramosRes,
    catRes,
    subcatRes,
    usuariosRes,
    permissoesRes,
    empresasRes,
    empRespRes,
    empProdRes,
    projetosRes,
    agendaRes,
    tarefasRes,
    financeiroRes,
    reposRes,
    arquivosRes,
  ] = await Promise.all([
    db
      .from('etapas_kanban')
      .select('id, nome, ordem, cor_hex, exige_confirmacao_critica, eliminado')
      .eq('eliminado', false)
      .order('ordem', { ascending: true }),
    db
      .from('ramos_atividade')
      .select('id, nome, eliminado')
      .eq('eliminado', false)
      .order('nome', { ascending: true }),
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
    db
      .from('usuarios')
      .select(
        'id, nome_completo, nome_usuario, email, telefone, cpf, cargo, possui_senha_salva, ativo, eliminado, ultimo_login_em'
      )
      .eq('eliminado', false)
      .order('nome_completo', { ascending: true }),
    db
      .from('permissoes_usuarios')
      .select('id, usuario_id, modulo, acessar, incluir, editar, deletar, eliminado')
      .eq('eliminado', false),
    canAccess('empresas') || hasPainel || canAccess('kanban') || canAccess('agenda') || canAccess('financeiro')
      ? db
          .from('empresas')
          .select(
            'id, tipo_pessoa, documento, nome_razao_social, nome_fantasia, cep, logradouro, cidade, estado, ramo_atividade_id, ramo_atividade_nome, nome_responsavel_principal, email, telefone, possui_senha_salva, slug, chave_pix, categoria_despesa_padrao_id, categoria_despesa_padrao_nome, tipo_cadastro, tipo_origem_comercial, captado_por_usuario_id, captado_por_externo_nome, ativo, eliminado'
          )
          .eq('eliminado', false)
          .order('criado_em', { ascending: false })
      : Promise.resolve({ data: [] }),
    canAccess('empresas') || hasPainel || canAccess('kanban') || canAccess('agenda') || canAccess('financeiro')
      ? db
          .from('empresas_responsaveis')
          .select('id, empresa_id, nome_responsavel, principal, ordem, eliminado')
          .eq('eliminado', false)
          .order('ordem', { ascending: true })
      : Promise.resolve({ data: [] }),
    canAccess('empresas') || hasPainel
      ? db
          .from('empresas_produtos_vinculados')
          .select('id, empresa_id, tipo_produto, descricao, eliminado')
          .eq('eliminado', false)
      : Promise.resolve({ data: [] }),
    canAccess('kanban') || hasPainel || canAccess('agenda') || canAccess('arquivos')
      ? db
          .from('projetos')
          .select(
            'id, nome, empresa_id, responsavel_id, etapa_id, etapa_nome, prazo_estimado, valor, descricao_escopo, eliminado'
          )
          .eq('eliminado', false)
          .order('criado_em', { ascending: false })
      : Promise.resolve({ data: [] }),
    canAccess('agenda') || hasPainel
      ? db
          .from('compromissos_agenda')
          .select(
            'id, titulo, descricao, data_compromisso, hora_compromisso, projeto_id, empresa_id, responsavel_id, eliminado'
          )
          .eq('eliminado', false)
          .order('data_compromisso', { ascending: true })
          .order('hora_compromisso', { ascending: true })
      : Promise.resolve({ data: [] }),
    canAccess('tasks') || hasPainel
      ? db
          .from('tarefas')
          .select(
            'id, responsavel_id, descricao, data_tarefa, hora_tarefa, prioridade, observacoes, status, eliminado'
          )
          .eq('eliminado', false)
          .order('data_tarefa', { ascending: true })
          .order('hora_tarefa', { ascending: true })
      : Promise.resolve({ data: [] }),
    canAccess('financeiro') || hasPainel
      ? db
          .from('lancamentos_financeiros')
          .select(
            'id, lote_parcelamento_id, numero_parcela, total_parcelas, tipo, categoria_id, subcategoria_id, categoria_nome, subcategoria_nome, empresa_id, descricao, observacoes, valor, data_vencimento, data_liquidacao, situacao, eliminado'
          )
          .eq('eliminado', false)
          .order('data_vencimento', { ascending: true })
      : Promise.resolve({ data: [] }),
    canAccess('arquivos') || hasPainel
      ? db
          .from('repositorios_github')
          .select(
            'id, projeto_id, nome_repositorio, url_repositorio, versao_release, descricao, observacoes, eliminado'
          )
          .eq('eliminado', false)
          .order('criado_em', { ascending: false })
      : Promise.resolve({ data: [] }),
    canAccess('arquivos') || hasPainel
      ? db
          .from('arquivos_repositorio')
          .select('id, repositorio_id, titulo, url_arquivo, ordem, eliminado')
          .eq('eliminado', false)
          .order('ordem', { ascending: true })
      : Promise.resolve({ data: [] }),
  ]);

  const etapasRows = etapasRes?.data || [];
  const kanbanStages = etapasRows.map((e) => e.nome).filter(Boolean);

  const ramosRows = ramosRes?.data || [];
  const industries = ramosRows.map((r) => r.nome).filter(Boolean);

  const categories = mapCategoriasFromDb(catRes?.data || [], subcatRes?.data || []);

  const permRows = permissoesRes?.data || [];
  const mappedUsers = (usuariosRes?.data || []).map((u) => mapUsuarioFromDb(u, permRows));

  // Garante que o usuário logado sempre esteja presente na lista de usuários do estado
  const currentUserDto = {
    id: session.sub,
    name: session.name || 'Usuário Logado',
    username: session.username || 'admin',
    email: session.email || '',
    phone: session.phone || '',
    cpf: session.cpf || '',
    role: session.role || 'Administrador',
    hasSavedPassword: Boolean(session.hasSavedPassword ?? true),
    active: true,
    permissions: session.permissions || {},
  };

  if (!mappedUsers.some((u) => u.id === currentUserDto.id)) {
    mappedUsers.unshift(currentUserDto);
  }

  const empResps = empRespRes?.data || [];
  const empProds = empProdRes?.data || [];
  const companies = (empresasRes?.data || []).map((e) =>
    mapEmpresaFromDb(e, empResps, empProds)
  );

  const projects = (projetosRes?.data || []).map((p) => mapProjetoFromDb(p));
  const appointments = (agendaRes?.data || []).map((a) => mapCompromissoFromDb(a));
  const tasks = (tarefasRes?.data || []).map((t) => mapTarefaFromDb(t));
  const finances = (financeiroRes?.data || []).map((f) => mapLancamentoFromDb(f));

  const arquivosRows = arquivosRes?.data || [];
  const repos = (reposRes?.data || []).map((r) => mapRepositorioFromDb(r, arquivosRows));

  return NextResponse.json({
    currentUser: currentUserDto,
    kanbanStages,
    kanbanStageObjects: etapasRows,
    industries,
    industryObjects: ramosRows,
    categories,
    users: mappedUsers,
    companies,
    projects,
    appointments,
    tasks,
    finances,
    repos,
  });
});

