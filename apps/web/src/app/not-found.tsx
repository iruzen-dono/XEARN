import Link from 'next/link';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-8xl font-bold gradient-text mb-4">404</div>
        <h1 className="text-2xl font-bold mb-3">Page introuvable</h1>
        <p className="text-dark-400 mb-6">
          La page que vous recherchez n&apos;existe pas ou a été déplacée.
        </p>
        <Link href="/" className="btn-primary inline-block px-6 py-2">
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
