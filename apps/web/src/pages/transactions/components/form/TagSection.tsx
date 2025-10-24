import React from 'react';
import { Control, UseFormSetValue } from 'react-hook-form';
import { Tag } from '@garangbi/types';
import { TransactionFormValues } from '../../types';
import { TagInput } from './TagInput';

interface TagSectionProps {
  control: Control<TransactionFormValues>;
  setValue: UseFormSetValue<TransactionFormValues>;
  tagOptions: Tag[];
}

export function TagSection({ control, setValue, tagOptions }: TagSectionProps) {
  return (
    <section className="flex flex-col gap-2">
      <label className="text-xs font-semibold uppercase text-pixel-ink/70">태그</label>
      <TagInput control={control} name="tags" setValue={setValue} tagOptions={tagOptions} />
    </section>
  );
}
