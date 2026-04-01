
export enum SignageSize {
  INCH_25 = '25',
  INCH_32 = '32'
}

export interface InquiryLead {
  id: string;
  customerName: string;
  email?: string; // Made optional
  buildingName: string;
  originalImage: string;
  simulatedImage?: string;
  simulatedImages?: string[];
  emailContent?: string; // 生成されたメール本文 (Deprecated)
  size: SignageSize;
  status: 'new' | 'processing' | 'sent' | 'completed';
  createdAt: number;
}

export interface SimulationProject extends InquiryLead {
  // 以前の型との互換性、または統合
}
