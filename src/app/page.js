"use client";

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  Kanban,
  Calendar as CalendarIcon,
  Building2,
  Users,
  DollarSign,
  FolderGit2,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Eye,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Menu,
  X,
  ExternalLink,
  GitBranch,
  Tag,
  FileText,
  Shield,
  Lock,
  RefreshCw,
  Check,
  Info,
  CalendarDays,
  ListFilter,
  ArrowRight,
  Briefcase,
  UserCheck,
  Download,
  CheckSquare,
  LogOut
} from 'lucide-react';

// ==========================================
// UTILITÁRIOS DE FORMATAÇÃO E MÁSCARAS (BR)
// ==========================================

const formatCurrencyBRL = (value) => {
  const num = Number(value) || 0;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(num);
};

// Entrada monetária da direita para a esquerda (centavos primeiro)
const parseRightToLeftCurrency = (rawString) => {
  const digits = String(rawString).replace(/\D/g, '');
  if (!digits) return 0;
  return parseInt(digits, 10) / 100;
};

const formatCPF = (v) => {
  const d = String(v).replace(/\D/g, '').slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
};

const formatCNPJ = (v) => {
  const d = String(v).replace(/\D/g, '').slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
};

const formatCEP = (v) => {
  const d = String(v).replace(/\D/g, '').slice(0, 8);
  return d.replace(/^(\d{5})(\d)/, '$1-$2');
};

const formatPhone = (v) => {
  const d = String(v).replace(/\D/g, '').slice(0, 11);
  if (d.length <= 10) {
    return d
      .replace(/^(\d{2})(\d)/g, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  return d
    .replace(/^(\d{2})(\d)/g, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
};

const formatDateBR = (isoDate) => {
  if (!isoDate) return '-';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

const createSlug = (text) => {
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
};

const addDays = (dateStr, days) => {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + Number(days));
  return d.toISOString().split('T')[0];
};

const addMonths = (dateStr, months) => {
  const d = new Date(dateStr + 'T12:00:00');
  d.setMonth(d.getMonth() + Number(months));
  return d.toISOString().split('T')[0];
};

// ==========================================
// CONSTANTES DO SISTEMA (MÓDULOS DO RBAC)
// ==========================================

// Data atual do sistema (fuso local do navegador) no formato ISO AAAA-MM-DD
const getTodayISO = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const MONTH_NAMES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const SYSTEM_MODULES = [
  { id: 'painel', label: 'Painel' },
  { id: 'kanban', label: 'Kanban' },
  { id: 'agenda', label: 'Agenda' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'empresas', label: 'Empresas' },
  { id: 'usuarios', label: 'Usuários' },
  { id: 'financeiro', label: 'Financeiro' },
  { id: 'arquivos', label: 'Arquivos e projetos' },
];

// ==========================================
// COMPONENTE DE LOGOTIPO UPLY (INSPIRADO NA REFERÊNCIA)
// ==========================================

const UplyBrandLogo = ({ collapsed = false }) => (
  <div className="flex items-center gap-3 select-none">
    <div className="relative w-10 h-10 flex items-center justify-center rounded-xl bg-[#081021] border border-cyan-500/20 shadow-lg shadow-cyan-500/10 shrink-0">
      <svg viewBox="0 0 64 64" className="w-8 h-8" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="uplyGradLeft" x1="12" y1="54" x2="36" y2="12" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#16A34A" />
            <stop offset="55%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#0EA5E9" />
          </linearGradient>
          <linearGradient id="uplyGradRight" x1="22" y1="56" x2="50" y2="10" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="45%" stopColor="#0EA5E9" />
            <stop offset="100%" stopColor="#2563EB" />
          </linearGradient>
        </defs>
        {/* Escudo / U externo com seta ascendente */}
        <path
          d="M14 26V40C14 49 22 55 32 55C42 55 50 49 50 40V20L43 25V39C43 44.5 38.5 48.5 32 48.5C25.5 48.5 21 44.5 21 39V22L14 26Z"
          fill="url(#uplyGradRight)"
        />
        {/* U interno dinâmico subindo em seta */}
        <path
          d="M23 23V37C23 41.5 26.8 44.5 31.5 44.5C36.2 44.5 39 41.5 39 37V19H44L35.5 8L27 19H32V36.5C32 38.5 30.8 39.5 29.2 39.5C27.6 39.5 26.5 38.5 26.5 36.5V20.5L23 23Z"
          fill="url(#uplyGradLeft)"
        />
      </svg>
    </div>
    {!collapsed && (
      <div className="flex flex-col">
        <div className="flex items-baseline tracking-wider font-extrabold text-xl leading-none">
          <span className="text-white">UPL</span>
          <span className="bg-gradient-to-r from-sky-400 to-blue-600 bg-clip-text text-transparent">Y</span>
        </div>
        <span className="text-[10px] uppercase tracking-widest text-cyan-400/80 font-semibold mt-0.5">
          Software Factory ERP
        </span>
      </div>
    )}
  </div>
);

// ==========================================
// COMPONENTE DE INPUT MONETÁRIO (DIREITA PARA ESQUERDA)
// ==========================================

const CurrencyInputBRL = ({ value, onChange, label, required = false, error = '' }) => {
  const handleKeyDownOrChange = (e) => {
    const raw = e.target.value;
    const numericValue = parseRightToLeftCurrency(raw);
    onChange(numericValue);
  };

  return (
    <div>
      {label && (
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
          {label} {required && <span className="text-emerald-400">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          value={formatCurrencyBRL(value)}
          onChange={handleKeyDownOrChange}
          placeholder="R$ 0,00"
          className={`w-full bg-[#070C17] border ${
            error ? 'border-rose-500' : 'border-slate-800 focus:border-cyan-400'
          } rounded-xl px-3.5 py-2.5 text-right font-mono text-sm text-emerald-300 font-semibold focus:outline-none transition-colors`}
        />
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[11px] text-slate-500 pointer-events-none">
          BRL (digite os números)
        </span>
      </div>
      {error && <p className="text-xs text-rose-400 mt-1">{error}</p>}
    </div>
  );
};

// ==========================================
// SELETOR DE EMPRESA COM BUSCA E ENTER PARA PRIMEIRO RESULTADO
// ==========================================

const SearchableCompanySelector = ({ companies, selectedId, onSelect, filterType = 'all', label = 'Empresa (Cliente / Fornecedor)' }) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const selectedCompany = companies.find((c) => c.id === selectedId);

  const filteredCompanies = useMemo(() => {
    return companies.filter((c) => {
      if (filterType === 'Cliente' && c.registrationType === 'Fornecedor') return false;
      if (filterType === 'Fornecedor' && c.registrationType === 'Cliente') return false;
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        (c.tradeName && c.tradeName.toLowerCase().includes(q)) ||
        c.document.toLowerCase().includes(q)
      );
    });
  }, [companies, query, filterType]);

  useEffect(() => {
    const handleClickOutside = (ev) => {
      if (containerRef.current && !containerRef.current.contains(ev.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCompanies.length > 0) {
        onSelect(filteredCompanies[0].id);
        setQuery('');
        setIsOpen(false);
      }
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
        {label} <span className="text-emerald-400">*</span>
      </label>
      <div
        onClick={() => setIsOpen(true)}
        className="w-full bg-[#070C17] border border-slate-800 focus-within:border-cyan-400 rounded-xl px-3.5 py-2 text-sm text-slate-100 flex items-center justify-between cursor-pointer"
      >
        <input
          type="text"
          value={isOpen ? query : selectedCompany ? `${selectedCompany.tradeName || selectedCompany.name} (${selectedCompany.document})` : ''}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Digite para pesquisar e pressione Enter para o 1º resultado..."
          className="w-full bg-transparent focus:outline-none text-sm text-slate-100 placeholder-slate-500"
        />
        <Search className="w-4 h-4 text-cyan-400 shrink-0 ml-2" />
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1.5 w-full bg-[#0B1324] border border-slate-700/80 rounded-xl shadow-2xl max-h-56 overflow-y-auto divide-y divide-slate-800/60">
          <div className="px-3 py-1.5 bg-[#070C17] text-[11px] text-slate-400 flex items-center justify-between">
            <span>Pressione <kbd className="px-1.5 py-0.5 bg-slate-800 text-cyan-300 rounded">Enter</kbd> para selecionar o 1º</span>
            <span>{filteredCompanies.length} encontrada(s)</span>
          </div>
          {filteredCompanies.length === 0 ? (
            <div className="p-3 text-xs text-slate-400 text-center">
              Nenhuma empresa localizada para "{query}".
            </div>
          ) : (
            filteredCompanies.map((comp, idx) => (
              <button
                type="button"
                key={comp.id}
                onClick={() => {
                  onSelect(comp.id);
                  setQuery('');
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3.5 py-2.5 text-xs transition-colors flex items-center justify-between hover:bg-cyan-500/10 ${
                  idx === 0 && query ? 'bg-cyan-500/10 border-l-2 border-cyan-400' : ''
                }`}
              >
                <div>
                  <p className="font-semibold text-slate-100">
                    {comp.tradeName || comp.name}
                    {idx === 0 && query && (
                      <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                        Enter ↵
                      </span>
                    )}
                  </p>
                  <p className="text-slate-400 text-[11px]">{comp.name} • {comp.document}</p>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                  {comp.registrationType}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

// ==========================================
// APLICAÇÃO PRINCIPAL (UPLY MVP)
// ==========================================

export default function App() {
  // Autenticação (Tela de Login)
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Navegação e controle de interface
  const [activeMenu, setActiveMenu] = useState('painel');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoadingView, setIsLoadingView] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(false);

  // Estados principais de dados (carregados do Supabase via /api/bootstrap)
  const [currentUser, setCurrentUser] = useState(null);
  const [kanbanStages, setKanbanStages] = useState([]);
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [industries, setIndustries] = useState([]);
  const [projects, setProjects] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [categories, setCategories] = useState({ entrada: [], saida: [] });
  const [finances, setFinances] = useState([]);
  const [repos, setRepos] = useState([]);

  // Sistema de notificações (Toasts discretos)
  const [toasts, setToasts] = useState([]);
  const addToast = (message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Modal de confirmação universal (para exclusões, descartar alterações ou mudanças críticas no Kanban)
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    description: '',
    confirmLabel: 'Confirmar',
    variant: 'danger',
    onConfirm: null
  });

  const askConfirmation = ({ title, description, confirmLabel = 'Confirmar', variant = 'danger', onConfirm }) => {
    setConfirmDialog({
      open: true,
      title,
      description,
      confirmLabel,
      variant,
      onConfirm
    });
  };

  // ==========================================
  // SESSÃO, HELPER DE API E CARGA INICIAL (BOOTSTRAP)
  // ==========================================

  // Limpa todo o estado em memória e retorna para a tela de login
  const resetSessionState = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    setKanbanStages([]);
    setUsers([]);
    setCompanies([]);
    setIndustries([]);
    setProjects([]);
    setAppointments([]);
    setTasks([]);
    setCategories({ entrada: [], saida: [] });
    setFinances([]);
    setRepos([]);
    setActiveMenu('painel');
    setMobileMenuOpen(false);
    setConfirmDialog((prev) => ({ ...prev, open: false }));
    setProjectModal({ open: false, mode: 'create', data: null });
    setStagesModalOpen(false);
    setAppointmentModal({ open: false, mode: 'create', data: null });
    setTaskModal({ open: false, mode: 'create', data: null });
    setCompanyModal({ open: false, mode: 'create', data: null });
    setUserModal({ open: false, mode: 'create', data: null });
    setFinanceModal({ open: false, mode: 'create', data: null });
    setRepoModal({ open: false, mode: 'create', data: null });
  };

  /**
   * Helper central de comunicação com o backend.
   * - Envia o cookie HttpOnly (uply_token) com credentials: 'include' (renovação automática +28h).
   * - 401: encerra a sessão local e volta para o login.
   * - 403: exibe a mensagem de permissão retornada pelo backend.
   */
  const apiFetch = async (url, options = {}) => {
    const { body, headers, skipAuthRedirect = false, ...rest } = options;
    const init = {
      credentials: 'include',
      cache: 'no-store',
      ...rest,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(headers || {})
      }
    };
    if (body !== undefined) {
      init.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    let res;
    try {
      res = await fetch(url, init);
    } catch {
      const netErr = new Error('Falha de conexão com o servidor. Verifique sua rede e tente novamente.');
      netErr.status = 0;
      throw netErr;
    }

    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

    if (res.status === 401) {
      const err = new Error(data?.error || 'Sessão expirada. Faça login novamente.');
      err.status = 401;
      if (!skipAuthRedirect) {
        resetSessionState();
        addToast('Sessão expirada. Faça login novamente.', 'error');
        err.handled = true;
      }
      throw err;
    }

    if (res.status === 403) {
      const msg = data?.error || 'Você não possui permissão para executar esta ação.';
      addToast(msg, 'error');
      const err = new Error(msg);
      err.status = 403;
      err.handled = true;
      throw err;
    }

    if (!res.ok) {
      const err = new Error(data?.error || `Erro ${res.status} ao comunicar com o servidor.`);
      err.status = res.status;
      throw err;
    }

    return data;
  };

  // Exibe erro em Toast apenas se ainda não foi tratado pelo apiFetch (401/403)
  const handleApiError = (err, fallbackMessage) => {
    if (err?.handled) return;
    addToast(err?.message || fallbackMessage, 'error');
  };

  const pickFirstAccessibleMenu = (user) => {
    const perms = user?.permissions || {};
    if (perms.painel?.access) return 'painel';
    const first = SYSTEM_MODULES.find((m) => perms[m.id]?.access);
    return first ? first.id : 'painel';
  };

  // Carrega todos os dados ativos (eliminado = false) permitidos para o usuário logado
  const carregarDadosDoSistema = async () => {
    setIsBootstrapping(true);
    try {
      const data = await apiFetch('/api/bootstrap');
      if (data?.currentUser) {
        setCurrentUser((prev) => ({ ...(prev || {}), ...data.currentUser }));
      }
      setKanbanStages(Array.isArray(data?.kanbanStages) ? data.kanbanStages : []);
      setIndustries(Array.isArray(data?.industries) ? data.industries : []);
      setCategories({
        entrada: data?.categories?.entrada || [],
        saida: data?.categories?.saida || []
      });
      setUsers(Array.isArray(data?.users) ? data.users : []);
      setCompanies(Array.isArray(data?.companies) ? data.companies : []);
      setProjects(Array.isArray(data?.projects) ? data.projects : []);
      setAppointments(Array.isArray(data?.appointments) ? data.appointments : []);
      setTasks(Array.isArray(data?.tasks) ? data.tasks : []);
      setFinances(Array.isArray(data?.finances) ? data.finances : []);
      setRepos(Array.isArray(data?.repos) ? data.repos : []);
      return true;
    } catch (err) {
      handleApiError(err, 'Não foi possível carregar os dados do sistema.');
      return false;
    } finally {
      setIsBootstrapping(false);
    }
  };

  // Validação da sessão ativa ao abrir a aplicação (cookie HttpOnly JWT)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await apiFetch('/api/auth/me', { skipAuthRedirect: true });
        if (cancelled || !me?.user) return;
        setCurrentUser(me.user);
        setActiveMenu(pickFirstAccessibleMenu(me.user));
        setIsAuthenticated(true);
        await carregarDadosDoSistema();
      } catch {
        // Sem sessão válida: permanece na tela de login
      } finally {
        if (!cancelled) setIsCheckingSession(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST', skipAuthRedirect: true });
    } catch {
      // Mesmo com falha no servidor, a sessão local é encerrada
    }
    resetSessionState();
    setLoginPassword('');
    addToast('Sessão encerrada com segurança.', 'info');
  };

  const canDo = (moduleKey, action = 'access') => {
    const modPerm = currentUser?.permissions?.[moduleKey];
    if (!modPerm) return false;
    return Boolean(modPerm[action]);
  };

  const handleNavigate = (menuId) => {
    if (!canDo(menuId, 'access')) {
      addToast(`Seu perfil (${currentUser?.name || 'usuário'}) não possui permissão de acesso ao módulo "${menuId}".`, 'error');
      return;
    }
    setIsLoadingView(true);
    setActiveMenu(menuId);
    setMobileMenuOpen(false);
    setTimeout(() => setIsLoadingView(false), 180);
  };

  // Helpers de relacionamento
  const getCompanyName = (id) => {
    const c = companies.find((item) => item.id === id);
    return c ? c.tradeName || c.name : 'Empresa não vinculada';
  };

  const getUserName = (id) => {
    const u = users.find((item) => item.id === id);
    return u ? u.name : 'Não atribuído';
  };

  const getProjectName = (id) => {
    const p = projects.find((item) => item.id === id);
    return p ? p.name : 'Projeto Geral';
  };

  // Data de referência dinâmica (data atual real do sistema)
  const [todayIso, setTodayIso] = useState('2026-03-01');
  useEffect(() => {
    setTodayIso(getTodayISO());
  }, []);

  const TODAY_ISO = todayIso;
  const CURRENT_YEAR = Number(TODAY_ISO.slice(0, 4));
  const CURRENT_MONTH_INDEX = Number(TODAY_ISO.slice(5, 7)) - 1;
  const CURRENT_MONTH_PREFIX = TODAY_ISO.slice(0, 7);
  const CURRENT_QUARTER = Math.floor(CURRENT_MONTH_INDEX / 3) + 1;

  // ==========================================
  // 1. MÓDULO: PAINEL (DASHBOARD)
  // ==========================================
  const [dashboardPeriod, setDashboardPeriod] = useState('todos'); // 'mes', 'trimestre', 'todos'

  const renderPainel = () => {
    const quarterPrefixes = [0, 1, 2].map((offset) => {
      const monthIdx = (CURRENT_QUARTER - 1) * 3 + offset;
      return `${CURRENT_YEAR}-${String(monthIdx + 1).padStart(2, '0')}`;
    });

    const filterByPeriod = (dateStr) => {
      if (!dateStr || dashboardPeriod === 'todos') return true;
      if (dashboardPeriod === 'mes') return dateStr.startsWith(CURRENT_MONTH_PREFIX);
      if (dashboardPeriod === 'trimestre') {
        return quarterPrefixes.some((prefix) => dateStr.startsWith(prefix));
      }
      return true;
    };

    const filteredFinances = finances.filter((f) => filterByPeriod(f.dueDate));

    const totalReceber = filteredFinances
      .filter((f) => f.type === 'receber' && f.status !== 'cancelado')
      .reduce((acc, cur) => acc + cur.value, 0);

    const totalRecebido = filteredFinances
      .filter((f) => f.type === 'receber' && f.status === 'pago')
      .reduce((acc, cur) => acc + cur.value, 0);

    const totalPagar = filteredFinances
      .filter((f) => f.type === 'pagar' && f.status !== 'cancelado')
      .reduce((acc, cur) => acc + cur.value, 0);

    const totalPago = filteredFinances
      .filter((f) => f.type === 'pagar' && f.status === 'pago')
      .reduce((acc, cur) => acc + cur.value, 0);

    const saldoPrevisto = totalReceber - totalPagar;

    // Projetos atrasados ou próximos do prazo (até 7 dias)
    const activeProjects = projects.filter(
      (p) => !['Concluído', 'Faturado', 'Cancelado'].includes(p.stage)
    );
    const urgentProjects = activeProjects.filter((p) => {
      if (!p.deadline) return false;
      return p.deadline <= addDays(TODAY_ISO, 7);
    });

    // Próximos compromissos (a partir de hoje)
    const nextAppointments = [...appointments]
      .filter((a) => !a.date || a.date >= TODAY_ISO)
      .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
      .slice(0, 4);

    // Resumo por categoria
    const revenueByCategory = {};
    const expenseByCategory = {};
    filteredFinances.forEach((f) => {
      if (f.status === 'cancelado') return;
      if (f.type === 'receber') {
        revenueByCategory[f.category] = (revenueByCategory[f.category] || 0) + f.value;
      } else {
        expenseByCategory[f.category] = (expenseByCategory[f.category] || 0) + f.value;
      }
    });

    return (
      <div className="space-y-6">
        {/* Cabeçalho e filtro de período */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0B1221] border border-slate-800/80 rounded-2xl p-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold uppercase tracking-widest text-cyan-400">
                Visão Executiva em Tempo Real
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white mt-1">
              Painel Operacional UPLY
            </h1>
            <p className="text-sm text-slate-400">
              Acompanhamento centralizado de engenharia, entregas, agenda e fluxo financeiro.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-[#060A12] p-1.5 rounded-xl border border-slate-800 self-start sm:self-auto">
            {[
              { id: 'mes', label: `${MONTH_NAMES_PT[CURRENT_MONTH_INDEX]}/${String(CURRENT_YEAR).slice(2)}` },
              { id: 'trimestre', label: `${CURRENT_QUARTER}º Trimestre` },
              { id: 'todos', label: 'Todo o Período' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setDashboardPeriod(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  dashboardPeriod === tab.id
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* KPIs Financeiros e Operacionais */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="bg-[#0B1221] border border-slate-800/80 rounded-2xl p-5 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Contas a Receber
              </span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                <ArrowUpRight className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-white mt-3">
              {formatCurrencyBRL(totalReceber)}
            </p>
            <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Recebido: {formatCurrencyBRL(totalRecebido)}
            </p>
          </div>

          <div className="bg-[#0B1221] border border-slate-800/80 rounded-2xl p-5 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Contas a Pagar
              </span>
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
                <ArrowDownRight className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-white mt-3">
              {formatCurrencyBRL(totalPagar)}
            </p>
            <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              Liquidado: {formatCurrencyBRL(totalPago)}
            </p>
          </div>

          <div className="bg-[#0B1221] border border-slate-800/80 rounded-2xl p-5 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Resultado Projetado
              </span>
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <p className={`text-2xl font-extrabold mt-3 ${saldoPrevisto >= 0 ? 'text-cyan-300' : 'text-rose-400'}`}>
              {formatCurrencyBRL(saldoPrevisto)}
            </p>
            <p className="text-xs text-slate-400 mt-2">
              Balanço entre entradas e saídas ativas
            </p>
          </div>

          <div className="bg-[#0B1221] border border-slate-800/80 rounded-2xl p-5 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Pipeline em Execução
              </span>
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                <Kanban className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-white mt-3">
              {projects.length} projetos
            </p>
            <p className="text-xs text-amber-400 mt-2 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              {urgentProjects.length} com prazo próximo ou vencido
            </p>
          </div>
        </div>

        {/* Projetos por etapa do Kanban */}
        <div className="bg-[#0B1221] border border-slate-800/80 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-white">Projetos por Etapa do Kanban</h2>
              <p className="text-xs text-slate-400">Distribuição do fluxo completo da fábrica de software</p>
            </div>
            <button
              onClick={() => handleNavigate('kanban')}
              className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              Abrir Quadro Kanban <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-2.5">
            {kanbanStages.map((stage) => {
              const count = projects.filter((p) => p.stage === stage).length;
              const stageSum = projects
                .filter((p) => p.stage === stage)
                .reduce((acc, cur) => acc + (Number(cur.value) || 0), 0);
              return (
                <div
                  key={stage}
                  onClick={() => handleNavigate('kanban')}
                  className="bg-[#060A12] border border-slate-800/90 hover:border-cyan-500/40 rounded-xl p-3 cursor-pointer transition-all flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[11px] font-medium text-slate-300 leading-tight line-clamp-2">
                      {stage}
                    </span>
                    <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-cyan-500/15 text-cyan-300 shrink-0">
                      {count}
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-emerald-400/90 mt-3 truncate">
                    {formatCurrencyBRL(stageSum)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Grid Central: Alertas de Prazo + Próximos Compromissos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Projetos próximos do prazo ou atrasados */}
          <div className="bg-[#0B1221] border border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  Atenção de Prazos (Atrasados / Próximos)
                </h2>
                <span className="text-xs text-slate-400">Ref: {formatDateBR(TODAY_ISO)}</span>
              </div>

              <div className="space-y-3">
                {urgentProjects.length === 0 ? (
                  <div className="p-6 text-center text-sm text-slate-400 bg-[#060A12] rounded-xl border border-slate-800">
                    Nenhum projeto com prazo crítico no momento.
                  </div>
                ) : (
                  urgentProjects.map((proj) => {
                    const isLate = proj.deadline < TODAY_ISO;
                    return (
                      <div
                        key={proj.id}
                        className="p-3.5 rounded-xl bg-[#060A12] border border-slate-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                isLate
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              }`}
                            >
                              {isLate ? 'Atrasado' : 'Prazo Próximo'}
                            </span>
                            <span className="text-xs text-cyan-400 font-medium">{proj.stage}</span>
                          </div>
                          <p className="font-semibold text-sm text-white mt-1">{proj.name}</p>
                          <p className="text-xs text-slate-400">
                            Cliente: {getCompanyName(proj.companyId)} • Resp: {getUserName(proj.responsibleId)}
                          </p>
                        </div>
                        <div className="text-left sm:text-right shrink-0">
                          <p className="text-xs font-mono font-semibold text-slate-200">
                            Prazo: {formatDateBR(proj.deadline)}
                          </p>
                          <p className="text-xs font-mono text-emerald-400">
                            {formatCurrencyBRL(proj.value)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <button
              onClick={() => handleNavigate('kanban')}
              className="mt-4 w-full py-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-xs font-semibold text-slate-200 transition-colors"
            >
              Gerenciar Prazos no Kanban
            </button>
          </div>

          {/* Próximos compromissos da agenda */}
          <div className="bg-[#0B1221] border border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-cyan-400" />
                  Próximos Compromissos da Agenda
                </h2>
                <button
                  onClick={() => handleNavigate('agenda')}
                  className="text-xs text-cyan-400 hover:underline"
                >
                  Ver agenda completa
                </button>
              </div>

              <div className="space-y-3">
                {nextAppointments.map((app) => (
                  <div
                    key={app.id}
                    className="p-3.5 rounded-xl bg-[#060A12] border border-slate-800/90 flex items-start justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="px-2.5 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-center shrink-0">
                        <p className="text-xs font-bold text-cyan-300">{formatDateBR(app.date).slice(0, 5)}</p>
                        <p className="text-[11px] font-mono text-emerald-400">{app.time}</p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{app.title}</p>
                        <p className="text-xs text-slate-400 line-clamp-1">{app.description}</p>
                        <p className="text-[11px] text-slate-500 mt-1">
                          {getCompanyName(app.companyId)} • Resp: {getUserName(app.userId)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => handleNavigate('agenda')}
              className="mt-4 w-full py-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-xs font-semibold text-slate-200 transition-colors"
            >
              Agendar Novo Compromisso
            </button>
          </div>
        </div>

        {/* Categorias de Receitas e Despesas & Vencimentos Próximos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[#0B1221] border border-slate-800/80 rounded-2xl p-5">
            <h2 className="text-base font-bold text-white mb-4">
              Distribuição por Categorias (Receitas vs. Despesas)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-[#060A12] p-4 rounded-xl border border-slate-800">
                <span className="text-xs font-bold uppercase text-emerald-400">Entradas por Categoria</span>
                <div className="mt-3 space-y-2.5">
                  {Object.entries(revenueByCategory).length === 0 ? (
                    <p className="text-xs text-slate-500">Sem lançamentos no período.</p>
                  ) : (
                    Object.entries(revenueByCategory).map(([cat, val]) => (
                      <div key={cat}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-300 truncate pr-2">{cat}</span>
                          <span className="font-mono text-emerald-400 shrink-0">{formatCurrencyBRL(val)}</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400"
                            style={{ width: `${Math.min(100, (val / (totalReceber || 1)) * 100)}%` }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-[#060A12] p-4 rounded-xl border border-slate-800">
                <span className="text-xs font-bold uppercase text-rose-400">Saídas por Categoria</span>
                <div className="mt-3 space-y-2.5">
                  {Object.entries(expenseByCategory).length === 0 ? (
                    <p className="text-xs text-slate-500">Sem lançamentos no período.</p>
                  ) : (
                    Object.entries(expenseByCategory).map(([cat, val]) => (
                      <div key={cat}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-300 truncate pr-2">{cat}</span>
                          <span className="font-mono text-rose-400 shrink-0">{formatCurrencyBRL(val)}</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-rose-500 to-amber-500"
                            style={{ width: `${Math.min(100, (val / (totalPagar || 1)) * 100)}%` }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#0B1221] border border-slate-800/80 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-white">Contas Pendentes e Vencimentos Próximos</h2>
              <button
                onClick={() => handleNavigate('financeiro')}
                className="text-xs text-cyan-400 hover:underline"
              >
                Ir para Financeiro
              </button>
            </div>
            <div className="space-y-2.5">
              {finances
                .filter((f) => f.status === 'pendente' || f.status === 'vencido')
                .slice(0, 4)
                .map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-[#060A12] border border-slate-800 flex items-center justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                            item.type === 'receber'
                              ? 'bg-emerald-500/15 text-emerald-300'
                              : 'bg-rose-500/15 text-rose-300'
                          }`}
                        >
                          {item.type === 'receber' ? 'A Receber' : 'A Pagar'}
                        </span>
                        <span className="text-xs font-semibold text-white">{item.description}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {getCompanyName(item.companyId)} • Venc: {formatDateBR(item.dueDate)}
                      </p>
                    </div>
                    <span
                      className={`text-sm font-mono font-bold shrink-0 ${
                        item.type === 'receber' ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {formatCurrencyBRL(item.value)}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ==========================================
  // 2. MÓDULO: KANBAN DE PROJETOS
  // ==========================================
  const [kanbanSearch, setKanbanSearch] = useState('');
  const [projectModal, setProjectModal] = useState({ open: false, mode: 'create', data: null });
  const [projectFormDirty, setProjectFormDirty] = useState(false);
  const [stagesModalOpen, setStagesModalOpen] = useState(false);
  const [newStageNameInput, setNewStageNameInput] = useState('');

  const handleAddKanbanStage = async (e) => {
    e.preventDefault();
    const trimmed = newStageNameInput.trim();
    if (!trimmed) return;
    if (!canDo('kanban', 'create')) {
      addToast('Você não tem permissão para incluir etapas no Kanban.', 'error');
      return;
    }
    if (kanbanStages.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      addToast('Já existe uma etapa com este nome no Kanban.', 'error');
      return;
    }
    try {
      const data = await apiFetch('/api/kanban/etapas', {
        method: 'POST',
        body: { name: trimmed }
      });
      const stageName = data?.stage || trimmed;
      setKanbanStages((prev) => (prev.includes(stageName) ? prev : [...prev, stageName]));
      setNewStageNameInput('');
      addToast(`Etapa "${stageName}" adicionada ao Kanban!`, 'success');
    } catch (err) {
      handleApiError(err, 'Erro ao adicionar etapa ao Kanban.');
    }
  };

  const handleRemoveKanbanStage = (stageToRemove) => {
    if (!canDo('kanban', 'delete')) {
      addToast('Você não tem permissão para remover etapas do Kanban.', 'error');
      return;
    }
    if (kanbanStages.length <= 1) {
      addToast('O Kanban precisa manter pelo menos uma etapa ativa.', 'error');
      return;
    }
    const fallbackStage = kanbanStages.find((s) => s !== stageToRemove) || kanbanStages[0];
    const linkedProjects = projects.filter((p) => p.stage === stageToRemove);

    askConfirmation({
      title: `Remover etapa "${stageToRemove}"?`,
      description:
        linkedProjects.length > 0
          ? `Existem ${linkedProjects.length} projeto(s) nesta etapa. Ao confirmar, eles serão movidos automaticamente para "${fallbackStage}".`
          : `Confirma a exclusão da etapa "${stageToRemove}" do quadro Kanban?`,
      confirmLabel: 'Remover Etapa',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await apiFetch(`/api/kanban/etapas?name=${encodeURIComponent(stageToRemove)}`, {
            method: 'DELETE'
          });
          setKanbanStages((prev) => prev.filter((s) => s !== stageToRemove));
          // Recarrega os projetos do banco (a RPC move os projetos vinculados para outra etapa)
          if (linkedProjects.length > 0) {
            try {
              const proj = await apiFetch('/api/projetos');
              setProjects(Array.isArray(proj?.projects) ? proj.projects : []);
            } catch {
              setProjects((prev) =>
                prev.map((p) => (p.stage === stageToRemove ? { ...p, stage: fallbackStage } : p))
              );
            }
          }
          addToast(`Etapa "${stageToRemove}" removida do Kanban.`, 'info');
        } catch (err) {
          handleApiError(err, 'Erro ao remover etapa do Kanban.');
        }
      }
    });
  };

  const openProjectModal = (mode, project = null) => {
    if (mode === 'create' && !canDo('kanban', 'create')) {
      addToast('Você não tem permissão para incluir projetos.', 'error');
      return;
    }
    if (mode === 'edit' && !canDo('kanban', 'edit')) {
      addToast('Você não tem permissão para editar projetos.', 'error');
      return;
    }
    setProjectFormDirty(false);
    setProjectModal({
      open: true,
      mode,
      data: project
        ? { ...project }
        : {
            id: '',
            name: '',
            companyId: companies[0]?.id || '',
            responsibleId: users[0]?.id || '',
            deadline: addDays(TODAY_ISO, 30),
            value: 0,
            stage: kanbanStages[0] || 'Projeção',
            description: ''
          }
    });
  };

  const handleMoveProjectStage = (project, newStage) => {
    if (!canDo('kanban', 'edit')) {
      addToast('Seu usuário não possui permissão para mover projetos no Kanban.', 'error');
      return;
    }
    if (project.stage === newStage) return;

    const executeMove = async () => {
      try {
        const data = await apiFetch(`/api/projetos/${project.id}`, {
          method: 'PATCH',
          body: { stage: newStage }
        });
        const updated = data?.project || { ...project, stage: newStage };
        setProjects((prev) => prev.map((p) => (p.id === project.id ? updated : p)));
        addToast(`Projeto "${project.name}" movido para "${newStage}".`, 'success');
      } catch (err) {
        handleApiError(err, 'Erro ao mover o projeto de etapa.');
      }
    };

    // Avisos/confirmações quando a mudança exigir atenção
    if (['Cancelado', 'Faturado', 'Concluído'].includes(newStage)) {
      askConfirmation({
        title: `Confirmar mudança para "${newStage}"?`,
        description:
          newStage === 'Cancelado'
            ? `Atenção: Mover "${project.name}" para Cancelado interrompe o acompanhamento ativo na fábrica.`
            : `Ao marcar "${project.name}" como "${newStage}", verifique se os lançamentos financeiros e entregas no GitHub já foram revisados.`,
        confirmLabel: `Sim, mover para ${newStage}`,
        variant: newStage === 'Cancelado' ? 'danger' : 'primary',
        onConfirm: executeMove
      });
    } else {
      executeMove();
    }
  };

  const handleSaveProject = async (e) => {
    e.preventDefault();
    const d = projectModal.data;
    if (!d.name.trim() || !d.companyId || !d.responsibleId) {
      addToast('Preencha nome do projeto, cliente e responsável.', 'error');
      return;
    }
    const payload = {
      name: d.name.trim(),
      companyId: d.companyId,
      responsibleId: d.responsibleId,
      stage: d.stage,
      deadline: d.deadline || null,
      value: Number(d.value) || 0,
      description: d.description || ''
    };
    try {
      if (projectModal.mode === 'create') {
        const data = await apiFetch('/api/projetos', { method: 'POST', body: payload });
        setProjects((prev) => [data.project, ...prev]);
        addToast('Novo projeto cadastrado no Kanban!', 'success');
      } else {
        const data = await apiFetch(`/api/projetos/${d.id}`, { method: 'PUT', body: payload });
        setProjects((prev) => prev.map((p) => (p.id === d.id ? data.project : p)));
        addToast('Projeto atualizado com sucesso!', 'success');
      }
      setProjectFormDirty(false);
      setProjectModal({ open: false, mode: 'create', data: null });
    } catch (err) {
      handleApiError(err, 'Erro ao salvar o projeto.');
    }
  };

  const renderKanban = () => {
    const filtered = projects.filter((p) => {
      if (!kanbanSearch.trim()) return true;
      const q = kanbanSearch.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        getCompanyName(p.companyId).toLowerCase().includes(q) ||
        getUserName(p.responsibleId).toLowerCase().includes(q)
      );
    });

    return (
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0B1221] border border-slate-800/80 rounded-2xl p-5">
          <div>
            <h1 className="text-xl font-bold text-white">Kanban de Projetos</h1>
            <p className="text-xs text-slate-400">
              Acompanhe o ciclo de vida completo desde a projeção comercial até o faturamento.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={kanbanSearch}
                onChange={(e) => setKanbanSearch(e.target.value)}
                placeholder="Filtrar projeto ou cliente..."
                className="bg-[#060A12] border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
            <button
              type="button"
              onClick={() => setStagesModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#060A12] hover:bg-slate-800 border border-slate-700 text-xs font-bold text-cyan-300 transition-colors"
            >
              <Filter className="w-3.5 h-3.5" /> Gerenciar Etapas ({kanbanStages.length})
            </button>
            <button
              onClick={() => openProjectModal('create')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-xs font-bold text-white shadow-lg shadow-cyan-500/20"
            >
              <Plus className="w-4 h-4" /> Novo Projeto
            </button>
          </div>
        </div>

        {/* Colunas horizontais com rolagem fluida */}
        <div className="flex gap-4 overflow-x-auto pb-4 pt-1 select-none">
          {kanbanStages.map((stage) => {
            const stageProjects = filtered.filter((p) => p.stage === stage);
            const totalStageVal = stageProjects.reduce((acc, cur) => acc + (Number(cur.value) || 0), 0);

            return (
              <div
                key={stage}
                className="w-80 shrink-0 bg-[#0B1221] border border-slate-800/90 rounded-2xl flex flex-col max-h-[72vh]"
              >
                {/* Topo da coluna */}
                <div className="p-3.5 border-b border-slate-800/80 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-cyan-400" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                        {stage}
                      </h3>
                    </div>
                    <p className="text-[11px] font-mono text-emerald-400 mt-0.5">
                      {formatCurrencyBRL(totalStageVal)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-[#060A12] text-cyan-300 border border-slate-800">
                      {stageProjects.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveKanbanStage(stage)}
                      title={`Remover etapa "${stage}"`}
                      className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Lista de cartões */}
                <div className="p-3 space-y-3 overflow-y-auto flex-1">
                  {stageProjects.length === 0 ? (
                    <div className="border border-dashed border-slate-800 rounded-xl p-6 text-center">
                      <p className="text-xs text-slate-500">Nenhum projeto nesta etapa</p>
                    </div>
                  ) : (
                    stageProjects.map((proj) => {
                      const isOverdue =
                        proj.deadline < TODAY_ISO &&
                        !['Concluído', 'Faturado', 'Cancelado'].includes(proj.stage);

                      return (
                        <div
                          key={proj.id}
                          className="bg-[#060A12] border border-slate-800 hover:border-cyan-500/50 rounded-xl p-3.5 shadow-md transition-all group"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-[11px] font-semibold text-cyan-400 truncate">
                              {getCompanyName(proj.companyId)}
                            </span>
                            <button
                              onClick={() => openProjectModal('edit', proj)}
                              className="text-slate-400 hover:text-white p-1 rounded"
                              title="Detalhes / Editar"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <h4
                            onClick={() => openProjectModal('edit', proj)}
                            className="text-sm font-bold text-white mt-1 cursor-pointer hover:text-cyan-300 transition-colors"
                          >
                            {proj.name}
                          </h4>

                          <div className="mt-3 space-y-1.5 text-xs text-slate-400">
                            <div className="flex items-center justify-between">
                              <span>Responsável:</span>
                              <span className="text-slate-200 font-medium">{getUserName(proj.responsibleId)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span>Prazo:</span>
                              <span className={`font-mono ${isOverdue ? 'text-rose-400 font-bold' : 'text-slate-200'}`}>
                                {formatDateBR(proj.deadline)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span>Valor:</span>
                              <span className="font-mono font-semibold text-emerald-400">
                                {proj.value ? formatCurrencyBRL(proj.value) : 'Sob consulta'}
                              </span>
                            </div>
                          </div>

                          {/* Seletor rápido de mudança de etapa */}
                          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-2">
                            <span className="text-[10px] uppercase text-slate-500 font-semibold">Mover etapa:</span>
                            <select
                              value={proj.stage}
                              onChange={(e) => handleMoveProjectStage(proj, e.target.value)}
                              className="bg-[#0B1221] border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-200 focus:outline-none focus:border-cyan-400"
                            >
                              {kanbanStages.map((st) => (
                                <option key={st} value={st}>
                                  {st}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ==========================================
  // 3. MÓDULO: AGENDA
  // ==========================================
  const [agendaViewMode, setAgendaViewMode] = useState('calendario'); // 'calendario' | 'lista'
  const [selectedCalendarDay, setSelectedCalendarDay] = useState('2026-03-01');
  const [calendarCursor, setCalendarCursor] = useState({ year: 2026, month: 2 });

  useEffect(() => {
    const today = getTodayISO();
    setSelectedCalendarDay(today);
    const now = new Date();
    setCalendarCursor({ year: now.getFullYear(), month: now.getMonth() });
  }, []);
  const [appointmentModal, setAppointmentModal] = useState({ open: false, mode: 'create', data: null });

  const shiftCalendarMonth = (delta) => {
    setCalendarCursor((prev) => {
      const d = new Date(prev.year, prev.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  const goToCalendarToday = () => {
    const now = new Date();
    setCalendarCursor({ year: now.getFullYear(), month: now.getMonth() });
    setSelectedCalendarDay(getTodayISO());
  };

  const openAppointmentModal = (mode, item = null) => {
    if (mode === 'create' && !canDo('agenda', 'create')) {
      addToast('Sem permissão para agendar compromissos.', 'error');
      return;
    }
    if (mode === 'edit' && !canDo('agenda', 'edit')) {
      addToast('Sem permissão para editar compromissos.', 'error');
      return;
    }
    setAppointmentModal({
      open: true,
      mode,
      data: item
        ? { ...item }
        : {
            id: '',
            title: '',
            description: '',
            date: selectedCalendarDay || TODAY_ISO,
            time: '10:00',
            projectId: projects[0]?.id || '',
            companyId: companies[0]?.id || '',
            userId: currentUser?.id || users[0]?.id || ''
          }
    });
  };

  const handleSaveAppointment = async (e) => {
    e.preventDefault();
    const d = appointmentModal.data;
    if (!d.title.trim() || !d.date || !d.time) {
      addToast('Informe título, data e horário do compromisso.', 'error');
      return;
    }
    const payload = {
      title: d.title.trim(),
      description: d.description || '',
      date: d.date,
      time: d.time,
      projectId: d.projectId || null,
      companyId: d.companyId || null,
      userId: d.userId || currentUser?.id || null
    };
    try {
      if (appointmentModal.mode === 'create') {
        const data = await apiFetch('/api/agenda', { method: 'POST', body: payload });
        setAppointments((prev) => [...prev, data.appointment]);
        addToast('Compromisso registrado na agenda!', 'success');
      } else {
        const data = await apiFetch(`/api/agenda/${d.id}`, { method: 'PUT', body: payload });
        setAppointments((prev) => prev.map((a) => (a.id === d.id ? data.appointment : a)));
        addToast('Compromisso atualizado!', 'success');
      }
      setAppointmentModal({ open: false, mode: 'create', data: null });
    } catch (err) {
      handleApiError(err, 'Erro ao salvar o compromisso.');
    }
  };

  const handleDeleteAppointment = async (ev, successMessage = 'Compromisso removido.') => {
    try {
      await apiFetch(`/api/agenda/${ev.id}`, { method: 'DELETE' });
      setAppointments((prev) => prev.filter((a) => a.id !== ev.id));
      addToast(successMessage, 'info');
    } catch (err) {
      handleApiError(err, 'Erro ao excluir o compromisso.');
    }
  };

  const renderAgenda = () => {
    // Geração dinâmica dos dias do mês/ano navegado (com recuo do dia da semana inicial)
    const { year: calYear, month: calMonth } = calendarCursor;
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const leadingBlanks = new Date(calYear, calMonth, 1).getDay();
    const monthPrefix = `${calYear}-${String(calMonth + 1).padStart(2, '0')}`;
    const daysInCurrentMonth = Array.from({ length: daysInMonth }, (_, i) => {
      const dayNum = String(i + 1).padStart(2, '0');
      return `${monthPrefix}-${dayNum}`;
    });

    const appointmentsOnSelectedDay = appointments.filter((a) => a.date === selectedCalendarDay);

    return (
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0B1221] border border-slate-800/80 rounded-2xl p-5">
          <div>
            <h1 className="text-xl font-bold text-white">Agenda de Compromissos</h1>
            <p className="text-xs text-slate-400">
              Reuniões técnicas, dailies, homologações e alinhamentos vinculados a clientes e projetos.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-[#060A12] p-1 rounded-xl border border-slate-800 flex items-center">
              <button
                onClick={() => setAgendaViewMode('calendario')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${
                  agendaViewMode === 'calendario'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" /> Calendário
              </button>
              <button
                onClick={() => setAgendaViewMode('lista')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${
                  agendaViewMode === 'lista'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ListFilter className="w-3.5 h-3.5" /> Lista
              </button>
            </div>
            <button
              onClick={() => openAppointmentModal('create')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-xs font-bold text-white shadow-lg shadow-cyan-500/20"
            >
              <Plus className="w-4 h-4" /> Novo Compromisso
            </button>
          </div>
        </div>

        {agendaViewMode === 'calendario' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Grade de Calendário Mensal */}
            <div className="lg:col-span-2 bg-[#0B1221] border border-slate-800/80 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4 gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => shiftCalendarMonth(-1)}
                    className="p-1.5 rounded-lg bg-[#060A12] border border-slate-800 text-slate-300 hover:text-cyan-300"
                    title="Mês anterior"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <h2 className="text-base font-bold text-white min-w-[150px] text-center">
                    {MONTH_NAMES_PT[calMonth]} de {calYear}
                  </h2>
                  <button
                    type="button"
                    onClick={() => shiftCalendarMonth(1)}
                    className="p-1.5 rounded-lg bg-[#060A12] border border-slate-800 text-slate-300 hover:text-cyan-300"
                    title="Próximo mês"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={goToCalendarToday}
                    className="ml-1 px-2.5 py-1 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-[11px] font-semibold text-cyan-300"
                  >
                    Hoje
                  </button>
                </div>
                <span className="text-xs text-cyan-400 hidden sm:inline">Clique em um dia para filtrar</span>
              </div>
              <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-bold uppercase text-slate-400 mb-2">
                <div>Dom</div>
                <div>Seg</div>
                <div>Ter</div>
                <div>Qua</div>
                <div>Qui</div>
                <div>Sex</div>
                <div>Sáb</div>
              </div>
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: leadingBlanks }, (_, i) => (
                  <div key={`blank-${i}`} className="min-h-[72px]" />
                ))}
                {daysInCurrentMonth.map((iso) => {
                  const dayEvents = appointments.filter((a) => a.date === iso);
                  const isSelected = selectedCalendarDay === iso;
                  const isToday = iso === TODAY_ISO;
                  return (
                    <button
                      type="button"
                      key={iso}
                      onClick={() => setSelectedCalendarDay(iso)}
                      className={`min-h-[72px] p-2 rounded-xl border text-left transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'bg-cyan-500/15 border-cyan-400 shadow-md shadow-cyan-500/10'
                          : 'bg-[#060A12] border-slate-800/90 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span
                          className={`text-xs font-bold ${
                            isToday
                              ? 'px-1.5 py-0.5 rounded bg-emerald-500 text-slate-950'
                              : isSelected
                              ? 'text-cyan-300'
                              : 'text-slate-300'
                          }`}
                        >
                          {iso.split('-')[2]}
                        </span>
                        {dayEvents.length > 0 && (
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        )}
                      </div>
                      <div className="space-y-1 mt-1 w-full">
                        {dayEvents.slice(0, 2).map((ev) => (
                          <div
                            key={ev.id}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-cyan-200 truncate"
                          >
                            {ev.time} {ev.title}
                          </div>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Painel lateral do dia selecionado */}
            <div className="bg-[#0B1221] border border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                  <div>
                    <span className="text-xs uppercase text-cyan-400 font-semibold">Agenda do Dia</span>
                    <h3 className="text-lg font-bold text-white">{formatDateBR(selectedCalendarDay)}</h3>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-200">
                    {appointmentsOnSelectedDay.length} item(ns)
                  </span>
                </div>

                {appointmentsOnSelectedDay.length === 0 ? (
                  <div className="p-8 text-center bg-[#060A12] rounded-xl border border-dashed border-slate-800">
                    <p className="text-xs text-slate-400">Nenhum compromisso agendado para esta data.</p>
                    <button
                      onClick={() => openAppointmentModal('create')}
                      className="mt-3 text-xs font-semibold text-cyan-400 hover:underline"
                    >
                      + Cadastrar compromisso neste dia
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {appointmentsOnSelectedDay.map((ev) => (
                      <div key={ev.id} className="p-3.5 rounded-xl bg-[#060A12] border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-mono text-xs font-bold">
                            {ev.time}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openAppointmentModal('edit', ev)}
                              className="p-1 text-slate-400 hover:text-cyan-400"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (!canDo('agenda', 'delete')) {
                                  addToast('Sem permissão para excluir compromissos.', 'error');
                                  return;
                                }
                                askConfirmation({
                                  title: 'Excluir compromisso?',
                                  description: `Deseja remover "${ev.title}" da agenda?`,
                                  onConfirm: () => handleDeleteAppointment(ev, 'Compromisso removido.')
                                });
                              }}
                              className="p-1 text-slate-400 hover:text-rose-400"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <p className="text-sm font-bold text-white">{ev.title}</p>
                        <p className="text-xs text-slate-400">{ev.description}</p>
                        <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-300 space-y-0.5">
                          <p><strong className="text-slate-500">Projeto:</strong> {getProjectName(ev.projectId)}</p>
                          <p><strong className="text-slate-500">Cliente:</strong> {getCompanyName(ev.companyId)}</p>
                          <p><strong className="text-slate-500">Responsável:</strong> {getUserName(ev.userId)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Visão em Lista */
          <div className="bg-[#0B1221] border border-slate-800/80 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#060A12] border-b border-slate-800 text-[11px] font-bold uppercase text-slate-400">
                    <th className="py-3.5 px-4">Data & Hora</th>
                    <th className="py-3.5 px-4">Compromisso</th>
                    <th className="py-3.5 px-4">Projeto Relacionado</th>
                    <th className="py-3.5 px-4">Cliente / Empresa</th>
                    <th className="py-3.5 px-4">Responsável</th>
                    <th className="py-3.5 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {appointments.map((ev) => (
                    <tr key={ev.id} className="hover:bg-slate-800/30">
                      <td className="py-3.5 px-4 font-mono text-cyan-300 whitespace-nowrap">
                        {formatDateBR(ev.date)} às {ev.time}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-white">{ev.title}</p>
                        <p className="text-slate-400 text-[11px]">{ev.description}</p>
                      </td>
                      <td className="py-3.5 px-4 text-slate-200">{getProjectName(ev.projectId)}</td>
                      <td className="py-3.5 px-4 text-slate-300">{getCompanyName(ev.companyId)}</td>
                      <td className="py-3.5 px-4 text-emerald-400 font-medium">{getUserName(ev.userId)}</td>
                      <td className="py-3.5 px-4 text-right space-x-2 whitespace-nowrap">
                        <button
                          onClick={() => openAppointmentModal('edit', ev)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (!canDo('agenda', 'delete')) {
                              addToast('Sem permissão para excluir compromissos.', 'error');
                              return;
                            }
                            askConfirmation({
                              title: 'Excluir compromisso?',
                              description: `Deseja excluir "${ev.title}"?`,
                              onConfirm: () => handleDeleteAppointment(ev, 'Compromisso excluído.')
                            });
                          }}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-rose-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ==========================================
  // 3.5 MÓDULO: TASKS (TAREFAS DA EQUIPE)
  // ==========================================
  const [taskSearch, setTaskSearch] = useState('');
  const [taskStatusFilter, setTaskStatusFilter] = useState('todos');
  const [taskModal, setTaskModal] = useState({ open: false, mode: 'create', data: null });

  const openTaskModal = (mode, item = null) => {
    if (mode === 'create' && !canDo('tasks', 'create')) {
      addToast('Sem permissão para criar tasks.', 'error');
      return;
    }
    if (mode === 'edit' && !canDo('tasks', 'edit')) {
      addToast('Sem permissão para editar tasks.', 'error');
      return;
    }
    setTaskModal({
      open: true,
      mode,
      data: item
        ? { ...item }
        : {
            id: '',
            userId: currentUser?.id || users[0]?.id || '',
            description: '',
            date: TODAY_ISO,
            time: '09:00',
            priority: 'Média',
            notes: '',
            status: 'pendente'
          }
    });
  };

  const handleSaveTask = async (e) => {
    e.preventDefault();
    const d = taskModal.data;
    if (!d.description.trim() || !d.userId || !d.date || !d.time) {
      addToast('Preencha responsável, descrição, data e hora da task.', 'error');
      return;
    }
    const payload = {
      userId: d.userId,
      description: d.description.trim(),
      date: d.date,
      time: d.time,
      priority: d.priority,
      notes: d.notes || '',
      status: d.status
    };
    try {
      if (taskModal.mode === 'create') {
        const data = await apiFetch('/api/tasks', { method: 'POST', body: payload });
        setTasks((prev) => [data.task, ...prev]);
        addToast('Task cadastrada com sucesso!', 'success');
      } else {
        const data = await apiFetch(`/api/tasks/${d.id}`, { method: 'PUT', body: payload });
        setTasks((prev) => prev.map((t) => (t.id === d.id ? data.task : t)));
        addToast('Task atualizada com sucesso!', 'success');
      }
      setTaskModal({ open: false, mode: 'create', data: null });
    } catch (err) {
      handleApiError(err, 'Erro ao salvar a task.');
    }
  };

  const handleChangeTaskStatus = async (task, nextStatus) => {
    if (!canDo('tasks', 'edit')) {
      addToast('Sem permissão para alterar o status de tasks.', 'error');
      return;
    }
    try {
      const data = await apiFetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        body: { status: nextStatus }
      });
      setTasks((prev) => prev.map((item) => (item.id === task.id ? data.task : item)));
      addToast('Status da task atualizado!', 'success');
    } catch (err) {
      handleApiError(err, 'Erro ao atualizar o status da task.');
    }
  };

  const handleDeleteTask = async (task) => {
    try {
      await apiFetch(`/api/tasks/${task.id}`, { method: 'DELETE' });
      setTasks((prev) => prev.filter((item) => item.id !== task.id));
      addToast('Task excluída.', 'info');
    } catch (err) {
      handleApiError(err, 'Erro ao excluir a task.');
    }
  };

  const renderTasks = () => {
    const filteredTasks = tasks.filter((t) => {
      if (taskStatusFilter !== 'todos' && t.status !== taskStatusFilter) return false;
      if (!taskSearch.trim()) return true;
      const q = taskSearch.toLowerCase();
      return (
        t.description.toLowerCase().includes(q) ||
        (t.notes && t.notes.toLowerCase().includes(q)) ||
        getUserName(t.userId).toLowerCase().includes(q)
      );
    });

    return (
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0B1221] border border-slate-800/80 rounded-2xl p-5">
          <div>
            <h1 className="text-xl font-bold text-white">Tasks Operacionais</h1>
            <p className="text-xs text-slate-400">
              Controle de atividades, responsáveis, prioridades, prazos e status de execução.
            </p>
          </div>
          <button
            onClick={() => openTaskModal('create')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-xs font-bold text-white shadow-lg shadow-cyan-500/20 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" /> Nova Task
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#0B1221] border border-slate-800/80 rounded-2xl p-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={taskSearch}
              onChange={(e) => setTaskSearch(e.target.value)}
              placeholder="Pesquisar por descrição, observação ou responsável..."
              className="w-full bg-[#060A12] border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'todos', label: 'Todas' },
              { id: 'pendente', label: 'Pendente' },
              { id: 'em andamento', label: 'Em andamento' },
              { id: 'concluido', label: 'Concluído' }
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setTaskStatusFilter(st.id)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold ${
                  taskStatusFilter === st.id
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'bg-[#060A12] text-slate-400 border border-slate-800'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-[#0B1221] border border-slate-800/80 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#060A12] border-b border-slate-800 text-[11px] font-bold uppercase text-slate-400">
                  <th className="py-3.5 px-4">Data & Hora</th>
                  <th className="py-3.5 px-4">Descrição & Observação</th>
                  <th className="py-3.5 px-4">Responsável</th>
                  <th className="py-3.5 px-4">Prioridade</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      Nenhuma task encontrada para os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((task) => (
                    <tr key={task.id} className="hover:bg-slate-800/30">
                      <td className="py-3.5 px-4 font-mono text-cyan-300 whitespace-nowrap">
                        {formatDateBR(task.date)} às {task.time}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-white">{task.description}</p>
                        {task.notes && <p className="text-[11px] text-slate-400 mt-0.5">{task.notes}</p>}
                      </td>
                      <td className="py-3.5 px-4 text-slate-200 font-medium">
                        {getUserName(task.userId)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            task.priority === 'Alta' || task.priority === 'Urgente'
                              ? 'bg-rose-500/20 text-rose-300'
                              : task.priority === 'Média'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {task.priority}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <select
                          value={task.status}
                          onChange={(e) => handleChangeTaskStatus(task, e.target.value)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase border focus:outline-none ${
                            task.status === 'concluido'
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                              : task.status === 'em andamento'
                              ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                              : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                          }`}
                        >
                          <option value="pendente" className="bg-[#0B1221] text-slate-200">
                            Pendente
                          </option>
                          <option value="em andamento" className="bg-[#0B1221] text-slate-200">
                            Em andamento
                          </option>
                          <option value="concluido" className="bg-[#0B1221] text-slate-200">
                            Concluído
                          </option>
                        </select>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2 whitespace-nowrap">
                        <button
                          onClick={() => openTaskModal('edit', task)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (!canDo('tasks', 'delete')) {
                              addToast('Sem permissão para excluir tasks.', 'error');
                              return;
                            }
                            askConfirmation({
                              title: 'Excluir Task?',
                              description: `Deseja remover a task "${task.description}"?`,
                              onConfirm: () => handleDeleteTask(task)
                            });
                          }}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-rose-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // ==========================================
  // 4. MÓDULO: EMPRESAS (CLIENTES E FORNECEDORES)
  // ==========================================
  const [companySearch, setCompanySearch] = useState('');
  const [companyTypeFilter, setCompanyTypeFilter] = useState('todos');
  const [companyModal, setCompanyModal] = useState({ open: false, mode: 'create', data: null });
  const [cepStatusMessage, setCepStatusMessage] = useState('');
  const [newIndustryName, setNewIndustryName] = useState('');
  const [newResponsibleInput, setNewResponsibleInput] = useState('');
  const [newProductTypeInput, setNewProductTypeInput] = useState('Sistema');
  const [newProductDescInput, setNewProductDescInput] = useState('');

  const openCompanyModal = (mode, comp = null) => {
    if (mode === 'create' && !canDo('empresas', 'create')) {
      addToast('Sem permissão para cadastrar empresas.', 'error');
      return;
    }
    if (mode === 'edit' && !canDo('empresas', 'edit')) {
      addToast('Sem permissão para editar empresas.', 'error');
      return;
    }
    setCepStatusMessage('');
    setNewResponsibleInput('');
    setNewProductTypeInput('Sistema');
    setNewProductDescInput('');
    setCompanyModal({
      open: true,
      mode,
      data: comp
        ? {
            ...comp,
            initialPassword: '',
            responsibles:
              Array.isArray(comp.responsibles) && comp.responsibles.length > 0
                ? [...comp.responsibles]
                : comp.responsibleName
                ? [comp.responsibleName]
                : [''],
            linkedProducts: Array.isArray(comp.linkedProducts) ? [...comp.linkedProducts] : []
          }
        : {
            id: '',
            personType: 'CNPJ',
            document: '',
            name: '',
            tradeName: '',
            cep: '',
            street: '',
            city: '',
            state: '',
            industry: industries[0] || '',
            responsibleName: '',
            responsibles: [''],
            linkedProducts: [],
            email: '',
            initialPassword: '',
            hasSavedPassword: false,
            phone: '',
            slug: '',
            pixKey: '',
            defaultExpenseCategory: categories.saida[0]?.name || 'Infraestrutura Cloud',
            registrationType: 'Cliente',
            acquiredByType: 'user',
            acquiredByUserId: users[0]?.id || '',
            acquiredByExternalName: ''
          }
    });
  };

  const handleCepLookup = async (rawCep) => {
    const formatted = formatCEP(rawCep);
    const digits = formatted.replace(/\D/g, '');
    setCompanyModal((prev) => ({
      ...prev,
      data: { ...prev.data, cep: formatted }
    }));

    if (digits.length === 8) {
      setCepStatusMessage('Consultando CEP automaticamente...');
      try {
        const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
        const json = await res.json();
        if (!json.erro) {
          setCompanyModal((prev) => ({
            ...prev,
            data: {
              ...prev.data,
              street: json.logradouro || prev.data.street,
              city: json.localidade || prev.data.city,
              state: json.uf || prev.data.state
            }
          }));
          setCepStatusMessage('Endereço preenchido via consulta automática de CEP.');
        } else {
          setCepStatusMessage('CEP não encontrado. Preencha o endereço manualmente abaixo.');
        }
      } catch {
        setCepStatusMessage('Consulta de CEP offline ou indisponível. Preenchimento manual habilitado.');
      }
    }
  };

  const handleSaveCompany = async (e) => {
    e.preventDefault();
    const d = companyModal.data;
    if (!d.name.trim() || !d.document.trim() || !d.email.trim()) {
      addToast('Preencha CPF/CNPJ, Nome/Razão Social e E-mail.', 'error');
      return;
    }

    const cleanedResponsibles = (d.responsibles || []).map((r) => r.trim()).filter(Boolean);
    const primaryResponsible = cleanedResponsibles[0] || d.responsibleName || '';

    const payload = {
      ...d,
      responsibleName: primaryResponsible,
      responsibles: cleanedResponsibles.length > 0 ? cleanedResponsibles : primaryResponsible ? [primaryResponsible] : [],
      linkedProducts: d.linkedProducts || [],
      slug: d.slug || createSlug(d.tradeName || d.name),
      hasSavedPassword: d.hasSavedPassword || Boolean(d.initialPassword)
    };

    try {
      if (companyModal.mode === 'create') {
        const res = await apiFetch('/api/empresas', {
          method: 'POST',
          body: payload
        });
        const createdComp = res?.company || { ...payload, id: 'c_' + Date.now() };
        delete createdComp.initialPassword;
        setCompanies((prev) => [createdComp, ...prev]);
        if (res?.industryName && !industries.includes(res.industryName)) {
          setIndustries((prev) => [...prev, res.industryName]);
        }
        addToast('Empresa cadastrada com sucesso!', 'success');
      } else {
        const res = await apiFetch(`/api/empresas/${payload.id}`, {
          method: 'PUT',
          body: payload
        });
        const updatedComp = res?.company || payload;
        delete updatedComp.initialPassword;
        setCompanies((prev) => prev.map((c) => (c.id === updatedComp.id ? updatedComp : c)));
        if (res?.industryName && !industries.includes(res.industryName)) {
          setIndustries((prev) => [...prev, res.industryName]);
        }
        addToast('Cadastro da empresa atualizado!', 'success');
      }
      setCompanyModal({ open: false, mode: 'create', data: null });
    } catch (err) {
      handleApiError(err, 'Erro ao salvar empresa.');
    }
  };

  const renderEmpresas = () => {
    const filtered = companies.filter((c) => {
      if (companyTypeFilter !== 'todos' && c.registrationType !== companyTypeFilter && c.registrationType !== 'Ambos') {
        return false;
      }
      if (!companySearch.trim()) return true;
      const q = companySearch.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        (c.tradeName && c.tradeName.toLowerCase().includes(q)) ||
        c.document.toLowerCase().includes(q) ||
        c.industry.toLowerCase().includes(q)
      );
    });

    return (
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0B1221] border border-slate-800/80 rounded-2xl p-5">
          <div>
            <h1 className="text-xl font-bold text-white">Empresas (Clientes e Fornecedores)</h1>
            <p className="text-xs text-slate-400">
              Gestão unificada de clientes, parceiros e fornecedores com automação de categorias e chaves Pix.
            </p>
          </div>
          <button
            onClick={() => openCompanyModal('create')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-xs font-bold text-white shadow-lg shadow-cyan-500/20 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" /> Nova Empresa
          </button>
        </div>

        {/* Barra de Pesquisa e Filtros */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#0B1221] border border-slate-800/80 rounded-2xl p-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={companySearch}
              onChange={(e) => setCompanySearch(e.target.value)}
              placeholder="Pesquisar por Razão Social, Nome Fantasia, CPF/CNPJ ou ramo..."
              className="w-full bg-[#060A12] border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
            />
          </div>
          <div className="flex items-center gap-2">
            {['todos', 'Cliente', 'Fornecedor'].map((t) => (
              <button
                key={t}
                onClick={() => setCompanyTypeFilter(t)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold capitalize ${
                  companyTypeFilter === t
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'bg-[#060A12] text-slate-400 border border-slate-800'
                }`}
              >
                {t === 'todos' ? 'Todos' : t + 's'}
              </button>
            ))}
          </div>
        </div>

        {/* Tabela de Empresas */}
        <div className="bg-[#0B1221] border border-slate-800/80 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#060A12] border-b border-slate-800 text-[11px] font-bold uppercase text-slate-400">
                  <th className="py-3.5 px-4">Empresa / Documento</th>
                  <th className="py-3.5 px-4">Tipo & Ramo</th>
                  <th className="py-3.5 px-4">Responsável & Contato</th>
                  <th className="py-3.5 px-4">Origem Comercial</th>
                  <th className="py-3.5 px-4">Chave Pix / Slug</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {filtered.map((comp) => (
                  <tr key={comp.id} className="hover:bg-slate-800/30">
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-white">{comp.tradeName || comp.name}</p>
                      <p className="text-[11px] text-slate-400">{comp.name}</p>
                      <span className="inline-block mt-1 font-mono text-[11px] text-cyan-300">
                        {comp.personType}: {comp.document}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          comp.registrationType === 'Cliente'
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : comp.registrationType === 'Fornecedor'
                            ? 'bg-amber-500/15 text-amber-300'
                            : 'bg-cyan-500/15 text-cyan-300'
                        }`}
                      >
                        {comp.registrationType}
                      </span>
                      <p className="text-slate-300 mt-1">{comp.industry}</p>
                      {comp.linkedProducts && comp.linkedProducts.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {comp.linkedProducts.map((lp, idx) => (
                            <span
                              key={lp.id || idx}
                              className="px-1.5 py-0.5 rounded bg-[#060A12] border border-slate-800 text-[10px] text-cyan-300"
                            >
                              {lp.type}: {lp.description}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="text-slate-200 font-medium">
                        {(comp.responsibles && comp.responsibles.length > 0
                          ? comp.responsibles
                          : [comp.responsibleName]
                        )
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                      <p className="text-slate-400">{comp.email}</p>
                      <p className="text-slate-400 font-mono">{comp.phone}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      {comp.acquiredByType === 'user' ? (
                        <span className="text-slate-200 flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
                          {getUserName(comp.acquiredByUserId)}
                        </span>
                      ) : (
                        <span className="text-amber-300">
                          Externo: {comp.acquiredByExternalName}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-mono text-emerald-400 text-[11px]">Pix: {comp.pixKey || '-'}</p>
                      <p className="font-mono text-slate-500 text-[11px]">/{comp.slug}</p>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => openCompanyModal('edit', comp)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400"
                        title="Editar"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (!canDo('empresas', 'delete')) {
                            addToast('Sem permissão para excluir empresas.', 'error');
                            return;
                          }
                          askConfirmation({
                            title: 'Excluir Empresa?',
                            description: `Confirma a exclusão de "${comp.name}"?`,
                            onConfirm: async () => {
                              try {
                                await apiFetch(`/api/empresas/${comp.id}`, { method: 'DELETE' });
                                setCompanies((prev) => prev.filter((item) => item.id !== comp.id));
                                addToast('Empresa excluída com sucesso.', 'info');
                              } catch (err) {
                                handleApiError(err, 'Erro ao excluir empresa.');
                              }
                            }
                          });
                        }}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-rose-400"
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // ==========================================
  // 5. MÓDULO: USUÁRIOS DO SISTEMA E MATRIZ DE PERMISSÕES
  // ==========================================
  const [userModal, setUserModal] = useState({ open: false, mode: 'create', data: null });

  const createDefaultPermissions = () => {
    const obj = {};
    SYSTEM_MODULES.forEach((m) => {
      obj[m.id] = { access: true, create: false, edit: false, delete: false };
    });
    return obj;
  };

  const openUserModal = (mode, u = null) => {
    if (mode === 'create' && !canDo('usuarios', 'create')) {
      addToast('Você não tem permissão para incluir usuários.', 'error');
      return;
    }
    if (mode === 'edit' && !canDo('usuarios', 'edit')) {
      addToast('Você não tem permissão para editar usuários.', 'error');
      return;
    }
    setUserModal({
      open: true,
      mode,
      data: u
        ? JSON.parse(JSON.stringify({ ...u, passwordInput: '' }))
        : {
            id: '',
            name: '',
            username: '',
            email: '',
            passwordInput: '',
            hasSavedPassword: false,
            phone: '',
            cpf: '',
            role: '',
            permissions: createDefaultPermissions()
          }
    });
  };

  // Regra de validação: impede que um usuário tenha ações permitidas sem acesso ao módulo
  const togglePermissionCell = (modId, actionKey) => {
    setUserModal((prev) => {
      const perms = { ...prev.data.permissions };
      const currentMod = { ...perms[modId] };
      const nextVal = !currentMod[actionKey];

      if (actionKey === 'access' && !nextVal) {
        // Se desmarcar acesso ao menu, desmarca automaticamente Incluir, Editar e Deletar
        currentMod.access = false;
        currentMod.create = false;
        currentMod.edit = false;
        currentMod.delete = false;
      } else if (actionKey !== 'access' && nextVal) {
        // Se marcar Incluir, Editar ou Deletar, habilita automaticamente o Acesso ao módulo
        currentMod[actionKey] = true;
        currentMod.access = true;
      } else {
        currentMod[actionKey] = nextVal;
      }

      perms[modId] = currentMod;
      return {
        ...prev,
        data: { ...prev.data, permissions: perms }
      };
    });
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    const d = userModal.data;
    if (!d.name.trim() || !d.username.trim() || !d.email.trim()) {
      addToast('Preencha Nome, Usuário e E-mail.', 'error');
      return;
    }
    const payload = {
      ...d,
      hasSavedPassword: d.hasSavedPassword || Boolean(d.passwordInput)
    };

    try {
      if (userModal.mode === 'create') {
        const res = await apiFetch('/api/usuarios', {
          method: 'POST',
          body: payload
        });
        const createdUser = res?.user || { ...payload, id: 'u_' + Date.now() };
        delete createdUser.passwordInput;
        setUsers((prev) => [...prev, createdUser]);
        addToast('Usuário cadastrado com sucesso!', 'success');
      } else {
        const res = await apiFetch(`/api/usuarios/${payload.id}`, {
          method: 'PUT',
          body: payload
        });
        const updatedUser = res?.user || payload;
        delete updatedUser.passwordInput;
        setUsers((prev) => prev.map((item) => (item.id === updatedUser.id ? updatedUser : item)));
        if (currentUser?.id === updatedUser.id) {
          setCurrentUser((prev) => ({ ...prev, ...updatedUser }));
        }
        addToast('Permissões e dados do usuário atualizados!', 'success');
      }
      setUserModal({ open: false, mode: 'create', data: null });
    } catch (err) {
      handleApiError(err, 'Erro ao salvar usuário.');
    }
  };

  const renderUsuarios = () => {
    return (
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0B1221] border border-slate-800/80 rounded-2xl p-5">
          <div>
            <h1 className="text-xl font-bold text-white">Usuários do Sistema & Permissões</h1>
            <p className="text-xs text-slate-400">
              Controle granular de acesso por módulo e ação (Acessar, Incluir, Editar e Deletar).
            </p>
          </div>
          <button
            onClick={() => openUserModal('create')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-xs font-bold text-white shadow-lg shadow-cyan-500/20"
          >
            <Plus className="w-4 h-4" /> Novo Usuário
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {users.map((u) => {
            const accessibleCount = Object.values(u.permissions || {}).filter((p) => p.access).length;
            return (
              <div
                key={u.id}
                className="bg-[#0B1221] border border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-cyan-400">
                        {u.role}
                      </span>
                      <h3 className="text-base font-bold text-white mt-0.5">{u.name}</h3>
                      <p className="text-xs text-slate-400 font-mono">@{u.username} • {u.email}</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Senha Criptografada
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-4 p-3 rounded-xl bg-[#060A12] border border-slate-800 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase">CPF</span>
                      <span className="font-mono text-slate-200">{u.cpf}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase">Contato</span>
                      <span className="font-mono text-slate-200">{u.phone}</span>
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="text-xs text-slate-400 mb-2">
                      Módulos liberados ({accessibleCount}/{SYSTEM_MODULES.length}):
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {SYSTEM_MODULES.map((m) => {
                        const p = u.permissions?.[m.id];
                        if (!p?.access) return null;
                        return (
                          <span
                            key={m.id}
                            className="px-2 py-0.5 rounded-md bg-slate-800 text-[11px] text-slate-200 border border-slate-700"
                          >
                            {m.label}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between">
                  <button
                    onClick={() => openUserModal('edit', u)}
                    className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5"
                  >
                    <Shield className="w-4 h-4" /> Configurar Matriz de Permissões
                  </button>
                  {u.id !== currentUser?.id && (
                    <button
                      onClick={() =>
                        askConfirmation({
                          title: 'Excluir Usuário?',
                          description: `Deseja remover o acesso de "${u.name}"?`,
                          onConfirm: async () => {
                            try {
                              await apiFetch(`/api/usuarios/${u.id}`, { method: 'DELETE' });
                              setUsers((prev) => prev.filter((item) => item.id !== u.id));
                              addToast('Usuário excluído.', 'info');
                            } catch (err) {
                              handleApiError(err, 'Erro ao excluir usuário.');
                            }
                          }
                        })
                      }
                      className="text-xs text-rose-400 hover:underline"
                    >
                      Excluir
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ==========================================
  // 6. MÓDULO: FINANCEIRO (PAGAR, RECEBER, PARCELAS E CATEGORIAS)
  // ==========================================
  const [financeTab, setFinanceTab] = useState('receber'); // 'receber' | 'pagar' | 'cat_entrada' | 'cat_saida'
  const [finFilterSearch, setFinFilterSearch] = useState('');
  const [finFilterStatus, setFinFilterStatus] = useState('todos');
  const [finFilterMinVal, setFinFilterMinVal] = useState('');
  const [finFilterMaxVal, setFinFilterMaxVal] = useState('');
  const [financeModal, setFinanceModal] = useState({ open: false, mode: 'create', data: null });
  const [newCatInput, setNewCatInput] = useState('');
  const [newSubcatInputs, setNewSubcatInputs] = useState({});

  const openFinanceModal = (type, item = null) => {
    const catList = type === 'receber' ? categories.entrada : categories.saida;
    const defaultCat = catList[0]?.name || '';
    const defaultSub = catList[0]?.subcategories?.[0] || '';

    setFinanceModal({
      open: true,
      mode: item ? 'edit' : 'create',
      data: item
        ? {
            ...item,
            generateInstallments: false,
            installmentCount: 2,
            installmentRule: '30dias',
            customInterval: 10,
            customUnit: 'dias',
            specificDates: []
          }
        : {
            id: '',
            type,
            category: defaultCat,
            subcategory: defaultSub,
            companyId: companies[0]?.id || '',
            description: '',
            notes: '',
            value: 0,
            dueDate: TODAY_ISO,
            status: 'pendente',
            generateInstallments: false,
            installmentCount: 3,
            installmentRule: '15dias', // 'especifica' | '7dias' | '15dias' | 'personalizada'
            customInterval: 1,
            customUnit: 'meses', // 'dias' | 'meses'
            specificDates: [TODAY_ISO, addDays(TODAY_ISO, 15), addDays(TODAY_ISO, 30)]
          }
    });
  };

  // Cálculo automático da prévia de parcelas antes de salvar
  const previewInstallments = useMemo(() => {
    const d = financeModal.data;
    if (!d || !d.generateInstallments) return [];
    const count = Math.max(2, Math.min(24, Number(d.installmentCount) || 2));
    const total = Number(d.value) || 0;
    const basePart = Math.floor((total / count) * 100) / 100;
    const remainder = Number((total - basePart * count).toFixed(2));

    return Array.from({ length: count }, (_, idx) => {
      let due = d.dueDate || TODAY_ISO;
      if (d.installmentRule === '7dias') {
        due = addDays(d.dueDate || TODAY_ISO, idx * 7);
      } else if (d.installmentRule === '15dias') {
        due = addDays(d.dueDate || TODAY_ISO, idx * 15);
      } else if (d.installmentRule === 'personalizada') {
        const step = Math.max(1, Number(d.customInterval) || 1) * idx;
        due = d.customUnit === 'meses' ? addMonths(d.dueDate || TODAY_ISO, step) : addDays(d.dueDate || TODAY_ISO, step);
      } else if (d.installmentRule === 'especifica') {
        due = d.specificDates?.[idx] || addDays(d.dueDate || TODAY_ISO, idx * 30);
      }

      const val = idx === 0 ? Number((basePart + remainder).toFixed(2)) : basePart;
      return {
        number: idx + 1,
        total: count,
        dueDate: due,
        value: val,
        description: `${d.description || 'Lançamento'} (Parcela ${idx + 1}/${count})`
      };
    });
  }, [financeModal.data]);

  const handleSaveFinance = async (e) => {
    e.preventDefault();
    const d = financeModal.data;
    if (!d.description.trim() || !d.companyId || d.value <= 0) {
      addToast('Informe descrição, empresa relacionada e um valor maior que R$ 0,00.', 'error');
      return;
    }

    try {
      if (financeModal.mode === 'create' && d.generateInstallments && previewInstallments.length > 1) {
        const res = await apiFetch('/api/financeiro', {
          method: 'POST',
          body: {
            ...d,
            generateInstallments: true,
            installments: previewInstallments
          }
        });
        const createdList = Array.isArray(res?.finances)
          ? res.finances
          : previewInstallments.map((inst, i) => ({
              id: `fin_${Date.now()}_${i}`,
              type: d.type,
              category: d.category,
              subcategory: d.subcategory,
              companyId: d.companyId,
              description: inst.description,
              notes: d.notes,
              value: inst.value,
              dueDate: inst.dueDate,
              status: d.status
            }));
        setFinances((prev) => [...createdList, ...prev]);
        addToast(`${createdList.length} parcelas geradas e lançadas com sucesso!`, 'success');
      } else if (financeModal.mode === 'create') {
        const res = await apiFetch('/api/financeiro', {
          method: 'POST',
          body: d
        });
        const createdFin = res?.finance || {
          id: 'fin_' + Date.now(),
          type: d.type,
          category: d.category,
          subcategory: d.subcategory,
          companyId: d.companyId,
          description: d.description,
          notes: d.notes,
          value: d.value,
          dueDate: d.dueDate,
          status: d.status
        };
        setFinances((prev) => [createdFin, ...prev]);
        addToast('Lançamento financeiro registrado!', 'success');
      } else {
        const res = await apiFetch(`/api/financeiro/${d.id}`, {
          method: 'PUT',
          body: d
        });
        const updatedFin = res?.finance || d;
        setFinances((prev) => prev.map((f) => (f.id === updatedFin.id ? updatedFin : f)));
        addToast('Lançamento atualizado!', 'success');
      }
      setFinanceModal({ open: false, mode: 'create', data: null });
    } catch (err) {
      handleApiError(err, 'Erro ao salvar lançamento financeiro.');
    }
  };

  const renderFinanceiro = () => {
    const isEntryOrOutTab = financeTab === 'receber' || financeTab === 'pagar';

    const filteredFinances = finances.filter((f) => {
      if (f.type !== financeTab) return false;
      if (finFilterStatus !== 'todos' && f.status !== finFilterStatus) return false;
      if (finFilterMinVal !== '' && f.value < Number(finFilterMinVal)) return false;
      if (finFilterMaxVal !== '' && f.value > Number(finFilterMaxVal)) return false;
      if (finFilterSearch.trim()) {
        const q = finFilterSearch.toLowerCase();
        const matchDesc = f.description.toLowerCase().includes(q);
        const matchComp = getCompanyName(f.companyId).toLowerCase().includes(q);
        const matchCat = f.category.toLowerCase().includes(q);
        if (!matchDesc && !matchComp && !matchCat) return false;
      }
      return true;
    });

    const catGroupKey = financeTab === 'cat_entrada' ? 'entrada' : 'saida';

    return (
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0B1221] border border-slate-800/80 rounded-2xl p-5">
          <div>
            <h1 className="text-xl font-bold text-white">Gestão Financeira</h1>
            <p className="text-xs text-slate-400">
              Contas a pagar, contas a receber, geração inteligente de parcelas e estrutura de categorias.
            </p>
          </div>
          {isEntryOrOutTab && (
            <button
              onClick={() => openFinanceModal(financeTab)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-xs font-bold text-white shadow-lg shadow-cyan-500/20"
            >
              <Plus className="w-4 h-4" />
              {financeTab === 'receber' ? 'Nova Conta a Receber' : 'Nova Conta a Pagar'}
            </button>
          )}
        </div>

        {/* Sub-navegação das 4 áreas do Financeiro */}
        <div className="flex flex-wrap gap-2 bg-[#0B1221] p-2 rounded-2xl border border-slate-800/80">
          {[
            { id: 'receber', label: 'Contas a Receber' },
            { id: 'pagar', label: 'Contas a Pagar' },
            { id: 'cat_entrada', label: 'Categorias de Entrada' },
            { id: 'cat_saida', label: 'Categorias de Saída' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFinanceTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                financeTab === tab.id
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {isEntryOrOutTab ? (
          <>
            {/* Filtros de Lançamentos */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-[#0B1221] border border-slate-800/80 rounded-2xl p-4">
              <div className="sm:col-span-2 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={finFilterSearch}
                  onChange={(e) => setFinFilterSearch(e.target.value)}
                  placeholder="Filtrar por descrição, empresa ou categoria..."
                  className="w-full bg-[#060A12] border border-slate-800 rounded-xl pl-10 pr-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              </div>
              <div>
                <select
                  value={finFilterStatus}
                  onChange={(e) => setFinFilterStatus(e.target.value)}
                  className="w-full bg-[#060A12] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                >
                  <option value="todos">Todas as Situações</option>
                  <option value="pendente">Pendente</option>
                  <option value="pago">{financeTab === 'receber' ? 'Recebido' : 'Pago'}</option>
                  <option value="vencido">Vencido</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Valor mín."
                  value={finFilterMinVal}
                  onChange={(e) => setFinFilterMinVal(e.target.value)}
                  className="w-1/2 bg-[#060A12] border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-white"
                />
                <input
                  type="number"
                  placeholder="Valor máx."
                  value={finFilterMaxVal}
                  onChange={(e) => setFinFilterMaxVal(e.target.value)}
                  className="w-1/2 bg-[#060A12] border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-white"
                />
              </div>
            </div>

            {/* Tabela de Lançamentos */}
            <div className="bg-[#0B1221] border border-slate-800/80 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#060A12] border-b border-slate-800 text-[11px] font-bold uppercase text-slate-400">
                      <th className="py-3.5 px-4">Vencimento</th>
                      <th className="py-3.5 px-4">Descrição & Observações</th>
                      <th className="py-3.5 px-4">Empresa</th>
                      <th className="py-3.5 px-4">Categoria / Subcategoria</th>
                      <th className="py-3.5 px-4">Situação</th>
                      <th className="py-3.5 px-4 text-right">Valor (BRL)</th>
                      <th className="py-3.5 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-xs">
                    {filteredFinances.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-800/30">
                        <td className="py-3.5 px-4 font-mono text-slate-200 whitespace-nowrap">
                          {formatDateBR(item.dueDate)}
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-white">{item.description}</p>
                          {item.notes && <p className="text-[11px] text-slate-400">{item.notes}</p>}
                        </td>
                        <td className="py-3.5 px-4 text-cyan-300 font-medium">
                          {getCompanyName(item.companyId)}
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="text-slate-200">{item.category}</p>
                          <p className="text-[11px] text-slate-400">{item.subcategory}</p>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              item.status === 'pago'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : item.status === 'vencido'
                                ? 'bg-rose-500/20 text-rose-300'
                                : item.status === 'cancelado'
                                ? 'bg-slate-700 text-slate-400'
                                : 'bg-amber-500/20 text-amber-300'
                            }`}
                          >
                            {item.status === 'pago'
                              ? item.type === 'receber'
                                ? 'Recebido'
                                : 'Pago'
                              : item.status}
                          </span>
                        </td>
                        <td
                          className={`py-3.5 px-4 text-right font-mono font-bold whitespace-nowrap ${
                            item.type === 'receber' ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {formatCurrencyBRL(item.value)}
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-2 whitespace-nowrap">
                          <button
                            onClick={() => openFinanceModal(item.type, item)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() =>
                              askConfirmation({
                                title: 'Excluir Lançamento?',
                                description: `Confirma a exclusão de "${item.description}"?`,
                                onConfirm: async () => {
                                  try {
                                    await apiFetch(`/api/financeiro/${item.id}`, { method: 'DELETE' });
                                    setFinances((prev) => prev.filter((f) => f.id !== item.id));
                                    addToast('Lançamento removido com sucesso.', 'info');
                                  } catch (err) {
                                    handleApiError(err, 'Erro ao excluir lançamento.');
                                  }
                                }
                              })
                            }
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-rose-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          /* Gestão de Categorias e Subcategorias de Entrada ou Saída */
          <div className="bg-[#0B1221] border border-slate-800/80 rounded-2xl p-5 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-bold text-white">
                  {catGroupKey === 'entrada'
                    ? 'Categorias e Subcategorias de Entrada (Receitas)'
                    : 'Categorias e Subcategorias de Saída (Despesas)'}
                </h2>
                <p className="text-xs text-slate-400">
                  Organize o plano de contas usado nos filtros e lançamentos financeiros.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newCatInput}
                  onChange={(e) => setNewCatInput(e.target.value)}
                  placeholder="Nova categoria principal..."
                  className="bg-[#060A12] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
                <button
                  type="button"
                  onClick={async () => {
                    if (!newCatInput.trim()) return;
                    const catName = newCatInput.trim();
                    try {
                      const res = await apiFetch('/api/financeiro/categorias', {
                        method: 'POST',
                        body: { type: catGroupKey, name: catName }
                      });
                      const createdCat = res?.category || {
                        id: 'cat_' + Date.now(),
                        name: catName,
                        subcategories: ['Geral']
                      };
                      setCategories((prev) => ({
                        ...prev,
                        [catGroupKey]: [...prev[catGroupKey], createdCat]
                      }));
                      setNewCatInput('');
                      addToast('Categoria adicionada!', 'success');
                    } catch (err) {
                      handleApiError(err, 'Erro ao cadastrar categoria.');
                    }
                  }}
                  className="px-3.5 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs"
                >
                  + Categoria
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {categories[catGroupKey].map((cat) => (
                <div key={cat.id} className="bg-[#060A12] border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-cyan-300">{cat.name}</h3>
                    <ul className="mt-3 space-y-1.5">
                      {cat.subcategories.map((sub, i) => (
                        <li
                          key={i}
                          className="text-xs text-slate-300 flex items-center justify-between bg-[#0B1221] px-2.5 py-1.5 rounded-lg"
                        >
                          <span>{sub}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center gap-2">
                    <input
                      type="text"
                      value={newSubcatInputs[cat.id] || ''}
                      onChange={(e) =>
                        setNewSubcatInputs((prev) => ({ ...prev, [cat.id]: e.target.value }))
                      }
                      placeholder="Nova subcategoria..."
                      className="flex-1 bg-[#0B1221] border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        const val = (newSubcatInputs[cat.id] || '').trim();
                        if (!val) return;
                        try {
                          await apiFetch('/api/financeiro/categorias', {
                            method: 'POST',
                            body: {
                              action: 'create_subcategory',
                              categoryId: cat.id,
                              name: val
                            }
                          });
                          setCategories((prev) => ({
                            ...prev,
                            [catGroupKey]: prev[catGroupKey].map((c) =>
                              c.id === cat.id ? { ...c, subcategories: [...c.subcategories, val] } : c
                            )
                          }));
                          setNewSubcatInputs((prev) => ({ ...prev, [cat.id]: '' }));
                          addToast('Subcategoria incluída!', 'success');
                        } catch (err) {
                          handleApiError(err, 'Erro ao incluir subcategoria.');
                        }
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ==========================================
  // 7. MÓDULO: ARQUIVOS E PROJETOS NO GITHUB
  // ==========================================
  const [repoModal, setRepoModal] = useState({ open: false, mode: 'create', data: null });
  const [newFileTitle, setNewFileTitle] = useState('');
  const [newFileUrl, setNewFileUrl] = useState('');

  const openRepoModal = (mode, item = null) => {
    setNewFileTitle('');
    setNewFileUrl('');
    setRepoModal({
      open: true,
      mode,
      data: item
        ? JSON.parse(JSON.stringify(item))
        : {
            id: '',
            projectId: projects[0]?.id || '',
            repoName: 'uply-software/',
            repoUrl: 'https://github.com/uply-software/',
            version: 'v1.0.0',
            description: '',
            notes: '',
            files: []
          }
    });
  };

  const handleSaveRepo = async (e) => {
    e.preventDefault();
    const d = repoModal.data;
    if (!d.repoName.trim() || !d.repoUrl.trim()) {
      addToast('Informe o nome e o link do repositório no GitHub.', 'error');
      return;
    }

    try {
      if (repoModal.mode === 'create') {
        const res = await apiFetch('/api/repositorios', {
          method: 'POST',
          body: d
        });
        const createdRepo = res?.repo || { ...d, id: 'r_' + Date.now() };
        setRepos((prev) => [createdRepo, ...prev]);
        addToast('Repositório e arquivos registrados!', 'success');
      } else {
        const res = await apiFetch(`/api/repositorios/${d.id}`, {
          method: 'PUT',
          body: d
        });
        const updatedRepo = res?.repo || d;
        setRepos((prev) => prev.map((r) => (r.id === updatedRepo.id ? updatedRepo : r)));
        addToast('Registro do repositório atualizado!', 'success');
      }
      setRepoModal({ open: false, mode: 'create', data: null });
    } catch (err) {
      handleApiError(err, 'Erro ao salvar repositório.');
    }
  };

  const renderArquivos = () => {
    return (
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0B1221] border border-slate-800/80 rounded-2xl p-5">
          <div>
            <h1 className="text-xl font-bold text-white">Arquivos e Projetos no GitHub</h1>
            <p className="text-xs text-slate-400">
              Catálogo centralizado de repositórios, releases e documentação técnica dos projetos.
            </p>
          </div>
          <button
            onClick={() => openRepoModal('create')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-xs font-bold text-white shadow-lg shadow-cyan-500/20"
          >
            <Plus className="w-4 h-4" /> Registrar Repositório / Arquivos
          </button>
        </div>

        {/* Banner informativo transparente sobre futura integração OAuth GitHub */}
        <div className="bg-gradient-to-r from-cyan-950/50 via-[#0B1221] to-emerald-950/30 border border-cyan-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-white">
                Modo MVP: Cadastro e Vínculo Manual de Repositórios e Releases
              </p>
              <p className="text-xs text-slate-300 mt-0.5">
                A arquitetura já está preparada para futura integração via GitHub App / Webhooks (sincronização automática de branches, PRs e tags). Neste MVP, os links são cadastrados e abertos diretamente.
              </p>
            </div>
          </div>
          <button
            onClick={() =>
              addToast(
                'A integração automática via GitHub OAuth / Webhooks será configurada na Fase 2 pós-MVP.',
                'info'
              )
            }
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold shrink-0 border border-slate-700"
          >
            Status da Integração GitHub
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {repos.map((repo) => (
            <div
              key={repo.id}
              className="bg-[#0B1221] border border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-semibold text-cyan-400">
                      {getProjectName(repo.projectId)}
                    </span>
                    <h3 className="text-base font-bold text-white flex items-center gap-2 mt-0.5 font-mono">
                      <GitBranch className="w-4 h-4 text-emerald-400 shrink-0" />
                      {repo.repoName}
                    </h3>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <Tag className="w-3 h-3" /> {repo.version}
                  </span>
                </div>

                <p className="text-xs text-slate-300 mt-3">{repo.description}</p>
                {repo.notes && (
                  <p className="text-[11px] text-slate-400 mt-2 bg-[#060A12] p-2.5 rounded-xl border border-slate-800">
                    <strong className="text-slate-300">Observações:</strong> {repo.notes}
                  </p>
                )}

                <div className="mt-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                    Arquivos e Documentos Relevantes ({repo.files.length})
                  </span>
                  <div className="space-y-1.5">
                    {repo.files.map((f, idx) => (
                      <a
                        key={idx}
                        href={f.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-2.5 rounded-xl bg-[#060A12] border border-slate-800 hover:border-cyan-500/40 text-xs text-slate-200 group"
                      >
                        <span className="flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5 text-cyan-400" />
                          {f.title}
                        </span>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400" />
                      </a>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                <a
                  href={repo.repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-400 hover:text-cyan-300"
                >
                  Abrir Repositório no GitHub <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openRepoModal('edit', repo)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() =>
                      askConfirmation({
                        title: 'Remover registro de repositório?',
                        description: `Deseja excluir a referência "${repo.repoName}" do MVP?`,
                        onConfirm: async () => {
                          try {
                            await apiFetch(`/api/repositorios/${repo.id}`, { method: 'DELETE' });
                            setRepos((prev) => prev.filter((r) => r.id !== repo.id));
                            addToast('Repositório removido.', 'info');
                          } catch (err) {
                            handleApiError(err, 'Erro ao remover repositório.');
                          }
                        }
                      })
                    }
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-rose-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ==========================================
  // RENDERIZAÇÃO DOS MODAIS GLOBAIS
  // ==========================================

  const NAV_ITEMS = [
    { id: 'painel', label: 'Painel', icon: LayoutDashboard },
    { id: 'kanban', label: 'Kanban', icon: Kanban },
    { id: 'agenda', label: 'Agenda', icon: CalendarIcon },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'empresas', label: 'Empresas', icon: Building2 },
    { id: 'usuarios', label: 'Usuários', icon: Users },
    { id: 'financeiro', label: 'Financeiro', icon: DollarSign },
    { id: 'arquivos', label: 'Arquivos e projetos', icon: FolderGit2 },
  ];

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    if (!loginUsername.trim() || !loginPassword.trim()) {
      setLoginError('Informe usuário e senha para acessar.');
      return;
    }
    setIsSubmittingLogin(true);
    try {
      const data = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: { username: loginUsername.trim(), password: loginPassword },
        skipAuthRedirect: true
      });
      if (data?.user) {
        setCurrentUser(data.user);
        setIsAuthenticated(true);
        setActiveMenu(pickFirstAccessibleMenu(data.user));
        addToast(`Bem-vindo(a) ao sistema UPLY, ${data.user.name}!`, 'success');
        setLoginPassword('');
        await carregarDadosDoSistema();
      }
    } catch (err) {
      setLoginError(err.message || 'Falha ao autenticar. Verifique suas credenciais.');
    } finally {
      setIsSubmittingLogin(false);
    }
  };

  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-[#060A12] text-slate-100 flex flex-col items-center justify-center p-4 font-sans selection:bg-cyan-500 selection:text-slate-950">
        <UplyBrandLogo />
        <div className="mt-6 flex items-center gap-2.5 text-cyan-400 text-xs font-semibold">
          <RefreshCw className="w-4 h-4 animate-spin" /> Verificando autenticação e permissões...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#060A12] text-slate-100 flex items-center justify-center p-4 font-sans selection:bg-cyan-500 selection:text-slate-950">
        <div className="w-full max-w-md bg-[#0B1221] border border-slate-800/90 rounded-3xl p-8 shadow-2xl space-y-6">
          <div className="flex flex-col items-center text-center">
            <UplyBrandLogo />
            <h1 className="text-xl font-bold text-white mt-5">Acesso ao Sistema Gerencial</h1>
            <p className="text-xs text-slate-400 mt-1">
              Entre com seu nome de usuário no sistema e senha para continuar.
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Nome de usuário no sistema
              </label>
              <input
                type="text"
                required
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                placeholder="Ex: lucas.andrade"
                className="w-full bg-[#060A12] border border-slate-800 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Senha
              </label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#060A12] border border-slate-800 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
              />
            </div>

            {loginError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmittingLogin}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-60 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2"
            >
              {isSubmittingLogin ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Autenticando...
                </>
              ) : (
                'Entrar na Plataforma UPLY'
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060A12] text-slate-100 flex flex-col lg:flex-row font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* MENU LATERAL DESKTOP */}
      <aside className="hidden lg:flex w-64 shrink-0 bg-[#080E1A] border-r border-slate-800/80 flex-col justify-between p-4">
        <div>
          <div className="px-2 py-2">
            <UplyBrandLogo />
          </div>

          <div className="mt-8 space-y-1">
            <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
              Módulos do Sistema
            </p>
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeMenu === item.id;
              const hasAccess = canDo(item.id, 'access');
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500/20 to-blue-600/10 text-cyan-300 border border-cyan-500/30 shadow-sm'
                      : hasAccess
                      ? 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      : 'text-slate-600 cursor-not-allowed'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : ''}`} />
                    {item.label}
                  </span>
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Card do Usuário Autenticado & Logout */}
        <div className="p-3 rounded-2xl bg-[#060A12] border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-cyan-400">Sessão Ativa</span>
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="bg-[#0B1221] border border-slate-700/80 rounded-xl p-2.5">
            <p className="text-xs font-bold text-white truncate">{currentUser?.name || 'Usuário Autenticado'}</p>
            <div className="flex items-center justify-between mt-1 text-[11px] text-slate-400">
              <span className="truncate">{currentUser?.role || 'Colaborador'}</span>
              <span className="text-[10px] font-mono text-cyan-400">@{currentUser?.username || ''}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full mt-1 py-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" /> Sair do Sistema
          </button>
        </div>
      </aside>

      {/* HEADER MOBILE / TABLET */}
      <header className="lg:hidden bg-[#080E1A] border-b border-slate-800 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <UplyBrandLogo />
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-xl bg-[#0B1221] border border-slate-800 text-slate-200"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* DRAWER MOBILE */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex">
          <div className="w-72 bg-[#080E1A] border-r border-slate-800 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <UplyBrandLogo />
                <button onClick={() => setMobileMenuOpen(false)} className="text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="mt-4 space-y-1">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeMenu === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavigate(item.id)}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold ${
                        isActive
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          : 'text-slate-400'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="mt-auto pt-4 border-t border-slate-800">
              <div className="p-3 rounded-2xl bg-[#060A12] border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-cyan-400">Sessão Ativa</span>
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="bg-[#0B1221] border border-slate-700/80 rounded-xl p-2.5">
                  <p className="text-xs font-bold text-white truncate">{currentUser?.name || 'Usuário Autenticado'}</p>
                  <div className="flex items-center justify-between mt-1 text-[11px] text-slate-400">
                    <span className="truncate">{currentUser?.role || 'Colaborador'}</span>
                    <span className="text-[10px] font-mono text-cyan-400">@{currentUser?.username || ''}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full mt-1 py-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" /> Sair do Sistema
                </button>
              </div>
            </div>
          </div>
          <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
        </div>
      )}

      {/* ÁREA DE CONTEÚDO PRINCIPAL */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        {isLoadingView ? (
          <div className="h-96 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-7 h-7 text-cyan-400 animate-spin" />
            <span className="text-xs text-slate-400">Carregando módulo UPLY...</span>
          </div>
        ) : (
          <>
            {activeMenu === 'painel' && renderPainel()}
            {activeMenu === 'kanban' && renderKanban()}
            {activeMenu === 'agenda' && renderAgenda()}
            {activeMenu === 'tasks' && renderTasks()}
            {activeMenu === 'empresas' && renderEmpresas()}
            {activeMenu === 'usuarios' && renderUsuarios()}
            {activeMenu === 'financeiro' && renderFinanceiro()}
            {activeMenu === 'arquivos' && renderArquivos()}
          </>
        )}
      </main>

      {/* ========================================== */}
      {/* MODAL DE GERENCIAMENTO DINÂMICO DE ETAPAS DO KANBAN */}
      {/* ========================================== */}
      {stagesModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B1221] border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl max-h-[88vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-lg font-bold text-white">Gerenciar Etapas do Kanban</h3>
              <button
                onClick={() => setStagesModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddKanbanStage} className="flex gap-2 mb-4">
              <input
                type="text"
                value={newStageNameInput}
                onChange={(e) => setNewStageNameInput(e.target.value)}
                placeholder="Nome da nova etapa..."
                className="flex-1 bg-[#070C17] border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-xs font-bold text-white shrink-0"
              >
                + Adicionar
              </button>
            </form>

            <div className="space-y-2 overflow-y-auto flex-1 pr-1">
              {kanbanStages.map((st, idx) => {
                const count = projects.filter((p) => p.stage === st).length;
                return (
                  <div
                    key={st}
                    className="flex items-center justify-between p-3 rounded-xl bg-[#060A12] border border-slate-800 text-xs"
                  >
                    <div>
                      <span className="font-bold text-white">
                        {idx + 1}. {st}
                      </span>
                      <span className="ml-2 text-[11px] text-slate-400">({count} projeto(s))</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveKanbanStage(st)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-rose-400"
                      title="Remover etapa"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-4 mt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setStagesModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-200"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL DE TASKS */}
      {/* ========================================== */}
      {taskModal.open && taskModal.data && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B1221] border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-lg font-bold text-white">
                {taskModal.mode === 'create' ? 'Nova Task' : 'Editar Task'}
              </h3>
              <button
                onClick={() => setTaskModal({ open: false, mode: 'create', data: null })}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
                  Responsável <span className="text-emerald-400">*</span>
                </label>
                <select
                  value={taskModal.data.userId}
                  onChange={(e) =>
                    setTaskModal((prev) => ({
                      ...prev,
                      data: { ...prev.data, userId: e.target.value }
                    }))
                  }
                  className="w-full bg-[#070C17] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
                  Descrição <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={taskModal.data.description}
                  onChange={(e) =>
                    setTaskModal((prev) => ({
                      ...prev,
                      data: { ...prev.data, description: e.target.value }
                    }))
                  }
                  placeholder="Descreva a atividade a ser executada..."
                  className="w-full bg-[#070C17] border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Data</label>
                  <input
                    type="date"
                    required
                    value={taskModal.data.date}
                    onChange={(e) =>
                      setTaskModal((prev) => ({
                        ...prev,
                        data: { ...prev.data, date: e.target.value }
                      }))
                    }
                    className="w-full bg-[#070C17] border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Hora</label>
                  <input
                    type="time"
                    required
                    value={taskModal.data.time}
                    onChange={(e) =>
                      setTaskModal((prev) => ({
                        ...prev,
                        data: { ...prev.data, time: e.target.value }
                      }))
                    }
                    className="w-full bg-[#070C17] border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
                    Prioridade
                  </label>
                  <select
                    value={taskModal.data.priority}
                    onChange={(e) =>
                      setTaskModal((prev) => ({
                        ...prev,
                        data: { ...prev.data, priority: e.target.value }
                      }))
                    }
                    className="w-full bg-[#070C17] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="Baixa">Baixa</option>
                    <option value="Média">Média</option>
                    <option value="Alta">Alta</option>
                    <option value="Urgente">Urgente</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
                    Status
                  </label>
                  <select
                    value={taskModal.data.status}
                    onChange={(e) =>
                      setTaskModal((prev) => ({
                        ...prev,
                        data: { ...prev.data, status: e.target.value }
                      }))
                    }
                    className="w-full bg-[#070C17] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="pendente">Pendente</option>
                    <option value="em andamento">Em andamento</option>
                    <option value="concluido">Concluído</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
                  Observação
                </label>
                <textarea
                  rows={3}
                  value={taskModal.data.notes}
                  onChange={(e) =>
                    setTaskModal((prev) => ({
                      ...prev,
                      data: { ...prev.data, notes: e.target.value }
                    }))
                  }
                  placeholder="Detalhes adicionais ou observações..."
                  className="w-full bg-[#070C17] border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setTaskModal({ open: false, mode: 'create', data: null })}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-xs font-bold text-white"
                >
                  Salvar Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL DE PROJETO (KANBAN) */}
      {/* ========================================== */}
      {projectModal.open && projectModal.data && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B1221] border border-slate-700 rounded-2xl max-w-xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-lg font-bold text-white">
                {projectModal.mode === 'create' ? 'Novo Projeto no Kanban' : 'Detalhes e Edição do Projeto'}
              </h3>
              <button
                onClick={() => {
                  if (projectFormDirty) {
                    askConfirmation({
                      title: 'Descartar alterações?',
                      description: 'Existem informações alteradas neste projeto que ainda não foram salvas.',
                      confirmLabel: 'Descartar',
                      onConfirm: () => setProjectModal({ open: false, mode: 'create', data: null })
                    });
                  } else {
                    setProjectModal({ open: false, mode: 'create', data: null });
                  }
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
                  Nome do Projeto <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={projectModal.data.name}
                  onChange={(e) => {
                    setProjectFormDirty(true);
                    setProjectModal((prev) => ({ ...prev, data: { ...prev.data, name: e.target.value } }));
                  }}
                  placeholder="Ex: Plataforma B2B Pagamentos"
                  className="w-full bg-[#070C17] border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
                    Cliente <span className="text-emerald-400">*</span>
                  </label>
                  <select
                    value={projectModal.data.companyId}
                    onChange={(e) => {
                      setProjectFormDirty(true);
                      setProjectModal((prev) => ({ ...prev, data: { ...prev.data, companyId: e.target.value } }));
                    }}
                    className="w-full bg-[#070C17] border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white"
                  >
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.tradeName || c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
                    Responsável UPLY <span className="text-emerald-400">*</span>
                  </label>
                  <select
                    value={projectModal.data.responsibleId}
                    onChange={(e) => {
                      setProjectFormDirty(true);
                      setProjectModal((prev) => ({
                        ...prev,
                        data: { ...prev.data, responsibleId: e.target.value }
                      }));
                    }}
                    className="w-full bg-[#070C17] border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
                    Etapa do Kanban
                  </label>
                  <select
                    value={projectModal.data.stage}
                    onChange={(e) => {
                      setProjectFormDirty(true);
                      setProjectModal((prev) => ({ ...prev, data: { ...prev.data, stage: e.target.value } }));
                    }}
                    className="w-full bg-[#070C17] border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white"
                  >
                    {kanbanStages.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
                    Prazo Estimado
                  </label>
                  <input
                    type="date"
                    value={projectModal.data.deadline}
                    onChange={(e) => {
                      setProjectFormDirty(true);
                      setProjectModal((prev) => ({ ...prev, data: { ...prev.data, deadline: e.target.value } }));
                    }}
                    className="w-full bg-[#070C17] border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>

                <CurrencyInputBRL
                  label="Valor do Projeto"
                  value={projectModal.data.value}
                  onChange={(val) => {
                    setProjectFormDirty(true);
                    setProjectModal((prev) => ({ ...prev, data: { ...prev.data, value: val } }));
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
                  Escopo e Observações Técnicas
                </label>
                <textarea
                  rows={3}
                  value={projectModal.data.description}
                  onChange={(e) => {
                    setProjectFormDirty(true);
                    setProjectModal((prev) => ({
                      ...prev,
                      data: { ...prev.data, description: e.target.value }
                    }));
                  }}
                  className="w-full bg-[#070C17] border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setProjectModal({ open: false, mode: 'create', data: null })}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-xs font-bold text-white"
                >
                  Salvar Projeto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL DE COMPROMISSO (AGENDA) */}
      {/* ========================================== */}
      {appointmentModal.open && appointmentModal.data && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B1221] border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-lg font-bold text-white">
                {appointmentModal.mode === 'create' ? 'Novo Compromisso na Agenda' : 'Editar Compromisso'}
              </h3>
              <button
                onClick={() => setAppointmentModal({ open: false, mode: 'create', data: null })}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAppointment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
                  Título do Compromisso <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={appointmentModal.data.title}
                  onChange={(e) =>
                    setAppointmentModal((prev) => ({
                      ...prev,
                      data: { ...prev.data, title: e.target.value }
                    }))
                  }
                  placeholder="Ex: Reunião de Alinhamento de Arquitetura"
                  className="w-full bg-[#070C17] border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Data</label>
                  <input
                    type="date"
                    required
                    value={appointmentModal.data.date}
                    onChange={(e) =>
                      setAppointmentModal((prev) => ({
                        ...prev,
                        data: { ...prev.data, date: e.target.value }
                      }))
                    }
                    className="w-full bg-[#070C17] border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Horário</label>
                  <input
                    type="time"
                    required
                    value={appointmentModal.data.time}
                    onChange={(e) =>
                      setAppointmentModal((prev) => ({
                        ...prev,
                        data: { ...prev.data, time: e.target.value }
                      }))
                    }
                    className="w-full bg-[#070C17] border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Projeto</label>
                  <select
                    value={appointmentModal.data.projectId}
                    onChange={(e) =>
                      setAppointmentModal((prev) => ({
                        ...prev,
                        data: { ...prev.data, projectId: e.target.value }
                      }))
                    }
                    className="w-full bg-[#070C17] border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-white"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Cliente</label>
                  <select
                    value={appointmentModal.data.companyId}
                    onChange={(e) =>
                      setAppointmentModal((prev) => ({
                        ...prev,
                        data: { ...prev.data, companyId: e.target.value }
                      }))
                    }
                    className="w-full bg-[#070C17] border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-white"
                  >
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.tradeName || c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Responsável</label>
                  <select
                    value={appointmentModal.data.userId}
                    onChange={(e) =>
                      setAppointmentModal((prev) => ({
                        ...prev,
                        data: { ...prev.data, userId: e.target.value }
                      }))
                    }
                    className="w-full bg-[#070C17] border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-white"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Descrição / Pauta</label>
                <textarea
                  rows={3}
                  value={appointmentModal.data.description}
                  onChange={(e) =>
                    setAppointmentModal((prev) => ({
                      ...prev,
                      data: { ...prev.data, description: e.target.value }
                    }))
                  }
                  className="w-full bg-[#070C17] border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setAppointmentModal({ open: false, mode: 'create', data: null })}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-xs font-bold text-white"
                >
                  Salvar Compromisso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL DE EMPRESAS (CLIENTES / FORNECEDORES) */}
      {/* ========================================== */}
      {companyModal.open && companyModal.data && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B1221] border border-slate-700 rounded-2xl max-w-3xl w-full p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-lg font-bold text-white">
                {companyModal.mode === 'create'
                  ? 'Cadastrar Empresa (Cliente / Fornecedor)'
                  : 'Editar Cadastro da Empresa'}
              </h3>
              <button
                onClick={() => setCompanyModal({ open: false, mode: 'create', data: null })}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCompany} className="space-y-4">
              {/* Tipo de pessoa, CPF/CNPJ e Tipo de cadastro */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
                    Tipo de Pessoa
                  </label>
                  <select
                    value={companyModal.data.personType}
                    onChange={(e) =>
                      setCompanyModal((prev) => ({
                        ...prev,
                        data: { ...prev.data, personType: e.target.value, document: '' }
                      }))
                    }
                    className="w-full bg-[#070C17] border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white"
                  >
                    <option value="CNPJ">Pessoa Jurídica (CNPJ)</option>
                    <option value="CPF">Pessoa Física (CPF)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
                    {companyModal.data.personType} <span className="text-emerald-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={companyModal.data.document}
                    onChange={(e) => {
                      const formatted =
                        companyModal.data.personType === 'CNPJ'
                          ? formatCNPJ(e.target.value)
                          : formatCPF(e.target.value);
                      setCompanyModal((prev) => ({
                        ...prev,
                        data: { ...prev.data, document: formatted }
                      }));
                    }}
                    placeholder={companyModal.data.personType === 'CNPJ' ? '00.000.000/0001-00' : '000.000.000-00'}
                    className="w-full bg-[#070C17] border border-slate-800 rounded-xl px-3.5 py-2 text-sm font-mono text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
                    Tipo de Cadastro
                  </label>
                  <select
                    value={companyModal.data.registrationType}
                    onChange={(e) =>
                      setCompanyModal((prev) => ({
                        ...prev,
                        data: { ...prev.data, registrationType: e.target.value }
                      }))
                    }
                    className="w-full bg-[#070C17] border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white"
                  >
                    <option value="Cliente">Cliente</option>
                    <option value="Fornecedor">Fornecedor</option>
                    <option value="Ambos">Ambos (Cliente e Fornecedor)</option>
                  </select>
                </div>
              </div>

              {/* Razão Social / Nome Completo e Nome Fantasia */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
                    {companyModal.data.personType === 'CNPJ' ? 'Razão Social' : 'Nome Completo'}{' '}
                    <span className="text-emerald-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={companyModal.data.name}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCompanyModal((prev) => ({
                        ...prev,
                        data: {
                          ...prev.data,
                          name: val,
                          slug: createSlug(prev.data.tradeName || val)
                        }
                      }));
                    }}
                    className="w-full bg-[#070C17] border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white"
                  />
                </div>

                {companyModal.data.personType === 'CNPJ' && (
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
                      Nome Fantasia
                    </label>
                    <input
                      type="text"
                      value={companyModal.data.tradeName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCompanyModal((prev) => ({
                          ...prev,
                          data: {
                            ...prev.data,
                            tradeName: val,
                            slug: createSlug(val || prev.data.name)
                          }
                        }));
                      }}
                      className="w-full bg-[#070C17] border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white"
                    />
                  </div>
                )}
              </div>

              {/* Endereço e CEP com preenchimento automático / manual */}
              <div className="p-3.5 rounded-xl bg-[#060A12] border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-cyan-400">Endereço e Localização</span>
                  {cepStatusMessage && (
                    <span className="text-[11px] text-emerald-400">{cepStatusMessage}</span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] uppercase text-slate-400 mb-1">CEP</label>
                    <input
                      type="text"
                      value={companyModal.data.cep}
                      onChange={(e) => handleCepLookup(e.target.value)}
                      placeholder="00000-000"
                      className="w-full bg-[#0B1221] border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] uppercase text-slate-400 mb-1">
                      Logradouro e Número
                    </label>
                    <input
                      type="text"
                      value={companyModal.data.street}
                      onChange={(e) =>
                        setCompanyModal((prev) => ({
                          ...prev,
                          data: { ...prev.data, street: e.target.value }
                        }))
                      }
                      placeholder="Av. / Rua, número, complemento"
                      className="w-full bg-[#0B1221] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="block text-[11px] uppercase text-slate-400 mb-1">Cidade</label>
                      <input
                        type="text"
                        value={companyModal.data.city}
                        onChange={(e) =>
                          setCompanyModal((prev) => ({
                            ...prev,
                            data: { ...prev.data, city: e.target.value }
                          }))
                        }
                        className="w-full bg-[#0B1221] border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] uppercase text-slate-400 mb-1">UF</label>
                      <input
                        type="text"
                        maxLength={2}
                        value={companyModal.data.state}
                        onChange={(e) =>
                          setCompanyModal((prev) => ({
                            ...prev,
                            data: { ...prev.data, state: e.target.value.toUpperCase() }
                          }))
                        }
                        className="w-full bg-[#0B1221] border border-slate-700 rounded-xl px-2 py-2 text-xs text-white uppercase text-center"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Ramo de Atividade (com opção de cadastrar novo) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
                    Ramo de Atividade
                  </label>
                  <select
                    value={companyModal.data.industry}
                    onChange={(e) =>
                      setCompanyModal((prev) => ({
                        ...prev,
                        data: { ...prev.data, industry: e.target.value }
                      }))
                    }
                    className="w-full bg-[#070C17] border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white"
                  >
                    {industries.map((ind) => (
                      <option key={ind} value={ind}>
                        {ind}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
                    Cadastrar Novo Ramo de Atividade
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newIndustryName}
                      onChange={(e) => setNewIndustryName(e.target.value)}
                      placeholder="Ex: Indústria Farmacêutica"
                      className="flex-1 bg-[#070C17] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (!newIndustryName.trim()) return;
                        const val = newIndustryName.trim();
                        try {
                          const res = await apiFetch('/api/empresas', {
                            method: 'POST',
                            body: { action: 'create_industry', name: val }
                          });
                          const nameAdded = res?.industry || val;
                          setIndustries((prev) => (prev.includes(nameAdded) ? prev : [...prev, nameAdded]));
                          setCompanyModal((prev) => ({
                            ...prev,
                            data: { ...prev.data, industry: nameAdded }
                          }));
                          setNewIndustryName('');
                          addToast(`Ramo "${nameAdded}" adicionado e selecionado!`, 'success');
                        } catch (err) {
                          handleApiError(err, 'Erro ao cadastrar novo ramo de atividade.');
                        }
                      }}
                      className="px-3 py-2 rounded-xl bg-cyan-500/20 text-cyan-300 text-xs font-bold border border-cyan-500/30"
                    >
                      + Incluir
                    </button>
                  </div>
                </div>
              </div>

              {/* Responsáveis (Múltiplos), E-mail e Telefone */}
              <div className="p-3.5 rounded-xl bg-[#060A12] border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase text-cyan-300">
                    Responsáveis pela Empresa ({(companyModal.data.responsibles || []).length})
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setCompanyModal((prev) => ({
                        ...prev,
                        data: {
                          ...prev.data,
                          responsibles: [...(prev.data.responsibles || []), '']
                        }
                      }))
                    }
                    className="px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 text-xs font-bold border border-cyan-500/30"
                  >
                    + Adicionar Responsável
                  </button>
                </div>
                <div className="space-y-2">
                  {(companyModal.data.responsibles || ['']).map((resp, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={resp}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCompanyModal((prev) => {
                            const updated = [...(prev.data.responsibles || [])];
                            updated[idx] = val;
                            return {
                              ...prev,
                              data: {
                                ...prev.data,
                                responsibles: updated,
                                responsibleName: updated[0] || ''
                              }
                            };
                          });
                        }}
                        placeholder={`Nome do responsável ${idx + 1}...`}
                        className="flex-1 bg-[#0B1221] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                      />
                      {(companyModal.data.responsibles || []).length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setCompanyModal((prev) => {
                              const updated = prev.data.responsibles.filter((_, i) => i !== idx);
                              return {
                                ...prev,
                                data: {
                                  ...prev.data,
                                  responsibles: updated,
                                  responsibleName: updated[0] || ''
                                }
                              };
                            })
                          }
                          className="p-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-rose-400"
                          title="Remover responsável"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Tipos de Produtos Vinculados (Itens de Linha: Site, Sistema e etc) */}
              <div className="p-3.5 rounded-xl bg-[#060A12] border border-slate-800 space-y-3">
                <label className="block text-xs font-bold uppercase text-emerald-400">
                  Produtos Vinculados (Itens de Linha: Site, Sistema, App, etc.)
                </label>

                {(companyModal.data.linkedProducts || []).length > 0 && (
                  <div className="space-y-1.5">
                    {companyModal.data.linkedProducts.map((prod, idx) => (
                      <div
                        key={prod.id || idx}
                        className="flex items-center justify-between bg-[#0B1221] border border-slate-800 rounded-xl px-3 py-2 text-xs"
                      >
                        <div>
                          <span className="font-bold text-cyan-300">{prod.type}</span>
                          {prod.description && (
                            <span className="text-slate-300"> — {prod.description}</span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setCompanyModal((prev) => ({
                              ...prev,
                              data: {
                                ...prev.data,
                                linkedProducts: prev.data.linkedProducts.filter((_, i) => i !== idx)
                              }
                            }))
                          }
                          className="text-rose-400 hover:underline text-[11px]"
                        >
                          Remover
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                  <select
                    value={newProductTypeInput}
                    onChange={(e) => setNewProductTypeInput(e.target.value)}
                    className="sm:col-span-2 bg-[#0B1221] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="Sistema">Sistema</option>
                    <option value="Site">Site</option>
                    <option value="Aplicativo Mobile">Aplicativo Mobile</option>
                    <option value="E-commerce">E-commerce</option>
                    <option value="API / Integração">API / Integração</option>
                    <option value="Infraestrutura / Cloud">Infraestrutura / Cloud</option>
                    <option value="Design / UI & UX">Design / UI & UX</option>
                    <option value="Consultoria / Squad">Consultoria / Squad</option>
                  </select>
                  <input
                    type="text"
                    value={newProductDescInput}
                    onChange={(e) => setNewProductDescInput(e.target.value)}
                    placeholder="Especificação ou nome do item (Ex: ERP Web, Landing Page)..."
                    className="sm:col-span-2 bg-[#0B1221] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const desc = newProductDescInput.trim() || newProductTypeInput;
                      setCompanyModal((prev) => ({
                        ...prev,
                        data: {
                          ...prev.data,
                          linkedProducts: [
                            ...(prev.data.linkedProducts || []),
                            { id: 'lp_' + Date.now(), type: newProductTypeInput, description: desc }
                          ]
                        }
                      }));
                      setNewProductDescInput('');
                    }}
                    className="px-3 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold"
                  >
                    + Adicionar Item
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
                    E-mail <span className="text-emerald-400">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={companyModal.data.email}
                    onChange={(e) =>
                      setCompanyModal((prev) => ({
                        ...prev,
                        data: { ...prev.data, email: e.target.value }
                      }))
                    }
                    className="w-full bg-[#070C17] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
                    Telefone / Contato
                  </label>
                  <input
                    type="text"
                    value={companyModal.data.phone}
                    onChange={(e) =>
                      setCompanyModal((prev) => ({
                        ...prev,
                        data: { ...prev.data, phone: formatPhone(e.target.value) }
                      }))
                    }
                    placeholder="(11) 99999-0000"
                    className="w-full bg-[#070C17] border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white"
                  />
                </div>
              </div>

              {/* Senha inicial, Slug, Chave Pix e Categoria de Despesa Padrão */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
                    Senha Inicial Portal
                  </label>
                  <input
                    type="password"
                    value={companyModal.data.initialPassword || ''}
                    onChange={(e) =>
                      setCompanyModal((prev) => ({
                        ...prev,
                        data: { ...prev.data, initialPassword: e.target.value }
                      }))
                    }
                    placeholder={
                      companyModal.data.hasSavedPassword
                        ? '•••••••• (Salva com segurança)'
                        : 'Definir senha inicial'
                    }
                    className="w-full bg-[#070C17] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
                    Slug da Empresa
                  </label>
                  <input
                    type="text"
                    value={companyModal.data.slug}
                    onChange={(e) =>
                      setCompanyModal((prev) => ({
                        ...prev,
                        data: { ...prev.data, slug: createSlug(e.target.value) }
                      }))
                    }
                    className="w-full bg-[#070C17] border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-cyan-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
                    Chave Pix
                  </label>
                  <input
                    type="text"
                    value={companyModal.data.pixKey}
                    onChange={(e) =>
                      setCompanyModal((prev) => ({
                        ...prev,
                        data: { ...prev.data, pixKey: e.target.value }
                      }))
                    }
                    className="w-full bg-[#070C17] border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
                    Categoria Despesa Padrão
                  </label>
                  <select
                    value={companyModal.data.defaultExpenseCategory}
                    onChange={(e) =>
                      setCompanyModal((prev) => ({
                        ...prev,
                        data: { ...prev.data, defaultExpenseCategory: e.target.value }
                      }))
                    }
                    className="w-full bg-[#070C17] border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-white"
                  >
                    {categories.saida.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Quem conseguiu o cliente? (Usuário cadastrado ou Pessoa Externa) */}
              <div className="p-3.5 rounded-xl bg-[#060A12] border border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-xs font-bold uppercase text-cyan-300">
                    Quem conseguiu o cliente? (Origem Comercial)
                  </label>
                  <div className="flex items-center gap-3 text-xs">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        checked={companyModal.data.acquiredByType === 'user'}
                        onChange={() =>
                          setCompanyModal((prev) => ({
                            ...prev,
                            data: { ...prev.data, acquiredByType: 'user' }
                          }))
                        }
                      />
                      <span>Usuário do Sistema</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        checked={companyModal.data.acquiredByType === 'external'}
                        onChange={() =>
                          setCompanyModal((prev) => ({
                            ...prev,
                            data: { ...prev.data, acquiredByType: 'external' }
                          }))
                        }
                      />
                      <span>Pessoa Externa / Indicação</span>
                    </label>
                  </div>
                </div>

                {companyModal.data.acquiredByType === 'user' ? (
                  <select
                    value={companyModal.data.acquiredByUserId}
                    onChange={(e) =>
                      setCompanyModal((prev) => ({
                        ...prev,
                        data: { ...prev.data, acquiredByUserId: e.target.value }
                      }))
                    }
                    className="w-full bg-[#0B1221] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={companyModal.data.acquiredByExternalName}
                    onChange={(e) =>
                      setCompanyModal((prev) => ({
                        ...prev,
                        data: { ...prev.data, acquiredByExternalName: e.target.value }
                      }))
                    }
                    placeholder="Informe o nome do parceiro ou indicador externo..."
                    className="w-full bg-[#0B1221] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white"
                  />
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCompanyModal({ open: false, mode: 'create', data: null })}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-xs font-bold text-white"
                >
                  Salvar Cadastro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL DE USUÁRIO E MATRIZ DE PERMISSÕES */}
      {/* ========================================== */}
      {userModal.open && userModal.data && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B1221] border border-slate-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-lg font-bold text-white">
                {userModal.mode === 'create' ? 'Novo Usuário do Sistema' : 'Editar Usuário e Permissões'}
              </h3>
              <button
                onClick={() => setUserModal({ open: false, mode: 'create', data: null })}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
                    Nome Completo <span className="text-emerald-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={userModal.data.name}
                    onChange={(e) =>
                      setUserModal((prev) => ({ ...prev, data: { ...prev.data, name: e.target.value } }))
                    }
                    className="w-full bg-[#070C17] border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
                    Nome de Usuário <span className="text-emerald-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={userModal.data.username}
                    onChange={(e) =>
                      setUserModal((prev) => ({ ...prev, data: { ...prev.data, username: e.target.value } }))
                    }
                    className="w-full bg-[#070C17] border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono text-cyan-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">E-mail</label>
                  <input
                    type="email"
                    required
                    value={userModal.data.email}
                    onChange={(e) =>
                      setUserModal((prev) => ({ ...prev, data: { ...prev.data, email: e.target.value } }))
                    }
                    className="w-full bg-[#070C17] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">CPF</label>
                  <input
                    type="text"
                    value={userModal.data.cpf}
                    onChange={(e) =>
                      setUserModal((prev) => ({
                        ...prev,
                        data: { ...prev.data, cpf: formatCPF(e.target.value) }
                      }))
                    }
                    className="w-full bg-[#070C17] border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Contato</label>
                  <input
                    type="text"
                    value={userModal.data.phone}
                    onChange={(e) =>
                      setUserModal((prev) => ({
                        ...prev,
                        data: { ...prev.data, phone: formatPhone(e.target.value) }
                      }))
                    }
                    className="w-full bg-[#070C17] border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Cargo</label>
                  <input
                    type="text"
                    value={userModal.data.role}
                    onChange={(e) =>
                      setUserModal((prev) => ({ ...prev, data: { ...prev.data, role: e.target.value } }))
                    }
                    placeholder="Ex: Engenheiro de Software Sênior"
                    className="w-full bg-[#070C17] border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
                    Senha de Acesso (Oculta após salvar)
                  </label>
                  <input
                    type="password"
                    value={userModal.data.passwordInput || ''}
                    onChange={(e) =>
                      setUserModal((prev) => ({
                        ...prev,
                        data: { ...prev.data, passwordInput: e.target.value }
                      }))
                    }
                    placeholder={
                      userModal.data.hasSavedPassword
                        ? '•••••••• (Deixe em branco para manter)'
                        : 'Digite a senha inicial'
                    }
                    className="w-full bg-[#070C17] border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white"
                  />
                </div>
              </div>

              {/* Matriz de Permissões */}
              <div className="border border-slate-800 rounded-2xl overflow-hidden">
                <div className="bg-[#060A12] px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-300">
                    Matriz de Permissões por Módulo e Ação
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Ações exigem acesso ao menu habilitado
                  </span>
                </div>
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#070C17] text-[11px] uppercase text-slate-400 border-b border-slate-800">
                      <th className="py-2.5 px-4">Módulo</th>
                      <th className="py-2.5 px-3 text-center">Acessar Menu</th>
                      <th className="py-2.5 px-3 text-center">Incluir</th>
                      <th className="py-2.5 px-3 text-center">Editar</th>
                      <th className="py-2.5 px-3 text-center">Deletar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {SYSTEM_MODULES.map((m) => {
                      const perm = userModal.data.permissions?.[m.id] || {
                        access: false,
                        create: false,
                        edit: false,
                        delete: false
                      };
                      return (
                        <tr key={m.id} className="hover:bg-slate-800/20">
                          <td className="py-2.5 px-4 font-semibold text-white">{m.label}</td>
                          {['access', 'create', 'edit', 'delete'].map((act) => (
                            <td key={act} className="py-2.5 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={ Boolean(perm[act]) }
                                onChange={() => togglePermissionCell(m.id, act)}
                                className="w-4 h-4 accent-cyan-400 rounded cursor-pointer"
                              />
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setUserModal({ open: false, mode: 'create', data: null })}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-xs font-bold text-white"
                >
                  Salvar Usuário e Permissões
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL FINANCEIRO (COM GERADOR DE PARCELAS) */}
      {/* ========================================== */}
      {financeModal.open && financeModal.data && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B1221] border border-slate-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-lg font-bold text-white">
                {financeModal.data.type === 'receber'
                  ? 'Lançamento de Conta a Receber (Entrada)'
                  : 'Lançamento de Conta a Pagar (Saída)'}
              </h3>
              <button
                onClick={() => setFinanceModal({ open: false, mode: 'create', data: null })}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFinance} className="space-y-4">
              {/* Seletor de empresa com busca e tecla Enter */}
              <SearchableCompanySelector
                companies={companies}
                selectedId={financeModal.data.companyId}
                onSelect={(id) =>
                  setFinanceModal((prev) => ({
                    ...prev,
                    data: { ...prev.data, companyId: id }
                  }))
                }
                label={
                  financeModal.data.type === 'receber'
                    ? 'Cliente Relacionado (Enter seleciona o 1º)'
                    : 'Fornecedor / Empresa Relacionada (Enter seleciona o 1º)'
                }
              />

              {/* Categoria e Subcategoria filtradas conforme entrada ou saída */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
                    Categoria
                  </label>
                  <select
                    value={financeModal.data.category}
                    onChange={(e) => {
                      const catName = e.target.value;
                      const list =
                        financeModal.data.type === 'receber' ? categories.entrada : categories.saida;
                      const found = list.find((c) => c.name === catName);
                      setFinanceModal((prev) => ({
                        ...prev,
                        data: {
                          ...prev.data,
                          category: catName,
                          subcategory: found?.subcategories?.[0] || ''
                        }
                      }));
                    }}
                    className="w-full bg-[#070C17] border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white"
                  >
                    {(financeModal.data.type === 'receber' ? categories.entrada : categories.saida).map(
                      (c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
                    Subcategoria
                  </label>
                  <select
                    value={financeModal.data.subcategory}
                    onChange={(e) =>
                      setFinanceModal((prev) => ({
                        ...prev,
                        data: { ...prev.data, subcategory: e.target.value }
                      }))
                    }
                    className="w-full bg-[#070C17] border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white"
                  >
                    {(
                      (financeModal.data.type === 'receber' ? categories.entrada : categories.saida).find(
                        (c) => c.name === financeModal.data.category
                      )?.subcategories || ['Geral']
                    ).map((sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
                  Descrição do Lançamento <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={financeModal.data.description}
                  onChange={(e) =>
                    setFinanceModal((prev) => ({
                      ...prev,
                      data: { ...prev.data, description: e.target.value }
                    }))
                  }
                  placeholder="Ex: Desenvolvimento Sprint 4 / Fatura Cloud"
                  className="w-full bg-[#070C17] border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <CurrencyInputBRL
                  label="Valor Total (BRL)"
                  required
                  value={financeModal.data.value}
                  onChange={(val) =>
                    setFinanceModal((prev) => ({
                      ...prev,
                      data: { ...prev.data, value: val }
                    }))
                  }
                />

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1.5">
                    Data de Vencimento
                  </label>
                  <input
                    type="date"
                    value={financeModal.data.dueDate}
                    onChange={(e) =>
                      setFinanceModal((prev) => ({
                        ...prev,
                        data: { ...prev.data, dueDate: e.target.value }
                      }))
                    }
                    className="w-full bg-[#070C17] border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1.5">
                    Situação
                  </label>
                  <select
                    value={financeModal.data.status}
                    onChange={(e) =>
                      setFinanceModal((prev) => ({
                        ...prev,
                        data: { ...prev.data, status: e.target.value }
                      }))
                    }
                    className="w-full bg-[#070C17] border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white"
                  >
                    <option value="pendente">Pendente</option>
                    <option value="pago">
                      {financeModal.data.type === 'receber' ? 'Recebido' : 'Pago'}
                    </option>
                    <option value="vencido">Vencido</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>
              </div>

              {/* Opção de gerar parcelas automaticamente */}
              {financeModal.mode === 'create' && (
                <div className="p-4 rounded-2xl bg-[#060A12] border border-slate-800 space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={financeModal.data.generateInstallments}
                      onChange={(e) =>
                        setFinanceModal((prev) => ({
                          ...prev,
                          data: { ...prev.data, generateInstallments: e.target.checked }
                        }))
                      }
                      className="w-4 h-4 accent-cyan-400 rounded"
                    />
                    <span className="text-xs font-bold text-cyan-300">
                      Gerar parcelas automaticamente a partir deste valor
                    </span>
                  </label>

                  {financeModal.data.generateInstallments && (
                    <div className="space-y-3 pt-2">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] uppercase text-slate-400 mb-1">
                            Qtd. de Parcelas
                          </label>
                          <input
                            type="number"
                            min={2}
                            max={24}
                            value={financeModal.data.installmentCount}
                            onChange={(e) =>
                              setFinanceModal((prev) => ({
                                ...prev,
                                data: { ...prev.data, installmentCount: Number(e.target.value) }
                              }))
                            }
                            className="w-full bg-[#0B1221] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-[11px] uppercase text-slate-400 mb-1">
                            Regra de Repetição
                          </label>
                          <select
                            value={financeModal.data.installmentRule}
                            onChange={(e) =>
                              setFinanceModal((prev) => ({
                                ...prev,
                                data: { ...prev.data, installmentRule: e.target.value }
                              }))
                            }
                            className="w-full bg-[#0B1221] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
                          >
                            <option value="7dias">A cada 7 dias</option>
                            <option value="15dias">A cada 15 dias</option>
                            <option value="personalizada">Repetição personalizada (intervalo + unidade)</option>
                            <option value="especifica">Data específica para cada parcela</option>
                          </select>
                        </div>
                      </div>

                      {financeModal.data.installmentRule === 'personalizada' && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] text-slate-400 mb-1">Intervalo</label>
                            <input
                              type="number"
                              min={1}
                              value={financeModal.data.customInterval}
                              onChange={(e) =>
                                setFinanceModal((prev) => ({
                                  ...prev,
                                  data: { ...prev.data, customInterval: Number(e.target.value) }
                                }))
                              }
                              className="w-full bg-[#0B1221] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] text-slate-400 mb-1">Unidade de Tempo</label>
                            <select
                              value={financeModal.data.customUnit}
                              onChange={(e) =>
                                setFinanceModal((prev) => ({
                                  ...prev,
                                  data: { ...prev.data, customUnit: e.target.value }
                                }))
                              }
                              className="w-full bg-[#0B1221] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
                            >
                              <option value="dias">Dias</option>
                              <option value="meses">Meses</option>
                            </select>
                          </div>
                        </div>
                      )}

                      {/* Prévia das parcelas */}
                      <div className="border border-slate-800 rounded-xl p-3 bg-[#0B1221] space-y-2">
                        <span className="text-[11px] font-bold uppercase text-emerald-400 block">
                          Prévia das Parcelas e Vencimentos
                        </span>
                        <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                          {previewInstallments.map((inst, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between text-xs bg-[#060A12] px-3 py-1.5 rounded-lg border border-slate-800"
                            >
                              <span className="text-slate-300">
                                Parcela {inst.number}/{inst.total}
                              </span>
                              {financeModal.data.installmentRule === 'especifica' ? (
                                <input
                                  type="date"
                                  value={inst.dueDate}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setFinanceModal((prev) => {
                                      const arr = [...(prev.data.specificDates || [])];
                                      arr[idx] = val;
                                      return {
                                        ...prev,
                                        data: { ...prev.data, specificDates: arr }
                                      };
                                    });
                                  }}
                                  className="bg-[#0B1221] border border-slate-700 rounded px-2 py-0.5 text-xs font-mono text-cyan-300"
                                />
                              ) : (
                                <span className="font-mono text-cyan-300">{formatDateBR(inst.dueDate)}</span>
                              )}
                              <span className="font-mono font-bold text-emerald-400">
                                {formatCurrencyBRL(inst.value)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
                  Observações
                </label>
                <textarea
                  rows={2}
                  value={financeModal.data.notes}
                  onChange={(e) =>
                    setFinanceModal((prev) => ({
                      ...prev,
                      data: { ...prev.data, notes: e.target.value }
                    }))
                  }
                  className="w-full bg-[#070C17] border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setFinanceModal({ open: false, mode: 'create', data: null })}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-xs font-bold text-white"
                >
                  Salvar Lançamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL DE ARQUIVOS E REPOSITÓRIO GITHUB */}
      {/* ========================================== */}
      {repoModal.open && repoModal.data && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B1221] border border-slate-700 rounded-2xl max-w-xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-lg font-bold text-white">
                {repoModal.mode === 'create'
                  ? 'Registrar Repositório e Arquivos'
                  : 'Editar Repositório e Links'}
              </h3>
              <button
                onClick={() => setRepoModal({ open: false, mode: 'create', data: null })}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRepo} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
                    Projeto Relacionado
                  </label>
                  <select
                    value={repoModal.data.projectId}
                    onChange={(e) =>
                      setRepoModal((prev) => ({
                        ...prev,
                        data: { ...prev.data, projectId: e.target.value }
                      }))
                    }
                    className="w-full bg-[#070C17] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
                    Versão ou Release
                  </label>
                  <input
                    type="text"
                    value={repoModal.data.version}
                    onChange={(e) =>
                      setRepoModal((prev) => ({
                        ...prev,
                        data: { ...prev.data, version: e.target.value }
                      }))
                    }
                    placeholder="v1.0.0"
                    className="w-full bg-[#070C17] border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-emerald-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
                    Identificação do Repositório
                  </label>
                  <input
                    type="text"
                    required
                    value={repoModal.data.repoName}
                    onChange={(e) =>
                      setRepoModal((prev) => ({
                        ...prev,
                        data: { ...prev.data, repoName: e.target.value }
                      }))
                    }
                    placeholder="uply-software/nome-do-repo"
                    className="w-full bg-[#070C17] border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
                    URL no GitHub
                  </label>
                  <input
                    type="url"
                    required
                    value={repoModal.data.repoUrl}
                    onChange={(e) =>
                      setRepoModal((prev) => ({
                        ...prev,
                        data: { ...prev.data, repoUrl: e.target.value }
                      }))
                    }
                    className="w-full bg-[#070C17] border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-cyan-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
                  Descrição e Observações
                </label>
                <textarea
                  rows={2}
                  value={repoModal.data.description}
                  onChange={(e) =>
                    setRepoModal((prev) => ({
                      ...prev,
                      data: { ...prev.data, description: e.target.value }
                    }))
                  }
                  className="w-full bg-[#070C17] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              {/* Links de arquivos relevantes */}
              <div className="p-3.5 rounded-xl bg-[#060A12] border border-slate-800 space-y-2.5">
                <span className="text-xs font-bold text-cyan-300 block">
                  Links para Arquivos Relevantes (RFCs, Figma, Docs)
                </span>
                <div className="space-y-1.5">
                  {repoModal.data.files.map((f, i) => (
                    <div key={i} className="flex items-center justify-between text-xs bg-[#0B1221] px-3 py-1.5 rounded-lg">
                      <span className="truncate">{f.title} ({f.url})</span>
                      <button
                        type="button"
                        onClick={() =>
                          setRepoModal((prev) => ({
                            ...prev,
                            data: {
                              ...prev.data,
                              files: prev.data.files.filter((_, idx) => idx !== i)
                            }
                          }))
                        }
                        className="text-rose-400 ml-2"
                      >
                        Remover
                      </button>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Título do arquivo"
                    value={newFileTitle}
                    onChange={(e) => setNewFileTitle(e.target.value)}
                    className="sm:col-span-2 bg-[#0B1221] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                  <input
                    type="url"
                    placeholder="https://..."
                    value={newFileUrl}
                    onChange={(e) => setNewFileUrl(e.target.value)}
                    className="sm:col-span-2 bg-[#0B1221] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newFileTitle.trim() || !newFileUrl.trim()) return;
                      setRepoModal((prev) => ({
                        ...prev,
                        data: {
                          ...prev.data,
                          files: [...prev.data.files, { title: newFileTitle.trim(), url: newFileUrl.trim() }]
                        }
                      }));
                      setNewFileTitle('');
                      setNewFileUrl('');
                    }}
                    className="bg-cyan-500/20 text-cyan-300 rounded-lg text-xs font-bold py-1.5"
                  >
                    + Link
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setRepoModal({ open: false, mode: 'create', data: null })}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-xs font-bold text-white"
                >
                  Salvar Registro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL DE CONFIRMAÇÃO GLOBAL */}
      {/* ========================================== */}
      {confirmDialog.open && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B1221] border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white">{confirmDialog.title}</h3>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">{confirmDialog.description}</p>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}
                className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (confirmDialog.onConfirm) confirmDialog.onConfirm();
                  setConfirmDialog((prev) => ({ ...prev, open: false }));
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white ${
                  confirmDialog.variant === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-500'
                    : 'bg-gradient-to-r from-cyan-500 to-blue-600'
                }`}
              >
                {confirmDialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOASTS FLUTUANTES DISCRETOS */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto p-3.5 rounded-xl border shadow-xl flex items-center gap-2.5 text-xs font-semibold ${
              t.type === 'error'
                ? 'bg-rose-950/95 border-rose-500/40 text-rose-200'
                : t.type === 'info'
                ? 'bg-[#0B1221]/95 border-cyan-500/40 text-cyan-200'
                : 'bg-emerald-950/95 border-emerald-500/40 text-emerald-200'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}