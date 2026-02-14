
'use client';

import { useEffect, useState } from 'react';
import { 
  Webhook, 
  Link as LinkIcon, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Copy,
  Terminal,
  ShieldCheck,
  Globe
} from 'lucide-react';

type Bot = {
  id: string;
  name: string;
  use_webhooks: boolean;
  webhook_url: string;
  status: string;
};

export default function WebhooksPage() {
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const [appBaseUrl, setAppBaseUrl] = useState('');
  const [toast, setToast] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    // Try to guess default URL
    if (typeof window !== 'undefined') {
        setAppBaseUrl(window.location.origin);
    }
  }, []);

  async function loadData() {
    setLoading(true);
    try {
        const res = await fetch('/api/bots');
        const data = await res.json();
        setBots(Array.isArray(data) ? data : []);
    } catch (e) {
        console.error(e);
    }
    setLoading(false);
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  async function copyToClipboard(text: string) {
    await navigator.clipboard.writeText(text);
    showToast('Copiado para a área de transferência!');
  }

  async function setupWebhook(botId: string, customUrl?: string) {
    if (!customUrl && !appBaseUrl.startsWith('http')) {
        alert('URL inválida.');
        return;
    }

    setProcessing(botId);
    try {
        const generatedUrl = customUrl || `${appBaseUrl}/api/bot/webhook/${botId}`;

        // 1. Update Config via API
        const updateRes = await fetch('/api/bots', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                id: botId, 
                use_webhooks: true, 
                webhook_url: generatedUrl 
            })
        });

        if (!updateRes.ok) throw new Error('Falha ao salvar configuração');

        // 2. Trigger Bot Restart (This effectively registers the webhook with Telegram)
        const res = await fetch('/api/bots/control', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ botId, action: 'start' }), 
        });
        
        const data = await res.json();
        if (data.success) {
            showToast('Webhook configurado e Bot reiniciado!');
            loadData();
        } else {
            showToast(`Erro ao reiniciar: ${data.error}`);
        }

    } catch (e: any) {
        showToast(`Erro: ${e.message}`);
    } finally {
        setProcessing(null);
    }
  }

  async function disableWebhook(botId: string) {
    setProcessing(botId);
    try {
        // 1. Update Config via API
        const updateRes = await fetch('/api/bots', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                id: botId, 
                use_webhooks: false
            })
        });
        
        if (!updateRes.ok) throw new Error('Falha ao salvar configuração');

        // 2. Restart (startBot will detect use_webhooks=false and deleteWebhook)
        await fetch('/api/bots/control', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ botId, action: 'start' }),
        });

        showToast('Webhook desativado e Bot alterado para Polling!');
        loadData();
    } catch (e: any) {
        showToast(`Erro: ${e.message}`);
    } finally {
        setProcessing(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
         <h2 className="text-3xl font-bold tracking-tight text-white font-outfit">Configuração de Webhooks</h2>
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
           <h2 className="text-3xl font-bold tracking-tight text-white font-outfit">Configuração de Webhooks</h2>
           <p className="text-sm text-slate-400 mt-1">Conecte seus bots para receber atualizações em tempo real.</p>
        </div>
        <button onClick={loadData} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
            <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-lg shadow-xl animate-in fade-in slide-in-from-top-4">
          {toast}
        </div>
      )}

      {/* URL Helper */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 shadow-sm overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-5">
            <Globe className="w-32 h-32 text-blue-500" />
        </div>
        <div className="relative z-10">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-blue-500" /> URL da Aplicação (Base)
            </h3>
            <div className="max-w-xl space-y-3">
                <div className="flex gap-2">
                    <input 
                        value={appBaseUrl}
                        onChange={(e) => setAppBaseUrl(e.target.value)}
                        placeholder="https://seu-dominio.com"
                        className="h-10 flex-1 rounded-md border border-slate-800 bg-slate-950 px-3 text-sm text-white placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    />
                </div>
                <p className="text-[10px] text-slate-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> 
                    Certifique-se de que esta URL é pública e acessível pelo Telegram (HTTPS obrigatório).
                </p>
            </div>
        </div>
      </div>

      {/* Bots Webhook Status */}
      <div className="grid gap-4">
        {bots.map((bot) => {
          const isProcessing = processing === bot.id;
          const hasWebhook = bot.use_webhooks && bot.webhook_url;

          return (
            <div key={bot.id} className="bg-slate-900 rounded-xl border border-slate-800 p-5 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${hasWebhook ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-800 text-slate-500'}`}>
                        <Webhook className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <h4 className="font-bold text-white text-lg">{bot.name}</h4>
                            {hasWebhook ? (
                                <span className="flex items-center gap-1 text-[10px] font-bold text-green-500 uppercase">
                                    <CheckCircle2 className="w-3 h-3" /> Ativo
                                </span>
                            ) : (
                                <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase">
                                    Modo Polling
                                </span>
                            )}
                        </div>
                        {hasWebhook && (
                            <div className="flex items-center gap-2">
                                <code className="text-[10px] bg-black/40 px-2 py-1 rounded text-slate-400 font-mono">
                                    {bot.webhook_url}
                                </code>
                                <button onClick={() => copyToClipboard(bot.webhook_url)} className="text-slate-500 hover:text-white transition-colors">
                                    <Copy className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {hasWebhook ? (
                        <button 
                            disabled={isProcessing}
                            onClick={() => disableWebhook(bot.id)}
                            className="px-4 h-9 text-xs font-bold uppercase text-slate-400 hover:text-white border border-slate-800 rounded-lg transition-colors"
                        >
                            {isProcessing ? 'Processando...' : 'Voltar para Polling'}
                        </button>
                    ) : (
                        <button 
                            disabled={isProcessing}
                            onClick={() => setupWebhook(bot.id)}
                            className="px-4 h-9 text-xs font-bold uppercase bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all shadow-lg shadow-blue-900/20 flex items-center gap-2"
                        >
                            {isProcessing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Webhook className="w-3 h-3" />}
                            Ativar Webhook
                        </button>
                    )}
                </div>
            </div>
          );
        })}

        {bots.length === 0 && (
          <div className="text-center text-slate-600 py-12 border-2 border-dashed border-slate-800 rounded-xl">
             Nenhum bot encontrado para configurar.
          </div>
        )}
      </div>

      {/* Deployment Helper Card */}
      <div className="bg-blue-600/5 rounded-xl border border-blue-500/20 p-6 space-y-4">
          <h3 className="text-white font-bold flex items-center gap-2">
              <Terminal className="w-5 h-5 text-blue-400" /> Nota sobre Webhooks
          </h3>
          <div className="space-y-3">
              <p className="text-sm text-slate-300">
                  Ao ativar o Webhook, o Telegram enviará atualizações para a URL configurada. Certifique-se de que sua aplicação está acessível publicamente (use <b>ngrok</b> para desenvolvimento local ou a URL do seu deploy Vercel/VPS em produção).
              </p>
          </div>
      </div>
    </div>
  );
}
