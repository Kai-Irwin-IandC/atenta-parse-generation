
import React, { useState } from 'react';
import { SignageSize, SimulationProject } from '../types';
import { ICONS } from '../constants';
import { generateSignageSimulation } from '../services/geminiService';

interface SimulateViewProps {
  onSimulationComplete: (project: SimulationProject) => void;
}

const SimulateView: React.FC<SimulateViewProps> = ({ onSimulationComplete }) => {
  const [image, setImage] = useState<string | null>(null);
  const [size, setSize] = useState<SignageSize>(SignageSize.INCH_25);
  const [includeWiring, setIncludeWiring] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!image) return;
    setIsGenerating(true);
    setError(null);
    try {
      const results = await generateSignageSimulation(image, size, includeWiring);
      /* Fix: Ensure the project object matches the InquiryLead interface required by SimulationProject */
      const newProject: SimulationProject = {
        id: Math.random().toString(36).substr(2, 9),
        customerName: 'シミュレーター利用',
        email: '-',
        buildingName: `シミュレーション_${new Date().toLocaleDateString('ja-JP')}`,
        originalImage: image,
        simulatedImage: results[0],
        simulatedImages: results,
        size,
        status: 'completed',
        createdAt: Date.now(),
      };
      onSimulationComplete(newProject);
    } catch (err) {
      setError("シミュレーションの生成に失敗しました。APIキーとネットワーク接続を確認してください。");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <header className="space-y-2">
        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">AI 設置シミュレーター</h2>
        <p className="text-slate-500 text-lg">ダンボールが貼られたエレベーター壁面の写真をアップロードして、完成イメージを生成します。</p>
      </header>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 space-y-8">
        <div className="space-y-4">
          <label className="block text-sm font-semibold text-slate-700">1. 設置予定場所の写真をアップロード</label>
          {!image ? (
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-12 text-center hover:border-blue-400 transition-colors">
              <input
                type="file"
                id="file-upload"
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
              />
              <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-4">
                <div className="p-4 bg-slate-50 rounded-full text-slate-400">
                  <ICONS.Upload />
                </div>
                <div>
                  <p className="text-base font-medium text-slate-900">写真を選択してください</p>
                  <p className="text-sm text-slate-500">JPG, PNG (最大10MB)</p>
                </div>
              </label>
            </div>
          ) : (
            <div className="relative group rounded-xl overflow-hidden border border-slate-200 shadow-inner">
              <img src={image} alt="Original" className="w-full max-h-[400px] object-contain bg-slate-100" />
              <button 
                onClick={() => setImage(null)}
                className="absolute top-4 right-4 bg-slate-900/70 text-white p-2 rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <label className="block text-sm font-semibold text-slate-700">2. サイネージ設定</label>
          <div className="grid grid-cols-2 gap-6">
            <button
              onClick={() => setSize(SignageSize.INCH_25)}
              className={`p-6 rounded-xl border-2 text-left transition-all ${
                size === SignageSize.INCH_25 ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200'
              }`}
            >
              <p className="text-2xl font-bold">25インチ</p>
              <p className="text-xs uppercase font-bold mt-1 opacity-70">垂直コンパクトモデル</p>
            </button>
            <button
              onClick={() => setSize(SignageSize.INCH_32)}
              className={`p-6 rounded-xl border-2 text-left transition-all ${
                size === SignageSize.INCH_32 ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200'
              }`}
            >
              <p className="text-2xl font-bold">32インチ</p>
              <p className="text-xs uppercase font-bold mt-1 opacity-70">標準大型モデル</p>
            </button>
          </div>
          
          <label className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200">
            <input 
              type="checkbox" 
              checked={includeWiring}
              onChange={(e) => setIncludeWiring(e.target.checked)}
              className="w-5 h-5 text-blue-600 rounded"
            />
            <div className="flex-1">
              <p className="text-sm font-semibold">配線ルートを可視化する</p>
              <p className="text-xs text-slate-500">配線ダクトやケーブルの露出状況を含めたシミュレーションを行います</p>
            </div>
          </label>
        </div>

        <button
          onClick={handleGenerate}
          disabled={!image || isGenerating}
          className={`w-full py-5 rounded-xl font-bold text-white text-lg transition-all shadow-xl ${
            !image || isGenerating ? 'bg-slate-300 cursor-not-allowed shadow-none' : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98]'
          }`}
        >
          {isGenerating ? (
            <div className="flex items-center justify-center gap-3">
              <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>AIシミュレーション生成中...</span>
            </div>
          ) : '完成イメージを生成する'}
        </button>
        
        {error && <p className="text-red-500 text-sm font-bold bg-red-50 p-4 rounded-xl border border-red-100 text-center">{error}</p>}
      </div>
    </div>
  );
};

export default SimulateView;
