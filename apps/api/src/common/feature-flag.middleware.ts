import { Injectable, NestMiddleware, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class FeatureFlagMiddleware implements NestMiddleware {
  constructor(private config: ConfigService) {}

  use(req: Request, res: Response, next: NextFunction) {
    // Vérifier si le module tâches est désactivé
    if (
      req.path.startsWith('/api/v1/tasks') &&
      this.config.get('FEATURE_TASKS_ENABLED') === 'false'
    ) {
      throw new ServiceUnavailableException(
        'Le module tâches est temporairement désactivé. Merci de réessayer plus tard.',
      );
    }

    // Vérifier si le module publicités est désactivé
    if (req.path.startsWith('/api/v1/ads') && this.config.get('FEATURE_ADS_ENABLED') === 'false') {
      throw new ServiceUnavailableException(
        'Le module publicités est temporairement désactivé. Merci de réessayer plus tard.',
      );
    }

    // Vérifier si le module wallet est désactivé
    if (
      req.path.startsWith('/api/v1/wallet') &&
      this.config.get('FEATURE_WALLET_ENABLED') === 'false'
    ) {
      throw new ServiceUnavailableException(
        'Le module portefeuille est temporairement désactivé. Merci de réessayer plus tard.',
      );
    }

    // Vérifier si le module paiements est désactivé
    if (
      req.path.startsWith('/api/v1/payment') &&
      this.config.get('FEATURE_PAYMENTS_ENABLED') === 'false'
    ) {
      throw new ServiceUnavailableException(
        'Le module paiements est temporairement désactivé. Merci de réessayer plus tard.',
      );
    }

    next();
  }
}
