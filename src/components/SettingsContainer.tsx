import { useState } from "react";
import SettingsMain from "./SettingsMain";
import APISettings from "./APISettings";
import BeautifySettings from "./BeautifySettings";
import DataManagement from "./DataManagement";
import DisclaimerPage from "./DisclaimerPage";

interface SettingsContainerProps {
  onClose: () => void;
}

type SettingsPage = 'main' | 'api' | 'beautify' | 'data' | 'disclaimer';

export default function SettingsContainer({ onClose }: SettingsContainerProps) {
  const [currentPage, setCurrentPage] = useState<SettingsPage>('main');

  const handleNavigate = (page: SettingsPage) => {
    setCurrentPage(page);
  };

  const handleBack = () => {
    setCurrentPage('main');
  };

  return (
    <>
      {currentPage === 'main' && (
        <SettingsMain 
          onNavigate={handleNavigate} 
          onClose={onClose} 
        />
      )}
      {currentPage === 'api' && (
        <APISettings onBack={handleBack} />
      )}
      {currentPage === 'beautify' && (
        <BeautifySettings onBack={handleBack} />
      )}
      {currentPage === 'data' && (
        <DataManagement onBack={handleBack} />
      )}
      {currentPage === 'disclaimer' && (
        <DisclaimerPage onBack={handleBack} />
      )}
    </>
  );
}