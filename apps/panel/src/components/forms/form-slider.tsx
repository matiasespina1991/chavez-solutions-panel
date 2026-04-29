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
import { Slider } from '@/components/ui/slider';
import { type BaseFormFieldProps, type SliderConfig } from '@/types/base-form';

interface FormSliderProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> extends BaseFormFieldProps<TFieldValues, TName> {
  readonly config: SliderConfig;
  readonly showValue?: boolean;
}

function FormSlider<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  control,
  name,
  label,
  description,
  required,
  config,
  showValue = true,
  disabled,
  className
}: FormSliderProps<TFieldValues, TName>) {
  const { min, max, step = 1, formatValue } = config;

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          {label ? <FormLabel>
            {label}
            {required ? <span className='ml-1 text-red-500'>*</span> : null}
          </FormLabel> : null}
          <FormControl>
            <div className='px-3'>
              <Slider
                min={min}
                max={max}
                step={step}
                value={[field.value || min]}
                disabled={disabled}
                onValueChange={(value) => field.onChange(value[0])}
              />
              {showValue ? <div className='text-muted-foreground mt-1 flex justify-between text-sm'>
                <span>{formatValue ? formatValue(min) : min}</span>
                <span>
                  {formatValue
                    ? formatValue(field.value || min)
                    : field.value || min}
                </span>
                <span>{formatValue ? formatValue(max) : max}</span>
              </div> : null}
            </div>
          </FormControl>
          {description ? <FormDescription>{description}</FormDescription> : null}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export { FormSlider };
