import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentService } from '../payment/payment.service';

/**
 * MAJEUR FIX #3: Service de vérification de solvabilité plateforme
 *
 * Vérifie que la plateforme dispose de fonds suffisants pour honorer les retraits.
 * Empêche un "bank run" où les premiers utilisateurs vident le compte FedaPay.
 */
@Injectable()
export class PlatformBalanceService {
  private readonly logger = new Logger(PlatformBalanceService.name);

  constructor(
    private prisma: PrismaService,
    private paymentService: PaymentService,
    private configService: ConfigService,
  ) {}

  /**
   * Vérifie la solvabilité de la plateforme.
   *
   * @returns {solvent: boolean, deficit: Decimal, liabilities: Decimal, assets: Decimal}
   */
  async checkSolvency(): Promise<{
    solvent: boolean;
    deficit: Decimal;
    liabilities: Decimal;
    assets: Decimal;
  }> {
    try {
      // 1. Calculer le total des soldes utilisateurs (passif)
      const totalUserBalances = await this.prisma.wallet.aggregate({
        _sum: { balance: true },
      });

      const liabilities = new Decimal(String(totalUserBalances._sum.balance || 0));

      // 2. Obtenir le solde FedaPay (actif)
      let assets: Decimal;
      try {
        const provider = this.paymentService.getProvider();
        if (provider.name === 'fedapay') {
          // FedaPay API pour obtenir le solde du compte marchand
          const balance = await this.getFedaPayBalance();
          assets = new Decimal(balance);
        } else {
          // Mode développement: on suppose que la plateforme est solvable
          this.logger.warn('Mode MockProvider - vérification solvabilité désactivée');
          return {
            solvent: true,
            deficit: new Decimal(0),
            liabilities,
            assets: liabilities,
          };
        }
      } catch (err) {
        this.logger.error(`Erreur récupération solde FedaPay: ${err}`);
        // En cas d'erreur API, on considère comme solvable pour ne pas bloquer les retraits
        // (l'admin doit être alerté par monitoring)
        return {
          solvent: true,
          deficit: new Decimal(0),
          liabilities,
          assets: liabilities,
        };
      }

      // 3. Calculer le déficit (si liabilities > assets)
      const deficit = liabilities.minus(assets);
      const solvent = deficit.lessThanOrEqualTo(0);

      if (!solvent) {
        this.logger.error(
          `🚨 PLATEFORME INSOLVABLE: Passif ${liabilities} FCFA > Actif ${assets} FCFA - Déficit: ${deficit} FCFA`,
        );
      }

      return {
        solvent,
        deficit: deficit.greaterThan(0) ? deficit : new Decimal(0),
        liabilities,
        assets,
      };
    } catch (error) {
      this.logger.error(`Erreur vérification solvabilité: ${error}`);
      throw error;
    }
  }

  /**
   * Vérifie si la plateforme peut traiter un retrait spécifique.
   *
   * @param amount Montant brut du retrait (avant frais)
   * @returns true si le retrait peut être traité, false sinon
   */
  async canProcessWithdrawal(amount: Decimal): Promise<boolean> {
    try {
      const { solvent, deficit } = await this.checkSolvency();

      if (!solvent) {
        this.logger.error(
          `🚨 Retrait de ${amount} FCFA refusé - Plateforme insolvable (déficit: ${deficit} FCFA)`,
        );
        // TODO: Alerter l'admin (email, Slack, Sentry)
        return false;
      }

      return true;
    } catch (error) {
      // En cas d'erreur de vérification, on autorise le retrait (fail-open)
      // pour ne pas bloquer les utilisateurs si l'API FedaPay est down
      this.logger.warn(`Erreur vérification retrait - autorisation par défaut: ${error}`);
      return true;
    }
  }

  /**
   * Obtient le solde du compte marchand FedaPay.
   *
   * @returns Solde en FCFA
   */
  private async getFedaPayBalance(): Promise<number> {
    // TODO: Implémenter l'appel API FedaPay pour récupérer le solde du compte marchand
    // Endpoint probable: GET https://api.fedapay.com/v1/accounts/{account_id}/balance
    // Nécessite token API avec scope 'read:balance'

    const fedapaySecretKey = this.configService.get('FEDAPAY_SECRET_KEY');
    if (!fedapaySecretKey) {
      throw new Error('FEDAPAY_SECRET_KEY non configuré');
    }

    // Placeholder: en production, faire l'appel API réel
    // const response = await fetch('https://api.fedapay.com/v1/accounts/me/balance', {
    //   headers: { Authorization: `Bearer ${fedapaySecretKey}` },
    // });
    // const data = await response.json();
    // return data.available_balance;

    this.logger.warn('getFedaPayBalance non implémenté - retour 0');
    return 0;
  }

  /**
   * Génère un rapport de solvabilité pour l'admin.
   */
  async getSolvencyReport() {
    const { solvent, deficit, liabilities, assets } = await this.checkSolvency();

    return {
      solvent,
      deficit: Number(deficit),
      liabilities: Number(liabilities),
      assets: Number(assets),
      timestamp: new Date().toISOString(),
      status: solvent ? 'HEALTHY' : 'CRITICAL',
    };
  }
}
