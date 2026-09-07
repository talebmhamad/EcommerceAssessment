import type { Request, Response } from "express";
import { createSuccessResponse } from "../../shared/utilities/api-response";
import type { ProductIdParams } from "../../validation/request-schemas";
import { getProductById, listProducts } from "./products.service";

export async function getProducts(
  _request: Request,
  response: Response
): Promise<Response> {
  const products = await listProducts();

  return response.status(200).json(createSuccessResponse(products));
}

export async function getProduct(
  request: Request,
  response: Response
): Promise<Response> {
  const { productId } = request.params as unknown as ProductIdParams;
  const product = await getProductById(productId);

  return response.status(200).json(createSuccessResponse(product));
}
