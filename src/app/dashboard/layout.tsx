'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Settings, 
  Bot, 
  Webhook, 
  LogOut, 
  Menu, 
  X,
  Tag
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Close sidebar when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Vendas', href: '/dashboard/transactions', icon: ShoppingCart },
    { label: 'Cupons', href: '/dashboard/promo', icon: Tag },
    { label: 'Meus Bots', href: '/dashboard/bots', icon: Bot },
    { label: 'Webhook', href: '/dashboard/webhooks', icon: Webhook },
    { label: 'Configurações', href: '/dashboard/settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-300" 
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 transition-transform duration-300 transform md:relative md:translate-x-0 flex flex-col",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
               <span className="font-bold text-white">PB</span>
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-400">
               Pass Booyah
            </h1>
          </div>
          <button onClick={() => setIsOpen(false)} className="md:hidden p-2 text-slate-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <div className="text-xs font-semibold text-slate-500 mb-2 px-2 uppercase tracking-wider">Menu Principal</div>
          
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link 
                key={item.href}
                href={item.href} 
                className={cn(
                  "flex items-center px-4 py-3 rounded-xl transition-all group",
                  active 
                    ? "bg-blue-600/10 text-blue-400 border border-blue-500/20" 
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                )}
              >
                <Icon className={cn("w-5 h-5 mr-3 transition-colors", active ? "text-blue-400" : "group-hover:text-blue-400")} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-slate-800">
            <div className="flex items-center px-4 py-3 text-slate-400 hover:text-red-400 cursor-pointer transition-colors">
                <LogOut className="w-5 h-5 mr-3" />
                Sair
            </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black p-4 md:p-8 relative">
        {/* Mobile Header */}
        <header className="flex items-center justify-between md:hidden mb-6 bg-slate-900/50 backdrop-blur-md p-4 rounded-2xl border border-slate-800 shadow-xl">
             <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                   <span className="font-bold text-white text-xs">PB</span>
                </div>
                <h1 className="text-lg font-bold text-white font-outfit">Pass Booyah</h1>
             </div>
             <button 
                onClick={() => setIsOpen(true)}
                className="p-2 text-slate-400 hover:text-white transition-colors bg-slate-800 rounded-lg"
             >
                <Menu className="w-6 h-6" />
             </button>
        </header>

        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
           {children}
        </div>
      </main>
    </div>
  );
}
