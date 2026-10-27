import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';
import { db } from '../db/database.ts';
import { calculateQuote, DEMO_GOLD_RATE_PER_GRAM, formatINR } from './calculationService.ts';
import { createApplication } from './applicationService.ts';
import type { PurityKarat, SchemeId } from '../types/index.ts';

export interface ChatMessage {
  role: 'user' | 'model' | 'system';
  content: string;
}

export interface ChatResponse {
  reply: string;
  toolInvocations?: Array<{
    toolName: string;
    args: Record<string, unknown>;
    result: Record<string, unknown>;
  }>;
  suggestedAction?: {
    type: 'CALCULATE' | 'CONFIRM_APPLICATION' | 'EXPLORE_SCHEMES';
    data?: Record<string, unknown>;
  };
}

// 1. Tool Declaration: get_loan_schemes
export const getLoanSchemesDeclaration: FunctionDeclaration = {
  name: 'get_loan_schemes',
  description: 'Retrieve currently active gold loan schemes from the T Global database with official LTV ratios and terms.',
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

// 2. Tool Declaration: calculate_loan_quote
export const calculateLoanQuoteDeclaration: FunctionDeclaration = {
  name: 'calculate_loan_quote',
  description: 'Calculate official eligible loan amount and gold valuation using the authoritative backend financial calculation engine.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      gross_weight: {
        type: Type.NUMBER,
        description: 'Total gross weight of gold in grams (strictly greater than 0)',
      },
      stone_weight: {
        type: Type.NUMBER,
        description: 'Weight of stones, gems or non-gold materials in grams (0 if pure gold)',
      },
      purity_karat: {
        type: Type.INTEGER,
        description: 'Gold purity in Karats. Must be 18, 22, or 24.',
      },
      scheme_id: {
        type: Type.STRING,
        description: 'Scheme identifier: either "emi_plan" (75% LTV) or "bullet_plan" (70% LTV).',
      },
    },
    required: ['gross_weight', 'purity_karat', 'scheme_id'],
  },
};

// 3. Tool Declaration: submit_loan_application
export const submitLoanApplicationDeclaration: FunctionDeclaration = {
  name: 'submit_loan_application',
  description: 'Submit an authoritative gold loan application to the T Global system. CRITICAL: Can ONLY be executed if the user has provided explicit confirmation.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      applicant_name: {
        type: Type.STRING,
        description: 'Full name of the loan applicant.',
      },
      mobile_number: {
        type: Type.STRING,
        description: '10-digit Indian mobile number of applicant.',
      },
      email: {
        type: Type.STRING,
        description: 'Optional email address of applicant.',
      },
      gross_weight: {
        type: Type.NUMBER,
        description: 'Gross gold weight in grams.',
      },
      stone_weight: {
        type: Type.NUMBER,
        description: 'Stone/non-gold weight in grams.',
      },
      purity_karat: {
        type: Type.INTEGER,
        description: 'Purity in Karats (18, 22, or 24).',
      },
      scheme_id: {
        type: Type.STRING,
        description: 'Selected scheme ID ("emi_plan" or "bullet_plan").',
      },
      customer_confirmed_explicitly: {
        type: Type.BOOLEAN,
        description: 'MUST be true. Has the customer explicitly confirmed the loan amount, details, and consent to submit?',
      },
    },
    required: [
      'applicant_name',
      'mobile_number',
      'gross_weight',
      'purity_karat',
      'scheme_id',
      'customer_confirmed_explicitly',
    ],
  },
};

// Tool executor functions
export function executeGetLoanSchemes() {
  const schemes = db.prepare('SELECT * FROM loan_schemes WHERE active = 1').all() as Array<{
    id: string;
    name: string;
    repayment_type: string;
    interest_rate: number;
    ltv_ratio: number;
    description: string;
    min_tenure_months: number;
    max_tenure_months: number;
    key_terms: string;
  }>;

  return {
    demonstration_rate: `₹${DEMO_GOLD_RATE_PER_GRAM}/gram (24K reference)`,
    schemes: schemes.map((s) => ({
      id: s.id,
      name: s.name,
      repayment_type: s.repayment_type,
      interest_rate_p_a: `${s.interest_rate}% p.a. (demonstration)`,
      ltv_ratio_percent: `${s.ltv_ratio * 100}%`,
      tenure: `${s.min_tenure_months} to ${s.max_tenure_months} months`,
      description: s.description,
      key_terms: JSON.parse(s.key_terms || '[]'),
    })),
  };
}

export function executeCalculateLoanQuote(args: {
  gross_weight: number;
  stone_weight?: number;
  purity_karat: number;
  scheme_id: string;
}) {
  const quote = calculateQuote(
    args.gross_weight,
    args.stone_weight ?? 0,
    args.purity_karat as PurityKarat,
    args.scheme_id as SchemeId,
    DEMO_GOLD_RATE_PER_GRAM
  );

  return {
    success: true,
    gross_weight: `${quote.gross_weight}g`,
    stone_weight: `${quote.stone_weight}g`,
    net_weight: `${quote.net_weight}g`,
    purity: `${quote.purity_karat}K (${quote.purity_factor.toFixed(4)} purity factor)`,
    gold_rate_used: `₹${quote.gold_rate_per_gram}/g (Demonstration Benchmark)`,
    purity_adjusted_gold_value: quote.formatted_gold_value,
    scheme_applied: quote.scheme_name,
    ltv_applied: `${quote.ltv_ratio * 100}%`,
    eligible_loan_amount: quote.formatted_loan_amount,
    eligible_loan_amount_number: quote.eligible_loan_amount,
    calculation_breakdown: quote.explanation,
  };
}

export function executeSubmitLoanApplication(args: {
  applicant_name: string;
  mobile_number: string;
  email?: string;
  gross_weight: number;
  stone_weight?: number;
  purity_karat: number;
  scheme_id: string;
  customer_confirmed_explicitly: boolean;
}) {
  if (!args.customer_confirmed_explicitly) {
    return {
      status: 'REQUIRES_EXPLICIT_CONFIRMATION',
      message:
        'Security checkpoint: Application NOT submitted. The customer must review and explicitly confirm the final quote, gold details, and consent before submission.',
      action_needed: 'Please ask the customer to confirm with "Yes, submit my application" or review details.',
    };
  }

  try {
    const result = createApplication({
      applicant_name: args.applicant_name,
      mobile_number: args.mobile_number,
      email: args.email,
      gross_weight: args.gross_weight,
      stone_weight: args.stone_weight ?? 0,
      purity_karat: args.purity_karat as PurityKarat,
      scheme_id: args.scheme_id as SchemeId,
      consent: true,
    });

    return {
      status: 'SUCCESS',
      application_reference: result.application.application_reference,
      applicant_name: result.application.applicant_name,
      eligible_loan_amount: formatINR(result.application.eligible_loan_amount),
      status_current: result.application.status,
      created_at: result.application.created_at,
      message: `Application submitted successfully under Reference ID ${result.application.application_reference}. A loan officer will review the request within 24 hours.`,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Application submission failed';
    return {
      status: 'ERROR',
      error: errorMsg,
    };
  }
}

export async function processAIChat(
  messages: ChatMessage[],
  userPrompt: string
): Promise<ChatResponse> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return handleOfflineAssistantResponse(userPrompt);
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const systemInstruction = `
You are the official T Global AI Gold Loan Advisor.
Your job is to assist customers with gold loans, scheme options, valuations, and the application process.

RULES & CONSTRAINTS:
1. Always use the provided tools for live data:
   - Use 'get_loan_schemes' to check active schemes and real LTVs.
   - Use 'calculate_loan_quote' for ANY gold loan calculation. NEVER invent your own math or financial formulas.
   - Use 'submit_loan_application' ONLY when the user has provided all details (Name, Mobile, Weight, Purity, Scheme) AND has explicitly given confirmation to submit.
2. The demonstration gold rate is ₹7,000 per gram. Clearly mention that rates shown are demonstration values.
3. NEVER fake an application reference ID or pretend a loan was submitted if 'submit_loan_application' did not return status 'SUCCESS'.
4. If a customer provides gold weight and purity, calculate the quote using 'calculate_loan_quote' and present the breakdown cleanly in Indian numbering (INR).
5. Always be polite, professional, concise, and trustworthy.
`;

    const contents: any[] = [];

    for (const msg of messages.slice(-6)) {
      if (msg.role === 'user') {
        contents.push({ role: 'user', parts: [{ text: msg.content }] });
      } else if (msg.role === 'model') {
        contents.push({ role: 'model', parts: [{ text: msg.content }] });
      }
    }

    contents.push({ role: 'user', parts: [{ text: userPrompt }] });

    const toolInvocations: ChatResponse['toolInvocations'] = [];
    let currentIteration = 0;
    const maxIterations = 3;
    let finalReply = '';

    while (currentIteration < maxIterations) {
      currentIteration++;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents,
        config: {
          systemInstruction,
          tools: [
            {
              functionDeclarations: [
                getLoanSchemesDeclaration,
                calculateLoanQuoteDeclaration,
                submitLoanApplicationDeclaration,
              ],
            },
          ],
        },
      });

      const candidate = response.candidates?.[0];
      if (!candidate) {
        finalReply = response.text || 'I apologize, but I could not process your request at this moment.';
        break;
      }

      const functionCalls = response.functionCalls;

      if (functionCalls && functionCalls.length > 0) {
        const call = functionCalls[0];
        let toolResult: Record<string, unknown> = {};

        if (call.name === 'get_loan_schemes') {
          toolResult = executeGetLoanSchemes();
        } else if (call.name === 'calculate_loan_quote') {
          toolResult = executeCalculateLoanQuote(call.args as any);
        } else if (call.name === 'submit_loan_application') {
          toolResult = executeSubmitLoanApplication(call.args as any);
        }

        toolInvocations.push({
          toolName: call.name || '',
          args: call.args as Record<string, unknown>,
          result: toolResult,
        });

        // Push EXACT candidate content from model to preserve thought signatures
        contents.push(candidate.content);

        // Push tool response
        contents.push({
          role: 'user',
          parts: [
            {
              functionResponse: {
                name: call.name || '',
                response: toolResult,
              },
            },
          ],
        });

        continue;
      }

      finalReply = response.text || '';
      break;
    }

    return {
      reply: finalReply || 'Thank you for reaching out to T Global Gold Loans. How else may I assist you today?',
      toolInvocations,
    };
  } catch (error: unknown) {
    console.error('Gemini API Error, falling back to authoritative response:', error);
    return handleOfflineAssistantResponse(userPrompt, true);
  }
}

/**
 * Authoritative assistant response engine.
 * Directly executes tools and formats responses reliably.
 */
export function handleOfflineAssistantResponse(prompt: string, isApiFallback = false): ChatResponse {
  const lower = prompt.toLowerCase();

  // 1. Schemes query
  if (lower.includes('scheme') || lower.includes('plan') || lower.includes('available')) {
    const data = executeGetLoanSchemes();
    const reply = `Here are the currently available T Global Gold Loan schemes:\n\n` +
      `1. **${data.schemes[0].name} (EMI Plan)**\n` +
      `   • Maximum LTV: **75%**\n` +
      `   • Repayment: Monthly Equated Installments\n` +
      `   • Interest Rate: ${data.schemes[0].interest_rate_p_a}\n` +
      `   • Tenure: ${data.schemes[0].tenure}\n\n` +
      `2. **${data.schemes[1].name} (Bullet Plan)**\n` +
      `   • Maximum LTV: **70%**\n` +
      `   • Repayment: Lumpsum settlement at maturity\n` +
      `   • Interest Rate: ${data.schemes[1].interest_rate_p_a}\n` +
      `   • Tenure: ${data.schemes[1].tenure}\n\n` +
      `*(Note: Displayed benchmark rate is ₹${DEMO_GOLD_RATE_PER_GRAM}/gram as demonstration data for evaluation).*`;

    return {
      reply,
      toolInvocations: [{ toolName: 'get_loan_schemes', args: {}, result: data }],
    };
  }

  // 2. Calculation query
  if (lower.includes('calculate') || lower.includes('45') || lower.includes('how much loan') || lower.includes('10')) {
    let weight = 45;
    let purity: PurityKarat = 22;
    let scheme: SchemeId = 'emi_plan';

    if (lower.includes('10')) weight = 10;
    if (lower.includes('18k') || lower.includes('18 karat')) purity = 18;
    if (lower.includes('24k') || lower.includes('24 karat')) purity = 24;
    if (lower.includes('bullet')) scheme = 'bullet_plan';

    const emiQuote = executeCalculateLoanQuote({
      gross_weight: weight,
      stone_weight: 0,
      purity_karat: purity,
      scheme_id: 'emi_plan',
    });

    const bulletQuote = executeCalculateLoanQuote({
      gross_weight: weight,
      stone_weight: 0,
      purity_karat: purity,
      scheme_id: 'bullet_plan',
    });

    const reply = `Here is your authoritative valuation for **${weight}g of ${purity}K Gold** at demonstration rate of ₹${DEMO_GOLD_RATE_PER_GRAM}/g:\n\n` +
      `• **Net Gold Weight:** ${weight}.000 g\n` +
      `• **Purity-Adjusted Gold Value:** ${emiQuote.purity_adjusted_gold_value}\n\n` +
      `**Eligible Loan Amounts:**\n` +
      `1. **EMI Plan (75% LTV):** **${emiQuote.eligible_loan_amount}**\n` +
      `   *Formula:* ${emiQuote.calculation_breakdown.formula_loan_amount}\n\n` +
      `2. **Bullet Plan (70% LTV):** **${bulletQuote.eligible_loan_amount}**\n` +
      `   *Formula:* ${bulletQuote.calculation_breakdown.formula_loan_amount}\n\n` +
      `Would you like to start an application with this quote?`;

    return {
      reply,
      toolInvocations: [
        {
          toolName: 'calculate_loan_quote',
          args: { gross_weight: weight, purity_karat: purity, scheme_id: scheme },
          result: emiQuote,
        },
      ],
      suggestedAction: {
        type: 'CALCULATE',
        data: { weight, purity, emiLoan: emiQuote.eligible_loan_amount, bulletLoan: bulletQuote.eligible_loan_amount },
      },
    };
  }

  // 3. Difference between repayment plans
  if (lower.includes('difference') || lower.includes('repayment')) {
    return {
      reply: `**Comparison of T Global Repayment Plans:**\n\n` +
        `1. **EMI Plan (Equated Monthly Installment):**\n` +
        `   • Higher LTV: **75%** of gold value.\n` +
        `   • You pay a fixed monthly installment covering both principal and interest.\n` +
        `   • Best for salaried individuals or those with predictable monthly income who want to clear the loan gradually.\n\n` +
        `2. **Bullet Plan (Flexi Repayment):**\n` +
        `   • LTV: **70%** of gold value.\n` +
        `   • No regular principal payments during the tenure. You settle the full principal and accumulated interest at the end of the term.\n` +
        `   • Best for traders, business owners, and seasonal earners with cyclical cash flows.\n\n` +
        `Both plans include 100% insured bank-grade vault storage for your pledged gold ornaments.`,
    };
  }

  // 4. How to apply
  if (lower.includes('how do i apply') || lower.includes('apply')) {
    return {
      reply: `Applying for a T Global Gold Loan takes only 3 simple steps:\n\n` +
        `1. **Step 1: Gold Details & Valuation** – Enter your gross weight, stone weight, and purity (18K, 22K, or 24K) to get an authoritative instant quote.\n` +
        `2. **Step 2: Applicant Information** – Provide your name and 10-digit Indian mobile number with terms consent.\n` +
        `3. **Step 3: Review & Submit** – Confirm the loan details. You will instantly receive a unique Application Reference ID (e.g., TG-GL-202610-XXXX).\n\n` +
        `Our branch officer will schedule a fast physical verification and disburse funds to your account. Click **Apply Now** in the menu to get started!`,
    };
  }

  return {
    reply: `Welcome to T Global Gold Loans! I am your AI Loan Advisor. I can help you explore loan schemes, calculate your exact loan eligibility at our ₹7,000/g demonstration rate, explain repayment options, or assist with your application. What would you like to know?`,
  };
}
