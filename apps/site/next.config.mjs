/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: { allowedOrigins: ["*"] },

    // ⬇️ sorgt dafür, dass Vercel beim Build auch den sites/-Ordner mitnimmt
    outputFileTracingIncludes: {
      // Alle Server-Komponenten, API-Routen etc. dürfen auf den Content zugreifen
      "app/**": ["sites/**"],
      "pages/**": ["sites/**"], // falls irgendwo Pages Router noch genutzt wird
    },
  },

  // ⬇️ Lint/Typecheck im Build überspringen (nur zum Eingrenzen benutzen!)
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  // Falls Monorepo/Workspace-Pakete genutzt werden:
  transpilePackages: ["@jinge/integrations"],

	images: {
	  remotePatterns: [
		{ protocol: "https", hostname: "m.media-amazon.com" },
		{ protocol: "https", hostname: "images-na.ssl-images-amazon.com" },
		// FIX: placeholder host erlauben (sonst next/image runtime error)
		{ protocol: "https", hostname: "via.placeholder.com" },
	  ],
	  formats: ["image/avif", "image/webp"],
	},

};

export default nextConfig;
