'use client';

import { useEffect, useState } from 'react';
// import { createClient } from '@supabase/supabase-js'; (Removed)
import { 
  Tag, 
  Trash2, 
  RefreshCw,
  Ticket,
  Plus,
  TrendingDown,
  Clock,
  Users,
  Infinity as InfinityIcon,
  AlertCircle
} from 'lucide-react';

// Imports removed

type PromoCode = { 
    code: string; 
    discount_amount: number; 
    is_active: boolean;
    max_uses?: number | null;
    used_count?: number;
    expires_at?: string | null;
};

export default function PromoCodesPage() {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form States
  const [newPromoCode, setNewPromoCode] = useState('');
  const [newPromoDiscount, setNewPromoDiscount] = useState('');
  const [limitTime, setLimitTime] = useState(false);
  const [expiresInHours, setExpiresInHours] = useState('');
  const [limitUsage, setLimitUsage] = useState(false);
  const [maxUses, setMaxUses] = useState('');
  
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState('');
  const [passPrice, setPassPrice] = useState('0');
  const [passCost, setPassCost] = useState('0');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
        const [promoRes, settingsRes] = await Promise.all([
          fetch('/api/promo').then(res => res.json()),
          fetch('/api/settings').then(res => res.json())
        ]);
        
        setPromoCodes(Array.isArray(promoRes) ? promoRes : []);
        
        setPassPrice(settingsRes['pass_price'] || '0');
        setPassCost(settingsRes['pass_cost'] || '0');
    } catch (e) {
        console.error('Error loading data:', e);
    }
    setLoading(false);
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  async function addPromo() {
    if (!newPromoCode || !newPromoDiscount) return;
    setAdding(true);
    try {
        const res = await fetch('/api/promo', {
            method: 'POST',
            body: JSON.stringify({
                code: newPromoCode,
                discount_amount: newPromoDiscount,
                max_uses: limitUsage ? maxUses : null,
                expires_in_hours: limitTime ? expiresInHours : null
            })
        });
        
        const data = await res.json();
        
        if (data.error) throw new Error(data.error);

        setNewPromoCode(''); 
        setNewPromoDiscount('');
        setLimitTime(false);
        setExpiresInHours('');
        setLimitUsage(false);
        setMaxUses('');
        
        showToast('✅ Cupom criado com sucesso!');
        loadData();
    } catch (e: any) {
        showToast(`❌ Erro: ${e.message}`);
    }
    setAdding(false);
  }

  async function deletePromo(code: string) {
    if (!confirm(`Tem certeza que deseja excluir o cupom ${code}?`)) return;
    
    try {
        const res = await fetch(`/api/promo?code=${code}`, { method: 'DELETE' });
        const data = await res.json();
        
        if (data.error) throw new Error(data.error);
        
        showToast('🗑️ Cupom removido.');
        loadData();
    } catch (e: any) {
        showToast(`❌ Erro: ${e.message}`);
    }
  }

  // Helper calculations
  const discountValue = parseFloat(newPromoDiscount) || 0;
  const priceValue = parseFloat(passPrice) || 1; // Avoid division by zero
  const discountPercent = ((discountValue / priceValue) * 100).toFixed(1);
  const profitValue = (parseFloat(passPrice) - parseFloat(passCost) - discountValue).toFixed(2);

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold tracking-tight text-white font-outfit">Gestão de Cupons</h2>
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
           <h2 className="text-3xl font-bold tracking-tight text-white font-outfit">Gestão de Cupons</h2>
           <p className="text-sm text-slate-400 mt-1">Crie códigos de desconto com regras de validade personalizadas.</p>
        </div>
        <button onClick={loadData} className="p-2 text-slate-400 hover:text-white transition-colors bg-slate-900 border border-slate-800 rounded-lg">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-lg shadow-xl animate-in fade-in slide-in-from-top-4">
          {toast}
        </div>
      )}

      {/* CREATE CARD */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Plus className="w-4 h-4 text-blue-500" /> Criar Novo Cupom
            </h3>
            {discountValue > 0 && (
                <span className="text-[10px] font-bold uppercase bg-blue-500/10 text-blue-400 px-2 py-1 rounded border border-blue-500/20">
                    {discountPercent}% OFF
                </span>
            )}
        </div>
        
        <div className="space-y-6">
            {/* Row 1: Code & Value */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500">CÓDIGO</label>
                    <input 
                    value={newPromoCode} 
                    onChange={(e) => setNewPromoCode(e.target.value)} 
                    placeholder="Ex: BOOYAH10"
                    className="h-10 w-full rounded-md border border-slate-800 bg-slate-950 px-3 text-sm text-white placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono uppercase" />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500">Valor Desconto (R$)</label>
                    <div className="relative">
                        <input 
                        type="number" 
                        step="0.50"
                        value={newPromoDiscount} 
                        onChange={(e) => setNewPromoDiscount(e.target.value)} 
                        placeholder="Ex: 2.00"
                        className="h-10 w-full rounded-md border border-slate-800 bg-slate-950 px-3 text-sm text-white placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        {discountValue > 0 && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                                {discountPercent}%
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Row 2: Constraints Toggles */}
            <div className="flex flex-col md:flex-row gap-4 p-4 bg-slate-950 rounded-lg border border-slate-800/50">
                <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                        <input 
                            type="checkbox" 
                            id="limitTime" 
                            checked={limitTime} 
                            onChange={e => setLimitTime(e.target.checked)}
                            className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500/20"
                        />
                        <label htmlFor="limitTime" className="text-xs font-bold text-slate-300 uppercase cursor-pointer select-none">Limitar por Tempo</label>
                    </div>
                    {limitTime && (
                        <div className="animate-in fade-in slide-in-from-top-1">
                            <input 
                                type="number" 
                                value={expiresInHours}
                                onChange={e => setExpiresInHours(e.target.value)}
                                placeholder="Duração em horas (Ex: 24)"
                                className="h-9 w-full rounded-md border border-slate-800 bg-slate-900 px-3 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                    )}
                </div>

                <div className="w-px bg-slate-800 hidden md:block" />

                <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                        <input 
                            type="checkbox" 
                            id="limitUsage" 
                            checked={limitUsage} 
                            onChange={e => setLimitUsage(e.target.checked)}
                            className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500/20"
                        />
                        <label htmlFor="limitUsage" className="text-xs font-bold text-slate-300 uppercase cursor-pointer select-none">Limitar por Usos</label>
                    </div>
                    {limitUsage && (
                        <div className="animate-in fade-in slide-in-from-top-1">
                            <input 
                                type="number" 
                                value={maxUses}
                                onChange={e => setMaxUses(e.target.value)}
                                placeholder="Máximo de usos (Ex: 50)"
                                className="h-9 w-full rounded-md border border-slate-800 bg-slate-900 px-3 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Action Row */}
            <div className="flex items-center justify-between pt-2">
                 <div className="flex items-center gap-2 text-[10px] text-slate-500">
                    <TrendingDown className="w-3 h-3" />
                    <span>Lucro estimado: <b className="text-slate-300">R$ {profitValue}</b></span>
                 </div>

                 <button onClick={addPromo} disabled={adding || !newPromoCode || !newPromoDiscount}
                    className="h-10 px-6 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold uppercase rounded-md transition-all flex items-center gap-2 shadow-lg shadow-blue-900/20">
                    {adding ? 'Criando...' : 'Criar Cupom'}
                 </button>
            </div>
        </div>
      </div>

      {/* LIST */}
      <div className="space-y-3">
        {promoCodes.map((promo) => {
          const priceNum = parseFloat(passPrice);
          const costNum = parseFloat(passCost);
          const profit = priceNum - costNum - promo.discount_amount;
          const isPositive = profit >= 0;

          // Expiration Logic Display
          const hasTimeLimit = !!promo.expires_at;
          const hasUsageLimit = !!promo.max_uses;
          const usagePercent = hasUsageLimit ? Math.round(((promo.used_count || 0) / (promo.max_uses || 1)) * 100) : 0;
          
          let timeLeft = '';
          if (hasTimeLimit && promo.expires_at) {
              const diff = new Date(promo.expires_at).getTime() - new Date().getTime();
              const hoursLeft = Math.ceil(diff / (1000 * 60 * 60));
              timeLeft = hoursLeft > 0 ? `${hoursLeft}h restantes` : 'Expirado';
          }
          
          return (
            <div key={promo.code} className="bg-slate-900 rounded-xl border border-slate-800 p-4 hover:border-slate-700 transition-all group">
               <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                   {/* Left: Info */}
                   <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-400 group-hover:text-blue-500 transition-colors">
                            <Ticket className="w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-white text-lg font-mono tracking-wide">{promo.code}</span>
                                <span className="text-xs font-bold text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                                    - R$ {promo.discount_amount.toFixed(2)}
                                </span>
                            </div>
                            
                            {/* Constraints Badges */}
                            <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500 uppercase">
                                {!hasTimeLimit && !hasUsageLimit && (
                                    <span className="flex items-center gap-1"><InfinityIcon className="w-3 h-3" /> Permanente</span>
                                )}
                                {hasTimeLimit && (
                                    <span className={`flex items-center gap-1 ${timeLeft === 'Expirado' ? 'text-red-500' : 'text-slate-400'}`}>
                                        <Clock className="w-3 h-3" /> {timeLeft}
                                    </span>
                                )}
                                {hasUsageLimit && (
                                    <span className="flex items-center gap-1 text-slate-400">
                                        <Users className="w-3 h-3" /> {promo.used_count}/{promo.max_uses} Usos
                                    </span>
                                )}
                            </div>
                        </div>
                   </div>

                   {/* Right: Actions & Profit */}
                   <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto pl-14 md:pl-0">
                        <div className="flex flex-col items-end">
                             <span className="text-[9px] text-slate-600 font-bold uppercase">Lucro Líquido</span>
                             <span className={`text-sm font-bold ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                                R$ {profit.toFixed(2)}
                             </span>
                        </div>
                        <button 
                            onClick={() => deletePromo(promo.code)}
                            className="h-8 w-8 flex items-center justify-center text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                   </div>
               </div>
               
               {/* Usage Progress Bar */}
               {hasUsageLimit && (
                   <div className="mt-4 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                       <div className="h-full bg-blue-500" style={{ width: `${Math.min(usagePercent, 100)}%` }} />
                   </div>
               )}
            </div>
          );
        })}

        {promoCodes.length === 0 && (
          <div className="text-center text-slate-600 py-12 border-2 border-dashed border-slate-800 rounded-xl bg-slate-900/20">
            <Ticket className="w-8 h-8 mx-auto mb-2 opacity-20" />
            <p className="text-xs font-bold text-slate-500">Nenhum cupom ativo</p>
          </div>
        )}
      </div>
    </div>
  );
}
