// SPDX-License-Identifier: AGPL-3.0
"use client";

import { useState } from "react";
import { Users, Shield, Key, Palette, CreditCard } from "lucide-react";
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

interface Member {
  id: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "member";
  joinedAt: string;
}

interface ApiKeyEntry {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt: string | null;
}

const ROLE_COLORS: Record<string, string> = {
  owner: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  admin: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  member: "bg-muted text-muted-foreground",
};

export default function OrgSettingsPage() {
  const [members] = useState<Member[]>([]);
  const [apiKeys] = useState<ApiKeyEntry[]>([]);
  const [orgName, setOrgName] = useState("");

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

          {/* General Settings */}
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
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="My Organization"
                  />
                </div>
                <Button size="sm">Save</Button>
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

          {/* Members */}
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
                {members.length === 0 ? (
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
                          className={cn(ROLE_COLORS[member.role])}
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

          {/* API Keys */}
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
                {apiKeys.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No API keys yet. Create one for the Validator feedback
                    ingestion API.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {apiKeys.map((key) => (
                      <div
                        key={key.id}
                        className="flex items-center justify-between rounded-lg border border-border p-3"
                      >
                        <div>
                          <p className="text-sm font-medium">{key.name}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground font-mono">
                            {key.prefix}...
                          </p>
                          <div className="mt-1 flex gap-1">
                            {key.scopes.map((scope) => (
                              <Badge
                                key={scope}
                                variant="outline"
                                className="text-xs"
                              >
                                {scope}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          <p>Created {key.createdAt}</p>
                          <p>
                            {key.lastUsedAt
                              ? `Last used ${key.lastUsedAt}`
                              : "Never used"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security */}
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

          {/* Billing */}
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
