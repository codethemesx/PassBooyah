'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Webhook, 
  Link as LinkIcon, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Copy,
  Terminal,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

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
  const [supabaseBaseUrl, setSupabaseBaseUrl] = useState('');
  const [toast, setToast] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const { data: botsData } = await supabase.from('bots').select('id, name, use_webhooks, webhook_url, status');
    setBots(botsData || []);

    // Try to derive base URL from process.env if available, or just leave empty for user
    if (supabaseUrl) {
        setSupabaseBaseUrl(supabaseUrl.replace(/\/$/, ''));
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
    if (!customUrl && !supabaseBaseUrl.includes('.supabase.co')) {
        alert('Por favor, insira uma URL válida do Supabase (ex: https://abc.supabase.co)');
        return;
    }

    setProcessing(botId);
    try {
        const generatedUrl = customUrl || `${supabaseBaseUrl}/functions/v1/telegram-webhook?botId=${botId}`;

        // 1. Update DB
        const { error: dbError } = await supabase
            .from('bots')
            .update({ 
                use_webhooks: true, 
                webhook_url: generatedUrl 
            })
            .eq('id', botId);

        if (dbError) throw dbError;

        // 2. Trigger Bot Restart
        const res = await fetch('/api/bots/control', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ botId, action: 'start' }), 
        });
        
        const data = await res.json();
        if (data.success) {
            showToast(customUrl ? 'Webhook Direto (ngrok) configurado!' : 'Webhook via Supabase configurado!');
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

  async function setupLocalWebhook(botId: string) {
    const appUrl = window.location.origin; // Dynamically use the current tunnel URL
    const localWebhookUrl = `${appUrl}/api/bot/webhook/${botId}`;
    await setupWebhook(botId, localWebhookUrl);
  }

  async function disableWebhook(botId: string) {
    setProcessing(botId);
    try {
        // 1. Update DB
        const { error: dbError } = await supabase
            .from('bots')
            .update({ 
                use_webhooks: false
            })
            .eq('id', botId);

        if (dbError) throw dbError;

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
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
           <h2 className="text-3xl font-bold tracking-tight text-white font-outfit">Configuração de Webhooks</h2>
           <p className="text-sm text-slate-400 mt-1">Conecte seus bots à Edge Function do Supabase para maior performance.</p>
        </div>
      </div>

      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-lg shadow-xl animate-in fade-in slide-in-from-top-4">
          {toast}
        </div>
      )}

      {/* Supabase URL Helper */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 shadow-sm overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-5">
            <ShieldCheck className="w-32 h-32 text-blue-500" />
        </div>
        <div className="relative z-10">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-blue-500" /> URL do Projeto Supabase
            </h3>
            <div className="max-w-xl space-y-3">
                <div className="flex gap-2">
                    <input 
                        value={supabaseBaseUrl}
                        onChange={(e) => setSupabaseBaseUrl(e.target.value)}
                        placeholder="https://sua-id.supabase.co"
                        className="h-10 flex-1 rounded-md border border-slate-800 bg-slate-950 px-3 text-sm text-white placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    />
                </div>
                <p className="text-[10px] text-slate-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> 
                    Você encontra esta URL no painel do Supabase em Project Settings {'>'} API.
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
                        <>
                            <button 
                                disabled={isProcessing}
                                onClick={() => setupLocalWebhook(bot.id)}
                                title="Conecta o Telegram diretamente ao seu PC via ngrok (Mais rápido)"
                                className="px-4 h-9 text-xs font-bold uppercase bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg transition-all shadow-lg shadow-blue-900/20 flex items-center gap-2 border border-blue-400/20"
                            >
                                {isProcessing ? '...' : (
                                    <>
                                        <RefreshCw className="w-3 h-3 animate-pulse" />
                                        Ativar via Túnel Local (Rápido)
                                    </>
                                )}
                            </button>
                            <button 
                                disabled={isProcessing}
                                onClick={() => setupWebhook(bot.id)}
                                className="px-4 h-9 text-xs font-bold uppercase bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-all"
                            >
                                {isProcessing ? '...' : 'Usar Supabase Proxy'}
                            </button>
                        </>
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
              <Terminal className="w-5 h-5 text-blue-400" /> Como configurar no Supabase?
          </h3>
          <div className="space-y-3">
              <p className="text-sm text-slate-300">
                  Para que os webhooks funcionem, você deve ter a Edge Function <code>telegram-webhook</code> implantada no seu projeto Supabase.
              </p>
              <div className="bg-black/60 rounded-lg p-3 font-mono text-[11px] text-blue-300/80 space-y-1">
                  <div># No seu terminal, execute:</div>
                  <div className="text-blue-200">supabase functions deploy telegram-webhook --no-verify-jwt</div>
              </div>
              <p className="text-xs text-slate-500">
                  Certifique-se de que a variável de ambiente <code>NEXT_PUBLIC_APP_URL</code> esteja configurada no Supabase Secrets para que o webhook consiga avisar este painel.
              </p>
          </div>
      </div>
    </div>
  );
}
