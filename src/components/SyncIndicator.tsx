import { useEffect, useState } from "react";

interface SyncIndicatorProps {
  isSyncing: boolean;
}

export function SyncIndicator({ isSyncing }: SyncIndicatorProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isSyncing) {
      setVisible(true);
    } else {
      // Pequeno delay para suavizar a saída
      const timeout = setTimeout(() => setVisible(false), 150);
      return () => clearTimeout(timeout);
    }
  }, [isSyncing]);

  if (!visible) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
      <div 
        className={`w-2.5 h-2.5 rounded-full bg-primary shadow-lg shadow-primary/30 animate-sync-pulse transition-opacity duration-150 ${
          isSyncing ? 'opacity-100' : 'opacity-0'
        }`} 
      />
    </div>
  );
}
