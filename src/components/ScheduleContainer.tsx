import ScheduleApp from "./schedule/ScheduleApp";

interface ScheduleContainerProps {
  onClose: () => void;
}

export default function ScheduleContainer({ onClose }: ScheduleContainerProps) {
  return (
    <div className="fixed inset-0 z-50 bg-[#FDFBF7] font-['Source_Han_Sans_CN_VF',sans-serif] overflow-hidden">
      <div className="h-full w-full">
        <ScheduleApp onBack={onClose} />
      </div>
    </div>
  );
}
