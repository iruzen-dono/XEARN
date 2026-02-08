'use client';

export default function AdminTransactionsPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">Transactions</h1>
      <p className="text-dark-400 mb-8">Suivi de toutes les transactions</p>

      <div className="card overflow-hidden p-0">
        <table className="w-full">
          <thead>
            <tr className="border-b border-dark-700">
              <th className="text-left text-dark-400 text-sm font-medium p-4">Utilisateur</th>
              <th className="text-left text-dark-400 text-sm font-medium p-4">Type</th>
              <th className="text-left text-dark-400 text-sm font-medium p-4">Montant</th>
              <th className="text-left text-dark-400 text-sm font-medium p-4">Statut</th>
              <th className="text-left text-dark-400 text-sm font-medium p-4">Date</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={5} className="text-center text-dark-400 py-12">
                Aucune transaction pour le moment.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
