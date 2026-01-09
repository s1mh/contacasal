import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { CAT_AVATARS, PERSON_COLORS } from '@/lib/constants';
import { Profile } from '@/hooks/useCouple';
import { Check, Heart } from 'lucide-react';

interface OnboardingModalProps {
  open: boolean;
  onComplete: (position: number, name: string, avatarIndex: number, color: string) => void;
  profiles: Profile[];
  shareCode: string;
}

export function OnboardingModal({ open, onComplete, profiles, shareCode }: OnboardingModalProps) {
  const [step, setStep] = useState<'select' | 'customize'>('select');
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [avatarIndex, setAvatarIndex] = useState(1);
  const [color, setColor] = useState(PERSON_COLORS[0].value);

  const handleSelectProfile = (position: number) => {
    setSelectedPosition(position);
    const profile = profiles.find(p => p.position === position);
    if (profile) {
      setName(profile.name);
      setAvatarIndex(profile.avatar_index);
      setColor(profile.color);
    }
    setStep('customize');
  };

  const handleComplete = () => {
    if (selectedPosition && name.trim()) {
      // Save to localStorage
      localStorage.setItem(`couple_${shareCode}`, JSON.stringify({
        position: selectedPosition,
        name: name.trim(),
        avatarIndex,
        color,
        timestamp: Date.now()
      }));
      onComplete(selectedPosition, name.trim(), avatarIndex, color);
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-center flex items-center justify-center gap-2">
            <Heart className="w-5 h-5 text-primary" />
            Bem-vindo(a)!
          </DialogTitle>
          <DialogDescription className="text-center">
            {step === 'select' 
              ? 'Quem é você nesse casal?' 
              : 'Personalize seu perfil'}
          </DialogDescription>
        </DialogHeader>

        {step === 'select' ? (
          <div className="grid grid-cols-2 gap-4 py-4">
            {profiles.map((profile) => (
              <button
                key={profile.id}
                onClick={() => handleSelectProfile(profile.position)}
                className="flex flex-col items-center gap-3 p-4 rounded-2xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all"
              >
                <div 
                  className="w-16 h-16 rounded-full overflow-hidden ring-4"
                  style={{ boxShadow: `0 0 0 4px ${profile.color}` }}
                >
                  <img 
                    src={CAT_AVATARS[profile.avatar_index - 1]} 
                    alt={profile.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="font-medium text-foreground">{profile.name}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Name Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Seu nome</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Como você quer ser chamado(a)?"
                className="text-center text-lg"
                autoFocus
              />
            </div>

            {/* Avatar Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Escolha seu gatinho</label>
              <div className="grid grid-cols-4 gap-3">
                {CAT_AVATARS.map((avatar, index) => (
                  <button
                    key={index}
                    onClick={() => setAvatarIndex(index + 1)}
                    className={cn(
                      "relative w-14 h-14 rounded-full overflow-hidden ring-2 transition-all",
                      avatarIndex === index + 1 
                        ? "ring-primary scale-110" 
                        : "ring-border hover:ring-primary/50"
                    )}
                  >
                    <img src={avatar} alt={`Avatar ${index + 1}`} className="w-full h-full object-cover" />
                    {avatarIndex === index + 1 && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <Check className="w-6 h-6 text-primary" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Sua cor</label>
              <div className="flex gap-2 justify-center">
                {PERSON_COLORS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setColor(c.value)}
                    className={cn(
                      "w-8 h-8 rounded-full transition-all",
                      color === c.value ? "ring-2 ring-offset-2 ring-primary scale-110" : "hover:scale-105"
                    )}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="flex items-center justify-center gap-3 p-4 rounded-2xl bg-muted/50">
              <div 
                className="w-12 h-12 rounded-full overflow-hidden ring-4"
                style={{ boxShadow: `0 0 0 4px ${color}` }}
              >
                <img 
                  src={CAT_AVATARS[avatarIndex - 1]} 
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="font-semibold text-lg">{name || 'Seu nome'}</span>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep('select')} className="flex-1">
                Voltar
              </Button>
              <Button onClick={handleComplete} disabled={!name.trim()} className="flex-1">
                Confirmar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
