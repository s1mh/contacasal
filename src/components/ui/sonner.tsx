import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-center"
      duration={3000}
      style={{ top: 'calc(var(--safe-area-top, 0px) + 8px)' }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white/55 dark:group-[.toaster]:bg-white/[0.12] group-[.toaster]:text-foreground group-[.toaster]:border-white/40 dark:group-[.toaster]:border-white/[0.15] group-[.toaster]:shadow-glass-lg group-[.toaster]:backdrop-blur-2xl group-[.toaster]:backdrop-saturate-[1.8] group-[.toaster]:rounded-full group-[.toaster]:px-5 group-[.toaster]:py-3 group-[.toaster]:animate-toast-glass-in",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-full",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-full",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
