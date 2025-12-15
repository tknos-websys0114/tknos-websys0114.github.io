import { useState } from "react";
import HealthDashboard from "./health/HealthDashboard";
import SleepTracker from "./health/SleepTracker";
import CycleTracker from "./health/CycleTracker";
import DiagnosisTracker from "./health/DiagnosisTracker";

interface HealthContainerProps {
  onClose: () => void;
}

export type HealthView = 'dashboard' | 'sleep' | 'cycle' | 'diagnosis';

export default function HealthContainer({ onClose }: HealthContainerProps) {
  const [currentView, setCurrentView] = useState<HealthView>('dashboard');

  const handleNavigate = (view: HealthView) => {
    setCurrentView(view);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#FDFBF7] font-['Source_Han_Sans_CN_VF',sans-serif] overflow-hidden">
       {/* Macaron Gradient Mesh Background - Static for better performance */}
       <div className="absolute inset-0 opacity-60 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[70%] h-[70%] bg-[#FFD1DC] rounded-full mix-blend-multiply filter blur-[90px]" />
          <div className="absolute top-[10%] right-[-10%] w-[60%] h-[60%] bg-[#C1E1C1] rounded-full mix-blend-multiply filter blur-[90px]" />
          <div className="absolute bottom-[-20%] left-[20%] w-[80%] h-[80%] bg-[#AEC6CF] rounded-full mix-blend-multiply filter blur-[90px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-[#E6E6FA] rounded-full mix-blend-multiply filter blur-[90px]" />
       </div>

      <div className="relative z-10 h-full">
        {currentView === 'dashboard' && (
          <HealthDashboard onClose={onClose} onNavigate={handleNavigate} />
        )}
        
        {currentView === 'sleep' && (
          <SleepTracker onBack={() => setCurrentView('dashboard')} />
        )}
        
        {currentView === 'cycle' && (
          <CycleTracker onBack={() => setCurrentView('dashboard')} />
        )}

        {currentView === 'diagnosis' && (
          <DiagnosisTracker onBack={() => setCurrentView('dashboard')} />
        )}
      </div>
    </div>
  );
}
