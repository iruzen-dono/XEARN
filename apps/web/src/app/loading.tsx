export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin w-10 h-10 border-2 border-primary-400 border-t-transparent rounded-full" />
        <p className="text-dark-400 text-sm">Chargement...</p>
      </div>
    </div>
  );
}
