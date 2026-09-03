import { z } from "zod";

const POSTGRES_INTEGER_MAX = 2_147_483_647;

const positiveIntegerSchema = (fieldName: string): z.ZodNumber =>
  z
    .number({
      required_error: `${fieldName} is required.`,
      invalid_type_error: `${fieldName} must be a positive integer.`
    })
    .int(`${fieldName} must be a positive integer.`)
    .min(1, `${fieldName} must be a positive integer.`)
    .max(
      POSTGRES_INTEGER_MAX,
      `${fieldName} must fit within the PostgreSQL integer range.`
    );

const routeIdSchema = (
  fieldName: string
): z.ZodType<number, z.ZodTypeDef, string> =>
  z
    .string({
      required_error: `${fieldName} is required.`,
      invalid_type_error: `${fieldName} must be a positive integer.`
    })
    .regex(/^[1-9]\d*$/, `${fieldName} must be a positive integer.`)
    .transform((value) => Number(value))
    .refine(
      (value) => value <= POSTGRES_INTEGER_MAX,
      `${fieldName} must fit within the PostgreSQL integer range.`
    );

export const loginBodySchema = z
  .object({
    email: z
      .string({
        required_error: "Email is required.",
        invalid_type_error: "A valid email is required."
      })
      .trim()
      .email("A valid email is required.")
      .transform((email) => email.toLowerCase()),
    password: z
      .string({
        required_error: "Password is required.",
        invalid_type_error: "Password is required."
      })
      .min(1, "Password is required.")
  })
  .strict();

export const productIdParamsSchema = z
  .object({
    productId: routeIdSchema("Product ID")
  })
  .strict();

export const productVariantIdParamsSchema = z
  .object({
    productVariantId: routeIdSchema("Product variant ID")
  })
  .strict();

export const addToCartBodySchema = z
  .object({
    productId: positiveIntegerSchema("Product ID"),
    productVariantId: positiveIntegerSchema("Product variant ID"),
    quantity: positiveIntegerSchema("Quantity").max(
      999,
      "Quantity must be between 1 and 999."
    )
  })
  .strict();

export const updateCartQuantityBodySchema = z
  .object({
    quantity: positiveIntegerSchema("Quantity").max(
      999,
      "Quantity must be between 1 and 999."
    )
  })
  .strict();

export const changeCartVariantBodySchema = z
  .object({
    productVariantId: positiveIntegerSchema("Product variant ID")
  })
  .strict();

export type LoginBody = z.infer<typeof loginBodySchema>;
export type ProductIdParams = z.infer<typeof productIdParamsSchema>;
export type ProductVariantIdParams = z.infer<typeof productVariantIdParamsSchema>;
export type AddToCartBody = z.infer<typeof addToCartBodySchema>;
export type UpdateCartQuantityBody = z.infer<typeof updateCartQuantityBodySchema>;
export type ChangeCartVariantBody = z.infer<typeof changeCartVariantBodySchema>;
