
import React, { useState } from 'react';
import { SignageSize, InquiryLead } from '../types';
import { ICONS } from '../constants';
import { generateSignageSimulation } from '../services/geminiService';

interface InquiryFormProps {
  onInquirySubmitted: (lead: InquiryLead) => void;
}

const InquiryForm: React.FC<InquiryFormProps> = ({ onInquirySubmitted }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [formData, setFormData] = useState({
    customerName: '',
    email: '', // 互換性のため残すが、UIからは削除
    buildingName: '',
    size: SignageSize.INCH_25,
  });
  const [image, setImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastSentLead, setLastSentLead] = useState<InquiryLead | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!image) return;

    // Gemini 3.0 Proを使用するためのAPIキー選択チェック
    try {
      // @ts-ignore
      if (window.aistudio) {
        // @ts-ignore
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (!hasKey) {
          // @ts-ignore
          await window.aistudio.openSelectKey();
        }
      }
    } catch (e) {
      console.warn("API Key selection check skipped:", e);
    }

    setIsProcessing(true);
    setStep(2);

    try {
      // 画像生成のみ実行
      const simulatedImages = await generateSignageSimulation(image, formData.size, false);
      
      const newLead: InquiryLead = {
        id: Math.random().toString(36).substr(2, 9),
        ...formData,
        originalImage: image,
        simulatedImage: simulatedImages[0],
        simulatedImages: simulatedImages,
        emailContent: "", // メール生成機能は削除
        status: 'completed',
        createdAt: Date.now(),
      };

      setLastSentLead(newLead);
      onInquirySubmitted(newLead);
      setStep(3);
    } catch (error) {
      console.error(error);
      alert("処理中にエラーが発生しました。もう一度お試しください。");
      setStep(1);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRegenerate = async () => {
    if (!lastSentLead) return;
    
    setIsProcessing(true);
    setStep(2);

    try {
      const simulatedImages = await generateSignageSimulation(lastSentLead.originalImage, lastSentLead.size, false);
      
      const updatedLead: InquiryLead = {
        ...lastSentLead,
        simulatedImage: simulatedImages[0],
        simulatedImages: simulatedImages,
        createdAt: Date.now(),
      };

      setLastSentLead(updatedLead);
      onInquirySubmitted(updatedLead);
      setStep(3);
    } catch (error) {
      console.error(error);
      alert("再生成中にエラーが発生しました。");
      setStep(3);
    } finally {
      setIsProcessing(false);
    }
  };

  if (step === 2) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center space-y-8">
        <div className="relative inline-block">
          <div className="w-24 h-24 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
          <div className="mt-8 animate-pulse">
            <h2 className="text-2xl font-bold text-slate-900">AIが設置イメージを作成中...</h2>
            <p className="text-slate-500 mt-2">壁面の白紙を解析し、実機パネルへ正確に置換しています。</p>
          </div>
        </div>
        <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 max-w-sm mx-auto">
          <p className="text-sm text-blue-800 font-medium italic">"ATENTA AI is digitizing your elevator hall..."</p>
        </div>
      </div>
    );
  }

  if (step === 3 && lastSentLead) {
    const images = lastSentLead.simulatedImages || (lastSentLead.simulatedImage ? [lastSentLead.simulatedImage] : []);

    return (
      <div className="max-w-6xl mx-auto py-12 space-y-12 animate-in fade-in zoom-in duration-500">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto shadow-xl">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
          </div>
          <h2 className="text-3xl font-bold text-slate-900">シミュレーション完了</h2>
          <p className="text-slate-500 text-lg">
            3パターンの設置イメージを生成しました。
          </p>
        </div>

        <div className="space-y-8">
            <div className="flex flex-col items-center space-y-4">
                <h4 className="font-bold text-slate-500 text-sm uppercase tracking-wider">Before (現場写真)</h4>
                <div className="w-64 rounded-xl overflow-hidden shadow-lg border-2 border-slate-200 aspect-[3/4] relative group">
                    <img src={lastSentLead.originalImage} className="w-full h-full object-cover grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500" />
                </div>
            </div>
            
            <div className="space-y-6">
                <h4 className="font-bold text-blue-600 text-sm uppercase tracking-wider text-center">After (AIシミュレーション候補)</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {images.map((img, idx) => (
                        <div key={idx} className="space-y-4 flex flex-col">
                            <div className="rounded-xl overflow-hidden shadow-xl border-4 border-blue-500 aspect-[3/4] bg-slate-100">
                                <img src={img} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                            </div>
                            <a 
                                href={img} 
                                download={`atenta_simulation_${idx + 1}.png`}
                                className="w-full py-3 bg-white border-2 border-blue-100 text-blue-600 rounded-xl font-bold hover:bg-blue-50 hover:border-blue-200 transition-all flex items-center justify-center gap-2 shadow-sm"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                                画像{idx + 1}を保存
                            </a>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        <div className="flex justify-center gap-4 pt-8">
          <button 
            onClick={handleRegenerate}
            className="px-8 py-3 bg-white text-slate-700 font-bold rounded-xl border-2 border-slate-200 hover:border-blue-500 hover:text-blue-600 transition-all shadow-sm flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
            再生成する
          </button>

          <button 
            onClick={() => { setStep(1); setImage(null); setLastSentLead(null); setFormData(prev => ({...prev, buildingName: ''})); }}
            className="px-8 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-700 transition-all shadow-lg"
          >
            別の物件をシミュレーションする
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
        <div className="grid grid-cols-1 md:grid-cols-5 h-full">
          <div className="md:col-span-2 bg-slate-900 p-10 text-white flex flex-col justify-between relative overflow-hidden">
            <div className="relative z-10">
              <span className="inline-block px-3 py-1 bg-blue-500 rounded-full text-[10px] font-bold uppercase tracking-widest mb-4">ATENTA AI Simulator</span>
              <h2 className="text-3xl font-bold leading-tight">エレベーター広告<br/>設置シミュレーター</h2>
              <p className="text-slate-400 mt-6 text-sm leading-relaxed">
                現場の写真を送るだけで、AIが設置後の広告パネルイメージを自動生成。白紙を貼った写真をアップロードしてください。
              </p>
            </div>
            <div className="space-y-4 relative z-10">
              <div className="flex gap-3 items-center text-sm text-slate-300">
                <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center font-bold text-blue-400">1</div>
                <span>物件名を入力</span>
              </div>
              <div className="flex gap-3 items-center text-sm text-slate-300">
                <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center font-bold text-blue-400">2</div>
                <span>白紙を貼った写真をアップ</span>
              </div>
              <div className="flex gap-3 items-center text-sm text-slate-300">
                <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center font-bold text-blue-400">3</div>
                <span>完成イメージを即座に確認</span>
              </div>
            </div>
            {/* Background design element */}
            <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl"></div>
          </div>

          <div className="md:col-span-3 p-10 space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">物件名・ビル名</label>
                <input 
                  type="text" 
                  placeholder="アテンタビル新橋" 
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  value={formData.buildingName}
                  onChange={e => setFormData({...formData, buildingName: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">現場写真（白紙貼付済み）</label>
                <span className="text-[10px] text-blue-500 font-bold uppercase underline">白紙が必要です</span>
              </div>
              {!image ? (
                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-all bg-slate-50 cursor-pointer group">
                  <input type="file" id="photo" className="hidden" accept="image/*" onChange={handleFileChange} />
                  <label htmlFor="photo" className="cursor-pointer flex flex-col items-center gap-4">
                    <div className="p-4 bg-white rounded-full shadow-md text-slate-400 group-hover:text-blue-500 transition-colors">
                      <ICONS.Upload />
                    </div>
                    <div>
                      <span className="text-base font-bold text-slate-600 block">写真をアップロード</span>
                      <span className="text-xs text-slate-400">クリックしてファイルを選択</span>
                    </div>
                  </label>
                </div>
              ) : (
                <div className="relative rounded-2xl overflow-hidden border-2 border-slate-200 group shadow-lg">
                  <img src={image} className="w-full h-56 object-cover" />
                  <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <button 
                      onClick={() => setImage(null)}
                      className="bg-white text-slate-900 px-6 py-2 rounded-full font-bold text-sm shadow-xl"
                    >
                      写真を変更する
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setFormData({...formData, size: SignageSize.INCH_25})}
                className={`py-4 rounded-xl border-2 font-bold text-sm transition-all ${formData.size === SignageSize.INCH_25 ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-md shadow-blue-500/10' : 'border-slate-100 bg-slate-50 text-slate-400'}`}
              >
                25インチ (小型)
              </button>
              <button
                onClick={() => setFormData({...formData, size: SignageSize.INCH_32})}
                className={`py-4 rounded-xl border-2 font-bold text-sm transition-all ${formData.size === SignageSize.INCH_32 ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-md shadow-blue-500/10' : 'border-slate-100 bg-slate-50 text-slate-400'}`}
              >
                32インチ (標準)
              </button>
            </div>

            <button
              onClick={handleSubmit}
              disabled={!image || isProcessing}
              className={`w-full py-5 rounded-2xl font-bold text-white text-lg shadow-xl transition-all ${
                !image || isProcessing ? 'bg-slate-300 shadow-none cursor-not-allowed opacity-50' : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98] shadow-blue-600/30'
              }`}
            >
              シミュレーションを実行
            </button>
          </div>
        </div>
      </div>
      <p className="mt-8 text-center text-[10px] text-slate-400 uppercase tracking-widest font-medium">
        © 2025 ATENTA Co., Ltd. <span className="mx-2 opacity-30">|</span> Powered by Gemini 3.0 Pro
      </p>
    </div>
  );
};

export default InquiryForm;
