'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Bot as BotIcon, 
  Plus, 
  Trash2, 
  Play, 
  Square, 
  ChevronDown, 
  ChevronUp, 
  Lock, 
  Globe, 
  Users, 
  Webhook, 
  Activity, 
  Clock, 
  Terminal,
  Save,
  RefreshCw,
  AlertTriangle,
  UserCircle,
  Type,
  CheckCircle2,
  MessageSquare,
  Tag,
  Image as ImageIcon,
  ChevronRight,
  Settings2,
  DollarSign
} from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

type Bot = {
  id: string;
  name: string;
  token: string;
  status: string;
  is_private: boolean;
  allowed_groups: string[];
  use_webhooks: boolean;
  webhook_url: string;
  last_seen: string | null;
  created_at: string;
  config?: Record<string, string>;
};

type BotLog = {
  id: string;
  message: string;
  type: string;
  created_at: string;
};

const BOT_STEPS = [
  {
    title: '1. Boas-Vindas',
    description: 'Primeira mensagem ao digitar /start',
    icon: UserCircle,
    imageKey: 'welcome_image_url',
    textKey: 'welcome_message',
    displayModeKey: 'welcome_display_mode',
    buttons: [{ key: 'btn_start', label: 'Botão principal' }],
  },
  {
    title: '2. Pedir ID',
    description: 'Solicita o ID Free Fire do cliente',
    icon: Type,
    imageKey: 'ask_id_image_url',
    textKey: 'ask_id_text',
    displayModeKey: 'ask_id_display_mode',
    buttons: [],
  },
  {
    title: '3. Confirmar ID',
    description: 'Confirma se o ID digitado está correto',
    icon: CheckCircle2,
    imageKey: 'confirm_id_image_url',
    textKey: 'confirm_id_text',
    displayModeKey: 'confirm_id_display_mode',
    buttons: [
      { key: 'btn_confirm_yes', label: 'Botão Sim' },
      { key: 'btn_confirm_no', label: 'Botão Não' },
    ],
  },
  {
    title: '4. Código Promocional?',
    description: 'Pergunta se tem código de desconto',
    icon: Tag,
    imageKey: 'ask_promo_image_url',
    textKey: 'ask_promo_text',
    displayModeKey: 'ask_promo_display_mode',
    buttons: [
      { key: 'btn_promo_yes', label: 'Botão Sim' },
      { key: 'btn_promo_no', label: 'Botão Não' },
    ],
  },
  {
    title: '5. Digitar Código',
    description: 'Solicita o código promocional',
    icon: MessageSquare,
    imageKey: 'ask_promo_code_image_url',
    textKey: 'ask_promo_code_text',
    displayModeKey: 'ask_promo_code_display_mode',
    buttons: [
      { key: 'btn_retry_promo', label: 'Tentar de novo' },
      { key: 'btn_no_promo', label: 'Sem desconto' },
    ],
  },
];

export default function BotsPage() {
  const [bots, setBots] = useState<Bot[]>([]);
  const [runningBots, setRunningBots] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newToken, setNewToken] = useState('');
  const [adding, setAdding] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [logs, setLogs] = useState<Record<string, BotLog[]>>({});
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [editingBot, setEditingBot] = useState<Bot | null>(null);
  const [editedConfig, setEditedConfig] = useState<Record<string, string>>({});
  const [savingConfig, setSavingConfig] = useState(false);

  useEffect(() => {
    loadBots();
    loadRunning();
    
    // Auto-refresh running status every 10s
    const interval = setInterval(() => {
      loadRunning();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  async function loadBots() {
    setLoading(true);
    const { data: botsData } = await supabase.from('bots').select('*').order('created_at', { ascending: false });
    
    // Auto-repair: If any bot is an orphan (no owner_id), try to claim it
    const orphans = botsData?.filter(b => !b.owner_id) || [];
    if (orphans.length > 0) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            for (const bot of orphans) {
               await supabase.from('bots').update({ owner_id: user.id }).eq('id', bot.id);
            }
        }
    }

    setBots(botsData || []);
    setLoading(false);
  }

  async function loadRunning() {
    try {
      const res = await fetch('/api/bots/control');
      const data = await res.json();
      setRunningBots(data.running || []);
    } catch { /* ignore */ }
  }

  const loadLogs = useCallback(async (botId: string) => {
    setLoadingLogs(true);
    const { data, error } = await supabase
        .from('bot_logs')
        .select('*')
        .eq('bot_id', botId)
        .order('created_at', { ascending: false })
        .limit(20);
    
    if (error) {
        console.error('[LOGS] Fetch error:', error);
        showToast('Erro ao carregar logs.');
    }
    setLogs(prev => ({ ...prev, [botId]: data || [] }));
    setLoadingLogs(false);
  }, []);

  useEffect(() => {
    if (expandedId) {
      loadLogs(expandedId);
    }
  }, [expandedId, loadLogs]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  async function addBot() {
    if (!newName || !newToken) return;
    setAdding(true);
    
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from('bots').insert({ 
        name: newName, 
        token: newToken, 
        status: 'inactive',
        allowed_groups: [],
        owner_id: user?.id
    });
    setNewName(''); setNewToken('');
    setAdding(false);
    showToast('Bot adicionado!');
    loadBots();
  }

  async function deleteBot(id: string) {
    if (!confirm('Tem certeza? Isso removerá todos os logs e ordens vinculadas.')) return;
    if (runningBots.includes(id)) {
      await controlBot(id, 'stop');
    }
    await supabase.from('bots').delete().eq('id', id);
    showToast('Bot removido.');
    loadBots();
    loadRunning();
  }

  async function controlBot(id: string, action: 'start' | 'stop') {
    setActionLoading(id);
    try {
      const res = await fetch('/api/bots/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botId: id, action }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(action === 'start' ? '🟢 Bot iniciado!' : '🔴 Bot parado.');
      } else {
        showToast(`❌ Erro: ${data.error}`);
      }
    } catch (e: any) {
      showToast(`❌ Erro: ${e.message}`);
    }
    setActionLoading(null);
    loadBots();
    loadRunning();
  }

  const [syncing, setSyncing] = useState(false);
  async function syncAllBots() {
    setSyncing(true);
    try {
      const res = await fetch('/api/bots/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync', botId: 'all' }), // botId is required by API but ignored for sync
      });
      const data = await res.json();
      if (data.success) {
        showToast(`🔄 Bots sincronizados! Reiniciados: ${data.restarted}`);
      }
    } catch (e: any) {
      showToast(`❌ Erro: ${e.message}`);
    }
    setSyncing(false);
    loadBots();
    loadRunning();
  }

  async function updateBotSetting(id: string, field: keyof Bot, value: any) {
    const { error } = await supabase.from('bots').update({ [field]: value }).eq('id', id);
    if (!error) {
        setBots(prev => prev.map(b => b.id === id ? { ...b, [field]: value } : b));
        showToast('Configuração salva!');
    }
  }

  async function openConfig(bot: Bot) {
    setEditingBot(bot);
    setEditedConfig(bot.config || {});
  }

  async function saveBotConfig() {
    if (!editingBot) return;
    setSavingConfig(true);
    const { error } = await supabase.from('bots').update({ config: editedConfig }).eq('id', editingBot.id);
    if (!error) {
        setBots(prev => prev.map(b => b.id === editingBot.id ? { ...b, config: editedConfig } : b));
        showToast('✅ Mensagens do bot salvas!');
        setEditingBot(null);
    } else {
        showToast('❌ Erro ao salvar configurações.');
    }
    setSavingConfig(false);
  }

  async function openConfig(bot: Bot) {
    setEditingBot(bot);
    setEditedConfig(bot.config || {});
  }

  async function saveBotConfig() {
    if (!editingBot) return;
    setSavingConfig(true);
    const { error } = await supabase.from('bots').update({ config: editedConfig }).eq('id', editingBot.id);
    if (!error) {
        setBots(prev => prev.map(b => b.id === editingBot.id ? { ...b, config: editedConfig } : b));
        showToast('✅ Mensagens do bot salvas!');
        setEditingBot(null);
    } else {
        showToast('❌ Erro ao salvar configurações.');
    }
    setSavingConfig(false);
  }

  const getStatusColor = (bot: Bot, isRunning: boolean) => {
    if (!isRunning) return 'text-slate-500 bg-slate-950/50 border-slate-800';
    
    const lastSeen = bot.last_seen ? new Date(bot.last_seen).getTime() : 0;
    const now = new Date().getTime();
    const diff = (now - lastSeen) / 1000;

    if (diff < 60) return 'text-green-400 bg-green-500/10 border-green-500/20'; // Ativo há menos de 1 min
    if (diff < 300) return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'; // Inativo há menos de 5 min (Polling talvez)
    return 'text-red-400 bg-red-500/10 border-red-500/20'; // Sem sinal
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold tracking-tight text-white font-outfit">Meus Bots</h2>
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
           <h2 className="text-3xl font-bold tracking-tight text-white font-outfit">Meus Bots</h2>
           <p className="text-sm text-slate-400 mt-1">Gerencie a privacidade e operação dos seus bots do Telegram.</p>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={syncAllBots} 
                disabled={syncing}
                className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition-all disabled:opacity-50"
            >
                <Activity className={`w-3.5 h-3.5 ${syncing ? 'animate-pulse' : ''}`} />
                {syncing ? 'Sincronizando...' : 'Sincronizar Bots'}
            </button>
            <button onClick={loadBots} className="p-2 text-slate-400 hover:text-white transition-colors bg-slate-900 border border-slate-800 rounded-lg">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-lg shadow-xl animate-in fade-in slide-in-from-top-4">
          {toast}
        </div>
      )}

      {/* Add Bot Card */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 shadow-sm">
        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4 text-blue-500" /> Adicionar Novo Bot
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-4 space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-500">Apelido do Bot</label>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ex: CentralVendasBot"
              className="h-10 w-full rounded-md border border-slate-800 bg-slate-950 px-3 text-sm text-white placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="md:col-span-6 space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-500">Token do @BotFather</label>
            <input value={newToken} onChange={(e) => setNewToken(e.target.value)} placeholder="123456:ABC-DEF..."
              className="h-10 w-full rounded-md border border-slate-800 bg-slate-950 px-3 text-sm text-white font-mono placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <button onClick={addBot} disabled={adding || !newName || !newToken}
            className="md:col-span-2 h-10 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold uppercase rounded-md transition-all flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" /> {adding ? '...' : 'Salvar'}
          </button>
        </div>
      </div>

      {/* Bots Grid/List */}
      <div className="space-y-4">
        {bots.map((bot) => {
          const isRunning = runningBots.includes(bot.id);
          const isExpanded = expandedId === bot.id;
          const statusStyle = getStatusColor(bot, isRunning);
          
          return (
            <div key={bot.id} className={`bg-slate-900 rounded-xl border transition-all ${isExpanded ? 'border-blue-500/50 ring-1 ring-blue-500/20' : 'border-slate-800 hover:border-slate-700'}`}>
              
                {/* Header / Summary Card */}
                <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : bot.id)}>
                   <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 ${isRunning ? 'bg-green-500/10 text-green-400' : 'bg-slate-950 text-slate-600'}`}>
                         <BotIcon className="w-6 h-6" />
                      </div>
                      <div>
                         <div className="flex items-center gap-2">
                            <h3 className="font-bold text-white text-lg">{bot.name}</h3>
                            {bot.is_private ? (
                                <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 text-[9px] font-bold uppercase border border-amber-500/20 flex items-center gap-1">
                                    <Lock className="w-2.5 h-2.5" /> Privado
                                </span>
                            ) : (
                                <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 text-[9px] font-bold uppercase border border-blue-500/20 flex items-center gap-1">
                                    <Globe className="w-2.5 h-2.5" /> Público
                                </span>
                            )}
                         </div>
                         <p className="text-[10px] text-slate-500 font-mono mt-0.5">{bot.token?.substring(0, 15)}*********************</p>
                      </div>
                   </div>

                   <div className="flex items-center gap-3">
                      <div className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-lg border flex items-center gap-2 ${statusStyle}`}>
                         <Activity className="w-3.5 h-3.5" />
                         {isRunning ? (bot.last_seen ? 'ONLINE' : 'INICIANDO...') : 'OFFLINE'}
                      </div>
                      
                      <button 
                        onClick={(e) => { e.stopPropagation(); openConfig(bot); }}
                        className="h-9 px-3 text-xs font-bold uppercase rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-all flex items-center gap-2"
                      >
                         <MessageSquare className="w-3.5 h-3.5" />
                         Mensagens
                      </button>

                      <button 
                         onClick={(e) => { e.stopPropagation(); controlBot(bot.id, isRunning ? 'stop' : 'start'); }}
                        className={`h-9 px-4 text-xs font-bold uppercase rounded-lg flex items-center gap-2 transition-all ${isRunning ? 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-400 hover:text-white' : 'bg-green-600 text-white hover:bg-green-500 shadow-lg shadow-green-900/20'}`}
                      >
                         {actionLoading === bot.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : (isRunning ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />)}
                         {isRunning ? 'Parar' : 'Iniciar'}
                      </button>

                      <button className="p-2 text-slate-500 hover:text-white bg-slate-950 border border-slate-800 rounded-lg">
                         {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </button>
                   </div>
                </div>

                {/* Expanded Section */}
                {isExpanded && (
                    <div className="border-t border-slate-800 bg-slate-950/30 p-6 animate-in slide-in-from-top-2">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            
                            {/* Settings Left */}
                            <div className="space-y-6">
                                {/* Privacy Toggle */}
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                        <Lock className="w-3.5 h-3.5" /> Privacidade e Operação
                                    </h4>
                                    <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="text-sm font-bold text-white">Modo Privado</div>
                                                <div className="text-[10px] text-slate-500">Bloqueia comandos na DM e permite apenas em grupos autorizados.</div>
                                            </div>
                                            <button 
                                                onClick={() => updateBotSetting(bot.id, 'is_private', !bot.is_private)}
                                                className={`relative w-10 h-5 rounded-full transition-colors ${bot.is_private ? 'bg-blue-600' : 'bg-slate-700'}`}>
                                                <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${bot.is_private ? 'translate-x-5' : 'translate-x-0'}`} />
                                            </button>
                                        </div>

                                        {bot.is_private && (
                                            <div className="space-y-2 pt-2 border-t border-slate-800">
                                                <label className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                                                    <Users className="w-3 h-3" /> IDs dos Grupos (Separados por vírgula)
                                                </label>
                                                <div className="flex gap-2">
                                                    <input 
                                                        defaultValue={bot.allowed_groups?.join(', ')}
                                                        onBlur={(e) => {
                                                            const ids = e.target.value.split(',').map(s => s.trim()).filter(s => s);
                                                            updateBotSetting(bot.id, 'allowed_groups', ids);
                                                        }}
                                                        placeholder="-100123456, -100987654"
                                                        className="flex-1 h-9 bg-slate-950 border border-slate-800 rounded px-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                    />
                                                    <button className="p-2 bg-slate-800 text-slate-400 rounded hover:text-white">
                                                        <Save className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                <p className="text-[9px] text-amber-500/70 italic flex items-center gap-1">
                                                    <AlertTriangle className="w-2.5 h-2.5" /> O Bot ignorará conversas privadas enquanto este modo estiver ativo.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Webhook Toggle */}
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                        <Webhook className="w-3.5 h-3.5" /> Configuração de Entrega
                                    </h4>
                                    <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="text-sm font-bold text-white">Utilizar Webhooks</div>
                                                <div className="text-[10px] text-slate-500">Melhor performance e status em tempo real (Requer Edge Function).</div>
                                            </div>
                                            <button 
                                                 onClick={() => updateBotSetting(bot.id, 'use_webhooks', !bot.use_webhooks)}
                                                 className={`relative w-10 h-5 rounded-full transition-colors ${bot.use_webhooks ? 'bg-blue-600' : 'bg-slate-700'}`}>
                                                <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${bot.use_webhooks ? 'translate-x-5' : 'translate-x-0'}`} />
                                            </button>
                                        </div>

                                        {bot.use_webhooks && (
                                            <div className="space-y-2 pt-2 border-t border-slate-800">
                                                <label className="text-[10px] uppercase font-bold text-slate-500">URL do Webhook</label>
                                                <input 
                                                    defaultValue={bot.webhook_url}
                                                    onBlur={(e) => updateBotSetting(bot.id, 'webhook_url', e.target.value)}
                                                    placeholder="https://...supabase.co/functions/v1/..."
                                                    className="w-full h-9 bg-slate-950 border border-slate-800 rounded px-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <button onClick={() => deleteBot(bot.id)} className="w-full h-10 border border-red-500/20 bg-red-500/5 text-red-500 text-[10px] font-bold uppercase rounded-xl hover:bg-red-500/10 transition-colors flex items-center justify-center gap-2">
                                    <Trash2 className="w-4 h-4" /> Excluir Bot Definitivamente
                                </button>
                            </div>

                            {/* Logs Right */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                        <Terminal className="w-3.5 h-3.5" /> Logs de Interação (Tempo Real)
                                    </h4>
                                    <button onClick={() => loadLogs(bot.id)} className="text-[10px] text-blue-500 hover:underline">Atualizar</button>
                                </div>
                                <div className="bg-black/40 border border-slate-800 rounded-xl overflow-hidden flex flex-col h-[380px]">
                                    <div className="flex-1 overflow-auto p-4 font-mono text-[11px] space-y-2 custom-scrollbar">
                                        {loadingLogs ? (
                                            <div className="flex items-center justify-center h-full text-slate-600">Carregando logs...</div>
                                        ) : logs[bot.id]?.length === 0 ? (
                                            <div className="flex items-center justify-center h-full text-slate-700 italic">Sem eventos registrados recentemente.</div>
                                        ) : (
                                            logs[bot.id]?.map((log) => (
                                                <div key={log.id} className="flex gap-2 group">
                                                    <span className="text-slate-600 shrink-0">[{new Date(log.created_at).toLocaleTimeString()}]</span>
                                                    <span className={
                                                        log.type === 'error' ? 'text-red-400' :
                                                        log.type === 'success' ? 'text-green-400' :
                                                        log.type === 'warning' ? 'text-yellow-400' :
                                                        'text-blue-300'
                                                    }>
                                                        {log.message}
                                                    </span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    <div className="bg-slate-900/50 p-2 border-t border-slate-800 flex items-center justify-between">
                                        <div className="text-[9px] text-slate-500 flex items-center gap-1 uppercase font-bold">
                                            <Clock className="w-2.5 h-2.5" /> Última atividade: {bot.last_seen ? new Date(bot.last_seen).toLocaleString() : 'Nunca'}
                                        </div>
                                        {isRunning && <div className="flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                                            <span className="text-[9px] font-bold text-green-500 uppercase">Monitorando</span>
                                        </div>}
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                )}
            </div>
          );
        })}

        {bots.length === 0 && (
          <div className="text-center text-slate-600 py-20 border-2 border-dashed border-slate-800 rounded-xl bg-slate-900/20">
            <BotIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-lg font-bold text-slate-400">Nenhum bot cadastrado</p>
            <p className="text-xs max-w-xs mx-auto text-slate-500 mt-2">Você ainda não conectou nenhum bot do Telegram. Use o Token do @BotFather para começar.</p>
          </div>
        )}
      </div>

      {/* Message Config Modal */}
      {editingBot && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setEditingBot(null)} />
            <div className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Modal Header */}
                <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center">
                            <BotIcon className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-lg">Configurar Mensagens: {editingBot.name}</h3>
                            <p className="text-xs text-slate-500">Personalize o fluxo do bot para este dispositivo.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setEditingBot(null)} className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors">Cancelar</button>
                        <button 
                            onClick={saveBotConfig}
                            disabled={savingConfig}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase rounded-lg transition-all shadow-lg shadow-blue-900/20 flex items-center gap-2"
                        >
                            {savingConfig ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                            Salvar Alterações
                        </button>
                    </div>
                </div>

                {/* Modal Content - Scrollable */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-950/20">
                    
                    {/* Price Config */}
                    <div className="bg-blue-600/5 border border-blue-500/20 rounded-xl p-5 mb-6">
                        <div className="flex items-center gap-2 mb-4">
                            <DollarSign className="w-5 h-5 text-blue-500" />
                            <h3 className="text-white font-bold text-sm">Finanças do Bot</h3>
                            <p className="text-[10px] text-slate-500 ml-auto">Estes valores sobrescrevem as configurações globais.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Preço de Venda (R$)</label>
                                <input 
                                    type="number" step="0.50"
                                    value={editedConfig['pass_price'] || ''} 
                                    onChange={e => setEditedConfig(prev => ({ ...prev, ['pass_price']: e.target.value }))}
                                    placeholder="8.00 (Global)"
                                    className="w-full h-10 bg-slate-950 border border-slate-800 rounded-lg px-4 text-xs text-blue-400 font-bold focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Custo (R$)</label>
                                <input 
                                    type="number" step="0.50"
                                    value={editedConfig['pass_cost'] || ''} 
                                    onChange={e => setEditedConfig(prev => ({ ...prev, ['pass_cost']: e.target.value }))}
                                    placeholder="2.00 (Global)"
                                    className="w-full h-10 bg-slate-950 border border-slate-800 rounded-lg px-4 text-xs text-red-400 font-bold focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                            <div className="flex flex-col justify-end">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block text-center">Lucro Estimado</label>
                                <div className="h-10 flex items-center justify-center bg-slate-950 border border-slate-800 rounded-lg text-sm font-black text-green-500">
                                    R$ {(parseFloat(editedConfig['pass_price'] || '0') - parseFloat(editedConfig['pass_cost'] || '0')).toFixed(2)}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                        {BOT_STEPS.map((step) => (
                            <div key={step.title} className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
                                            <step.icon className="w-4 h-4 text-blue-400" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-white">{step.title}</h4>
                                            <p className="text-[10px] text-slate-500">{step.description}</p>
                                        </div>
                                    </div>

                                    {/* Toggle Mode */}
                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800">
                                        <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1 uppercase">
                                            {(editedConfig[step.displayModeKey] || 'IMAGE') === 'TEXT' ? <Type className="w-3 h-3" /> : <ImageIcon className="w-3 h-3" />}
                                            {(editedConfig[step.displayModeKey] || 'IMAGE') === 'TEXT' ? 'Texto' : 'Imagem'}
                                        </span>
                                        <button 
                                            onClick={() => setEditedConfig(prev => ({ ...prev, [step.displayModeKey]: (prev[step.displayModeKey] || 'IMAGE') === 'TEXT' ? 'IMAGE' : 'TEXT' }))}
                                            className={`relative w-8 h-4 rounded-full transition-colors ${(editedConfig[step.displayModeKey] || 'IMAGE') === 'TEXT' ? 'bg-slate-700' : 'bg-blue-600'}`}>
                                            <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${(editedConfig[step.displayModeKey] || 'IMAGE') === 'TEXT' ? 'translate-x-0' : 'translate-x-4'}`} />
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Image Field */}
                                    <div className={(editedConfig[step.displayModeKey] || 'IMAGE') === 'TEXT' ? 'opacity-30 grayscale pointer-events-none' : ''}>
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">URL da Imagem</label>
                                        <input 
                                            value={editedConfig[step.imageKey] || ''} 
                                            onChange={e => setEditedConfig(prev => ({ ...prev, [step.imageKey]: e.target.value }))}
                                            placeholder="https://..."
                                            className="w-full h-10 bg-slate-950 border border-slate-800 rounded-lg px-4 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        />
                                    </div>

                                    {/* Text Field */}
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">
                                            {(editedConfig[step.displayModeKey] || 'IMAGE') === 'TEXT' ? 'Mensagem' : 'Legenda'}
                                        </label>
                                        <input 
                                            value={editedConfig[step.textKey] || ''} 
                                            onChange={e => setEditedConfig(prev => ({ ...prev, [step.textKey]: e.target.value }))}
                                            placeholder="Digite aqui..."
                                            className="w-full h-10 bg-slate-950 border border-slate-800 rounded-lg px-4 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>

                                {/* Buttons inside step */}
                                {step.buttons.length > 0 && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-800/50">
                                        {step.buttons.map(btn => (
                                            <div key={btn.key} className="space-y-1">
                                                <label className="text-[9px] font-bold text-slate-600 uppercase ml-1">{btn.label}</label>
                                                <input 
                                                    value={editedConfig[btn.key] || ''} 
                                                    onChange={e => setEditedConfig(prev => ({ ...prev, [btn.key]: e.target.value }))}
                                                    className="w-full h-9 bg-slate-900 border border-slate-800 rounded-lg px-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
