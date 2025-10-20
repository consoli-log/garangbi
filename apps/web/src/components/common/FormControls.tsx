import type { ComponentPropsWithoutRef, PropsWithChildren } from 'react';
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
        'pixel-box flex w-full max-w-xl flex-col gap-5 bg-[#2a2d3f] text-pixel-yellow',
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

export function Input({
  className,
  ...props
}: ComponentPropsWithoutRef<'input'>) {
  return (
    <input
      className={cn(
        'w-full rounded-none border-4 border-black bg-[#1d1f2a] px-4 py-3 text-[11px] uppercase tracking-wide text-pixel-yellow shadow-pixel-md focus:border-pixel-blue focus:outline-none',
        className,
      )}
      {...props}
    />
  );
}

export function Button({
  className,
  ...props
}: ComponentPropsWithoutRef<'button'>) {
  return (
    <button
      className={cn(
        'pixel-button disabled:translate-x-0 disabled:translate-y-0 disabled:bg-gray-500 disabled:text-gray-300 disabled:shadow-none',
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
    <p className={cn('text-[11px] font-bold uppercase text-pixel-red', className)} {...props} />
  );
}
