import { z } from 'zod';
import type { PurityKarat } from '../types/index.ts';

/**
 * Normalizes Indian mobile numbers to 10 digits starting with 6, 7, 8, or 9.
 * Handles '+91', '91', '0' prefixes, whitespace, parentheses, and dashes.
 */
export function normalizeIndianMobile(rawMobile: string): string {
  if (!rawMobile || typeof rawMobile !== 'string') {
    throw new Error('Mobile number is required and must be a string.');
  }

  // Remove spaces, hyphens, brackets, dots
  let cleaned = rawMobile.replace(/[\s\-\(\)\.]/g, '');

  // If starts with '+91', remove '+'
  if (cleaned.startsWith('+91')) {
    cleaned = cleaned.slice(3);
  } else if (cleaned.startsWith('91') && cleaned.length === 12) {
    cleaned = cleaned.slice(2);
  } else if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = cleaned.slice(1);
  }

  // Check 10 digit Indian standard: starts with 6, 7, 8, 9
  const indianMobileRegex = /^[6-9]\d{9}$/;
  if (!indianMobileRegex.test(cleaned)) {
    throw new Error('Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.');
  }

  return cleaned;
}

/**
 * Masks a normalized 10-digit mobile number for privacy in list views.
 * Example: 9876543210 -> +91 98*** **210
 */
export function maskMobileNumber(normalizedMobile: string): string {
  if (!normalizedMobile || normalizedMobile.length !== 10) {
    return '******';
  }
  return `+91 ${normalizedMobile.slice(0, 2)}*** **${normalizedMobile.slice(7)}`;
}

export const QuoteRequestSchema = z
  .object({
    gross_weight: z
      .number()
      .positive('Gross weight must be strictly greater than 0 grams')
      .max(100000, 'Gross weight cannot exceed 100,000 grams'),
    stone_weight: z
      .number()
      .min(0, 'Stone weight cannot be negative')
      .default(0),
    purity_karat: z
      .union([z.literal(18), z.literal(22), z.literal(24)])
      .refine((val) => [18, 22, 24].includes(val as PurityKarat), {
        message: 'Purity must be 18K, 22K, or 24K',
      }),
    scheme_id: z.enum(['emi_plan', 'bullet_plan'] as const),
  })
  .refine((data) => (data.stone_weight ?? 0) < data.gross_weight, {
    message: 'Stone weight must be strictly less than gross weight. Net gold weight must be positive.',
    path: ['stone_weight'],
  });

export const ApplicationSubmissionSchema = z
  .object({
    applicant_name: z
      .string()
      .trim()
      .min(2, 'Applicant name must be at least 2 characters')
      .max(100, 'Applicant name cannot exceed 100 characters')
      .regex(/^[a-zA-Z\s\.\'\-]+$/, 'Applicant name should only contain letters, spaces, and punctuation'),
    mobile_number: z.string().transform((val, ctx) => {
      try {
        return normalizeIndianMobile(val);
      } catch (err: unknown) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: err instanceof Error ? err.message : 'Invalid mobile number format',
        });
        return z.NEVER;
      }
    }),
    email: z
      .string()
      .trim()
      .email('Invalid email address format')
      .optional()
      .or(z.literal('')),
    scheme_id: z.enum(['emi_plan', 'bullet_plan'] as const),
    gross_weight: z
      .number()
      .positive('Gross weight must be strictly greater than 0 grams')
      .max(100000, 'Gross weight cannot exceed 100,000 grams'),
    stone_weight: z
      .number()
      .min(0, 'Stone weight cannot be negative')
      .default(0),
    purity_karat: z.union([z.literal(18), z.literal(22), z.literal(24)]),
    consent: z.boolean().refine((val) => val === true, {
      message: 'You must review and accept the loan terms and consent to proceed',
    }),
  })
  .refine((data) => (data.stone_weight ?? 0) < data.gross_weight, {
    message: 'Stone weight must be strictly less than gross weight',
    path: ['stone_weight'],
  });

export const StatusUpdateSchema = z.object({
  status: z.enum(['Pending', 'Under Review', 'Approved', 'Rejected'] as const),
  remarks: z.string().max(500, 'Remarks cannot exceed 500 characters').optional(),
});
