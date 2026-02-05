import { useState } from 'react';
import { useOutletContext, useParams, useNavigate } from 'react-router-dom';
import { User, Palette, Tag, Plus, Trash2, Check, Copy, LogOut, UserX, AtSign, RefreshCw, Users, Crown, Globe, Coins } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar } from '@/components/Avatar';
import { TagPill } from '@/components/TagPill';
import { CardManager } from '@/components/CardManager';
import { AgreementManager } from '@/components/AgreementManager';
import { MemberManagement } from '@/components/MemberManagement';
import { AnimatedPage, AnimatedItem } from '@/components/AnimatedPage';
import { Couple, useCoupleContext } from '@/contexts/CoupleContext';
import { CAT_AVATARS, PERSON_COLORS, TAG_ICONS } from '@/lib/constants';
import { cn, isConfiguredProfile } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { usePreferences } from '@/contexts/PreferencesContext';
import { useI18n } from '@/contexts/I18nContext';
import { SupportedLocale } from '@/lib/i18n';
import { SupportedCurrency } from '@/lib/preferences';

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
    deleteAgreement,
    isAdmin,
    refetch,
  } = useCoupleContext();
  const { shareCode } = useParams();
  const { toast } = useToast();
  const { t: prefT } = usePreferences();
  const { locale, currency, setLocale, setCurrency } = useI18n();
  const [regeneratingCode, setRegeneratingCode] = useState(false);

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [editingUsername, setEditingUsername] = useState(false);
  const [usernameValue, setUsernameValue] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagIcon, setNewTagIcon] = useState('tag');
  const [newTagColor, setNewTagColor] = useState('#94A3B8');
  const [showAddTag, setShowAddTag] = useState(false);

  // Get only MY profile
  const myProfile = couple.profiles.find(p => p.position === myPosition);

  const handleLocaleChange = (newLocale: SupportedLocale) => {
    setLocale(newLocale);
    toast({ 
      title: prefT('Preferências atualizadas'),
    });
  };

  const handleCurrencyChange = (newCurrency: SupportedCurrency) => {
    setCurrency(newCurrency);
    toast({ 
      title: prefT('Preferências atualizadas'),
    });
  };

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

  const handleUpdateUsername = async () => {
    if (!myProfile || !usernameValue.trim()) {
      setEditingUsername(false);
      return;
    }

    // Check availability
    setCheckingUsername(true);
    try {
      const { data } = await supabase.functions.invoke('check-username', {
        body: { username: usernameValue.trim(), exclude_profile_id: myProfile.id }
      });

      if (data?.exists) {
        setUsernameError(prefT('Este username já está em uso'));
        return;
      }

      await updateProfile(myProfile.id, { username: usernameValue.trim() });
      setEditingUsername(false);
      setUsernameValue('');
    } catch (err) {
      console.error('Error updating username:', err);
      setUsernameError(prefT('Erro ao verificar username'));
    } finally {
      setCheckingUsername(false);
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
    navigator.clipboard.writeText(couple.share_code || shareCode || '');
    toast({ 
      title: prefT('Copiado! 📋'),
      description: prefT('Compartilhe com quem você quiser')
    });
  };

  const handleRegenerateCode = async () => {
    if (!myProfile || !isAdmin(myProfile.id)) {
      toast({ 
        title: prefT('Sem permissão'),
        description: prefT('Apenas administradores podem regenerar o código'),
        variant: 'destructive'
      });
      return;
    }

    setRegeneratingCode(true);
    try {
      const { data, error } = await supabase.functions.invoke('regenerate-share-code');
      if (error) throw error;
      
      if (data?.success) {
        toast({ 
          title: prefT('Código regenerado! 🔄'),
          description: prefT('Novo código de compartilhamento gerado')
        });
        await refetch();
      }
    } catch (err) {
      console.error('Error regenerating code:', err);
      toast({ 
        title: prefT('Ops! Algo deu errado 😕'),
        description: prefT('Não foi possível regenerar o código'),
        variant: 'destructive'
      });
    } finally {
      setRegeneratingCode(false);
    }
  };

  const handleLogout = () => {
    if (shareCode) {
      localStorage.removeItem(`couple_${shareCode}`);
      toast({ 
        title: prefT('Até logo! 👋'),
        description: prefT('Volte quando quiser com seu código')
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
        <h1 className="text-xl font-semibold mb-6">{prefT('Ajustes')}</h1>
        <p className="text-muted-foreground">{prefT('Perfil não encontrado. Complete o onboarding primeiro.')}</p>
      </div>
    );
  }

  return (
    <AnimatedPage className="p-4 safe-top space-y-4">
      <h1 className="text-xl font-semibold mb-6">{prefT('Meu Perfil')}</h1>

      {/* My Profile */}
      <AnimatedItem delay={0}>
        <div className="bg-card rounded-3xl p-4 shadow-lg border border-border/50">
          <div className="flex items-center gap-3 mb-4">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">
              {prefT('Meus dados')}
            </span>
          </div>

          {/* Avatar Selection */}
          <div className="flex items-center gap-4 mb-4">
            <Avatar avatarIndex={myProfile.avatar_index} size="xl" ringColor={myProfile.color} animated animation="playing" />
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-2">{prefT('Escolha o gatinho')}</p>
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
                    <Avatar
                      avatarIndex={idx + 1}
                      size="sm"
                      selected={myProfile.avatar_index === idx + 1}
                      animateOnHover={myProfile.avatar_index !== idx + 1}
                      animation="rolling"
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Name */}
          <div className="mb-4">
            <label className="text-sm text-muted-foreground mb-2 block">{prefT('Nome')}</label>
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

          {/* Username - Editable */}
          <div className="mb-4">
            <label className="text-sm text-muted-foreground mb-2 block flex items-center gap-2">
              <AtSign className="w-4 h-4" /> {prefT('Seu @')} <span className="text-xs font-normal">({prefT('toque para editar')})</span>
            </label>
            {editingUsername ? (
              <div className="flex gap-2">
                <div className="flex-1 flex items-center gap-1">
                  <span className="text-muted-foreground">@</span>
                  <Input
                    value={usernameValue}
                    onChange={(e) => {
                      setUsernameValue(e.target.value.replace(/[@\s]/g, '').toLowerCase());
                      setUsernameError('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleUpdateUsername();
                      } else if (e.key === 'Escape') {
                        setEditingUsername(false);
                        setUsernameValue('');
                        setUsernameError('');
                      }
                    }}
                    autoFocus
                    maxLength={20}
                  />
                </div>
                <Button
                  size="icon"
                  onClick={handleUpdateUsername}
                  disabled={checkingUsername || !!usernameError}
                >
                  <Check className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setEditingUsername(true);
                  setUsernameValue(myProfile.username || '');
                }}
                className="w-full text-left p-3 bg-muted/50 rounded-2xl hover:bg-muted/80 transition-colors border-2 border-transparent hover:border-primary/30"
              >
                <span className="font-mono text-foreground">@{myProfile.username || prefT('Clique para definir')}</span>
              </button>
            )}
            {usernameError && <p className="text-xs text-destructive mt-1">{usernameError}</p>}
          </div>

          {/* Color */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block flex items-center gap-2">
              <Palette className="w-4 h-4" /> {prefT('Cor')}
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

      {/* Preferences */}
      <AnimatedItem delay={50}>
        <div className="bg-card rounded-3xl p-4 shadow-lg border border-border/50">
          <div className="flex items-center gap-3 mb-4">
            <Globe className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">
              {prefT('Preferências')}
            </span>
          </div>

          <div className="space-y-4">
            {/* Language */}
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">{prefT('Idioma')}</label>
              <Select value={locale} onValueChange={(value) => handleLocaleChange(value as SupportedLocale)}>
                <SelectTrigger>
                  <SelectValue>
                    {locale === 'pt-BR' ? 'Português (Brasil)' : locale === 'en-US' ? 'English (US)' : 'Español'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                  <SelectItem value="en-US">English (US)</SelectItem>
                  <SelectItem value="es-ES">Español</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Currency */}
            <div>
              <label className="text-sm text-muted-foreground mb-2 block flex items-center gap-2">
                <Coins className="w-4 h-4" /> {prefT('Moeda')}
              </label>
              <Select value={currency} onValueChange={(value) => handleCurrencyChange(value as SupportedCurrency)}>
                <SelectTrigger>
                  <SelectValue>
                    {currency === 'BRL' ? 'Real (R$)' : currency === 'USD' ? 'Dollar ($)' : 'Euro (€)'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BRL">Real (R$)</SelectItem>
                  <SelectItem value="USD">Dollar ($)</SelectItem>
                  <SelectItem value="EUR">Euro (€)</SelectItem>
                </SelectContent>
              </Select>
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
              <span className="text-sm font-medium text-muted-foreground">{prefT('Categorias')}</span>
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
                placeholder={prefT('Nome da categoria')}
                className="mb-3"
              />
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs text-muted-foreground">{prefT('Ícone')}:</span>
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
                <span className="text-xs text-muted-foreground">{prefT('Cor')}:</span>
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
                {prefT('Adicionar categoria')}
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

      {/* Members List - Visible for everyone */}
      <AnimatedItem delay={350}>
        <div className="bg-card rounded-3xl p-4 shadow-lg border border-border/50">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">
              {prefT('Membros')} ({couple.profiles.filter(isConfiguredProfile).length}/{couple.max_members || 5})
            </span>
          </div>

          <div className="space-y-3">
            {couple.profiles
              .filter(isConfiguredProfile)
              .map((profile) => (
                <div key={profile.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-2xl">
                  <Avatar avatarIndex={profile.avatar_index} size="md" ringColor={profile.color} animateOnHover animation="licking" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{profile.name}</span>
                      {profile.id === myProfile?.id && (
                        <span className="text-xs text-muted-foreground">({prefT('você')})</span>
                      )}
                      {isAdmin(profile.id) && (
                        <Crown className="w-4 h-4 text-amber-500" />
                      )}
                    </div>
                    {profile.username && (
                      <p className="text-xs text-muted-foreground">@{profile.username}</p>
                    )}
                  </div>
                </div>
              ))}
          </div>
          
          {/* Note: Use Settings to manage member roles */}
          {myProfile && isAdmin(myProfile.id) && (
            <p className="text-xs text-muted-foreground mt-4 text-center">
              {prefT('Para gerenciar membros, use os ajustes do espaço')}
            </p>
          )}
        </div>
      </AnimatedItem>

      {/* Share Code */}
      <AnimatedItem delay={400}>
        <div className="bg-muted/50 rounded-2xl p-4 border-2 border-border/30">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-xs text-muted-foreground mb-1">{prefT('Código do espaço')}</p>
              <p className="font-mono text-lg font-semibold">{couple.share_code}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {prefT('Compartilhe para convidar pessoas (máx. 5)')}
              </p>
            </div>
            <div className="flex gap-1">
              <button
                onClick={handleCopyCode}
                className="p-3 hover:bg-background rounded-xl transition-colors"
                title={prefT('Copiar código')}
              >
                <Copy className="w-5 h-5 text-muted-foreground" />
              </button>
              {myProfile && isAdmin(myProfile.id) && (
                <button
                  onClick={handleRegenerateCode}
                  disabled={regeneratingCode}
                  className="p-3 hover:bg-background rounded-xl transition-colors disabled:opacity-50"
                  title={prefT('Regenerar código')}
                >
                  <RefreshCw className={cn("w-5 h-5 text-muted-foreground", regeneratingCode && "animate-spin")} />
                </button>
              )}
            </div>
          </div>
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
          {prefT('Sair deste dispositivo')}
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
              {prefT('Excluir meu perfil')}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{prefT('⚠️ Excluir perfil permanentemente?')}</AlertDialogTitle>
              <AlertDialogDescription>
                {prefT('Seu perfil será resetado para os valores padrão e você perderá suas configurações pessoais.')}{' '}
                {prefT('Seus gastos serão mantidos no histórico do casal.')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{prefT('Cancelar')}</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteProfile} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {prefT('Excluir perfil')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </AnimatedItem>
    </AnimatedPage>
  );
}
