"use client";

import { ReactNode } from "react";
import { GeistSans } from "geist/font/sans";

export default function FontWrapper({ children }: { children: ReactNode }) {
  return <div className={GeistSans.variable}>{children}</div>;
}
