
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Mail, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok) {
          throw new Error(data.error || 'Falha no login');
      }

      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl p-8 animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 mb-4 shadow-lg shadow-blue-500/30">
                <span className="font-bold text-white text-2xl">PB</span>
            </div>
            <h1 className="text-2xl font-bold text-white font-outfit">Pass Booyah</h1>
            <p className="text-slate-400 text-sm mt-2">Entre para gerenciar seus bots e vendas.</p>
        </div>

        {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-lg mb-6 flex items-center gap-2">
                <Lock className="w-4 h-4" /> {error}
            </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Email</label>
                <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full h-11 bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 text-sm text-white placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        placeholder="admin@example.com"
                    />
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Senha</label>
                <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input 
                        type="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="w-full h-11 bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 text-sm text-white placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        placeholder="••••••••"
                    />
                </div>
            </div>

            <button 
                type="submit" 
                disabled={loading}
                className="w-full h-11 mt-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-900/40 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Entrar na Plataforma'}
            </button>
        </form>
      </div>
    </div>
  );
}
