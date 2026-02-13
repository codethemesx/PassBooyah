'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Gamepad2, 
  CreditCard, 
  UserCircle, 
  MessageSquare, 
  CheckCircle2, 
  Tag, 
  Type, 
  Image as ImageIcon, 
  Save, 
  Trash2, 
  Plus, 
  Eye, 
  EyeOff, 
  DollarSign, 
  Wallet,
  Coins
} from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

type Setting = { key: string; value: string; label: string; category: string };
type PromoCode = { code: string; discount_amount: number; is_active: boolean };

const TABS = [
  { id: 'passbooyah', label: 'Passe Global', icon: Gamepad2 },
  { id: 'gateway', label: 'Gateway', icon: CreditCard },
] as const;


export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<string>('passbooyah');
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const { data: settingsData } = await supabase.from('settings').select('*').order('category');
    setSettings(settingsData || []);
    const values: Record<string, string> = {};
    settingsData?.forEach((s: Setting) => { values[s.key] = s.value; });
    setEditedValues(values);
    setLoading(false);
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  function val(key: string) { return editedValues[key] || ''; }
  function set(key: string, value: string) { setEditedValues(prev => ({ ...prev, [key]: value })); }

  async function saveSettings() {
    setSaving(true);
    const updates = Object.entries(editedValues).map(([key, value]) =>
      supabase.from('settings').upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    );
    await Promise.all(updates);
    showToast('Configurações salvas!');
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold tracking-tight text-white">Configurações</h2>
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight text-white">Configurações</h2>
        <button onClick={saveSettings} disabled={saving}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white text-sm font-semibold rounded-lg transition-all flex items-center gap-2">
          {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> :
            <Save className="w-4 h-4" />}
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>

      {/* Toast */}
      {toast && <div className="fixed top-4 right-4 z-50 px-4 py-2.5 bg-green-500/90 text-white text-sm font-medium rounded-lg shadow-lg backdrop-blur-sm flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> {toast}</div>}

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-900 rounded-xl border border-slate-800">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ===== TAB: PASS BOOYAH ===== */}
      {activeTab === 'passbooyah' && (
        <div className="space-y-4">

          {/* Info Alert */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex gap-3 text-amber-500">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <div className="text-xs space-y-1">
              <p className="font-bold uppercase">Mensagens agora são individuais!</p>
              <p>As configurações de mensagens (boas-vindas, ID, etc.) foram movidas para a página <b>Meus Bots</b>. Agora você pode ter mensagens diferentes para cada bot.</p>
            </div>
          </div>

          {/* Preço */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="w-5 h-5 text-blue-500" />
              <h3 className="text-white font-semibold italic uppercase tracking-tighter">Valores Globais (Fallback)</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 mb-1 block uppercase">Preço de Venda Padrão (R$)</label>
                <input type="number" step="0.50" value={val('pass_price')} onChange={e => set('pass_price', e.target.value)}
                  className="h-10 w-full rounded-md border border-slate-800 bg-slate-950 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 mb-1 block uppercase">Custo Médio (R$)</label>
                <input type="number" step="0.50" value={val('pass_cost')} onChange={e => set('pass_cost', e.target.value)}
                  className="h-10 w-full rounded-md border border-slate-800 bg-slate-950 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex flex-col justify-end">
                <div className="h-10 flex items-center justify-between px-4 rounded-md border border-slate-800/50 bg-slate-950/50 text-xs text-slate-500">
                    LUCRO PADRÃO: <span className="font-black text-green-500">R$ {(parseFloat(val('pass_price') || '0') - parseFloat(val('pass_cost') || '0')).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== TAB: GATEWAY ===== */}
      {activeTab === 'gateway' && (
         <div className="space-y-4">
           {/* Mercado Pago */}
           <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-4">
             <div className="flex items-center gap-2">
               <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                 <CreditCard className="w-4 h-4 text-white" />
               </div>
               <div>
                 <h3 className="text-white font-semibold text-sm">Mercado Pago</h3>
                 <p className="text-[11px] text-slate-500">Gateway de pagamento Pix Oficial</p>
               </div>
             </div>
             <div className="pb-3 border-b border-slate-800 space-y-3">
               <SecretField 
                 label="Access Token (Produção)" 
                 value={val('mercadopago_access_token')} 
                 onChange={v => set('mercadopago_access_token', v)} 
               />
               <SecretField 
                 label="Secret de Assinatura (Webhook)" 
                 value={val('mercadopago_webhook_secret')} 
                 onChange={v => set('mercadopago_webhook_secret', v)} 
               />
               <p className="text-[10px] text-slate-500 mt-2">
                 Obtenha seu token e secret em: <a href="https://www.mercadopago.com.br/developers/panel" target="_blank" className="text-blue-400 hover:underline">Painel de Desenvolvedores MP</a>
               </p>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
               <div>
                 <label className="text-xs font-medium text-slate-400 mb-1 flex items-center gap-1">
                   <Tag className="w-3 h-3" /> Taxa Pix (%)
                 </label>
                 <input type="number" step="0.01" value={val('pix_fee_percent')} onChange={e => set('pix_fee_percent', e.target.value)}
                   placeholder="1.00"
                   className="h-10 w-full rounded-md border border-slate-800 bg-slate-950 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
               </div>
             </div>
             <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-[11px] text-blue-400 leading-relaxed">
                  <b>Aviso:</b> Lembre-se de configurar a URL de Webhook no Painel do Mercado Pago:<br/>
                  <code className="text-white bg-slate-950 px-1 rounded">{process.env.NEXT_PUBLIC_APP_URL || 'https://seusite.com'}/api/mercadopago/webhook</code>
                </p>
             </div>
           </div>

          {/* LikesFF */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Gamepad2 className="w-5 h-5 text-blue-500" />
              <div>
                <h3 className="text-white font-semibold text-sm">LikesFF API</h3>
                <p className="text-[11px] text-slate-500">Envio automático de passes</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <SecretField label="API Key" value={val('likesff_api_key')} onChange={v => set('likesff_api_key', v)} />
              <div>
                <label className="text-xs font-medium text-slate-400 mb-1 block">E-mail da Conta</label>
                <input value={val('likesff_email')} onChange={e => set('likesff_email', e.target.value)}
                  placeholder="seu-email@gmail.com"
                  className="h-10 w-full rounded-md border border-slate-800 bg-slate-950 px-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Secret Field Component ---
function SecretField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="text-xs font-medium text-slate-400 mb-1 block">{label}</label>
      <div className="relative">
        <input type={show ? 'text' : 'password'} value={value} onChange={e => onChange(e.target.value)} placeholder={label}
          className="h-10 w-full rounded-md border border-slate-800 bg-slate-950 px-3 pr-10 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <button type="button" onClick={() => setShow(!show)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
          {show ? (
            <EyeOff className="w-4 h-4" />
          ) : (
            <Eye className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
}
