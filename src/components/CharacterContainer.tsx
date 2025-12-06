import { useState } from "react";
import CharacterList from "./CharacterList";
import CharacterEditor from "./CharacterEditor";
import UserEditor from "./UserEditor";

interface Character {
  id: string;
  name: string;
  avatar: string | null;
  description: string;
  createdAt: string;
  updatedAt: string;
}

interface CharacterContainerProps {
  onClose: () => void;
}

export default function CharacterContainer({ onClose }: CharacterContainerProps) {
  const [currentView, setCurrentView] = useState<'list' | 'editCharacter' | 'editUser'>('list');
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);

  const handleEditUser = () => {
    setCurrentView('editUser');
  };

  const handleEditCharacter = (character: Character | null) => {
    setSelectedCharacter(character);
    setCurrentView('editCharacter');
  };

  const handleBack = () => {
    setCurrentView('list');
    setSelectedCharacter(null);
  };

  return (
    <>
      {currentView === 'list' && (
        <CharacterList
          onClose={onClose}
          onEditUser={handleEditUser}
          onEditCharacter={handleEditCharacter}
        />
      )}
      {currentView === 'editUser' && (
        <UserEditor onBack={handleBack} />
      )}
      {currentView === 'editCharacter' && (
        <CharacterEditor
          onBack={handleBack}
          character={selectedCharacter}
        />
      )}
    </>
  );
}
