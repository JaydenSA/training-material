import type { Metadata } from 'next';
import { DemoProvider } from '@/components/demo-provider';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';
export const metadata: Metadata = { title: { default: 'Tipit — A little thanks goes a long way', template: '%s | Tipit' }, description: 'Simple cashless tipping and employee appreciation for restaurants.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const content = <html lang="en"><body><DemoProvider>{children}</DemoProvider></body></html>;
  return process.env.NEXT_PUBLIC_AUTH_MODE === 'clerk' && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY ? <ClerkProvider>{content}</ClerkProvider> : content;
}
