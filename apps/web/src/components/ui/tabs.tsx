import * as React from 'react';
import { cn } from '@/lib/utils';

type TabsContextValue = {
  value: string;
  setValue: (value: string) => void;
};

const TabsContext = React.createContext<TabsContextValue | null>(null);

type TabsProps = React.HTMLAttributes<HTMLDivElement> & {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
};

export function Tabs({
  defaultValue,
  value: controlledValue,
  onValueChange,
  className,
  children,
  ...props
}: TabsProps) {
  const [internalValue, setInternalValue] = React.useState(
    controlledValue ?? defaultValue ?? ''
  );

  const value = controlledValue ?? internalValue;

  const setValue = React.useCallback(
    (nextValue: string) => {
      if (!controlledValue) {
        setInternalValue(nextValue);
      }
      onValueChange?.(nextValue);
    },
    [controlledValue, onValueChange]
  );

  React.useEffect(() => {
    if (controlledValue !== undefined) {
      setInternalValue(controlledValue);
    }
  }, [controlledValue]);

  return (
    <TabsContext.Provider value={{ value, setValue }}>
      <div className={cn('w-full', className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export const TabsList = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    role="tablist"
    className={cn(
      'inline-flex items-center rounded-full border border-border bg-muted/60 p-1 text-muted-foreground',
      className
    )}
    {...props}
  />
));
TabsList.displayName = 'TabsList';

type TabsTriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  value: string;
};

export const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ className, value, ...props }, ref) => {
    const ctx = React.useContext(TabsContext);
    if (!ctx) throw new Error('TabsTrigger must be used inside Tabs');
    const isActive = ctx.value === value;
    return (
      <button
        ref={ref}
        role="tab"
        aria-selected={isActive}
        className={cn(
          'relative rounded-full px-4 py-1.5 text-sm font-medium transition-all',
          isActive
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground',
          className
        )}
        onClick={(event) => {
          props.onClick?.(event);
          if (!event.defaultPrevented) {
            ctx.setValue(value);
          }
        }}
        {...props}
      />
    );
  }
);
TabsTrigger.displayName = 'TabsTrigger';

type TabsContentProps = React.HTMLAttributes<HTMLDivElement> & {
  value: string;
};

export const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ className, value, ...props }, ref) => {
    const ctx = React.useContext(TabsContext);
    if (!ctx) throw new Error('TabsContent must be used inside Tabs');
    if (ctx.value !== value) return null;
    return (
      <div
        ref={ref}
        role="tabpanel"
        className={cn('pt-6 focus-visible:outline-none', className)}
        {...props}
      />
    );
  }
);
TabsContent.displayName = 'TabsContent';
