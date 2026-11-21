'use client';

import * as React from 'react';
import { Drawer as DrawerPrimitive } from 'vaul';

function DrawerRoot({
  shouldScaleBackground = true,
  open,
  onOpenChange,
  children,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Root>) {
  // Predictive back / history handling (DESIGN.md 7.1 #12)
  React.useEffect(() => {
    if (!open) return;

    const handlePopState = () => {
      if (onOpenChange) {
        onOpenChange(false);
      }
    };

    window.history.pushState({ drawerOpen: true }, '');
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [open, onOpenChange]);

  return (
    <DrawerPrimitive.Root
      shouldScaleBackground={shouldScaleBackground}
      open={open}
      onOpenChange={onOpenChange}
      {...props}
    >
      {children}
    </DrawerPrimitive.Root>
  );
}

const DrawerTrigger = DrawerPrimitive.Trigger;
const DrawerPortal = DrawerPrimitive.Portal;
const DrawerClose = DrawerPrimitive.Close;

const DrawerOverlay = React.forwardRef<
  React.ComponentRef<typeof DrawerPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay>
>(({ className = '', ...props }, ref) => (
  <DrawerPrimitive.Overlay
    ref={ref}
    className={`fixed inset-0 z-50 bg-black/50 backdrop-blur-xs ${className}`}
    {...props}
  />
));
DrawerOverlay.displayName = DrawerPrimitive.Overlay.displayName;

const DrawerContent = React.forwardRef<
  React.ComponentRef<typeof DrawerPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content>
>(({ className = '', children, ...props }, ref) => (
  <DrawerPortal>
    <DrawerOverlay />
    <DrawerPrimitive.Content
      ref={ref}
      className={`fixed inset-x-0 bottom-0 z-50 mt-24 flex h-auto max-h-[85vh] flex-col rounded-t-[var(--r-xl)] border-t border-[var(--border)] bg-[var(--surface)] text-[var(--text)] outline-none shadow-subtle ${className}`}
      {...props}
    >
      <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-[var(--border)]" />
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</div>
    </DrawerPrimitive.Content>
  </DrawerPortal>
));
DrawerContent.displayName = 'DrawerContent';

const DrawerHeader = ({
  className = '',
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`grid gap-1.5 text-left mb-4 ${className}`} {...props} />
);
DrawerHeader.displayName = 'DrawerHeader';

const DrawerFooter = ({
  className = '',
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`mt-auto flex flex-col gap-2 pt-4 ${className}`} {...props} />
);
DrawerFooter.displayName = 'DrawerFooter';

const DrawerTitle = React.forwardRef<
  React.ComponentRef<typeof DrawerPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Title>
>(({ className = '', ...props }, ref) => (
  <DrawerPrimitive.Title
    ref={ref}
    className={`text-lg font-bold leading-none tracking-tight font-display text-[var(--text)] ${className}`}
    {...props}
  />
));
DrawerTitle.displayName = DrawerPrimitive.Title.displayName;

const DrawerDescription = React.forwardRef<
  React.ComponentRef<typeof DrawerPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Description>
>(({ className = '', ...props }, ref) => (
  <DrawerPrimitive.Description
    ref={ref}
    className={`text-sm text-[var(--text-muted)] ${className}`}
    {...props}
  />
));
DrawerDescription.displayName = DrawerPrimitive.Description.displayName;

export {
  DrawerRoot as Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
};
