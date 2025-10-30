'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface SubmitButtonProps {
  children: React.ReactNode;
  isSuccessful?: boolean;
}

export function SubmitButton({ children, isSuccessful }: SubmitButtonProps) {
  const [isPending, startTransition] = React.useTransition();

  return (
    <Button
      type="submit"
      disabled={isPending || isSuccessful}
      className="w-full"
    >
      {isPending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading...
        </>
      ) : (
        children
      )}
    </Button>
  );
}
