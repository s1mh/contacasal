import { useState } from 'react';
import { Users, Shield, ShieldOff, UserX, Loader2, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/Avatar';
import { Profile } from '@/contexts/CoupleContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn, isConfiguredProfile } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface SpaceRole {
  profile_id: string;
  role: 'admin' | 'member';
}

interface MemberManagementProps {
  profiles: Profile[];
  roles: SpaceRole[];
  myProfileId: string;
  onRefresh: () => Promise<void>;
}

export function MemberManagement({ profiles, roles, myProfileId, onRefresh }: MemberManagementProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);

  const configuredProfiles = profiles.filter(isConfiguredProfile);

  const getRole = (profileId: string): 'admin' | 'member' | null => {
    const role = roles.find(r => r.profile_id === profileId);
    return role?.role || null;
  };

  const isAdmin = (profileId: string) => getRole(profileId) === 'admin';
  const myRole = getRole(myProfileId);
  const canManage = myRole === 'admin';

  const handleAction = async (action: 'promote' | 'demote' | 'remove', targetProfileId: string) => {
    setLoading(targetProfileId);
    
    try {
      const { data, error } = await supabase.functions.invoke('manage-member', {
        body: {
          action,
          target_profile_id: targetProfileId,
          caller_profile_id: myProfileId,
        },
      });

      if (error) throw error;

      if (!data.success) {
        toast({
          title: 'Erro',
          description: data.error || 'Falha na operação',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Sucesso! ✨',
        description: data.message,
      });

      await onRefresh();
    } catch (err) {
      console.error('Error managing member:', err);
      toast({
        title: 'Ops! Algo deu errado 😕',
        description: 'Não foi possível realizar a ação',
        variant: 'destructive',
      });
    } finally {
      setLoading(null);
    }
  };

  if (configuredProfiles.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        <p>Nenhum membro configurado ainda.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">
          Membros ({configuredProfiles.length}/5)
        </span>
      </div>

      <div className="space-y-3">
        {configuredProfiles.map((profile) => {
          const role = getRole(profile.id);
          const isMe = profile.id === myProfileId;
          const isLoading = loading === profile.id;

          return (
            <div 
              key={profile.id}
              className={cn(
                "flex items-center justify-between p-3 rounded-2xl bg-muted/50",
                isMe && "ring-2 ring-primary/30"
              )}
            >
              <div className="flex items-center gap-3">
                <Avatar avatarIndex={profile.avatar_index} size="md" ringColor={profile.color} />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{profile.name}</span>
                    {isMe && <span className="text-xs text-muted-foreground">(você)</span>}
                    {role === 'admin' && (
                      <Crown className="w-4 h-4 text-amber-500" />
                    )}
                  </div>
                  {profile.username && (
                    <span className="text-xs text-muted-foreground">@{profile.username}</span>
                  )}
                </div>
              </div>

              {canManage && !isMe && (
                <div className="flex items-center gap-1">
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  ) : (
                    <>
                      {role === 'member' ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleAction('promote', profile.id)}
                          title="Promover a admin"
                          className="h-8 w-8 p-0"
                        >
                          <Shield className="w-4 h-4 text-amber-600" />
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleAction('demote', profile.id)}
                          title="Rebaixar para membro"
                          className="h-8 w-8 p-0"
                        >
                          <ShieldOff className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      )}

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Remover do espaço"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <UserX className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover {profile.name}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta pessoa será removida do espaço. O perfil será resetado e ela perderá acesso.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleAction('remove', profile.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}
                </div>
              )}

              {!canManage && role === 'admin' && (
                <span className="text-xs px-2 py-1 rounded-full bg-amber-500/10 text-amber-600">
                  Admin
                </span>
              )}
            </div>
          );
        })}
      </div>

      {!canManage && (
        <p className="text-xs text-muted-foreground text-center">
          Apenas administradores podem gerenciar membros.
        </p>
      )}
    </div>
  );
}
