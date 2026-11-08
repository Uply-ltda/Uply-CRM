import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    '[UPLY Supabase] Variáveis NEXT_PUBLIC_SUPABASE_URL ou chave do Supabase não definidas no ambiente.'
  );
}

export const supabase = createClient(supabaseUrl || '', supabaseKey || '', {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

/**
 * Cria uma instância do cliente Supabase injetando cabeçalhos de contexto
 * da sessão atual (token_sessao e usuario_id) para políticas RLS e funções SQL.
 */
export function getSupabaseWithContext(session = {}) {
  const extraHeaders = {};

  if (session?.sessionToken) {
    extraHeaders['x-session-token'] = String(session.sessionToken);
    extraHeaders['x-token-sessao'] = String(session.sessionToken);
    extraHeaders['x-uply-token'] = String(session.sessionToken);
    extraHeaders['x-uply-session-token'] = String(session.sessionToken);
  }

  if (session?.sub) {
    extraHeaders['x-usuario-id'] = String(session.sub);
    extraHeaders['x-user-id'] = String(session.sub);
    extraHeaders['x-uply-usuario-id'] = String(session.sub);
  }

  return createClient(supabaseUrl || '', supabaseKey || '', {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: extraHeaders,
    },
  });
}

// ==========================================
// SANITIZAÇÃO DE INPUTS CONTRA XSS / INJEÇÃO
// ==========================================

export function sanitizeString(value) {
  if (typeof value !== 'string') return value;
  return value
    .replace(/<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, '')
    .replace(/<\s*iframe[^>]*>[\s\S]*?<\s*\/\s*iframe\s*>/gi, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim();
}

export function sanitizePayload(input) {
  if (input === null || input === undefined) return input;
  if (typeof input === 'string') return sanitizeString(input);
  if (Array.isArray(input)) return input.map((item) => sanitizePayload(item));
  if (typeof input === 'object') {
    const out = {};
    for (const [key, val] of Object.entries(input)) {
      if (key === 'password' || key === 'passwordInput' || key === 'initialPassword' || key === 'senha') {
        out[key] = typeof val === 'string' ? val : '';
      } else {
        out[key] = sanitizePayload(val);
      }
    }
    return out;
  }
  return input;
}

export function getClientIp(request) {
  const forwarded = request?.headers?.get?.('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request?.headers?.get?.('x-real-ip') || '127.0.0.1';
}

// ==========================================
// AUDITORIA (public.logs_auditoria)
// ==========================================

export async function registrarAuditoria(
  db,
  {
    usuarioId,
    modulo,
    acao,
    tabelaAfetada,
    registroId,
    dadosAnteriores = null,
    dadosNovos = null,
    ipEndereco = '127.0.0.1',
  }
) {
  try {
    const cleanOld = dadosAnteriores ? { ...dadosAnteriores } : null;
    const cleanNew = dadosNovos ? { ...dadosNovos } : null;
    if (cleanOld) {
      delete cleanOld.senha_hash;
      delete cleanOld.senha_portal_hash;
    }
    if (cleanNew) {
      delete cleanNew.senha_hash;
      delete cleanNew.senha_portal_hash;
    }

    await db.from('logs_auditoria').insert({
      usuario_id: usuarioId || null,
      modulo: String(modulo || 'painel'),
      acao: String(acao || 'access'),
      tabela_afetada: String(tabelaAfetada || ''),
      registro_id: registroId ? String(registroId) : null,
      dados_anteriores: cleanOld,
      dados_novos: cleanNew,
      ip_endereco: ipEndereco,
    });
  } catch {
    // Falha silenciosa caso RLS restrinja inserção direta em logs_auditoria
  }
}

// ==========================================
// MAPEADORES DTO (BANCO PT-BR <-> FRONTEND)
// ==========================================

export const SYSTEM_MODULE_IDS = [
  'painel',
  'kanban',
  'agenda',
  'tasks',
  'empresas',
  'usuarios',
  'financeiro',
  'arquivos',
];

export function createEmptyPermissionsMatrix(defaultAccess = false) {
  const matrix = {};
  for (const mod of SYSTEM_MODULE_IDS) {
    matrix[mod] = {
      access: defaultAccess,
      create: false,
      edit: false,
      delete: false,
    };
  }
  return matrix;
}

export function mapPermissoesFromDb(permRows = []) {
  const matrix = createEmptyPermissionsMatrix(false);
  for (const row of permRows) {
    if (!row || row.eliminado) continue;
    const mod = row.modulo;
    if (SYSTEM_MODULE_IDS.includes(mod)) {
      const access = Boolean(row.acessar);
      matrix[mod] = {
        access,
        create: access && Boolean(row.incluir),
        edit: access && Boolean(row.editar),
        delete: access && Boolean(row.deletar),
      };
    }
  }
  return matrix;
}

export function mapUsuarioFromDb(u, permRows = []) {
  if (!u) return null;
  // Nunca retorna senha_hash
  const userPerms = permRows.filter((p) => p.usuario_id === u.id && !p.eliminado);
  return {
    id: u.id,
    name: u.nome_completo || '',
    username: u.nome_usuario || '',
    email: u.email || '',
    phone: u.telefone || '',
    cpf: u.cpf || '',
    role: u.cargo || '',
    hasSavedPassword: Boolean(u.possui_senha_salva),
    active: u.ativo !== false,
    lastLoginAt: u.ultimo_login_em || null,
    permissions:
      u.permissions && typeof u.permissions === 'object'
        ? u.permissions
        : mapPermissoesFromDb(userPerms),
  };
}

export function mapEmpresaFromDb(e, responsaveisRows = [], produtosRows = []) {
  if (!e) return null;
  // Nunca retorna senha_portal_hash
  const empResps = responsaveisRows
    .filter((r) => r.empresa_id === e.id && !r.eliminado)
    .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
    .map((r) => r.nome_responsavel)
    .filter(Boolean);

  const empProds = produtosRows
    .filter((p) => p.empresa_id === e.id && !p.eliminado)
    .map((p) => ({
      id: p.id,
      type: p.tipo_produto || 'Sistema',
      description: p.descricao || '',
    }));

  const primaryResp = empResps[0] || e.nome_responsavel_principal || '';

  return {
    id: e.id,
    personType: e.tipo_pessoa || 'CNPJ',
    document: e.documento || '',
    name: e.nome_razao_social || '',
    tradeName: e.nome_fantasia || '',
    cep: e.cep || '',
    street: e.logradouro || '',
    city: e.cidade || '',
    state: e.estado || '',
    industryId: e.ramo_atividade_id || null,
    industry: e.ramo_atividade_nome || '',
    responsibleName: primaryResp,
    responsibles: empResps.length > 0 ? empResps : primaryResp ? [primaryResp] : [],
    linkedProducts: empProds,
    email: e.email || '',
    phone: e.telefone || '',
    hasSavedPassword: Boolean(e.possui_senha_salva),
    slug: e.slug || '',
    pixKey: e.chave_pix || '',
    defaultExpenseCategoryId: e.categoria_despesa_padrao_id || null,
    defaultExpenseCategory: e.categoria_despesa_padrao_nome || '',
    registrationType: e.tipo_cadastro || 'Cliente',
    acquiredByType: e.tipo_origem_comercial || 'user',
    acquiredByUserId: e.captado_por_usuario_id || '',
    acquiredByExternalName: e.captado_por_externo_nome || '',
    active: e.ativo !== false,
  };
}

export function mapProjetoFromDb(p) {
  if (!p) return null;
  return {
    id: p.id,
    name: p.nome || '',
    companyId: p.empresa_id || '',
    responsibleId: p.responsavel_id || '',
    stageId: p.etapa_id || null,
    stage: p.etapa_nome || 'Projeção',
    deadline: p.prazo_estimado || '',
    value: Number(p.valor) || 0,
    description: p.descricao_escopo || '',
  };
}

export function mapCompromissoFromDb(a) {
  if (!a) return null;
  return {
    id: a.id,
    title: a.titulo || '',
    description: a.descricao || '',
    date: a.data_compromisso || '',
    time: a.hora_compromisso ? String(a.hora_compromisso).slice(0, 5) : '09:00',
    projectId: a.projeto_id || '',
    companyId: a.empresa_id || '',
    userId: a.responsavel_id || '',
  };
}

export function mapTarefaFromDb(t) {
  if (!t) return null;
  return {
    id: t.id,
    userId: t.responsavel_id || '',
    description: t.descricao || '',
    date: t.data_tarefa || '',
    time: t.hora_tarefa ? String(t.hora_tarefa).slice(0, 5) : '09:00',
    priority: t.prioridade || 'Média',
    notes: t.observacoes || '',
    status: t.status || 'pendente',
  };
}

export function mapCategoriasFromDb(catRows = [], subcatRows = []) {
  const result = {
    entrada: [],
    saida: [],
  };

  for (const cat of catRows) {
    if (!cat || cat.eliminado || cat.ativo === false) continue;
    const subs = subcatRows
      .filter((s) => s.categoria_id === cat.id && !s.eliminado && s.ativo !== false)
      .map((s) => s.nome);

    const item = {
      id: cat.id,
      name: cat.nome,
      type: cat.tipo,
      subcategories: subs,
    };

    if (cat.tipo === 'entrada') {
      result.entrada.push(item);
    } else if (cat.tipo === 'saida') {
      result.saida.push(item);
    }
  }

  return result;
}

export function mapLancamentoFromDb(f) {
  if (!f) return null;
  return {
    id: f.id,
    batchId: f.lote_parcelamento_id || null,
    installmentNumber: f.numero_parcela || 1,
    totalInstallments: f.total_parcelas || 1,
    type: f.tipo || 'receber',
    categoryId: f.categoria_id || null,
    subcategoryId: f.subcategoria_id || null,
    category: f.categoria_nome || '',
    subcategory: f.subcategoria_nome || '',
    companyId: f.empresa_id || '',
    description: f.descricao || '',
    notes: f.observacoes || '',
    value: Number(f.valor) || 0,
    dueDate: f.data_vencimento || '',
    paidAt: f.data_liquidacao || null,
    status: f.situacao || 'pendente',
  };
}

export function mapRepositorioFromDb(r, arquivosRows = []) {
  if (!r) return null;
  const files = arquivosRows
    .filter((a) => a.repositorio_id === r.id && !a.eliminado)
    .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
    .map((a) => ({
      id: a.id,
      title: a.titulo || '',
      url: a.url_arquivo || '',
    }));

  return {
    id: r.id,
    projectId: r.projeto_id || '',
    repoName: r.nome_repositorio || '',
    repoUrl: r.url_repositorio || '',
    version: r.versao_release || 'v1.0.0',
    description: r.descricao || '',
    notes: r.observacoes || '',
    files,
  };
}

