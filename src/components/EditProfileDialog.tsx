import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

interface UserData {
  name: string;
  country: string;
  fortress: string;
  date: string;
}

interface EditProfileDialogProps {
  open: boolean;
  onClose: () => void;
  userData: UserData;
  onSave: (data: UserData) => void;
}

export function EditProfileDialog({ open, onClose, userData, onSave }: EditProfileDialogProps) {
  const [formData, setFormData] = useState<UserData>(userData);

  useEffect(() => {
    if (open) {
      setFormData(userData);
    }
  }, [open, userData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  const handleChange = (field: keyof UserData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {if (!isOpen) onClose();}}>
      <DialogContent className="sm:max-w-[425px] bg-white">
        <DialogHeader>
          <DialogTitle>编辑个人信息</DialogTitle>
          <DialogDescription>更新您的个人信息</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">审神者名</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="country">属国</Label>
            <Input
              id="country"
              value={formData.country}
              onChange={(e) => handleChange('country', e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fortress">本丸名</Label>
            <Input
              id="fortress"
              value={formData.fortress}
              onChange={(e) => handleChange('fortress', e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">就任日</Label>
            <div className="relative">
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => handleChange('date', e.target.value)}
                required
                className="[&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-2 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              取消
            </Button>
            <Button type="submit">
              保存
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}