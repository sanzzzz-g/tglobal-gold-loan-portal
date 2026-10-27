import type { CalculationBreakdown, PurityKarat, SchemeId } from '../types/index.ts';

export const DEMO_GOLD_RATE_PER_GRAM = Number(process.env.DEMO_GOLD_RATE) || 7000;

export const SCHEME_LTV_MAP: Record<SchemeId, { name: string; ltv: number; repaymentType: 'EMI' | 'Bullet' }> = {
  emi_plan: {
    name: 'EMI Gold Advantage Plan',
    ltv: 0.75,
    repaymentType: 'EMI',
  },
  bullet_plan: {
    name: 'Bullet Repayment Flexi Plan',
    ltv: 0.70,
    repaymentType: 'Bullet',
  },
};

export const SUPPORTED_PURITIES: PurityKarat[] = [18, 22, 24];

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(Math.round(amount));
}

export function formatINRAccurate(amount: number): string {
  const rounded = Math.round(amount * 100) / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: rounded % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(rounded);
}

export function validateCalculationInputs(
  grossWeight: unknown,
  stoneWeight: unknown,
  purityKarat: unknown,
  schemeId: unknown
): {
  validGrossWeight: number;
  validStoneWeight: number;
  validPurity: PurityKarat;
  validSchemeId: SchemeId;
} {
  const gWeight = Number(grossWeight);
  const sWeight = stoneWeight === undefined || stoneWeight === null || stoneWeight === '' ? 0 : Number(stoneWeight);
  const purity = Number(purityKarat) as PurityKarat;
  const sId = String(schemeId) as SchemeId;

  if (Number.isNaN(gWeight) || !Number.isFinite(gWeight)) {
    throw new Error('Gross weight must be a valid finite number.');
  }
  if (gWeight <= 0) {
    throw new Error('Gross weight must be strictly greater than 0 grams.');
  }
  if (gWeight > 100000) {
    throw new Error('Gross weight exceeds maximum allowable input limit of 100,000 grams.');
  }

  if (Number.isNaN(sWeight) || !Number.isFinite(sWeight)) {
    throw new Error('Stone/non-gold weight must be a valid finite number.');
  }
  if (sWeight < 0) {
    throw new Error('Stone/non-gold weight cannot be negative.');
  }
  if (sWeight >= gWeight) {
    throw new Error(
      `Stone weight (${sWeight}g) must be strictly less than gross weight (${gWeight}g). Net gold weight cannot be zero or negative.`
    );
  }

  if (!SUPPORTED_PURITIES.includes(purity)) {
    throw new Error(`Unsupported gold purity (${purity}K). Allowed values are 18K, 22K, and 24K.`);
  }

  if (!SCHEME_LTV_MAP[sId]) {
    throw new Error(`Unsupported scheme ID (${schemeId}). Allowed schemes are 'emi_plan' and 'bullet_plan'.`);
  }

  return {
    validGrossWeight: Number(gWeight.toFixed(3)),
    validStoneWeight: Number(sWeight.toFixed(3)),
    validPurity: purity,
    validSchemeId: sId,
  };
}

/**
 * Authoritative financial calculation service.
 * Formula:
 * netWeight = grossWeight - stoneWeight
 * purityAdjustedGoldValue = netWeight * goldRatePerGram * (purityInKarats / 24)
 * eligibleLoanAmount = purityAdjustedGoldValue * schemeLTV
 */
export function calculateQuote(
  grossWeight: number,
  stoneWeight = 0,
  purityKarat: PurityKarat,
  schemeId: SchemeId,
  goldRatePerGram: number = DEMO_GOLD_RATE_PER_GRAM
): CalculationBreakdown {
  const { validGrossWeight, validStoneWeight, validPurity, validSchemeId } = validateCalculationInputs(
    grossWeight,
    stoneWeight,
    purityKarat,
    schemeId
  );

  const netWeight = Number((validGrossWeight - validStoneWeight).toFixed(3));
  const purityFactor = validPurity / 24;

  // purityAdjustedGoldValue = netWeight * goldRatePerGram * (purityInKarats / 24)
  const purityAdjustedGoldValue = (netWeight * goldRatePerGram * validPurity) / 24;

  const schemeInfo = SCHEME_LTV_MAP[validSchemeId];
  const ltvRatio = schemeInfo.ltv;

  // eligibleLoanAmount = purityAdjustedGoldValue * schemeLTV
  const eligibleLoanAmountRaw = purityAdjustedGoldValue * ltvRatio;
  const eligibleLoanAmount = Math.round(eligibleLoanAmountRaw);
  const displayGoldValue = Number(purityAdjustedGoldValue.toFixed(2));

  return {
    gross_weight: validGrossWeight,
    stone_weight: validStoneWeight,
    net_weight: netWeight,
    purity_karat: validPurity,
    purity_factor: purityFactor,
    gold_rate_per_gram: goldRatePerGram,
    purity_adjusted_gold_value: displayGoldValue,
    scheme_id: validSchemeId,
    scheme_name: schemeInfo.name,
    ltv_ratio: ltvRatio,
    eligible_loan_amount_raw: eligibleLoanAmountRaw,
    eligible_loan_amount: eligibleLoanAmount,
    formatted_gold_value: formatINR(displayGoldValue),
    formatted_loan_amount: formatINR(eligibleLoanAmount),
    explanation: {
      formula_net_weight: `${validGrossWeight}g (Gross) - ${validStoneWeight}g (Stones) = ${netWeight}g Net Gold`,
      formula_gold_value: `${netWeight}g × ₹${goldRatePerGram.toLocaleString('en-IN')}/g × (${validPurity}K / 24) = ${formatINRAccurate(displayGoldValue)}`,
      formula_loan_amount: `${formatINRAccurate(displayGoldValue)} × ${(ltvRatio * 100).toFixed(0)}% LTV = ${formatINRAccurate(eligibleLoanAmountRaw)} (Rounded: ${formatINR(eligibleLoanAmount)})`,
      notes: [
        `Demonstration gold rate: ₹${goldRatePerGram.toLocaleString('en-IN')} per gram (24K reference).`,
        `Selected scheme applies a ${Math.round(ltvRatio * 100)}% Loan-to-Value (LTV) limit.`,
        'All valuations are subject to physical inspection and assay verification at our branch.',
      ],
    },
  };
}
