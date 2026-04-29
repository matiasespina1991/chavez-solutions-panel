'use client';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb';
import { useBreadcrumbs } from '@/hooks/use-breadcrumbs';
import { IconSlash } from '@tabler/icons-react';
import { Fragment } from 'react';

export function Breadcrumbs() {
  const items = useBreadcrumbs();
  if (items.length === 0) return null;
  const displayItems = items.filter(
    (item, index) => index === 0 || item.title !== items[index - 1].title
  );

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {displayItems.map((item, index) => (
          <Fragment key={`${item.link}-${index}`}>
            {index !== displayItems.length - 1 && (
              <BreadcrumbItem className='hidden md:block'>
                <BreadcrumbLink href={item.link}>{item.title}</BreadcrumbLink>
              </BreadcrumbItem>
            )}
            {index < displayItems.length - 1 && (
              <BreadcrumbSeparator className='hidden md:block'>
                <IconSlash />
              </BreadcrumbSeparator>
            )}
            {index === displayItems.length - 1 &&
              (displayItems.length === 1 ? (
                <BreadcrumbItem className='hidden md:block'>
                  <BreadcrumbLink href={item.link}>{item.title}</BreadcrumbLink>
                </BreadcrumbItem>
              ) : (
                <BreadcrumbPage>{item.title}</BreadcrumbPage>
              ))}
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
