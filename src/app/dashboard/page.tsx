'use client';

import { useEffect, useState } from 'react';
// import { createClient } from '@supabase/supabase-js'; (Removed)
import { 
  TrendingUp, 
  Gamepad2, 
  Wallet, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  BarChart3,
  User,
  History,
  Info,
  Key
} from 'lucide-react';
import { checkBalance } from '@/lib/likesff';

// Imports removed

export default function DashboardPage() {
  const [totalSales, setTotalSales] = useState(0);
  const [revenue, setRevenue] = useState(0);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [likesInfo, setLikesInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch('/api/dashboard/stats');
      const data = await res.json();

      setTotalSales(data.totalSales || 0);
      setRevenue(data.revenue || 0);
      setRecentOrders(data.recentOrders || []);

      const apiKey = data.likesff?.likesff_api_key;
      const email = data.likesff?.likesff_email;

      if (apiKey) {
        const res = await fetch(`/api/likesff/info?key=${apiKey}${email ? `&email=${email}` : ''}`);
        const info = await res.json();
        setLikesInfo(info);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
    setLoading(false);
  }

  const StatCard = ({ title, value, icon: Icon, color, subtext }: any) => (
    <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-5 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-slate-400">{title}</span>
        <div className={`p-2 rounded-lg bg-slate-950/50 border border-slate-800/50 ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="text-2xl font-bold text-white">{loading ? '...' : value}</div>
      {subtext && <div className="text-[10px] text-slate-500 mt-1">{subtext}</div>}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight text-white font-outfit">Dashboard</h2>
        <button onClick={loadData} className="p-2 text-slate-400 hover:text-white transition-colors">
          <History className={`w-5 h-5 ${loading ? 'animate-spin text-blue-500' : ''}`} />
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="Vendas Pagas" value={totalSales} icon={CheckCircle2} color="text-green-500" />
        <StatCard title="Faturamento" value={`R$ ${revenue.toFixed(2)}`} icon={TrendingUp} color="text-blue-500" />
        <StatCard title="Saldo LikesFF" value={likesInfo?.balance ? `R$ ${likesInfo.balance}` : 'R$ 0.00'} icon={Wallet} color="text-yellow-500" subtext={likesInfo?.email} />
        <StatCard title="Envios API" value={likesInfo?.key_sends_success || 0} icon={Gamepad2} color="text-purple-500" subtext={`${likesInfo?.key_sends_failed || 0} falhas acumuladas`} />
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {/* LikesFF Info Card */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 flex flex-col">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-500" />
            Informações da API LikesFF
          </h3>
          {likesInfo ? (
            <div className="space-y-4 flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-950/50 border border-slate-800 rounded-lg">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Última Validação</span>
                  <div className="text-sm text-slate-200">{likesInfo.info}</div>
                </div>
                <div className="p-3 bg-slate-950/50 border border-slate-800 rounded-lg">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Transações Realizadas</span>
                  <div className="text-sm text-slate-200">{likesInfo.key_transactions}</div>
                </div>
              </div>

              <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Key className="w-4 h-4 text-blue-400" />
                  <span className="text-xs font-bold text-blue-400 uppercase">Chave de API Vinculada</span>
                </div>
                <div className="text-sm font-mono text-slate-400 break-all">{likesInfo.key}</div>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Status da Entrega</span>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden flex">
                  <div 
                    className="bg-green-500 h-full" 
                    style={{ width: `${(likesInfo.key_sends_success / (likesInfo.key_sends || 1)) * 100}%` }}
                  />
                  <div 
                    className="bg-red-500 h-full" 
                    style={{ width: `${(likesInfo.key_sends_failed / (likesInfo.key_sends || 1)) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Sucessos: {likesInfo.key_sends_success}</span>
                  <span>Falhas: {likesInfo.key_sends_failed}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-600 border border-dashed border-slate-800 rounded-lg p-10">
              <AlertCircle className="w-8 h-8 mb-2 opacity-20" />
              <p className="text-sm">Configurações da API LikesFF não encontradas.</p>
            </div>
          )}
        </div>

        {/* Recent Orders */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-500" />
            Vendas Recentes
          </h3>
          {loading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-14 bg-slate-800/50 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : recentOrders.length > 0 ? (
            <div className="space-y-2">
              {recentOrders.map((order: any) => (
                <div key={order.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-950/50 border border-slate-800/50 group hover:border-blue-500/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">{order.customer_name || 'Jogador FF'}</div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {new Date(order.created_at).toLocaleString('pt-BR')}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-white">R$ {parseFloat(order.amount).toFixed(2)}</div>
                    <span className={`text-[10px] font-bold uppercase ${
                      order.status === 'delivered' ? 'text-green-500' :
                      order.status === 'paid' ? 'text-blue-500' :
                      order.status === 'pending' ? 'text-yellow-500' :
                      'text-red-500'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-slate-600 py-10 border border-dashed border-slate-800 rounded-lg">
              <p className="text-sm">Nenhuma venda registrada ainda.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
