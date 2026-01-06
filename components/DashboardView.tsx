
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const data = [
  { name: '月間リード数', Before: 12, After: 48 },
  { name: '初回接触(日)', Before: 5, After: 0.1 },
  { name: '商談化率 (%)', Before: 8, After: 22 },
];

const DashboardView: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header className="flex justify-between items-end">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-slate-900">営業DX アナリティクス</h2>
          <p className="text-slate-500 text-lg">自動シミュレーション経由のリード獲得状況</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">レスポンス速度</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-4xl font-bold text-blue-600">即時</span>
            <span className="text-sm font-bold text-green-600">自動送付</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">AIによる自動生成とメール送付を統合</p>
        </div>
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">商談化率向上</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-4xl font-bold text-blue-600">+175%</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">可視化による顧客の納得度向上</p>
        </div>
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">月間リード数</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-4xl font-bold text-slate-900">4.0x</span>
            <span className="text-sm font-bold text-blue-600">増加</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">Web広告からの流入CVRが大幅改善</p>
        </div>
      </div>

      <div className="bg-white p-10 rounded-3xl border border-slate-200 shadow-sm">
        <h3 className="text-xl font-bold mb-8">導入前後パフォーマンス比較</h3>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
              <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
              <Legend verticalAlign="top" height={36} align="right" />
              <Bar name="導入前 (人手作業)" dataKey="Before" fill="#cbd5e1" radius={[6, 6, 0, 0]} barSize={50} />
              <Bar name="導入後 (AI自動化)" dataKey="After" fill="#2563eb" radius={[6, 6, 0, 0]} barSize={50} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
