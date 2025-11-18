import "@/styles/globals.css";
import Kbar from "@/app/mail/components/kbar";
import { ClerkProvider } from "@clerk/nextjs";
import { GeistSans } from "geist/font/sans";
import { type Metadata } from "next";
import { TRPCReactProvider } from "@/trpc/react";
import ThemeProviderWrapper from "@/components/ThemeProviderWrapper";
import { Toaster } from "sonner";
import FontWrapper from "@/components/FontWrapper"; // Client Component

export const metadata: Metadata = {
  title: "Normal Human",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={GeistSans.variable}>
      <body>
        <ClerkProvider>
          <FontWrapper>
            <ThemeProviderWrapper
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <TRPCReactProvider>
                <Kbar>{children}</Kbar>
              </TRPCReactProvider>
              <Toaster />
            </ThemeProviderWrapper>
          </FontWrapper>
        </ClerkProvider>
      </body>
    </html>
  );
}
