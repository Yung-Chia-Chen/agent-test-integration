'use client';

import React from 'react';

interface AuthFormProps {
  action: string | ((formData: FormData) => void);
  children: React.ReactNode;
  defaultEmail?: string;
}

export function AuthForm({ action, children, defaultEmail }: AuthFormProps) {
  return (
    <form action={action as any} className="flex flex-col gap-4 px-4 sm:px-16">
      {children}
    </form>
  );
}
