
import React from 'react';
import InquiryForm from './components/InquiryForm';
import { InquiryLead } from './types';

const App: React.FC = () => {
  const handleInquirySubmitted = (lead: InquiryLead) => {
    // データをローカルストレージに保存（バックアップとして機能）
    try {
      const savedLeads = localStorage.getItem('atenta_leads');
      const leads = savedLeads ? JSON.parse(savedLeads) : [];
      localStorage.setItem('atenta_leads', JSON.stringify([lead, ...leads]));
    } catch (e) {
      console.error("Storage error", e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full">
        <InquiryForm onInquirySubmitted={handleInquirySubmitted} />
      </div>
    </div>
  );
};

export default App;
