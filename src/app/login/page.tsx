import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login } from "@/app/actions";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function LoginPage({ searchParams }: Props) {
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : null;
  const next = typeof sp.next === "string" ? sp.next : "/";

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center">
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <header className="mb-5">
          <h1 className="text-xl font-semibold tracking-tight">coach</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Password-gated. Enter the password to continue.
          </p>
        </header>

        <form action={login} className="space-y-4">
          <input type="hidden" name="next" value={next} />
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              autoFocus
            />
          </div>

          {error === "wrong" ? (
            <p className="text-xs text-red-600">That's not the password. Try again.</p>
          ) : null}
          {error === "invalid" ? (
            <p className="text-xs text-red-600">Invalid form submission.</p>
          ) : null}

          <Button type="submit" className="w-full">
            Enter
          </Button>
        </form>
      </div>
    </div>
  );
}
