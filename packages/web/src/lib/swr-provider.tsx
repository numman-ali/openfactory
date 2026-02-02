// SPDX-License-Identifier: AGPL-3.0
"use client";

import { SWRConfig } from "swr";
import { swrFetcher } from "@/lib/api-client";

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher: swrFetcher,
        revalidateOnFocus: false,
        shouldRetryOnError: false,
      }}
    >
      {children}
    </SWRConfig>
  );
}
