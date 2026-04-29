'use client';

import { type ReactNode } from 'react';
import { type UseFormReturn } from 'react-hook-form';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { type FormValues } from '@/features/configurator/lib/configurator-form-model';

interface ConfiguratorDetailsTabProps {
  readonly form: UseFormReturn<FormValues>;
  readonly renderTabActions: () => ReactNode;
}

export function ConfiguratorDetailsTab({
  form,
  renderTabActions
}: ConfiguratorDetailsTabProps) {
  return (
    <TabsContent value='details' className='mt-4 space-y-4'>
      <Card className='border-0 shadow-none'>
        <CardHeader>
          <CardTitle>Datos de la proforma</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid grid-cols-2 gap-4'>
            <FormField
              control={form.control as any}
              name='reference'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Referencia</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name='validDays'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Validez de oferta (días)</FormLabel>
                  <Select
                    defaultValue={field.value?.toString()}
                    onValueChange={(val) =>
                      field.onChange(Number.parseInt(val, 10))
                    }
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder='Seleccione validez' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value='15'>15 días</SelectItem>
                      <SelectItem value='30'>30 días</SelectItem>
                      <SelectItem value='60'>60 días</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control as any}
            name='notes'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notas</FormLabel>
                <FormControl>
                  <Textarea {...field} className='min-h-[79px]' />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {renderTabActions()}
        </CardContent>
      </Card>
    </TabsContent>
  );
}
