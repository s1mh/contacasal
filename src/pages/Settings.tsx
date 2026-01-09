import { useState } from 'react';
import { useOutletContext, useParams, useNavigate } from 'react-router-dom';
import { User, Palette, Tag, Plus, Trash2, Check, Copy, LogOut, UserX } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/Avatar';
import { TagPill } from '@/components/TagPill';
import { CardManager } from '@/components/CardManager';
import { AgreementManager } from '@/components/AgreementManager';
import { AnimatedPage, AnimatedItem } from '@/components/AnimatedPage';
import { Couple, useCoupleContext } from '@/contexts/CoupleContext';
import { CAT_AVATARS, PERSON_COLORS, TAG_ICONS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

export default function Settings() {
  const { couple, myPosition } = useOutletContext<{ couple: Couple; myPosition: number | null }>();
  const navigate = useNavigate();
  const { 
    updateProfile, 
    deleteProfile,
    addTag, 
    deleteTag, 
    addCard, 
    deleteCard,
    addAgreement,
    updateAgreement,
    deleteAgreement
  } = useCoupleContext();
  const { shareCode } = useParams();
  const { toast } = useToast();

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [newTagIcon, setNewTagIcon] = useState('tag');
  const [newTagColor, setNewTagColor] = useState('#94A3B8');
  const [showAddTag, setShowAddTag] = useState(false);

  // Get only MY profile
  const myProfile = couple.profiles.find(p => p.position === myPosition);

  const handleStartEditing = () => {
    if (myProfile) {
      setEditingName(true);
      setNameValue(myProfile.name);
    }
  };

  const handleUpdateName = async () => {
    if (myProfile && nameValue.trim()) {
      await updateProfile(myProfile.id, { name: nameValue.trim() });
    }
    setEditingName(false);
    setNameValue('');
  };

  const handleUpdateAvatar = async (avatarIndex: number) => {
    if (myProfile) {
      await updateProfile(myProfile.id, { avatar_index: avatarIndex });
    }
  };

  const handleUpdateColor = async (color: string) => {
    if (myProfile) {
      await updateProfile(myProfile.id, { color });
    }
  };

  const handleAddTag = async () => {
    if (!newTagName.trim()) return;
    await addTag({
      name: newTagName,
      icon: newTagIcon,
      color: newTagColor,
    });
    setNewTagName('');
    setNewTagIcon('tag');
    setNewTagColor('#94A3B8');
    setShowAddTag(false);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(shareCode || '');
    toast({ 
      title: 'Copiado! 📋',
      description: 'Compartilhe com seu amor'
    });
  };

  const handleLogout = () => {
    if (shareCode) {
      localStorage.removeItem(`couple_${shareCode}`);
      toast({ 
        title: 'Até logo! 👋',
        description: 'Volte quando quiser com seu código'
      });
      navigate('/');
    }
  };

  const handleDeleteProfile = async () => {
    if (myProfile && shareCode) {
      const success = await deleteProfile(myProfile.id, shareCode);
      if (success) {
        navigate('/');
      }
    }
  };

  if (!myProfile) {
    return (
      <div className="p-4 safe-top">
        <h1 className="text-xl font-semibold mb-6">Ajustes</h1>
        <p className="text-muted-foreground">Perfil não encontrado. Complete o onboarding primeiro.</p>
      </div>
    );
  }

  return (
    <AnimatedPage className="p-4 safe-top space-y-4">
      <h1 className="text-xl font-semibold mb-6">Meu Perfil</h1>

      {/* My Profile */}
      <AnimatedItem delay={0}>
        <div className="bg-card rounded-3xl p-4 shadow-lg border border-border/50">
          <div className="flex items-center gap-3 mb-4">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">
              Meus dados
            </span>
          </div>

          {/* Avatar Selection */}
          <div className="flex items-center gap-4 mb-4">
            <Avatar avatarIndex={myProfile.avatar_index} size="xl" ringColor={myProfile.color} />
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-2">Escolha o gatinho</p>
              <div className="flex gap-2 flex-wrap">
                {CAT_AVATARS.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleUpdateAvatar(idx + 1)}
                    className={cn(
                      'rounded-full transition-all',
                      myProfile.avatar_index === idx + 1 && 'ring-2 ring-primary ring-offset-2'
                    )}
                  >
                    <Avatar avatarIndex={idx + 1} size="sm" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Name */}
          <div className="mb-4">
            <label className="text-sm text-muted-foreground mb-2 block">Nome</label>
            {editingName ? (
              <div className="flex gap-2">
                <Input
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleUpdateName();
                    } else if (e.key === 'Escape') {
                      setEditingName(false);
                      setNameValue('');
                    }
                  }}
                  autoFocus
                />
                <Button
                  size="icon"
                  onClick={handleUpdateName}
                >
                  <Check className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <button
                onClick={handleStartEditing}
                className="w-full text-left p-3 bg-muted/50 rounded-2xl hover:bg-muted/80 transition-colors border-2 border-transparent hover:border-primary/30"
              >
                {myProfile.name}
              </button>
            )}
          </div>

          {/* Color */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block flex items-center gap-2">
              <Palette className="w-4 h-4" /> Cor
            </label>
            <div className="flex gap-2 flex-wrap">
              {PERSON_COLORS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => handleUpdateColor(color.value)}
                  className={cn(
                    'w-8 h-8 rounded-full transition-all',
                    myProfile.color === color.value && 'ring-2 ring-offset-2 ring-foreground'
                  )}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
          </div>
        </div>
      </AnimatedItem>

      {/* My Cards */}
      <AnimatedItem delay={100}>
        <div className="bg-card rounded-3xl p-4 shadow-lg border border-border/50">
          <CardManager
            profile={myProfile}
            cards={couple.cards}
            onAddCard={addCard}
            onDeleteCard={deleteCard}
          />
        </div>
      </AnimatedItem>

      {/* Agreements */}
      <AnimatedItem delay={200}>
        <div className="bg-card rounded-3xl p-4 shadow-lg border border-border/50">
          <AgreementManager
            agreements={couple.agreements}
            profiles={couple.profiles}
            tags={couple.tags}
            onAddAgreement={addAgreement}
            onUpdateAgreement={updateAgreement}
            onDeleteAgreement={deleteAgreement}
            coupleId={couple.id}
          />
        </div>
      </AnimatedItem>

      {/* Tags */}
      <AnimatedItem delay={300}>
        <div className="bg-card rounded-3xl p-4 shadow-lg border border-border/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Categorias</span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowAddTag(!showAddTag)}
              className="rounded-full"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* Add Tag Form */}
          {showAddTag && (
            <div className="bg-muted/50 rounded-2xl p-4 mb-4 animate-fade-in border-2 border-border/30">
              <Input
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Nome da categoria"
                className="mb-3"
              />
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs text-muted-foreground">Ícone:</span>
                <div className="flex gap-1 flex-wrap">
                  {Object.keys(TAG_ICONS).map((icon) => (
                    <button
                      key={icon}
                      onClick={() => setNewTagIcon(icon)}
                      className={cn(
                        'p-2 rounded-lg transition-all',
                        newTagIcon === icon ? 'bg-primary/20' : 'hover:bg-background'
                      )}
                    >
                      <TagPill name="" icon={icon} color={newTagColor} size="sm" />
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs text-muted-foreground">Cor:</span>
                <div className="flex gap-1">
                  {['#F59E0B', '#3B82F6', '#EF4444', '#8B5CF6', '#06B6D4', '#10B981'].map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewTagColor(color)}
                      className={cn(
                        'w-6 h-6 rounded-full transition-all',
                        newTagColor === color && 'ring-2 ring-offset-1'
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <Button
                onClick={handleAddTag}
                disabled={!newTagName.trim()}
                className="w-full"
              >
                Adicionar categoria
              </Button>
            </div>
          )}

          {/* Tag List */}
          <div className="space-y-2">
            {couple.tags.map((tag) => (
              <div
                key={tag.id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-2xl group"
              >
                <TagPill name={tag.name} icon={tag.icon} color={tag.color} />
                <button
                  onClick={() => deleteTag(tag.id)}
                  className="p-2 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all rounded-lg hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </AnimatedItem>

      {/* Share Code */}
      <AnimatedItem delay={400}>
        <div className="bg-muted/50 rounded-2xl p-4 flex items-center justify-between border-2 border-border/30">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Código do espaço</p>
            <p className="font-mono text-lg font-semibold">{shareCode}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Compartilhe com seu parceiro(a)
            </p>
          </div>
          <button
            onClick={handleCopyCode}
            className="p-3 hover:bg-background rounded-xl transition-colors"
          >
            <Copy className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </AnimatedItem>

      {/* Logout - Just exit device */}
      <AnimatedItem delay={500}>
        <Button 
          variant="ghost" 
          onClick={handleLogout}
          className="w-full text-muted-foreground hover:text-foreground"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sair deste dispositivo
        </Button>
      </AnimatedItem>

      {/* Delete Profile - Dangerous action */}
      <AnimatedItem delay={600}>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              variant="ghost" 
              className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <UserX className="w-4 h-4 mr-2" />
              Excluir meu perfil
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>⚠️ Excluir perfil permanentemente?</AlertDialogTitle>
              <AlertDialogDescription>
                Seu perfil será resetado para os valores padrão e você perderá suas configurações pessoais. 
                Seus gastos serão mantidos no histórico do casal.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteProfile} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Excluir perfil
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </AnimatedItem>
    </AnimatedPage>
  );
}
