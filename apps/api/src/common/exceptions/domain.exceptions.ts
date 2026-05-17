import { HttpException, HttpStatus } from '@nestjs/common';

export abstract class DomainException extends HttpException {
  readonly code: string;

  constructor(message: string, code: string, status: HttpStatus) {
    super({ message, code }, status);
    this.code = code;
  }
}

export class InsufficientBalanceException extends DomainException {
  constructor(available?: number, requested?: number) {
    const detail =
      available !== undefined && requested !== undefined
        ? ` (available: ${available}, requested: ${requested})`
        : '';
    super(`Solde insuffisant${detail}`, 'INSUFFICIENT_BALANCE', HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

export class DailyLimitExceededException extends DomainException {
  constructor(limit: number) {
    super(
      `Limite quotidienne atteinte (${limit})`,
      'DAILY_LIMIT_EXCEEDED',
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

export class SessionExpiredException extends DomainException {
  constructor() {
    super('Session de tâche expirée', 'SESSION_EXPIRED', HttpStatus.GONE);
  }
}

export class SessionLockedException extends DomainException {
  constructor(remainingMs: number) {
    super(
      `Session verrouillée, réessayez dans ${Math.ceil(remainingMs / 1000)}s`,
      'SESSION_LOCKED',
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

export class InvalidVerificationCodeException extends DomainException {
  constructor(attemptsLeft: number) {
    super(
      `Code de vérification invalide (${attemptsLeft} tentatives restantes)`,
      'INVALID_VERIFICATION_CODE',
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}

export class TaskAlreadyCompletedException extends DomainException {
  constructor() {
    super('Tâche déjà complétée', 'TASK_ALREADY_COMPLETED', HttpStatus.CONFLICT);
  }
}

export class AccountNotActivatedException extends DomainException {
  constructor() {
    super('Compte non activé', 'ACCOUNT_NOT_ACTIVATED', HttpStatus.FORBIDDEN);
  }
}

export class WithdrawalMinimumException extends DomainException {
  constructor(minimum: number) {
    super(
      `Montant minimum de retrait: ${minimum} FCFA`,
      'WITHDRAWAL_MINIMUM',
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}

export class DuplicateOperationException extends DomainException {
  constructor(operation: string) {
    super(`Opération déjà effectuée: ${operation}`, 'DUPLICATE_OPERATION', HttpStatus.CONFLICT);
  }
}
