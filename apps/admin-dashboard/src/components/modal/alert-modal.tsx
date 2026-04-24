'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}

export const AlertModal: React.FC<AlertModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  loading
}) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  return (
    <Modal
      title='¿Eliminar exhibición?'
      description='Esta acción no se puede deshacer.'
      isOpen={isOpen}
      onClose={onClose}
    >
      <div className='flex w-full items-center justify-end space-x-2 pt-6'>
        <Button
          disabled={loading}
          variant='outline'
          className='cursor-pointer'
          onClick={(event) => {
            event.stopPropagation();
            onClose();
          }}
        >
          Cancelar
        </Button>
        <Button
          disabled={loading}
          variant='destructive'
          className='cursor-pointer'
          onClick={(event) => {
            event.stopPropagation();
            onConfirm();
          }}
        >
          Eliminar
        </Button>
      </div>
    </Modal>
  );
};
