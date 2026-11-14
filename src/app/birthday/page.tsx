import { Suspense } from "react";
import { BirthdayForm } from "./BirthdayForm";

export default function BirthdayPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Suspense>
        <BirthdayForm />
      </Suspense>
    </main>
  );
}
