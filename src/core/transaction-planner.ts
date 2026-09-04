import { IntentConstraint } from "../types/index.js";

/**
 * INTENTRA — Transaction Planner
 *
 * Calculates fees and limits for transaction plans.
 * This is where INTENTRA estimates execution costs.
 */

const FEE_RATE = 0.001;
const ROUND_TRIP_FEE_RATE = 0.002;

export class TransactionPlanner {
  calculateTotals(amounts: number[], constraint: IntentConstraint): {
    totalSpend: number;
    fees: number;
    maxSpend: number;
  } {
    const totalSpend = amounts.reduce((sum, a) => sum + a, 0);
    const fees = totalSpend * FEE_RATE;
    const maxSpend = constraint.maxTotalSpend || totalSpend;

    return { totalSpend, fees, maxSpend };
  }
}
