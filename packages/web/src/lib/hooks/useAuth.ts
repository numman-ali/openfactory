// SPDX-License-Identifier: AGPL-3.0
"use client";

import useSWR from "swr";
import { useCallback } from "react";
import { api, ApiError, setSessionToken, clearSessionToken } from "@/lib/api-client";

interface SessionUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
}

interface SessionResponse {
  user: SessionUser;
  organizationId: string | null;
  role: string | null;
}

interface SigninResponse {
  user: SessionUser;
  session: { token: string; expiresAt: string };
}

interface SignupResponse {
  user: SessionUser;
  organization: { id: string; name: string; slug: string };
  session: { token: string; expiresAt: string };
}

export function useSession() {
  const { data, error, isLoading, mutate } = useSWR<SessionResponse>(
    "/auth/session"
  );

  return {
    session: data ?? null,
    user: data?.user ?? null,
    isLoading,
    isAuthenticated: !!data?.user,
    error: error instanceof ApiError ? error : null,
    mutate,
  };
}

export function useAuth() {
  const { mutate } = useSession();

  const signin = useCallback(
    async (email: string, password: string) => {
      const result = await api.post<SigninResponse>("/auth/signin", {
        email,
        password,
      });
      setSessionToken(result.session.token);
      await mutate();
      return result;
    },
    [mutate]
  );

  const signup = useCallback(
    async (
      email: string,
      password: string,
      name: string,
      organizationName: string
    ) => {
      const result = await api.post<SignupResponse>("/auth/signup", {
        email,
        password,
        name,
        organizationName,
      });
      setSessionToken(result.session.token);
      await mutate();
      return result;
    },
    [mutate]
  );

  const signout = useCallback(async () => {
    await api.post<undefined>("/auth/signout");
    clearSessionToken();
    await mutate(undefined, { revalidate: false });
  }, [mutate]);

  return { signin, signup, signout };
}
