// apps/site/components/AuthorBox.tsx

export type Author = {
  id: string;
  name: string;
  bio?: string;
  avatarUrl?: string; // z. B. "/authors/anna.jpg" (liegt unter apps/site/public/authors)
};

type Props = { author: Author };

export function AuthorBox({ author }: Props) {
  if (!author) return null;

  // Bild nur nutzen, wenn avatarUrl nicht leer ist
  const hasAvatar = !!(author.avatarUrl && author.avatarUrl.trim().length > 0);

  // Fallback-Initialen, falls kein Bild vorhanden
  const initials =
    author.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "A";

  return (
    <aside className="author-box" aria-label={`Autor: ${author.name}`}>
      {hasAvatar ? (
        // <img> statt next/image => keine Domain-Whitelist nötig
        <img
          src={author.avatarUrl}
          alt={author.name}
          width={72}
          height={72}
          loading="lazy"
        />
      ) : (
        <div
          className="author-box__avatar-fallback"
          aria-hidden="true"
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#f3f4f6",
            color: "#111",
            fontWeight: 700,
          }}
        >
          {initials}
        </div>
      )}

      <div className="author-info">
        <div className="author-name">{author.name}</div>
        {author.bio && <div className="author-bio">{author.bio}</div>}
      </div>
    </aside>
  );
}

export default AuthorBox;
