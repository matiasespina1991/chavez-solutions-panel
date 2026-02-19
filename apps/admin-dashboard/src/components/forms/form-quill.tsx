'use client';

import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import { FieldPath, FieldValues } from 'react-hook-form';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { BaseFormFieldProps } from '@/types/base-form';
import { toast } from 'sonner';

type SelectionRange = { index: number; length: number } | null;
type QuillModules = Record<string, unknown>;
type RefValue<T> = { current: T };

interface FormQuillProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> extends BaseFormFieldProps<TFieldValues, TName> {
  placeholder?: string;
  height?: number;
  onRequestImage?: (insertImage: (url: string) => void) => void;
}

function FormQuill<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  control,
  name,
  label,
  description,
  required,
  placeholder,
  height = 490,
  disabled,
  onRequestImage,
  className
}: FormQuillProps<TFieldValues, TName>) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const quillRef = useRef<Quill | null>(null);
  const lastHtmlRef = useRef<string>('');
  const onChangeRef = useRef<(value: string) => void>(() => {});
  const onBlurRef = useRef<() => void>(() => {});
  const disabledRef = useRef<boolean>(false);
  const placeholderRef = useRef<string | undefined>(undefined);

  const insertImage = useCallback((url: string) => {
    const quill = quillRef.current;
    if (!quill) return;
    const range = quill.getSelection(true);
    const insertAt = range?.index ?? quill.getLength();
    quill.insertEmbed(insertAt, 'image', url, 'user');
    quill.setSelection(insertAt + 1, 0);
  }, []);

  const handleImageRequest = useCallback(() => {
    if (disabledRef.current) return;
    if (!onRequestImage) {
      toast.error('No hay galería configurada.');
      return;
    }
    onRequestImage(insertImage);
  }, [onRequestImage, insertImage]);

  const modules = useMemo(
    () => ({
      toolbar: {
        container: [
          [
            {
              header: [1, 2, 3, 4, 5, 6, false]
            }
          ],
          ['bold', 'italic', 'underline'],
          [{ list: 'ordered' }, { list: 'bullet' }],
          ['link', 'image'],
          ['clean']
        ],
        handlers: {
          image: handleImageRequest
        }
      }
    }),
    [handleImageRequest]
  );

  const formats = useMemo(
    () => ['header', 'bold', 'italic', 'underline', 'list', 'link', 'image'],
    []
  );
  const modulesRef = useRef<QuillModules>(modules);
  const formatsRef = useRef<string[]>(formats);

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        onChangeRef.current = (value: string) => field.onChange(value);
        onBlurRef.current = () => field.onBlur();
        disabledRef.current = Boolean(disabled);
        placeholderRef.current = placeholder;
        modulesRef.current = modules;
        formatsRef.current = formats;

        return (
          <FormItem className={className}>
            {label && (
              <FormLabel>
                {label}
                {required && <span className='text-red-500'>*</span>}
              </FormLabel>
            )}
            <FormControl>
              <div className='quill-editor sm:pb-0' style={{ height }}>
                <div ref={editorRef} />
              </div>
            </FormControl>
            {description && <FormDescription>{description}</FormDescription>}
            <FormMessage />
            <style jsx global>{`
              .quill-editor {
                display: flex;
                flex-direction: column;
              }

              .quill-editor .ql-editor p {
                font-size: 0.95rem;
              }
              .quill-editor .ql-toolbar {
                border-radius: 0.5rem 0.5rem 0 0;
              }
              .quill-editor .ql-container {
                flex: 1 1 auto;
                border-radius: 0 0 0.5rem 0.5rem;
              }
              .quill-editor .ql-editor {
                min-height: 100%;
              }
              .dark .quill-editor .ql-toolbar,
              .dark .quill-editor .ql-container {
                border-color: rgba(255, 255, 255, 0.15);
              }
              .dark .quill-editor .ql-toolbar .ql-stroke {
                stroke: rgba(255, 255, 255, 0.8);
              }
              .dark .quill-editor .ql-toolbar .ql-fill {
                fill: rgba(255, 255, 255, 0.8);
              }
              .dark .quill-editor .ql-toolbar .ql-picker {
                color: rgba(255, 255, 255, 0.85);
              }
              .dark .quill-editor .ql-toolbar .ql-picker-options {
                background: #1b1b1b;
                border-color: rgba(255, 255, 255, 0.2);
              }
              .dark .quill-editor .ql-toolbar .ql-picker-label {
                color: rgba(255, 255, 255, 0.85);
              }
              .dark .quill-editor .ql-editor.ql-blank::before {
                color: rgba(255, 255, 255, 0.55);
              }
            `}</style>
            <QuillController
              editorRef={editorRef}
              quillRef={quillRef}
              lastHtmlRef={lastHtmlRef}
              value={field.value ?? ''}
              onChangeRef={onChangeRef}
              onBlurRef={onBlurRef}
              disabledRef={disabledRef}
              disabled={Boolean(disabled)}
              placeholderRef={placeholderRef}
              modulesRef={modulesRef}
              formatsRef={formatsRef}
            />
          </FormItem>
        );
      }}
    />
  );
}

export { FormQuill };

function QuillController({
  editorRef,
  quillRef,
  lastHtmlRef,
  value,
  onChangeRef,
  onBlurRef,
  disabledRef,
  disabled,
  placeholderRef,
  modulesRef,
  formatsRef
}: {
  editorRef: RefValue<HTMLDivElement | null>;
  quillRef: RefValue<Quill | null>;
  lastHtmlRef: RefValue<string>;
  value: string;
  onChangeRef: RefValue<(value: string) => void>;
  onBlurRef: RefValue<() => void>;
  disabledRef: RefValue<boolean>;
  disabled: boolean;
  placeholderRef: RefValue<string | undefined>;
  modulesRef: RefValue<QuillModules>;
  formatsRef: RefValue<string[]>;
}) {
  useEffect(() => {
    if (!editorRef.current || quillRef.current) return;

    const host = editorRef.current;
    const hostParent = host.parentElement;
    if (hostParent) {
      hostParent
        .querySelectorAll('.ql-toolbar')
        .forEach((toolbar) => toolbar.remove());
    }
    host.innerHTML = '';

    const quill = new Quill(host, {
      theme: 'snow',
      modules: modulesRef.current,
      formats: formatsRef.current,
      placeholder: placeholderRef.current,
      readOnly: disabledRef.current
    });

    quill.root.innerHTML = value;
    lastHtmlRef.current = value;

    const handleTextChange = (
      _delta: unknown,
      _oldDelta: unknown,
      source: 'api' | 'user' | 'silent'
    ) => {
      if (source !== 'user') return;
      const html = quill.root.innerHTML;
      const normalized = html === '<p><br></p>' ? '' : html;
      lastHtmlRef.current = normalized;
      onChangeRef.current(normalized);
    };

    const handleSelectionChange = (
      range: SelectionRange,
      oldRange: SelectionRange
    ) => {
      if (oldRange && !range) onBlurRef.current();
    };

    quill.on('text-change', handleTextChange);
    quill.on('selection-change', handleSelectionChange);
    quillRef.current = quill;

    return () => {
      quill.off('text-change', handleTextChange);
      quill.off('selection-change', handleSelectionChange);
      quillRef.current = null;
      if (hostParent) {
        hostParent
          .querySelectorAll('.ql-toolbar')
          .forEach((toolbar) => toolbar.remove());
      }
      host.innerHTML = '';
    };
  }, [
    editorRef,
    quillRef,
    lastHtmlRef,
    onChangeRef,
    onBlurRef,
    disabledRef,
    placeholderRef,
    modulesRef,
    formatsRef
  ]);

  useEffect(() => {
    const quill = quillRef.current;
    if (!quill) return;
    quill.enable(!disabled);
  }, [disabled, quillRef]);

  useEffect(() => {
    const quill = quillRef.current;
    if (!quill) return;
    if (value === lastHtmlRef.current) return;
    const selection = quill.getSelection();
    quill.clipboard.dangerouslyPasteHTML(value);
    if (selection) {
      quill.setSelection(selection);
    }
  }, [value, quillRef, lastHtmlRef]);

  return null;
}
