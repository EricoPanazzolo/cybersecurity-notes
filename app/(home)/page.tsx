import Link from "next/link";
import { baseOptions } from "@/lib/layout.shared";
import { HomeLayout } from "fumadocs-ui/layouts/home";

export default function HomePage() {
  return (
    <HomeLayout {...baseOptions()}>
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-24 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Cybersecurity Personal Notes
        </h1>
        <p className="max-w-xl text-fd-muted-foreground text-lg">
          A personal reference for recon, enumeration, and web-application
          security-testing tools and playbooks.
        </p>
        <Link
          href="/docs"
          className="rounded-full bg-fd-primary px-6 py-3 font-medium text-fd-primary-foreground transition hover:opacity-90"
        >
          Browse the docs
        </Link>
      </main>
    </HomeLayout>
  );
}
