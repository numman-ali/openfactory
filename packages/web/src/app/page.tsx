// SPDX-License-Identifier: AGPL-3.0
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <div className="flex flex-col items-center gap-4">
        <h1 className="text-4xl font-bold tracking-tight">OpenFactory</h1>
        <p className="max-w-md text-center text-muted-foreground">
          AI-native SDLC orchestration platform. From requirements to
          architecture to tasks to feedback — connected through a knowledge
          graph.
        </p>
      </div>
      <div className="flex gap-4">
        <Link
          href="/signin"
          className="rounded-lg border border-border px-6 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
        >
          Sign In
        </Link>
        <Link
          href="/signup"
          className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Get Started
        </Link>
      </div>
    </div>
  );
}
