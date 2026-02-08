// ============================================
// Interface de fournisseur de paiement
// Abstraction pour supporter mock, FedaPay, etc.
// ============================================

export interface PaymentCollectionRequest {
  /** Montant en FCFA */
  amount: number;
  /** Description du paiement */
  description: string;
  /** Email du client */
  customerEmail?: string;
  /** Nom du client */
  customerName?: string;
  /** Téléphone du client */
  customerPhone?: string;
  /** Identifiant interne (userId, transactionId, etc.) */
  callbackMeta?: Record<string, string>;
}

export interface PaymentCollectionResult {
  /** Succès immédiat (mock) ou en attente (redirect) */
  status: 'completed' | 'pending' | 'failed';
  /** ID de la transaction chez le provider */
  providerTransactionId?: string;
  /** URL de paiement (pour redirect) */
  paymentUrl?: string;
  /** Message lisible */
  message: string;
}

export interface PaymentDisbursementRequest {
  /** Montant en FCFA */
  amount: number;
  /** Méthode (mtn_momo, flooz, tmoney, orange_money, etc.) */
  method: string;
  /** Numéro de téléphone ou info de compte */
  accountInfo: string;
  /** Nom du bénéficiaire */
  recipientName?: string;
  /** Métadonnées pour le callback */
  callbackMeta?: Record<string, string>;
}

export interface PaymentDisbursementResult {
  status: 'completed' | 'pending' | 'failed';
  providerTransactionId?: string;
  message: string;
}

export interface PaymentProvider {
  /** Nom du provider */
  readonly name: string;

  /**
   * Collecter de l'argent (activation de compte, etc.)
   * Retourne une URL de paiement ou un statut immédiat
   */
  collect(request: PaymentCollectionRequest): Promise<PaymentCollectionResult>;

  /**
   * Envoyer de l'argent (retraits)
   */
  disburse(request: PaymentDisbursementRequest): Promise<PaymentDisbursementResult>;

  /**
   * Vérifier le statut d'une transaction
   */
  checkStatus(providerTransactionId: string): Promise<'completed' | 'pending' | 'failed'>;
}
