// app/about-authors/page.tsx
import { getSiteConfig } from "@/lib/site-config";
import Image from "next/image";

export const metadata = {
  title: "Autoren – Garden Hero",
  description:
    "Die digitalen Stimmen hinter Garden Hero: warm, praxisnah und transparent KI-gestützt.",
  openGraph: {
    title: "Autoren – Garden Hero",
    description:
      "Lerne die digitalen Stimmen hinter Garden Hero kennen – authentisch und naturverbunden.",
    type: "website",
    url: "/about-authors",
  },
};

type Author = {
  id: string;
  name: string;
  bio?: string;
  avatarUrl?: string;
};

function normalizeAuthors(raw: unknown): Author[] {
  if (Array.isArray(raw)) return raw as Author[];
  if (raw && typeof raw === "object") return Object.values(raw as Record<string, Author>);
  return [];
}

function resolveAvatar(a: Author) {
  if (a.avatarUrl && a.avatarUrl.startsWith("/")) return a.avatarUrl;
  return `/authors/${a.id}.png`;
}

export default async function AboutAuthorsPage() {
  const cfg = await getSiteConfig();
  const authors = normalizeAuthors((cfg as any).authors);

  return (
    <section className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-10 text-center text-green-800">
        Unsere Autorinnen & Autoren
      </h1>

      {authors.length === 0 ? (
        <p className="text-neutral-600 text-center">
          Aktuell sind keine Autoren hinterlegt.
        </p>
      ) : (
        <div className="space-y-12">
          {authors.map((a, idx) => {
            const src = resolveAvatar(a) || "/authors/_fallback.png";
            return (
              <article
                key={a.id}
                className="bg-white border border-neutral-200 rounded-xl p-6 shadow-sm hover:shadow-md transition"
              >
                <h2 className="text-xl font-semibold text-green-800 mb-5 text-center sm:text-left underline underline-offset-4 decoration-green-400">
                  {a.name}
                </h2>

                <div className="flex flex-col sm:flex-row sm:items-start gap-5">
                  <div className="flex-shrink-0 mx-auto sm:mx-0">
                    <Image
                      src={src}
                      alt={a.name}
                      width={120}
                      height={120}
                      className="rounded-full object-cover ring-1 ring-neutral-200"
                      sizes="120px"
                      priority
                    />
                  </div>

                  <p className="text-neutral-700 leading-relaxed text-center sm:text-left">
                    {a.bio || (
                      <span className="italic text-neutral-500">
                        Beschreibung folgt in Kürze.
                      </span>
                    )}
                  </p>
                </div>

                {/* Hübscher Trenner */}
                {idx < authors.length - 1 && (
                  <div className="mt-8 flex justify-center">
                    <div className="w-1/2 h-px bg-gradient-to-r from-transparent via-green-400 to-transparent opacity-60"></div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
