import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ✅ SUPPRIMÉ: ignoreBuildErrors (dangereux pour la production)
  // TypeScript errors should be fixed, not ignored
  
  // ✅ AJOUTÉ: Optimisation pour Vercel
  output: 'standalone',
  
  // ✅ AJOUTÉ: Configuration images (Supabase storage)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
  
  // ✅ AJOUTÉ: Headers de sécurité
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
