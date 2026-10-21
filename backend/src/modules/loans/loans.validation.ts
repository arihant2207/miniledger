/**
 * Module: Loans Validation Schemas
 * Responsibility: Enforces boundary validation on loan operations.
 * Validates financial amounts (positive with up to 2 decimal places), calendar-format due dates
 * (future-or-today), non-empty trimmed friend names, and UUID route parameters.
 */

import { z } from 'zod';

// Validates ISO calendar date format YYYY-MM-DD
const dateRegex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export const createLoanSchema = z.object({
  friendName: z
    .string({ required_error: 'Friend name is required' })
    .trim()
    .min(1, 'Friend name cannot be empty')
    .max(100, 'Friend name cannot exceed 100 characters'),
  amount: z
    .union([z.number(), z.string()])
    .transform((val) => (typeof val === 'string' ? parseFloat(val) : val))
    .refine((val) => !isNaN(val) && val > 0, {
      message: 'Amount must be a positive number greater than 0',
    })
    .refine((val) => /^\d+(\.\d{1,2})?$/.test(val.toFixed(2)), {
      message: 'Amount cannot have more than 2 decimal places',
    })
    .refine((val) => val <= 9999999999.99, {
      message: 'Amount exceeds maximum supported limit',
    }),
  dueDate: z
    .string({ required_error: 'Due date is required' })
    .trim()
    .regex(dateRegex, 'Due date must be in YYYY-MM-DD format')
    .refine(
      (val) => {
        const parsed = new Date(val + 'T00:00:00Z');
        if (isNaN(parsed.getTime())) return false;

        // Compare against today's date in UTC (zeroed time)
        const todayStr = new Date().toISOString().slice(0, 10);
        return val >= todayStr;
      },
      {
        message: 'Due date must be today or a future date',
      }
    ),
  notes: z
    .string()
    .trim()
    .max(500, 'Notes cannot exceed 500 characters')
    .optional(),
});

export const loanIdParamSchema = z.object({
  id: z.string().uuid('Invalid loan ID format. Must be a valid UUID'),
});

export type CreateLoanInput = z.infer<typeof createLoanSchema>;

