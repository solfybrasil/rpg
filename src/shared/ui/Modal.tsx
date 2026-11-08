import * as DialogPrimitive from '@radix-ui/react-dialog';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { clsx } from 'clsx';
import { X } from 'lucide-react';
import React from 'react';
import { twMerge } from 'tailwind-merge';

/** Renderiza modais dentro da tela do mestre (quando aberta) para herdar o tema dela. */
const getThemeContainer = () =>
  typeof document === 'undefined'
    ? undefined
    : (document.querySelector<HTMLElement>('.mestre-root') ?? undefined);

export interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}) => {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal container={getThemeContainer()}>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={twMerge(
            clsx(
              'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-[var(--iron)] bg-[var(--stone)] p-6 shadow-2xl duration-200 slab rounded-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
              className,
            ),
          )}
        >
          <div className="flex flex-col space-y-1.5 text-center sm:text-left border-b border-[var(--iron)] pb-3">
            {title && (
              <DialogPrimitive.Title className="text-lg font-bold leading-none tracking-wider font-['Cinzel',serif] text-[var(--gold-hi)] uppercase">
                {title}
              </DialogPrimitive.Title>
            )}
            {description && (
              <DialogPrimitive.Description className="text-sm text-[var(--muted)] font-['EB_Garamond',serif] italic">
                {description}
              </DialogPrimitive.Description>
            )}
          </div>
          {children}
          <DialogPrimitive.Close className="absolute right-4 top-4 opacity-70 transition-opacity hover:opacity-100 focus:outline-none p-1.5 text-[var(--muted)] hover:text-white bg-black/40 border border-[var(--iron)] cursor-pointer">
            <X className="h-4 w-4" />
            <span className="sr-only">Fechar</span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

export interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  side?: 'bottom' | 'right';
}

export const Sheet: React.FC<SheetProps> = ({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
  side = 'bottom',
}) => {
  const isBottom = side === 'bottom';

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal container={getThemeContainer()}>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={twMerge(
            clsx(
              'fixed z-50 bg-[var(--stone)] border-[var(--iron)] p-6 shadow-2xl slab rounded-none transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out duration-200',
              isBottom
                ? 'inset-x-0 bottom-0 border-t max-h-[85vh] overflow-y-auto data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom'
                : 'inset-y-0 right-0 h-full w-3/4 border-l max-w-md overflow-y-auto data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right',
              className,
            ),
          )}
        >
          <div className="flex items-center justify-between border-b border-[var(--iron)] pb-3 mb-4">
            <div className="flex flex-col space-y-1">
              {title && (
                <DialogPrimitive.Title className="text-base font-bold font-['Cinzel',serif] text-[var(--gold-hi)] tracking-wider uppercase">
                  {title}
                </DialogPrimitive.Title>
              )}
              {description && (
                <DialogPrimitive.Description className="text-xs text-[var(--muted)] font-['EB_Garamond',serif] italic">
                  {description}
                </DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close className="p-1.5 text-[var(--muted)] hover:text-white bg-black/40 border border-[var(--iron)] transition-colors cursor-pointer">
              <X className="h-4 w-4" />
              <span className="sr-only">Fechar</span>
            </DialogPrimitive.Close>
          </div>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

export const Tabs = TabsPrimitive.Root;

export const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={twMerge(
      'inline-flex h-10 items-center justify-center p-1 bg-black/40 border border-[var(--iron)] gap-1 w-full',
      className,
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

export const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={twMerge(
      "inline-flex items-center justify-center whitespace-nowrap px-3 py-1.5 text-xs font-['Cinzel',serif] font-bold tracking-[0.12em] uppercase text-[var(--muted)] transition-all cursor-pointer hover:text-[var(--text)] data-[state=active]:slab data-[state=active]:on data-[state=active]:text-[var(--gold-hi)] disabled:pointer-events-none disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

export const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={twMerge(
      'mt-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--gold)]',
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={twMerge(
      "z-50 overflow-hidden border border-[var(--iron)] parch px-3 py-1.5 text-xs text-[var(--ink)] shadow-xl animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 font-['EB_Garamond',serif]",
      className,
    )}
    {...props}
  />
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;
