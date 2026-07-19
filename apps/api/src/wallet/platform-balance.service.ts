import { Injectable, Logger } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentService } from '../payment/payment.service';
import * as Sentry from '@sentry/node';

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
        const balance = await provider.getBalance();
        assets = new Decimal(balance);
      } catch (error) {
        this.logger.warn(
          'Impossible de récupérer le solde du provider — fail-open',
          (error as Error).message,
        );
        // Fail-open: on autorise les retraits même si l'API de solde est down
        assets = new Decimal(Infinity);
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
        Sentry.captureMessage(
          `🚨 RETRAIT REFUSÉ - PLATEFORME INSOLVABLE: ${amount} FCFA | Déficit: ${deficit} FCFA`,
          'fatal',
        );
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
