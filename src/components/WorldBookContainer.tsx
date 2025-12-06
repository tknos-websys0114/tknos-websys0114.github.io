import { useState } from "react";
import WorldBookList from "./WorldBookList";
import WorldBookEditor from "./WorldBookEditor";

interface WorldBook {
  id: string;
  name: string;
  scope: 'global' | 'local';
  position: 'before' | 'after';
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface WorldBookContainerProps {
  onClose: () => void;
}

export default function WorldBookContainer({ onClose }: WorldBookContainerProps) {
  const [currentView, setCurrentView] = useState<'list' | 'editor'>('list');
  const [editingBook, setEditingBook] = useState<WorldBook | null>(null);

  const handleEdit = (book: WorldBook | null) => {
    setEditingBook(book);
    setCurrentView('editor');
  };

  const handleBackToList = () => {
    setEditingBook(null);
    setCurrentView('list');
  };

  if (currentView === 'editor') {
    return <WorldBookEditor onBack={handleBackToList} worldBook={editingBook} />;
  }

  return <WorldBookList onBack={onClose} onEdit={handleEdit} />;
}
