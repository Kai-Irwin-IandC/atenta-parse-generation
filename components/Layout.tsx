
import React from 'react';
import { ICONS } from '../constants';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: 'form' | 'leads' | 'analytics';
  onTabChange: (tab: 'form' | 'leads' | 'analytics') => void;
  isAdmin: boolean;
  onToggleMode: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange, isAdmin, onToggleMode }) => {
  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <span className="text-blue-400">ATENTA</span> 営業DX
          </h1>
          <p className="text-[10px] text-slate-500 mt-1 font-bold tracking-widest uppercase">Comprehensive Sales System</p>
        </div>
        
        <nav className="flex-1 mt-6 px-4 space-y-2">
          {isAdmin ? (
            <>
              <div className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">管理メニュー</div>
              <button
                onClick={() => onTabChange('leads')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activeTab === 'leads' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'
                }`}
              >
                <ICONS.History />
                <span className="font-medium">問い合わせ一覧</span>
              </button>
              <button
                onClick={() => onTabChange('analytics')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activeTab === 'analytics' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'
                }`}
              >
                <ICONS.Chart />
                <span className="font-medium">営業分析</span>
              </button>
            </>
          ) : (
            <>
              <div className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">公開フォーム</div>
              <button
                onClick={() => onTabChange('form')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activeTab === 'form' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'
                }`}
              >
                <ICONS.Camera />
                <span className="font-medium">AIシミュレーター</span>
              </button>
            </>
          )}
        </nav>

        <div className="p-4 space-y-2">
          <button 
            onClick={onToggleMode}
            className="w-full py-2 px-4 rounded-lg bg-slate-800 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700 transition-all"
          >
            {isAdmin ? '顧客用フォームを表示' : '管理者ログイン (Demo)'}
          </button>
          <div className="bg-slate-800 p-3 rounded-lg">
            <p className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Engine</p>
            <p className="text-sm font-semibold">Gemini 3.0 Pro</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-8 bg-slate-50">
        {children}
      </main>
    </div>
  );
};

export default Layout;
