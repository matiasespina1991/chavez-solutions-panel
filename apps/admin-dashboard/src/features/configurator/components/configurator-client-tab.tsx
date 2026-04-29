'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { Search, Loader2 } from 'lucide-react';
import { type UseFormReturn, useWatch } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { TabsContent } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { FIRESTORE_COLLECTIONS } from '@/constants/firestore';
import {
  buildClientRowFromDoc,
  normalizeForSearch,
  type ClientRow
} from '@/features/clients/lib/client-panel-model';
import {
  createClient,
  saveClientChanges
} from '@/features/clients/services/client-callables';
import { type FormValues } from '@/features/configurator/lib/configurator-form-model';
import { getGenericCallableErrorMessage } from '@/lib/callable-errors';
import { showCallableErrorToast } from '@/lib/callable-toast';
import { db } from '@/lib/firebase';

interface ConfiguratorClientTabProps {
  readonly form: UseFormReturn<FormValues>;
  readonly renderTabActions: () => ReactNode;
}

type ClientFormSnapshot = FormValues['client'];
type ClientFormFieldKey = keyof ClientFormSnapshot;

const normalizeString = (value: string | null | undefined): string =>
  (value ?? '').trim();

const normalizeBusinessName = (value: string | null | undefined): string =>
  normalizeForSearch(value ?? '');

const normalizeSnapshot = (snapshot: ClientFormSnapshot) => ({
  businessName: normalizeString(snapshot.businessName),
  taxId: normalizeString(snapshot.taxId),
  contactName: normalizeString(snapshot.contactName),
  contactRole: normalizeString(snapshot.contactRole),
  email: normalizeString(snapshot.email),
  phone: normalizeString(snapshot.phone),
  address: normalizeString(snapshot.address),
  city: normalizeString(snapshot.city)
});

export function ConfiguratorClientTab({
  form,
  renderTabActions
}: ConfiguratorClientTabProps) {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
  const [clientDialogQuery, setClientDialogQuery] = useState('');
  const [selectedDialogClientId, setSelectedDialogClientId] = useState<
    string | null
  >(null);
  const [isBusinessAutocompleteOpen, setIsBusinessAutocompleteOpen] =
    useState(false);
  const [activeBusinessSuggestionIndex, setActiveBusinessSuggestionIndex] =
    useState(-1);
  const [isAddClientPromptOpen, setIsAddClientPromptOpen] = useState(false);
  const [isUpdateClientPromptOpen, setIsUpdateClientPromptOpen] = useState(false);
  const [matchedClientForUpdate, setMatchedClientForUpdate] =
    useState<ClientRow | null>(null);
  const [isSavingClientBase, setIsSavingClientBase] = useState(false);
  const [autofilledFields, setAutofilledFields] = useState<
    Partial<Record<ClientFormFieldKey, boolean>>
  >({});
  const ignoreNextBusinessBlurRef = useRef(false);

  const getAutofillInputClass = (key: ClientFormFieldKey) =>
    autofilledFields[key]
      ? 'bg-blue-50 border-blue-300 focus-visible:ring-blue-200 dark:bg-blue-950/35 dark:border-blue-800 dark:focus-visible:ring-blue-900/60'
      : '';

  const clearAutofilledField = (key: ClientFormFieldKey) => {
    setAutofilledFields((previous) => {
      if (!previous[key]) return previous;
      return {
        ...previous,
        [key]: false
      };
    });
  };

  const businessNameValue = useWatch({
    control: form.control,
    name: 'client.businessName'
  });

  const loadClients = async () => {
    setIsLoadingClients(true);

    try {
      const snapshot = await getDocs(collection(db, FIRESTORE_COLLECTIONS.CLIENTS));
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
      toast.error('No se pudo cargar la base de clientes.');
    } finally {
      setIsLoadingClients(false);
    }
  };

  useEffect(() => {
    void loadClients();
  }, []);

  const dialogFilteredClients = useMemo(() => {
    const normalizedQuery = normalizeForSearch(clientDialogQuery);
    if (!normalizedQuery) return [];

    return clients.filter((client) =>
      normalizeForSearch(
        [
          client.businessName,
          client.taxId,
          client.contactName,
          client.email,
          client.city
        ].join(' ')
      ).includes(normalizedQuery)
    );
  }, [clients, clientDialogQuery]);

  const businessSuggestions = useMemo(() => {
    const query = normalizeForSearch(businessNameValue ?? '');
    if (!query) return [];

    return clients
      .filter((client) =>
        normalizeForSearch(client.businessName).includes(query)
      )
      .slice(0, 8);
  }, [clients, businessNameValue]);

  const applyClientToForm = (client: ClientRow) => {
    ignoreNextBusinessBlurRef.current = true;
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
    setAutofilledFields({
      businessName: client.businessName.trim().length > 0,
      taxId: client.taxId.trim().length > 0,
      contactName: client.contactName.trim().length > 0,
      contactRole: client.contactRole.trim().length > 0,
      email: client.email.trim().length > 0,
      phone: client.phone.trim().length > 0,
      address: client.address.trim().length > 0,
      city: client.city.trim().length > 0
    });
    setActiveBusinessSuggestionIndex(-1);
  };

  const checkClientBaseSuggestion = () => {
    if (ignoreNextBusinessBlurRef.current) {
      ignoreNextBusinessBlurRef.current = false;
      return;
    }

    const snapshot = normalizeSnapshot(form.getValues('client'));
    if (!snapshot.businessName) return;

    const exactMatch = clients.find(
      (client) =>
        normalizeBusinessName(client.businessName) ===
        normalizeBusinessName(snapshot.businessName)
    );

    if (!exactMatch) {
      setIsAddClientPromptOpen(true);
      return;
    }

    const baseSnapshot = normalizeSnapshot({
      businessName: exactMatch.businessName,
      taxId: exactMatch.taxId,
      contactName: exactMatch.contactName,
      contactRole: exactMatch.contactRole,
      email: exactMatch.email,
      phone: exactMatch.phone,
      address: exactMatch.address,
      city: exactMatch.city
    });

    const hasChanges =
      snapshot.taxId !== baseSnapshot.taxId ||
      snapshot.contactName !== baseSnapshot.contactName ||
      snapshot.contactRole !== baseSnapshot.contactRole ||
      snapshot.email !== baseSnapshot.email ||
      snapshot.phone !== baseSnapshot.phone ||
      snapshot.address !== baseSnapshot.address ||
      snapshot.city !== baseSnapshot.city;

    if (hasChanges) {
      setMatchedClientForUpdate(exactMatch);
      setIsUpdateClientPromptOpen(true);
    }
  };

  const handleSaveNewClientToBase = async () => {
    const payload = normalizeSnapshot(form.getValues('client'));
    setIsSavingClientBase(true);

    try {
      await createClient(payload);
      toast.success('Cliente agregado a la base.');
      setIsAddClientPromptOpen(false);
      await loadClients();
    } catch (error) {
      console.error('[ConfiguratorClientTab] create client from form error', error);
      const message =
        getGenericCallableErrorMessage(error) ??
        'No se pudo agregar el cliente a la base.';
      showCallableErrorToast(message);
    } finally {
      setIsSavingClientBase(false);
    }
  };

  const handleUpdateClientInBase = async () => {
    if (!matchedClientForUpdate) return;

    const payload = normalizeSnapshot(form.getValues('client'));
    setIsSavingClientBase(true);

    try {
      await saveClientChanges(
        [
          {
            id: matchedClientForUpdate.id,
            patch: payload,
            lastKnownUpdatedAt: matchedClientForUpdate.updatedAtISO
          }
        ],
        'Actualización desde configurador de proformas'
      );
      toast.success('Cliente base actualizado.');
      setIsUpdateClientPromptOpen(false);
      setMatchedClientForUpdate(null);
      await loadClients();
    } catch (error) {
      console.error('[ConfiguratorClientTab] update client from form error', error);
      const message =
        getGenericCallableErrorMessage(error) ??
        'No se pudo actualizar el cliente en la base.';
      showCallableErrorToast(message);
    } finally {
      setIsSavingClientBase(false);
    }
  };

  const selectedDialogClient = dialogFilteredClients.find(
    (client) => client.id === selectedDialogClientId
  );
  const shouldShowBusinessAutocomplete =
    isBusinessAutocompleteOpen && businessSuggestions.length > 0;
  const shouldShowDialogResultsContainer =
    isLoadingClients || normalizeForSearch(clientDialogQuery).length > 0;

  return (
    <TabsContent value='client' className='mt-4 space-y-4'>
      <Card className='border-0 shadow-none'>
        <CardHeader>
          <div className='flex items-center gap-1.5'>
            <CardTitle>Datos del Cliente</CardTitle>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type='button'
                  className='text-muted-foreground hover:text-foreground inline-flex cursor-pointer items-center justify-center transition-colors'
                  onClick={() => setIsClientDialogOpen(true)}
                >
                  <Search className='h-3.5 w-3.5' />
                  <span className='sr-only'>Buscar cliente</span>
                </button>
              </TooltipTrigger>
              <TooltipContent>Buscar cliente</TooltipContent>
            </Tooltip>
          </div>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid grid-cols-2 gap-4'>
            <FormField
              control={form.control}
              name='client.businessName'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Razón Social</FormLabel>
                  <FormControl>
                    <div className='relative'>
                      <Input
                        {...field}
                        value={field.value ?? ''}
                        className={getAutofillInputClass('businessName')}
                        onFocus={() => {
                          setIsBusinessAutocompleteOpen(true);
                          setActiveBusinessSuggestionIndex(-1);
                        }}
                        onChange={(event) => {
                          clearAutofilledField('businessName');
                          field.onChange(event.target.value);
                          setIsBusinessAutocompleteOpen(true);
                          setActiveBusinessSuggestionIndex(-1);
                        }}
                        onBlur={() => {
                          globalThis.setTimeout(() => {
                            setIsBusinessAutocompleteOpen(false);
                            checkClientBaseSuggestion();
                          }, 120);
                        }}
                        onKeyDown={(event) => {
                          if (
                            !isBusinessAutocompleteOpen ||
                            businessSuggestions.length === 0
                          ) {
                            return;
                          }

                          if (event.key === 'ArrowDown') {
                            event.preventDefault();
                            const nextIndex =
                              activeBusinessSuggestionIndex >=
                              businessSuggestions.length - 1
                                ? 0
                                : activeBusinessSuggestionIndex + 1;
                            setActiveBusinessSuggestionIndex(nextIndex);
                            applyClientToForm(businessSuggestions[nextIndex]);
                            return;
                          }

                          if (event.key === 'ArrowUp') {
                            event.preventDefault();
                            const nextIndex =
                              activeBusinessSuggestionIndex <= 0
                                ? businessSuggestions.length - 1
                                : activeBusinessSuggestionIndex - 1;
                            setActiveBusinessSuggestionIndex(nextIndex);
                            applyClientToForm(businessSuggestions[nextIndex]);
                            return;
                          }

                          if (event.key === 'Enter') {
                            if (activeBusinessSuggestionIndex < 0) return;
                            event.preventDefault();
                            applyClientToForm(
                              businessSuggestions[activeBusinessSuggestionIndex]
                            );
                            setIsBusinessAutocompleteOpen(false);
                          }
                        }}
                      />

                      {shouldShowBusinessAutocomplete ? (
                        <div className='bg-popover text-popover-foreground absolute z-50 mt-1 flex max-h-72 w-full flex-col overflow-y-auto rounded-md border shadow-lg'>
                          {businessSuggestions.map((client, index) => (
                            <button
                              key={client.id}
                              type='button'
                              className={`block w-full cursor-pointer px-3 py-2 text-left text-sm transition-colors ${
                                index === activeBusinessSuggestionIndex
                                  ? 'bg-accent text-accent-foreground'
                                  : 'hover:bg-accent hover:text-accent-foreground'
                              }`}
                              onMouseEnter={() => {
                                setActiveBusinessSuggestionIndex(index);
                                applyClientToForm(client);
                              }}
                              onMouseDown={(event) => {
                                event.preventDefault();
                                applyClientToForm(client);
                                setIsBusinessAutocompleteOpen(false);
                              }}
                            >
                              <div className='truncate font-medium'>
                                {client.businessName}
                              </div>
                              <div className='text-muted-foreground truncate text-xs'>
                                {client.taxId || 'Sin RUC'} ·{' '}
                                {client.contactName || 'Sin contacto'}
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
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
                    <Input
                      {...field}
                      className={getAutofillInputClass('taxId')}
                      onChange={(event) => {
                        clearAutofilledField('taxId');
                        field.onChange(event.target.value);
                      }}
                    />
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
                    <Input
                      {...field}
                      className={getAutofillInputClass('contactName')}
                      onChange={(event) => {
                        clearAutofilledField('contactName');
                        field.onChange(event.target.value);
                      }}
                    />
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
                      className={getAutofillInputClass('contactRole')}
                      onChange={(event) => {
                        clearAutofilledField('contactRole');
                        field.onChange(event.target.value);
                      }}
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
                    <Input
                      type='email'
                      {...field}
                      className={getAutofillInputClass('email')}
                      onChange={(event) => {
                        clearAutofilledField('email');
                        field.onChange(event.target.value);
                      }}
                    />
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
                    <Input
                      {...field}
                      className={getAutofillInputClass('phone')}
                      onChange={(event) => {
                        clearAutofilledField('phone');
                        field.onChange(event.target.value);
                      }}
                    />
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
                    <Input
                      {...field}
                      className={getAutofillInputClass('address')}
                      onChange={(event) => {
                        clearAutofilledField('address');
                        field.onChange(event.target.value);
                      }}
                    />
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
                    <Input
                      {...field}
                      className={getAutofillInputClass('city')}
                      onChange={(event) => {
                        clearAutofilledField('city');
                        field.onChange(event.target.value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          {renderTabActions()}
        </CardContent>
      </Card>

      <Dialog open={isClientDialogOpen} onOpenChange={setIsClientDialogOpen}>
        <DialogContent className='w-[min(96vw,50rem)] !max-w-[50rem]'>
          <DialogHeader>
            <DialogTitle>Buscar cliente</DialogTitle>
            <DialogDescription>
              Selecciona un cliente para cargar sus datos en la proforma actual.
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-3'>
            <div className='relative'>
              <Search className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
              <Input
                value={clientDialogQuery}
                placeholder='Buscar por razón social, RUC, contacto o email...'
                className='pl-9'
                onChange={(event) => setClientDialogQuery(event.target.value)}
              />
            </div>
            {shouldShowDialogResultsContainer ? (
              <div className='max-h-80 overflow-y-auto rounded-md border'>
                {isLoadingClients ? (
                  <div className='text-muted-foreground flex items-center gap-2 px-3 py-4 text-sm'>
                    <Loader2 className='h-4 w-4 animate-spin' />
                    Cargando clientes...
                  </div>
                ) : dialogFilteredClients.length === 0 ? (
                  <div className='text-muted-foreground px-3 py-4 text-sm'>
                    No hay clientes para ese criterio.
                  </div>
                ) : (
                  <div className='divide-y'>
                    {dialogFilteredClients.map((client) => {
                      const isSelected = selectedDialogClientId === client.id;
                      return (
                        <button
                          key={client.id}
                          type='button'
                          className={`w-full cursor-pointer overflow-hidden px-3 py-2 text-left transition-colors ${
                            isSelected
                              ? 'bg-accent text-accent-foreground'
                              : 'hover:bg-accent/60'
                          }`}
                          onClick={() => setSelectedDialogClientId(client.id)}
                        >
                          <div
                            className='min-w-0 truncate font-medium'
                            title={client.businessName}
                          >
                            {client.businessName}
                          </div>
                          <div className='text-muted-foreground min-w-0 truncate text-xs'>
                            RUC: {client.taxId || 'Sin RUC'} ·{' '}
                            {client.contactName || 'Sin contacto'} ·{' '}
                            {client.email || 'Sin email'}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              className='cursor-pointer'
              onClick={() => setIsClientDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type='button'
              className='cursor-pointer'
              disabled={!selectedDialogClient || isLoadingClients}
              onClick={() => {
                if (!selectedDialogClient) return;
                applyClientToForm(selectedDialogClient);
                setIsClientDialogOpen(false);
              }}
            >
              Agregar datos del cliente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddClientPromptOpen} onOpenChange={setIsAddClientPromptOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar cliente a la base</DialogTitle>
            <DialogDescription>
              La razón social no existe en `clients`. ¿Deseas guardar este
              cliente para reutilizarlo en futuras proformas?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              className='cursor-pointer'
              disabled={isSavingClientBase}
              onClick={() => setIsAddClientPromptOpen(false)}
            >
              Omitir
            </Button>
            <Button
              type='button'
              className='cursor-pointer'
              disabled={isSavingClientBase}
              onClick={handleSaveNewClientToBase}
            >
              {isSavingClientBase ? (
                <Loader2 className='h-4 w-4 animate-spin' />
              ) : null}
              Agregar cliente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isUpdateClientPromptOpen}
        onOpenChange={setIsUpdateClientPromptOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Actualizar cliente en la base</DialogTitle>
            <DialogDescription>
              Esta razón social ya existe en `clients`, pero detectamos cambios
              en otros campos. ¿Deseas actualizar el registro maestro?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              className='cursor-pointer'
              disabled={isSavingClientBase}
              onClick={() => {
                setIsUpdateClientPromptOpen(false);
                setMatchedClientForUpdate(null);
              }}
            >
              Mantener base actual
            </Button>
            <Button
              type='button'
              className='cursor-pointer'
              disabled={isSavingClientBase}
              onClick={handleUpdateClientInBase}
            >
              {isSavingClientBase ? (
                <Loader2 className='h-4 w-4 animate-spin' />
              ) : null}
              Actualizar cliente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TabsContent>
  );
}
