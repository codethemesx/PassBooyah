'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Tag, 
  Trash2, 
  RefreshCw,
  Ticket,
  Plus,
  Coins,
  ArrowRight
} from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

type PromoCode = { code: string; discount_amount: number; is_active: boolean };

export default function PromoCodesPage() {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPromoCode, setNewPromoCode] = useState('');
  const [newPromoDiscount, setNewPromoDiscount] = useState('');
  const [toast, setToast] = useState('');
  const [passPrice, setPassPrice] = useState('0');
  const [passCost, setPassCost] = useState('0');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const [promoRes, settingsRes] = await Promise.all([
      supabase.from('promo_codes').select('*').order('created_at', { ascending: false }),
      supabase.from('settings').select('key, value').in('key', ['pass_price', 'pass_cost'])
    ]);
    
    setPromoCodes(promoRes.data || []);
    
    // Get prices to calculate profit
    const price = settingsRes.data?.find(s => s.key === 'pass_price')?.value || '0';
    const cost = settingsRes.data?.find(s => s.key === 'pass_cost')?.value || '0';
    setPassPrice(price);
    setPassCost(cost);
    
    setLoading(false);
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  async function addPromo() {
    if (!newPromoCode || !newPromoDiscount) return;
    try {
        const { error } = await supabase.from('promo_codes').insert({ 
            code: newPromoCode.toUpperCase().trim(), 
            discount_amount: parseFloat(newPromoDiscount) 
        });
        
        if (error) throw error;

        setNewPromoCode(''); 
        setNewPromoDiscount('');
        showToast('✅ Cupom criado com sucesso!');
        loadData();
    } catch (e: any) {
        showToast(`❌ Erro: ${e.message}`);
    }
  }

  async function deletePromo(code: string) {
    if (!confirm(`Tem certeza que deseja excluir o cupom ${code}?`)) return;
    await supabase.from('promo_codes').delete().eq('code', code);
    showToast('🗑️ Cupom removido.');
    loadData();
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
           <h2 className="text-3xl font-bold tracking-tight text-white font-outfit">Gestão de Cupons</h2>
           <p className="text-sm text-slate-400 mt-1">Crie códigos de desconto para seus clientes utilizarem no bot.</p>
        </div>
      </div>

      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-lg shadow-xl animate-in fade-in slide-in-from-top-4">
          {toast}
        </div>
      )}

      {/* Creation Form */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
            <Plus className="w-32 h-32 text-purple-500" />
        </div>
        
        <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-600/20 flex items-center justify-center">
                <Ticket className="w-5 h-5 text-purple-400" />
              </div>
              <h3 className="text-white font-bold text-lg">Gerar Novo Cupom</h3>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Código do Cupom</label>
                <input 
                  value={newPromoCode} 
                  onChange={e => setNewPromoCode(e.target.value)} 
                  placeholder="EX: PASSE2024"
                  className="h-12 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 text-sm text-white placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all font-mono uppercase font-bold" 
                />
              </div>
              <div className="w-full md:w-40 space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Desconto (R$)</label>
                <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-bold">R$</span>
                    <input 
                      type="number" 
                      step="0.50" 
                      value={newPromoDiscount} 
                      onChange={e => setNewPromoDiscount(e.target.value)} 
                      placeholder="2.50"
                      className="h-12 w-full rounded-xl border border-slate-800 bg-slate-950 pl-10 pr-4 text-sm text-white placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all font-bold" 
                    />
                </div>
              </div>
              <button 
                onClick={addPromo} 
                className="h-12 px-8 bg-purple-600 hover:bg-purple-500 text-white text-sm font-black rounded-xl transition-all shadow-lg shadow-purple-900/20 self-end uppercase"
              >
                Ativar Cupom
              </button>
            </div>
            
            <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl flex items-start gap-3">
                <div className="mt-1"><ArrowRight className="w-4 h-4 text-blue-400" /></div>
                <p className="text-xs text-blue-300/70 leading-relaxed">
                    <b>Dica:</b> O valor do passe atual é de <b>R$ {parseFloat(passPrice).toFixed(2)}</b>. 
                    Certifique-se de que o desconto não ultrapasse o lucro para manter sua operação saudável.
                </p>
            </div>
        </div>
      </div>

      {/* Cupons List */}
      <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">Cupons Configurados</h4>
            <div className="text-[10px] text-slate-600">Total: {promoCodes.length}</div>
          </div>
          
          <div className="grid gap-3">
            {promoCodes.map(promo => {
              const priceNum = parseFloat(passPrice);
              const costNum = parseFloat(passCost);
              const profit = priceNum - costNum - promo.discount_amount;
              const isPositive = profit >= 0;
              
              return (
                <div key={promo.code} className="bg-slate-900/40 hover:bg-slate-900/60 transition-all border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-6 group">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center border border-purple-500/10 group-hover:scale-105 transition-transform">
                      <Tag className="w-7 h-7 text-purple-400" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-black text-white tracking-tighter uppercase font-mono">{promo.code}</span>
                        <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 font-bold uppercase tracking-wider">
                        <span className="text-purple-400">DESCONTO: R$ {promo.discount_amount.toFixed(2)}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-700" />
                        <span>ATIVO</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className={`flex flex-col items-end px-5 py-2.5 rounded-2xl border transition-all ${isPositive ? 'bg-green-500/5 border-green-500/10 text-green-400 shadow-sm shadow-green-900/5' : 'bg-red-500/5 border-red-500/10 text-red-400 shadow-sm shadow-red-900/5'}`}>
                      <div className="flex items-center gap-1.5 opacity-60 mb-0.5">
                        <Coins className="w-3 h-3" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Lucro Líquido</span>
                      </div>
                      <span className="text-lg font-black tracking-tight">R$ {profit.toFixed(2)}</span>
                    </div>

                    <button 
                      onClick={() => deletePromo(promo.code)} 
                      className="w-12 h-12 flex items-center justify-center text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all border border-slate-800 hover:border-red-500/20 rounded-2xl"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              );
            })}

            {promoCodes.length === 0 && (
              <div className="text-center py-24 border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/20 flex flex-col items-center gap-4">
                <Ticket className="w-12 h-12 text-slate-700" />
                <div className="space-y-1">
                    <p className="text-slate-500 font-bold">Nenhum cupom ativo</p>
                    <p className="text-xs text-slate-700">Crie seu primeiro código promocional acima.</p>
                </div>
              </div>
            )}
          </div>
      </div>
    </div>
  );
}
