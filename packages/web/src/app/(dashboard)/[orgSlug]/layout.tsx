// SPDX-License-Identifier: AGPL-3.0
import { Header } from "@/components/layout/header";

export default async function OrgLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}>) {
  const { orgSlug } = await params;
  return (
    <div className="flex min-h-screen flex-col">
      <Header orgSlug={orgSlug} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
