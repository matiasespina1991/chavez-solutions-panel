'use client';

import { type FieldPath, type FieldValues } from 'react-hook-form';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { type BaseFormFieldProps } from '@/types/base-form';

interface FormInputProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> extends BaseFormFieldProps<TFieldValues, TName> {
  readonly type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
  readonly placeholder?: string;
  readonly step?: string | number;
  readonly min?: string | number;
  readonly max?: string | number;
}

function FormInput<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  control,
  name,
  label,
  description,
  required,
  type = 'text',
  placeholder,
  step,
  min,
  max,
  disabled,
  className
}: FormInputProps<TFieldValues, TName>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          {label ? <FormLabel className='gap-0.5'>
            {label}
            {required ? <span className='text-red-500'>*</span> : null}
          </FormLabel> : null}
          <FormControl>
            <Input
              type={type}
              placeholder={placeholder}
              step={step}
              min={min}
              max={max}
              disabled={disabled}
              {...field}
              onChange={(e) => {
                if (type === 'number') {
                  const {value} = e.target;
                  field.onChange(value === '' ? undefined : Number.parseFloat(value));
                } else {
                  field.onChange(e.target.value);
                }
              }}
            />
          </FormControl>
          {description ? <FormDescription>{description}</FormDescription> : null}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export { FormInput };
