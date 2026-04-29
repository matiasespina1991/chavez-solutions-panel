'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { Loader2, Search, X } from 'lucide-react';
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
import { TabsContent } from '@/components/ui/tabs';
import { FIRESTORE_COLLECTIONS } from '@/constants/firestore';
import {
  buildClientRowFromDoc,
  normalizeForSearch,
  type ClientRow
} from '@/features/clients/lib/client-panel-model';
import { type FormValues } from '@/features/configurator/lib/configurator-form-model';
import { db } from '@/lib/firebase';

interface ConfiguratorClientTabProps {
  readonly form: UseFormReturn<FormValues>;
  readonly renderTabActions: () => ReactNode;
}

export function ConfiguratorClientTab({
  form,
  renderTabActions
}: ConfiguratorClientTabProps) {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [isClientPickerOpen, setIsClientPickerOpen] = useState(false);

  useEffect(() => {
    const loadClients = async () => {
      setIsLoadingClients(true);

      try {
        const snapshot = await getDocs(
          collection(db, FIRESTORE_COLLECTIONS.CLIENTS)
        );
        const loadedClients = snapshot.docs
          .map((docSnap) =>
            buildClientRowFromDoc(docSnap.id, docSnap.data())
          )
          .sort((a, b) =>
            a.businessName.localeCompare(b.businessName, 'es', {
              sensitivity: 'base'
            })
          );
        setClients(loadedClients);
      } catch (error) {
        console.error('[ConfiguratorClientTab] clients load error', error);
      } finally {
        setIsLoadingClients(false);
      }
    };

    void loadClients();
  }, []);

  const filteredClients = useMemo(() => {
    const normalizedQuery = normalizeForSearch(clientSearch);
    if (!normalizedQuery) return clients.slice(0, 8);

    return clients
      .filter((client) =>
        normalizeForSearch(
          [
            client.businessName,
            client.taxId,
            client.contactName,
            client.email,
            client.city
          ].join(' ')
        ).includes(normalizedQuery)
      )
      .slice(0, 8);
  }, [clients, clientSearch]);

  const applyClientToForm = (client: ClientRow) => {
    form.setValue('client.businessName', client.businessName, {
      shouldDirty: true,
      shouldValidate: true
    });
    form.setValue('client.taxId', client.taxId, {
      shouldDirty: true,
      shouldValidate: true
    });
    form.setValue('client.contactName', client.contactName, {
      shouldDirty: true,
      shouldValidate: true
    });
    form.setValue('client.contactRole', client.contactRole, {
      shouldDirty: true,
      shouldValidate: true
    });
    form.setValue('client.email', client.email, {
      shouldDirty: true,
      shouldValidate: true
    });
    form.setValue('client.phone', client.phone, {
      shouldDirty: true,
      shouldValidate: true
    });
    form.setValue('client.address', client.address, {
      shouldDirty: true,
      shouldValidate: true
    });
    form.setValue('client.city', client.city, {
      shouldDirty: true,
      shouldValidate: true
    });
    setClientSearch(client.businessName);
    setIsClientPickerOpen(false);
  };

  return (
    <TabsContent value='client' className='mt-4 space-y-4'>
      <Card className='border-0 shadow-none'>
        <CardHeader>
          <CardTitle>Datos del Cliente</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='relative max-w-2xl'>
            <Search className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
            <Input
              value={clientSearch}
              placeholder='Buscar cliente maestro por razón social, RUC o email...'
              className='pr-10 pl-9'
              onFocus={() => setIsClientPickerOpen(true)}
              onChange={(event) => {
                setClientSearch(event.target.value);
                setIsClientPickerOpen(true);
              }}
              onBlur={() => {
                globalThis.setTimeout(() => setIsClientPickerOpen(false), 120);
              }}
            />
            <div className='absolute top-1/2 right-3 flex -translate-y-1/2 items-center gap-1'>
              {isLoadingClients ? (
                <Loader2 className='text-muted-foreground h-4 w-4 animate-spin' />
              ) : null}
              {clientSearch.trim().length > 0 ? (
                <button
                  type='button'
                  aria-label='Limpiar búsqueda de cliente'
                  className='text-muted-foreground hover:text-foreground cursor-pointer transition-colors'
                  onMouseDown={(event) => {
                    event.preventDefault();
                    setClientSearch('');
                    setIsClientPickerOpen(true);
                  }}
                >
                  <X className='h-4 w-4' />
                </button>
              ) : null}
            </div>

            {isClientPickerOpen && filteredClients.length > 0 ? (
              <div className='bg-popover text-popover-foreground absolute z-50 mt-1 flex max-h-72 w-full flex-col overflow-y-auto rounded-md border shadow-lg'>
                {filteredClients.map((client) => (
                  <button
                    key={client.id}
                    type='button'
                    className='hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground grid w-full cursor-pointer grid-cols-[1fr_auto] gap-3 px-3 py-2 text-left text-sm'
                    onMouseDown={(event) => {
                      event.preventDefault();
                      applyClientToForm(client);
                    }}
                  >
                    <span className='min-w-0'>
                      <span className='block truncate font-medium'>
                        {client.businessName}
                      </span>
                      <span className='text-muted-foreground block truncate text-xs'>
                        {client.contactName || 'Sin contacto'} ·{' '}
                        {client.email || 'Sin email'}
                      </span>
                    </span>
                    <span className='text-muted-foreground shrink-0 font-mono text-xs'>
                      {client.taxId || 'Sin RUC'}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className='grid grid-cols-2 gap-4'>
            <FormField
              control={form.control}
              name='client.businessName'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Razón Social</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='client.taxId'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>RUC</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='client.contactName'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Persona de Contacto</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='client.contactRole'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cargo (Opcional)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='client.email'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type='email' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='client.phone'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='client.address'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='client.city'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ciudad/Localidad</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          {renderTabActions()}
        </CardContent>
      </Card>
    </TabsContent>
  );
}
