
import React, { useState } from 'react';
import { SignageSize, InquiryLead } from '../types';
import { ICONS } from '../constants';
import { generateSignageSimulation, generateSignageSimulationFromMarkedArea } from '../services/geminiService';

interface InquiryFormProps {
  onInquirySubmitted: (lead: InquiryLead) => void;
}

const InquiryForm: React.FC<InquiryFormProps> = ({ onInquirySubmitted }) => {
  const TOTAL_VARIATIONS = 4;
  type SimulationMode = 'paper' | 'no-paper';
  type NormalizedPoint = { x: number; y: number };
  const SIZE_DIMENSIONS_MM: Record<SignageSize, { width: number; height: number }> = {
    [SignageSize.INCH_25]: { width: 274.4, height: 612.7 },
    [SignageSize.INCH_32]: { width: 422.6, height: 728.2 },
  };

  const [mode, setMode] = useState<SimulationMode | null>(null);
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
  const [noPaperPoints, setNoPaperPoints] = useState<NormalizedPoint[]>([]);
  const [noPaperError, setNoPaperError] = useState<string | null>(null);

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
      reader.onloadend = () => {
        setImage(reader.result as string);
        setNoPaperPoints([]);
        setNoPaperError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleModeSelect = (selectedMode: SimulationMode) => {
    setMode(selectedMode);
    setStep(1);
    setImage(null);
    setNoPaperPoints([]);
    setNoPaperError(null);
    setGeneratedImages([]);
    setActiveVariationIndex(0);
  };

  const handleNoPaperPointAdd = (e: React.MouseEvent<HTMLDivElement>) => {
    if (noPaperPoints.length >= 4) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setNoPaperPoints((prev) => [...prev, { x, y }]);
    setNoPaperError(null);
  };

  const normalizeQuadPoints = (points: NormalizedPoint[]): NormalizedPoint[] => {
    if (points.length !== 4) return points;

    const sortedByY = [...points].sort((a, b) => a.y - b.y);
    const topTwo = sortedByY.slice(0, 2).sort((a, b) => a.x - b.x);
    const bottomTwo = sortedByY.slice(2).sort((a, b) => a.x - b.x);

    // Always force a non-crossing winding order: top-left -> top-right -> bottom-right -> bottom-left
    return [topTwo[0], topTwo[1], bottomTwo[1], bottomTwo[0]];
  };

  const createMarkedImage = async (baseImage: string, points: NormalizedPoint[]): Promise<string> => {
    if (points.length !== 4) {
      throw new Error('4点の指定が必要です。');
    }

    return new Promise((resolve, reject) => {
      const sourceImage = new Image();
      sourceImage.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = sourceImage.naturalWidth;
        canvas.height = sourceImage.naturalHeight;

        const context = canvas.getContext('2d');
        if (!context) {
          reject(new Error('Canvasの初期化に失敗しました。'));
          return;
        }

        context.drawImage(sourceImage, 0, 0);
        context.fillStyle = 'rgba(255, 0, 0, 0.45)';
        context.strokeStyle = 'rgba(255, 0, 0, 0.95)';
        context.lineWidth = Math.max(3, Math.round(sourceImage.naturalWidth * 0.004));

        context.beginPath();
        context.moveTo(points[0].x * sourceImage.naturalWidth, points[0].y * sourceImage.naturalHeight);
        for (let i = 1; i < points.length; i++) {
          context.lineTo(points[i].x * sourceImage.naturalWidth, points[i].y * sourceImage.naturalHeight);
        }
        context.closePath();
        context.fill();
        context.stroke();

        resolve(canvas.toDataURL('image/jpeg', 0.95));
      };
      sourceImage.onerror = () => reject(new Error('画像の読み込みに失敗しました。'));
      sourceImage.src = baseImage;
    });
  };

  const handleSubmit = async () => {
    if (!image || !mode) return;

    if (mode === 'no-paper' && noPaperPoints.length !== 4) {
      setNoPaperError('赤く塗る領域を4点で指定してください。');
      return;
    }

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
      const generationSourceImage =
        mode === 'no-paper' ? await createMarkedImage(image, normalizeQuadPoints(noPaperPoints)) : image;

      // 4パターンを順番に生成し、生成済み分を即時表示する
      const variations: string[] = [];
      for (let i = 0; i < TOTAL_VARIATIONS; i++) {
        const simulatedImage = mode === 'no-paper'
          ? await generateSignageSimulationFromMarkedArea(generationSourceImage, formData.size, false)
          : await generateSignageSimulation(image, formData.size, false);
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

  if (!mode) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-3xl shadow-xl p-8 md:p-12 border border-slate-100 space-y-8">
          <div className="text-center space-y-3">
            <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-[10px] font-bold uppercase tracking-widest">ATENTA AI Simulator</span>
            <h2 className="text-3xl font-bold text-slate-900">シミュレーションモードを選択</h2>
            <p className="text-slate-500">現場写真の条件に応じて、処理方式を選んでください。</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <button
              onClick={() => handleModeSelect('paper')}
              className="text-left p-6 rounded-2xl border-2 border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 transition-all"
            >
              <p className="text-xl font-bold text-slate-900">画用紙あり</p>
              <p className="text-sm text-slate-500 mt-2">白紙を貼った写真を使う既存フローです。現在の処理をそのまま利用します。</p>
            </button>
            <button
              onClick={() => handleModeSelect('no-paper')}
              className="text-left p-6 rounded-2xl border-2 border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 transition-all"
            >
              <p className="text-xl font-bold text-slate-900">画用紙なし</p>
              <p className="text-sm text-slate-500 mt-2">画像上で4点を指定し、赤塗り領域を設置対象としてシミュレーションします。</p>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center space-y-8">
        <div className="relative inline-block w-full">
          <div className="w-24 h-24 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
          <div className="mt-8 animate-pulse">
            <h2 className="text-2xl font-bold text-slate-900">AIが設置イメージを作成中...</h2>
            <p className="text-slate-500 mt-2">
              {mode === 'paper'
                ? '壁面の白紙を解析し、実機パネルへ正確に置換しています。'
                : '赤色で指定された領域を解析し、実機パネルへ正確に置換しています。'}
              ({generatedImages.length}/{TOTAL_VARIATIONS} 生成済み)
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
              setNoPaperPoints([]);
              setNoPaperError(null);
              setLastSentLead(null);
              setGeneratedImages([]);
              setActiveVariationIndex(0);
              setFormData(prev => ({...prev, buildingName: ''}));
            }}
            className="px-8 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-700 transition-all shadow-lg"
          >
            別の物件をシミュレーションする
          </button>
          <button
            onClick={() => {
              setMode(null);
              setStep(1);
              setImage(null);
              setNoPaperPoints([]);
              setNoPaperError(null);
              setLastSentLead(null);
              setGeneratedImages([]);
              setActiveVariationIndex(0);
              setFormData(prev => ({ ...prev, buildingName: '' }));
            }}
            className="px-8 py-3 bg-white text-slate-900 font-bold rounded-xl border border-slate-300 hover:bg-slate-50 transition-all shadow-sm"
          >
            モード選択へ戻る
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'no-paper') {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
          <div className="grid grid-cols-1 md:grid-cols-5 h-full">
            <div className="md:col-span-2 bg-slate-900 p-10 text-white flex flex-col justify-between relative overflow-hidden">
              <div className="relative z-10">
                <span className="inline-block px-3 py-1 bg-blue-500 rounded-full text-[10px] font-bold uppercase tracking-widest mb-4">ATENTA AI Simulator</span>
                <h2 className="text-3xl font-bold leading-tight">エリア指定<br/>シミュレーター</h2>
                <p className="text-slate-400 mt-6 text-sm leading-relaxed">
                  白紙がない現場写真でも、設置したい四角形エリアを4点で指定してシミュレーションできます。
                </p>
              </div>
              <div className="space-y-4 relative z-10">
                <div className="flex gap-3 items-center text-sm text-slate-300">
                  <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center font-bold text-blue-400">1</div>
                  <span>物件名を入力</span>
                </div>
                <div className="flex gap-3 items-center text-sm text-slate-300">
                  <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center font-bold text-blue-400">2</div>
                  <span>現場写真をアップロード</span>
                </div>
                <div className="flex gap-3 items-center text-sm text-slate-300">
                  <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center font-bold text-blue-400">3</div>
                  <span>設置範囲を4点で指定</span>
                </div>
              </div>
              <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl"></div>
            </div>

            <div className="md:col-span-3 p-10 space-y-6">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">画用紙なしモード</span>
                <button
                  onClick={() => handleModeSelect('paper')}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 underline"
                >
                  画用紙ありモードへ
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">物件名・ビル名</label>
                <input
                  type="text"
                  placeholder="アテンタビル新橋"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  value={formData.buildingName}
                  onChange={e => setFormData({ ...formData, buildingName: e.target.value })}
                />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">現場写真（白紙なし）</label>
                  <span className="text-[10px] text-blue-500 font-bold uppercase underline">4点を指定してください</span>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                  <p className="text-[11px] leading-relaxed text-amber-800">
                    点は <span className="font-bold">左上 → 右上 → 右下 → 左下</span> の順で指定してください。生成時は内部でこの順に補正し、交差した形にならないよう処理します。
                  </p>
                </div>
                {!image ? (
                  <div className="border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-all bg-slate-50 cursor-pointer group">
                    <input type="file" id="photo-no-paper" className="hidden" accept="image/*" onChange={handleFileChange} />
                    <label htmlFor="photo-no-paper" className="cursor-pointer flex flex-col items-center gap-4">
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
                  <div className="space-y-3">
                    <div className="relative rounded-2xl overflow-hidden border-2 border-slate-200 shadow-lg cursor-crosshair" onClick={handleNoPaperPointAdd}>
                      <img src={image} className="w-full h-auto block" />
                      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                        {noPaperPoints.length >= 3 && (
                          <polygon
                            points={noPaperPoints.map((point) => `${point.x * 100},${point.y * 100}`).join(' ')}
                            fill="rgba(255, 0, 0, 0.35)"
                            stroke="rgba(255, 0, 0, 0.95)"
                            strokeWidth="0.6"
                          />
                        )}
                        {noPaperPoints.map((point, idx) => (
                          <g key={`${point.x}-${point.y}-${idx}`}>
                            <circle cx={point.x * 100} cy={point.y * 100} r="1.6" fill="white" stroke="red" strokeWidth="0.5" />
                            <text x={point.x * 100 + 2} y={point.y * 100 - 1.2} fill="red" fontSize="4" fontWeight="700">
                              {idx + 1}
                            </text>
                          </g>
                        ))}
                      </svg>
                    </div>
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <p className="text-xs text-slate-500">
                        画像上をクリックして4点を指定してください（推奨: 左上 → 右上 → 右下 → 左下）。現在: <span className="font-bold text-slate-900">{noPaperPoints.length}/4点</span>
                      </p>
                      <button
                        onClick={() => setNoPaperPoints([])}
                        className="text-xs font-bold px-3 py-1.5 rounded-full border border-slate-300 text-slate-600 hover:bg-slate-50"
                      >
                        指定をリセット
                      </button>
                    </div>
                  </div>
                )}
                {noPaperError && (
                  <p className="text-red-600 text-xs font-bold bg-red-50 border border-red-100 rounded-xl px-3 py-2">{noPaperError}</p>
                )}
              </div>

              <button
                onClick={handleSubmit}
                disabled={!image || isProcessing || noPaperPoints.length !== 4}
                className={`w-full py-5 rounded-2xl font-bold text-white text-lg shadow-xl transition-all ${
                  !image || isProcessing || noPaperPoints.length !== 4 ? 'bg-slate-300 shadow-none cursor-not-allowed opacity-50' : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98] shadow-blue-600/30'
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
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">画用紙ありモード</span>
              <button
                onClick={() => handleModeSelect('no-paper')}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 underline"
              >
                画用紙なしモードへ
              </button>
            </div>
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
                <span className="block text-[10px] font-medium opacity-80 mt-1">
                  縦{SIZE_DIMENSIONS_MM[SignageSize.INCH_25].height} x 横{SIZE_DIMENSIONS_MM[SignageSize.INCH_25].width}mm
                </span>
              </button>
              <button
                onClick={() => setFormData({...formData, size: SignageSize.INCH_32})}
                className={`py-4 rounded-xl border-2 font-bold text-sm transition-all ${formData.size === SignageSize.INCH_32 ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-md shadow-blue-500/10' : 'border-slate-100 bg-slate-50 text-slate-400'}`}
              >
                32インチ (標準)
                <span className="block text-[10px] font-medium opacity-80 mt-1">
                  縦{SIZE_DIMENSIONS_MM[SignageSize.INCH_32].height} x 横{SIZE_DIMENSIONS_MM[SignageSize.INCH_32].width}mm
                </span>
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
