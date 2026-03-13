// apps/site/components/article-templates.tsx
import { AuthorBox, type Author } from "@/components/AuthorBox";
import type { PageType } from "@/lib/page-types";

type ArticleTemplateProps = {
  pageType: PageType;
  html: string;
  category?: string;
  description?: string;
  author: Author;
};

type BaseArticleTemplateProps = {
  label: string;
  pageType: PageType;
  html: string;
  category?: string;
  description?: string;
  author: Author;
  introSlot?: React.ReactNode;
};

function BaseArticleTemplate({
  label,
  pageType,
  html,
  category,
  description,
  author,
  introSlot,
}: BaseArticleTemplateProps) {
  return (
    <article className="content" data-page-type={pageType}>
      <div
        style={{
          margin: "0 0 1rem",
          display: "flex",
          flexWrap: "wrap",
          gap: ".75rem",
          alignItems: "center",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            borderRadius: "999px",
            padding: ".4rem .75rem",
            fontSize: ".8rem",
            fontWeight: 700,
            background: "var(--brand-secondary, #f3f4f6)",
            color: "var(--brand-primary, #111827)",
          }}
        >
          {label}
        </span>

        {category && (
          <span style={{ fontSize: ".9rem", opacity: 0.72 }}>
            Kategorie: {category}
          </span>
        )}
      </div>

      {introSlot}

      {!introSlot && description && (
        <div
          style={{
            margin: "0 0 1rem",
            padding: "1rem 1.1rem",
            borderRadius: "14px",
            background: "var(--brand-secondary, #f9fafb)",
            border: "1px solid rgba(0,0,0,0.08)",
          }}
        >
          <p style={{ margin: 0, lineHeight: 1.6 }}>{description}</p>
        </div>
      )}

      <div dangerouslySetInnerHTML={{ __html: html }} />

      <AuthorBox author={author} />

      <p style={{ marginTop: ".75rem" }}>
        <a href="/about-authors">Alle Autoren ansehen →</a>
      </p>

      <style
        dangerouslySetInnerHTML={{
          __html: `
            .content a { text-decoration: underline; }
            .content a:hover { text-decoration: underline; }
            .bestof-intro-grid {
              display: grid;
              grid-template-columns: 1.2fr .8fr;
              gap: 1rem;
              margin: 0 0 1.25rem;
            }
            .bestof-intro-card {
              border: 1px solid rgba(0,0,0,0.08);
              border-radius: 16px;
              padding: 1rem 1.1rem;
              background: var(--brand-secondary, #f9fafb);
            }
            .bestof-intro-card h2,
            .bestof-intro-card h3 {
              margin-top: 0;
            }
            .bestof-checklist {
              margin: .75rem 0 0;
              padding-left: 1.1rem;
            }
            .bestof-checklist li + li {
              margin-top: .45rem;
            }
            @media (max-width: 840px) {
              .bestof-intro-grid {
                grid-template-columns: 1fr;
              }
            }
          `,
        }}
      />
    </article>
  );
}

function BestOfTemplate({
  html,
  category,
  description,
  author,
}: Omit<ArticleTemplateProps, "pageType">) {
  const introSlot = (
    <div className="bestof-intro-grid">
      <div className="bestof-intro-card">
        <h2 style={{ marginBottom: ".65rem" }}>Schnelle Einordnung</h2>
        <p style={{ margin: 0, lineHeight: 1.65 }}>
          {description?.trim() ||
            "Diese Seite bündelt mehrere Empfehlungen und hilft dir, schneller die passende Auswahl für deinen Einsatzbereich zu finden."}
        </p>
      </div>

      <aside className="bestof-intro-card" aria-label="Orientierung">
        <h3 style={{ marginBottom: ".65rem" }}>Diese Best-of-Seite ist sinnvoll, wenn du …</h3>
        <ul className="bestof-checklist">
          <li>nicht alle Produkte einzeln vergleichen willst</li>
          <li>eine schnelle Vorauswahl brauchst</li>
          <li>Stärken und Schwächen direkt nebeneinander sehen willst</li>
        </ul>
      </aside>
    </div>
  );

  return (
    <BaseArticleTemplate
      label="Best-of"
      pageType="best-of"
      html={html}
      category={category}
      description={description}
      author={author}
      introSlot={introSlot}
    />
  );
}

function EinzelproduktTemplate(props: Omit<ArticleTemplateProps, "pageType">) {
  return (
    <BaseArticleTemplate
      {...props}
      pageType="einzelprodukt"
      label="Einzelprodukt"
    />
  );
}

function MarkeTemplate(props: Omit<ArticleTemplateProps, "pageType">) {
  return (
    <BaseArticleTemplate
      {...props}
      pageType="marke"
      label="Marke"
    />
  );
}

function EigenschaftenTemplate(props: Omit<ArticleTemplateProps, "pageType">) {
  return (
    <BaseArticleTemplate
      {...props}
      pageType="eigenschaften"
      label="Eigenschaften"
    />
  );
}

function RatgeberTemplate(props: Omit<ArticleTemplateProps, "pageType">) {
  return (
    <BaseArticleTemplate
      {...props}
      pageType="ratgeber"
      label="Ratgeber"
    />
  );
}

function ZubehoerTemplate(props: Omit<ArticleTemplateProps, "pageType">) {
  return (
    <BaseArticleTemplate
      {...props}
      pageType="zubehoer"
      label="Zubehör"
    />
  );
}

export function ArticleTemplateResolver({
  pageType,
  html,
  category,
  description,
  author,
}: ArticleTemplateProps) {
  switch (pageType) {
    case "best-of":
      return (
        <BestOfTemplate
          html={html}
          category={category}
          description={description}
          author={author}
        />
      );
    case "einzelprodukt":
      return (
        <EinzelproduktTemplate
          html={html}
          category={category}
          description={description}
          author={author}
        />
      );
    case "marke":
      return (
        <MarkeTemplate
          html={html}
          category={category}
          description={description}
          author={author}
        />
      );
    case "eigenschaften":
      return (
        <EigenschaftenTemplate
          html={html}
          category={category}
          description={description}
          author={author}
        />
      );
    case "zubehoer":
      return (
        <ZubehoerTemplate
          html={html}
          category={category}
          description={description}
          author={author}
        />
      );
    case "ratgeber":
    default:
      return (
        <RatgeberTemplate
          html={html}
          category={category}
          description={description}
          author={author}
        />
      );
  }
}