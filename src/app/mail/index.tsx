// No 'use client' here
import { Mail } from '@/app/mail/components/mail'
import { cookies } from 'next/headers'

export default async function MailPage() {
  const cookieStore = await cookies();

  const layoutCookie = cookieStore.get("react-resizable-panels:layout:mail");
  const collapsedCookie = cookieStore.get("react-resizable-panels:collapsed");

  const defaultLayout = layoutCookie ? JSON.parse(layoutCookie.value) : undefined;
  const defaultCollapsed = collapsedCookie ? JSON.parse(collapsedCookie.value) : undefined;

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-scroll">
      <Mail
        defaultLayout={defaultLayout}
        defaultCollapsed={defaultCollapsed}
        navCollapsedSize={4}
      />
    </div>
  )
}
