'use client';

import { useEffect, useState, useMemo } from 'react';
// import { createClient } from '@supabase/supabase-js'; (Removed)
import { 
  Search, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  DollarSign, 
  TrendingUp, 
  User, 
  Gamepad2, 
  Receipt,
  Filter,
  RefreshCw,
  Tag
} from 'lucide-react';

// Imports removed

export default function TransactionsPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [passCost, setPassCost] = useState(0);
  const [pixFeePercent, setPixFeePercent] = useState(1.33); // Fallback to 1.33%

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
        const [ordersRes, settingsRes] = await Promise.all([
          fetch('/api/transactions').then(res => res.json()),
          fetch('/api/settings').then(res => res.json())
        ]);
        
        setOrders(Array.isArray(ordersRes) ? ordersRes : []);
        
        setPassCost(parseFloat(settingsRes['pass_cost'] || '4.50'));
        setPixFeePercent(parseFloat(settingsRes['pix_fee_percent'] || '1.33'));
    } catch (e) {
        console.error(e);
    }
    setLoading(false);
  }

  // --- Stats Calculation ---
  const stats = useMemo(() => {
    const paidOrders = orders.filter(o => o.status === 'paid' || o.status === 'delivered');
    const pendingOrders = orders.filter(o => o.status === 'pending');
    
    // Total bruto transacionado
    const grossTotal = paidOrders.reduce((sum, o) => sum + parseFloat(o.amount), 0);
    
    // Taxas do Gateway (1.33% de cada transação)
    const totalGatewayFees = grossTotal * (pixFeePercent / 100);
    
    // Custo real dos produtos (Passe Booyah)
    const totalPassCost = paidOrders.length * passCost;
    
    // Lucro Líquido = Bruto - Taxas Gateway - Custo Produto
    const netProfit = grossTotal - totalGatewayFees - totalPassCost;

    return {
      paidCount: paidOrders.length,
      pendingCount: pendingOrders.length,
      grossTotal,
      netProfit,
      totalGatewayFees
    };
  }, [orders, passCost, pixFeePercent]);

  // --- Filtering ---
  const filteredOrders = useMemo(() => {
    return orders.filter(o => 
      o.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      o.metadata?.ff_id?.toLowerCase().includes(search.toLowerCase()) ||
      o.customer_id?.toLowerCase().includes(search.toLowerCase()) ||
      o.external_id?.toLowerCase().includes(search.toLowerCase())
    );
  }, [orders, search]);

  const StatusBadge = ({ status }: { status: string }) => {
    const styles: Record<string, { bg: string, text: string, icon: any }> = {
      delivered: { bg: 'bg-green-500/10 border-green-500/20', text: 'text-green-500', icon: CheckCircle2 },
      paid: { bg: 'bg-blue-500/10 border-blue-500/20', text: 'text-blue-500', icon: CheckCircle2 },
      pending: { bg: 'bg-yellow-500/10 border-yellow-500/20', text: 'text-yellow-500', icon: Clock },
      failed: { bg: 'bg-red-500/10 border-red-500/20', text: 'text-red-500', icon: AlertCircle },
    };
    const style = styles[status] || styles.failed;
    const Icon = style.icon;

    return (
      <span className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-md border ${style.bg} ${style.text}`}>
        <Icon className="w-3 h-3" />
        {status.toUpperCase()}
      </span>
    );
  };

  const StatCard = ({ title, value, icon: Icon, color, subtext }: any) => (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-slate-400">{title}</span>
        <div className={`p-2 rounded-lg bg-slate-950/50 border border-slate-800/50 ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="text-xl font-bold text-white">{value}</div>
      {subtext && <div className="text-[10px] text-slate-500 mt-1">{subtext}</div>}
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold tracking-tight text-white">Vendas</h2>
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight text-white">Vendas</h2>
        <button onClick={loadData} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Pagamentos Pagos" value={stats.paidCount} icon={CheckCircle2} color="text-green-500" />
        <StatCard title="Aguardando Pix" value={stats.pendingCount} icon={Clock} color="text-yellow-500" />
        <StatCard 
          title="Faturamento Bruto" 
          value={`R$ ${stats.grossTotal.toFixed(2)}`} 
          icon={DollarSign} 
          color="text-blue-500"
          subtext={`Taxas Pix: -R$ ${stats.totalGatewayFees.toFixed(2)}`}
        />
        <StatCard 
          title="Lucro Líquido" 
          value={`R$ ${stats.netProfit.toFixed(2)}`} 
          icon={TrendingUp} 
          color="text-green-400"
          subtext={`Custo passes: -R$ ${(stats.paidCount * passCost).toFixed(2)}`}
        />
      </div>

      {/* Filtros e Busca */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input 
            type="text" 
            placeholder="Buscar por ID Free Fire, Nome ou transação..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Tabela de Vendas */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-slate-950/50 border-b border-slate-800">
                <th className="px-6 py-4 font-semibold text-slate-400">Data</th>
                <th className="px-6 py-4 font-semibold text-slate-400">Jogador</th>
                <th className="px-6 py-4 font-semibold text-slate-400">Valor</th>
                <th className="px-6 py-4 font-semibold text-slate-400 text-center">Status</th>
                <th className="px-6 py-4 font-semibold text-slate-400 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredOrders.map((order: any) => (
                <>
                <tr key={order.id} className={`group hover:bg-slate-800/30 transition-colors ${expandedId === order.id ? 'bg-slate-800/30' : ''}`}>
                  <td className="px-6 py-4 whitespace-nowrap text-slate-400">
                    {new Date(order.created_at).toLocaleDateString('pt-BR')} 
                    <span className="block text-[10px] text-slate-600">{new Date(order.created_at).toLocaleTimeString('pt-BR')}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-200">{order.customer_name || 'Jogador FF'}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1">
                          <Gamepad2 className="w-3 h-3" /> ID FF: <span className="text-blue-400 font-mono">{order.metadata?.ff_id || '—'}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-bold text-white">R$ {parseFloat(order.amount).toFixed(2)}</div>
                    <div className="text-[10px] text-slate-600 flex items-center gap-1">
                       <Tag className="w-2.5 h-2.5" /> {order.product_type === 'passbooya' ? 'Passe Booyah' : order.product_type}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex justify-center">
                      <StatusBadge status={order.status} />
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                      className="p-2 text-slate-500 hover:text-white bg-slate-950/50 border border-slate-800 rounded-lg hover:border-slate-700 transition-all"
                    >
                      {expandedId === order.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </td>
                </tr>
                
                {/* Expandable Section */}
                {expandedId === order.id && (
                    <tr className="bg-slate-950/30">
                        <td colSpan={5} className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Order Details */}
                                <div className="space-y-4">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                        <Receipt className="w-3 h-3" /> Detalhes do Pedido
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4 border border-slate-800 rounded-lg p-3">
                                        <div>
                                            <span className="text-[10px] text-slate-600 block">ID Transação</span>
                                            <code className="text-xs text-blue-400">{order.external_id || 'N/A'}</code>
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-slate-600 block">Telegram ID</span>
                                            <span className="text-xs text-slate-300 font-mono">{order.customer_id}</span>
                                        </div>
                                    </div>
                                    {order.status === 'delivered' && (
                                        <div className="p-3 bg-green-500/5 border border-green-500/20 rounded-lg">
                                            <span className="text-[10px] text-green-500/60 block">Entrega Realizada em:</span>
                                            <span className="text-xs text-green-400 font-medium">
                                                {order.metadata?.delivery_time ? new Date(order.metadata.delivery_time).toLocaleString('pt-BR') : 'Tempo não registrado'}
                                            </span>
                                        </div>
                                    )}
                                    <div className="pt-2 flex gap-2">
                                        <button 
                                            onClick={async () => {
                                                if (!confirm('Deseja aprovar este pagamento manualmente? Isso disparará o envio do passe.')) return;
                                                try {
                                                    const res = await fetch('/api/transactions/approve', {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({ orderId: order.id }),
                                                    });
                                                    const data = await res.json();
                                                    if (data.success) {
                                                        alert('✅ Pagamento aprovado com sucesso!');
                                                        loadData();
                                                    } else {
                                                        alert(`❌ Erro: ${data.error}`);
                                                    }
                                                } catch (e: any) {
                                                    alert(`❌ Erro de conexão: ${e.message}`);
                                                }
                                            }}
                                            disabled={order.status === 'delivered' || order.status === 'paid'}
                                            className="flex-1 h-9 bg-green-600 hover:bg-green-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-[10px] font-bold uppercase rounded-lg transition-all flex items-center justify-center gap-2"
                                        >
                                            <CheckCircle2 className="w-3.5 h-3.5" /> Aprovar Manualmente
                                        </button>
                                    </div>
                                </div>

                                {/* Player Info (likesff_response) */}
                                <div className="space-y-4">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                        <Gamepad2 className="w-3 h-3" /> Informações do Jogador (LikesFF)
                                    </h4>
                                    {order.metadata?.likesff_response ? (
                                        <div className="border border-slate-800 rounded-lg p-4 bg-slate-900/50">
                                            <div className="grid grid-cols-2 gap-y-3">
                                                <div>
                                                    <span className="text-[10px] text-slate-600 block">Apelido (Nick)</span>
                                                    <span className="text-sm font-bold text-white">{order.metadata.likesff_response.nick || order.customer_name || 'Desconhecido'}</span>
                                                </div>
                                                <div>
                                                    <span className="text-[10px] text-slate-600 block">Status API</span>
                                                    <span className="text-sm text-green-400 font-medium">Sucesso</span>
                                                </div>
                                                <div className="col-span-2 pt-2 border-t border-slate-800">
                                                    <span className="text-[10px] text-slate-600 block">Resposta Completa da API</span>
                                                    <pre className="mt-1 text-[10px] text-slate-500 font-mono overflow-auto max-h-[100px] p-2 bg-black/30 rounded">
                                                        {JSON.stringify(order.metadata.likesff_response, null, 2)}
                                                    </pre>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center p-8 border border-dashed border-slate-800 rounded-lg text-slate-600 text-xs italic">
                                            Informações de entrega ainda não disponíveis.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </td>
                    </tr>
                )}
                </>
              ))}
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-16 text-center text-slate-600">
                    <Filter className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>Nenhuma venda encontrada para os termos pesquisados.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
