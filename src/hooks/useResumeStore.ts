import { create } from 'zustand';

interface ResumeState {
  resumeId: string | null;
  originalFileUrl: string | null;
  extractedText: string | null;
  atsScore: number | null;
  scoreBreakdown: any | null;
  optimizedText: any | null;
  optimizedScore: number | null;
  setResumeData: (data: Partial<ResumeState>) => void;
  reset: () => void;
}

export const useResumeStore = create<ResumeState>((set) => ({
  resumeId: null,
  originalFileUrl: null,
  extractedText: null,
  atsScore: null,
  scoreBreakdown: null,
  optimizedText: null,
  optimizedScore: null,
  setResumeData: (data) => set((state) => ({ ...state, ...data })),
  reset: () => set({
    resumeId: null,
    originalFileUrl: null,
    extractedText: null,
    atsScore: null,
    scoreBreakdown: null,
    optimizedText: null,
    optimizedScore: null,
  }),
}));
