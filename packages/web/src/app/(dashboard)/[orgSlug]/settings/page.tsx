// SPDX-License-Identifier: AGPL-3.0
"use client";

import { use, useState, useMemo } from "react";
import { Users, Shield, Key, Palette, CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useOrganizations, useOrganization, useOrgMembers } from "@/lib/hooks/useOrganizations";

const ROLE_COLORS: Record<string, string> = {
  owner: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  admin: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  member: "bg-muted text-muted-foreground",
};

export default function OrgSettingsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  const { organizations } = useOrganizations();
  const org = useMemo(
    () => organizations.find((o) => o.slug === orgSlug),
    [organizations, orgSlug]
  );
  const { organization, updateOrg } = useOrganization(org?.id);
  const { members, isLoading: membersLoading } = useOrgMembers(org?.id);

  const [orgName, setOrgName] = useState("");

  // Sync org name when loaded
  const displayName = orgName || organization?.name || "";

  return (
    <div className="flex-1 overflow-auto">
      <div className="border-b border-border px-6 py-4">
        <h1 className="text-2xl font-bold">Organization Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage members, API keys, and organization preferences.
        </p>
      </div>

      <div className="p-6">
        <Tabs defaultValue="general" className="space-y-6">
          <TabsList>
            <TabsTrigger value="general">
              <Palette className="mr-1.5 h-3.5 w-3.5" /> General
            </TabsTrigger>
            <TabsTrigger value="members">
              <Users className="mr-1.5 h-3.5 w-3.5" /> Members
            </TabsTrigger>
            <TabsTrigger value="api-keys">
              <Key className="mr-1.5 h-3.5 w-3.5" /> API Keys
            </TabsTrigger>
            <TabsTrigger value="security">
              <Shield className="mr-1.5 h-3.5 w-3.5" /> Security
            </TabsTrigger>
            <TabsTrigger value="billing">
              <CreditCard className="mr-1.5 h-3.5 w-3.5" /> Billing
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Organization Name</CardTitle>
                <CardDescription>
                  This is your organization&apos;s display name.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="max-w-md space-y-2">
                  <Label htmlFor="org-name">Name</Label>
                  <Input
                    id="org-name"
                    value={displayName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="My Organization"
                  />
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    if (orgName) updateOrg({ name: orgName });
                  }}
                >
                  Save
                </Button>
              </CardContent>
            </Card>

            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="text-base text-destructive">
                  Danger Zone
                </CardTitle>
                <CardDescription>
                  Irreversible actions for this organization.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="destructive" size="sm">
                  Delete Organization
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="members" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Team Members</CardTitle>
                    <CardDescription>
                      Manage who has access to this organization.
                    </CardDescription>
                  </div>
                  <Button size="sm">Invite Member</Button>
                </div>
              </CardHeader>
              <CardContent>
                {membersLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : members.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No members yet. Invite team members to collaborate.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between rounded-lg border border-border p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{member.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {member.email}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant="secondary"
                          className={cn(ROLE_COLORS[member.role] ?? ROLE_COLORS.member)}
                        >
                          {member.role}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="api-keys" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">API Keys</CardTitle>
                    <CardDescription>
                      Manage API keys for the Validator feedback endpoint and
                      other integrations.
                    </CardDescription>
                  </div>
                  <Button size="sm">Create Key</Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No API keys yet. Create one for the Validator feedback
                  ingestion API.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Authentication Settings
                </CardTitle>
                <CardDescription>
                  Configure authentication and security policies.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">
                      Require Two-Factor Authentication
                    </p>
                    <p className="text-xs text-muted-foreground">
                      All members must enable 2FA to access the organization.
                    </p>
                  </div>
                  <Badge variant="outline">Coming soon</Badge>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">SSO / SAML</p>
                    <p className="text-xs text-muted-foreground">
                      Configure single sign-on for your organization.
                    </p>
                  </div>
                  <Badge variant="outline">Coming soon</Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="billing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Plan & Billing</CardTitle>
                <CardDescription>
                  OpenFactory is open source and free to self-host.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Community Edition</p>
                      <p className="text-xs text-muted-foreground">
                        Self-hosted, unlimited projects and members.
                      </p>
                    </div>
                    <Badge variant="secondary">Active</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
