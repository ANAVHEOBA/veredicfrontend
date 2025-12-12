import { Transaction } from '@mysten/sui/transactions';
import { SuiClient, SuiTransactionBlockResponse } from '@mysten/sui/client';

// =============================================================================
// TYPES
// =============================================================================

export type TransactionStatus = 'idle' | 'signing' | 'executing' | 'confirmed' | 'failed';

export interface TransactionResult<T = unknown> {
  success: boolean;
  digest?: string;
  data?: T;
  error?: TransactionError;
}

export interface TransactionError {
  code: string;
  message: string;
  details?: unknown;
}

/**
 * Response from dApp Kit's signAndExecuteTransaction
 * Can be either the full response or a minimal response with just digest
 */
export interface SignAndExecuteResponse {
  digest: string;
  effects?: any;
  events?: any[];
  objectChanges?: any[];
}

export interface SignAndExecuteFn {
  (input: { transaction: Transaction }): Promise<SignAndExecuteResponse>;
}

// =============================================================================
// ERROR PARSING
// =============================================================================

const MOVE_ERROR_CODES: Record<number, string> = {
  // Market errors
  1: 'Not authorized as admin',
  2: 'Not the market creator',
  3: 'Market not found',
  4: 'Market is not open',
  5: 'Market already resolved',
  6: 'Trading has not ended',
  7: 'Invalid outcome value',
  8: 'End time must be in the future',
  9: 'Question too short (min 10 chars)',
  10: 'Insufficient creation fee',
  11: 'Registry is paused',
};

function parseTransactionError(error: unknown): TransactionError {
  const errorMessage = error instanceof Error ? error.message : String(error);

  // Parse Move abort codes
  const abortMatch = errorMessage.match(/MoveAbort.*?(\d+)/);
  if (abortMatch) {
    const code = parseInt(abortMatch[1], 10);
    return {
      code: `MOVE_ABORT_${code}`,
      message: MOVE_ERROR_CODES[code] || `Transaction failed with code ${code}`,
      details: error,
    };
  }

  // User rejected
  if (errorMessage.includes('rejected') || errorMessage.includes('cancelled')) {
    return {
      code: 'USER_REJECTED',
      message: 'Transaction was rejected',
      details: error,
    };
  }

  // Insufficient funds
  if (errorMessage.includes('insufficient') || errorMessage.includes('balance')) {
    return {
      code: 'INSUFFICIENT_FUNDS',
      message: 'Insufficient balance for transaction',
      details: error,
    };
  }

  // Generic error
  return {
    code: 'TRANSACTION_FAILED',
    message: errorMessage || 'Transaction failed',
    details: error,
  };
}

// =============================================================================
// TRANSACTION SERVICE
// =============================================================================

export class TransactionService {
  constructor(
    private client: SuiClient,
    private signAndExecute: SignAndExecuteFn
  ) {}

  /**
   * Execute a transaction and parse the result
   */
  async execute<T = unknown>(
    transaction: Transaction,
    parser?: (response: SignAndExecuteResponse) => T
  ): Promise<TransactionResult<T>> {
    try {
      const response = await this.signAndExecute({ transaction });

      // Check if transaction succeeded (if effects are available)
      const effects = response.effects;
      if (effects) {
        // effects can be string (raw) or object
        const status =
          typeof effects === 'object' ? effects?.status?.status : undefined;
        if (status === 'failure') {
          const errorMsg =
            (typeof effects === 'object' ? effects?.status?.error : null) ||
            'Transaction failed';
          return {
            success: false,
            digest: response.digest,
            error: parseTransactionError(new Error(errorMsg)),
          };
        }
      }

      // Parse response data if parser provided
      const data = parser ? parser(response) : undefined;

      return {
        success: true,
        digest: response.digest,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: parseTransactionError(error),
      };
    }
  }

  /**
   * Wait for transaction confirmation
   */
  async waitForTransaction(digest: string): Promise<SuiTransactionBlockResponse> {
    return this.client.waitForTransaction({
      digest,
      options: {
        showEffects: true,
        showEvents: true,
        showObjectChanges: true,
      },
    });
  }

  /**
   * Get transaction details
   */
  async getTransaction(digest: string): Promise<SuiTransactionBlockResponse | null> {
    try {
      return await this.client.getTransactionBlock({
        digest,
        options: {
          showEffects: true,
          showEvents: true,
          showObjectChanges: true,
        },
      });
    } catch {
      return null;
    }
  }
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Extract created object ID from transaction response
 */
export function extractCreatedObjectId(
  response: SignAndExecuteResponse,
  objectType?: string
): string | undefined {
  const created = response.objectChanges?.filter((change: any) => change.type === 'created');

  if (!created || created.length === 0) return undefined;

  if (objectType) {
    const match = created.find(
      (change: any) => change.type === 'created' && change.objectType?.includes(objectType)
    );
    return match?.objectId;
  }

  // Return first created object
  return created[0]?.objectId;
}

/**
 * Extract event data from transaction response
 */
export function extractEvent<T = unknown>(
  response: SignAndExecuteResponse,
  eventType: string
): T | undefined {
  const event = response.events?.find((e: any) => e.type?.includes(eventType));
  return event?.parsedJson as T | undefined;
}
