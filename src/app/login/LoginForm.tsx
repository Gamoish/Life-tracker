"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button, Input } from "@/components/ui";
import { login, type LoginState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="primary"
      size="lg"
      disabled={pending}
      className="mt-4 py-3"
    >
      {pending ? "Checking…" : "Unlock"}
    </Button>
  );
}

export default function LoginForm({ next }: { next: string }) {
  const [state, formAction] = useActionState<LoginState, FormData>(login, {});

  return (
    <form action={formAction}>
      <input type="hidden" name="next" value={next} />

      <label htmlFor="password" className="text-sm font-medium">
        Password
      </label>
      <Input
        id="password"
        name="password"
        type="password"
        autoFocus
        autoComplete="current-password"
        className="mt-1.5 py-3 text-base"
      />

      {state.error && (
        <p role="alert" className="mt-2 text-sm text-warn">
          {state.error}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
