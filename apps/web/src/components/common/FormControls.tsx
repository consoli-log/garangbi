import { forwardRef, type ComponentPropsWithoutRef, type PropsWithChildren } from 'react';
import { cn } from '../../lib/cn';

export function FormContainer({
  className,
  ...props
}: ComponentPropsWithoutRef<'div'>) {
  return (
    <div
      className={cn(
        'flex min-h-screen flex-col items-center justify-center px-6 py-8',
        className,
      )}
      {...props}
    />
  );
}

export function Form({
  className,
  ...props
}: ComponentPropsWithoutRef<'form'>) {
  return (
    <form
      className={cn(
        'pixel-box flex w-full max-w-xl flex-col gap-6 text-pixel-ink',
        className,
      )}
      {...props}
    />
  );
}

export function InputGroup({
  className,
  children,
  ...props
}: PropsWithChildren<ComponentPropsWithoutRef<'div'>>) {
  return (
    <div className={cn('flex flex-col gap-2', className)} {...props}>
      {children}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, ComponentPropsWithoutRef<'input'>>(
  ({ className, ...props }, ref) => {
    const ariaInvalid = props['aria-invalid'];
    const isInvalid = ariaInvalid === true || ariaInvalid === 'true';

    return (
      <input
        ref={ref}
        className={cn(
          'w-full rounded-[22px] border-4 border-black bg-white px-5 py-3 text-base font-semibold text-pixel-ink shadow-pixel-sm transition-transform duration-200 ease-out placeholder:text-pixel-ink/35 focus:-translate-x-1 focus:-translate-y-1 focus:border-pixel-blue focus:shadow-pixel-md focus:outline-none focus:ring-0',
          isInvalid &&
            'border-pixel-red text-pixel-red placeholder:text-pixel-red/70 focus:border-pixel-red',
          className,
        )}
        {...props}
      />
    );
  },
);

Input.displayName = 'FormInput';

export function Button({
  className,
  ...props
}: ComponentPropsWithoutRef<'button'>) {
  return (
    <button
      className={cn(
        'pixel-button disabled:translate-x-0 disabled:translate-y-0 disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none disabled:opacity-70',
        className,
      )}
      {...props}
    />
  );
}

export function ErrorMessage({
  className,
  ...props
}: ComponentPropsWithoutRef<'p'>) {
  return (
    <p className={cn('text-sm font-semibold uppercase text-pixel-red', className)} {...props} />
  );
}
