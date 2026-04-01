
import React, { useState } from 'react';
import { SignageSize, InquiryLead } from '../types';
import { ICONS } from '../constants';
import { generateSignageSimulation } from '../services/geminiService';

interface InquiryFormProps {
  onInquirySubmitted: (lead: InquiryLead) => void;
}

const InquiryForm: React.FC<InquiryFormProps> = ({ onInquirySubmitted }) => {
  const TOTAL_VARIATIONS = 3;
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
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [activeVariationIndex, setActiveVariationIndex] = useState(0);

  const handleSaveImage = (imageDataUrl: string, variationNumber: number) => {
    const link = document.createElement('a');
    link.href = imageDataUrl;
    link.download = `atenta-simulation-variation-${variationNumber}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
    setGeneratedImages([]);
    setActiveVariationIndex(0);

    try {
      // 3パターンを順番に生成し、生成済み分を即時表示する
      const variations: string[] = [];
      for (let i = 0; i < TOTAL_VARIATIONS; i++) {
        const simulatedImage = await generateSignageSimulation(image, formData.size, false);
        variations.push(simulatedImage);
        setGeneratedImages([...variations]);
      }
      
      const newLead: InquiryLead = {
        id: Math.random().toString(36).substr(2, 9),
        ...formData,
        originalImage: image,
        simulatedImage: variations[0],
        simulatedImages: variations,
        emailContent: "", // メール生成機能は削除
        status: 'completed',
        createdAt: Date.now(),
      };

      setLastSentLead(newLead);
      setActiveVariationIndex(0);
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

  if (step === 2) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center space-y-8">
        <div className="relative inline-block w-full">
          <div className="w-24 h-24 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
          <div className="mt-8 animate-pulse">
            <h2 className="text-2xl font-bold text-slate-900">AIが設置イメージを作成中...</h2>
            <p className="text-slate-500 mt-2">
              壁面の白紙を解析し、実機パネルへ正確に置換しています。({generatedImages.length}/{TOTAL_VARIATIONS} 生成済み)
            </p>
          </div>
        </div>
        {generatedImages.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-bold text-blue-600">最新の生成結果（{generatedImages.length}/{TOTAL_VARIATIONS}）</p>
            <div className="rounded-xl overflow-hidden shadow-xl border-4 border-blue-500 aspect-[3/4] max-w-sm mx-auto">
              <img src={generatedImages[generatedImages.length - 1]} className="w-full h-full object-cover" />
            </div>
          </div>
        )}
        <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 max-w-sm mx-auto">
          <p className="text-sm text-blue-800 font-medium italic">"ATENTA AI is digitizing your elevator hall..."</p>
        </div>
      </div>
    );
  }

  if (step === 3 && lastSentLead) {
    const allVariations = lastSentLead.simulatedImages?.length
      ? lastSentLead.simulatedImages
      : (lastSentLead.simulatedImage ? [lastSentLead.simulatedImage] : []);
    const currentVariation = allVariations[activeVariationIndex] ?? allVariations[0];

    return (
      <div className="max-w-4xl mx-auto py-12 space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto shadow-xl">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
          </div>
          <h2 className="text-3xl font-bold text-slate-900">シミュレーション完了</h2>
          <p className="text-slate-500 text-lg">
            設置イメージが生成されました。
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
                <h4 className="font-bold text-slate-500 text-sm uppercase tracking-wider text-center">Before (現場写真)</h4>
                <div className="rounded-xl overflow-hidden shadow-lg border-2 border-slate-200 aspect-[3/4] relative group">
                    <img src={lastSentLead.originalImage} className="w-full h-full object-cover grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500" />
                </div>
            </div>
            <div className="space-y-4">
                <h4 className="font-bold text-blue-600 text-sm uppercase tracking-wider text-center">After (AIシミュレーション)</h4>
                <div className="rounded-xl overflow-hidden shadow-xl border-4 border-blue-500 aspect-[3/4]">
                    {currentVariation ? <img src={currentVariation} className="w-full h-full object-cover" /> : null}
                </div>
            </div>
        </div>

        {allVariations.length > 1 && (
          <div className="flex flex-wrap gap-3 justify-center">
            {allVariations.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveVariationIndex(idx)}
                className={`px-5 py-2 rounded-full border font-bold text-sm transition-all ${
                  idx === activeVariationIndex
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400'
                }`}
              >
                パターン {idx + 1}
              </button>
            ))}
          </div>
        )}

        <div className="flex justify-center gap-4 pt-8 flex-wrap">
          <button
            onClick={() => currentVariation && handleSaveImage(currentVariation, activeVariationIndex + 1)}
            disabled={!currentVariation}
            className="px-8 py-3 bg-white text-slate-900 font-bold rounded-xl border border-slate-300 hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50"
          >
            保存する
          </button>
          <button 
            onClick={() => {
              setStep(1);
              setImage(null);
              setLastSentLead(null);
              setGeneratedImages([]);
              setActiveVariationIndex(0);
              setFormData(prev => ({...prev, buildingName: ''}));
            }}
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
