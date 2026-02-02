// SPDX-License-Identifier: AGPL-3.0
import Link from "next/link";

export default function ForgotPasswordPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold">Reset your password</h2>
        <p className="text-sm text-muted-foreground">
          Enter your email to receive a password reset link
        </p>
      </div>
      <form className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            className="rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Send reset link
        </button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        Remember your password?{" "}
        <Link href="/signin" className="font-medium text-foreground hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
