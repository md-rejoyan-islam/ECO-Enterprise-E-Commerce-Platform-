import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { successResponse } from '../../utils/response-handler';
import { BrandService } from './brand.service';
import { GetBrandByIdQuery, GetBrandsQuery } from './brand.validation';

export const getBrands = asyncHandler(async (req: Request, res: Response) => {
  const result = await BrandService.list(req.query as GetBrandsQuery);
  successResponse(res, {
    statusCode: 200,
    message: 'Brands fetched',
    payload: { data: result.brands, pagination: result.pagination },
  });
});

export const getBrandById = asyncHandler(
  async (req: Request, res: Response) => {
    const query = req.query as GetBrandByIdQuery;
    const data = await BrandService.getById(req.params.id, query);
    successResponse(res, {
      statusCode: 200,
      message: 'Brand fetched',
      payload: { data },
    });
  },
);

export const createBrand = asyncHandler(async (req: Request, res: Response) => {
  const data = await BrandService.create(req.body);
  successResponse(res, {
    statusCode: 201,
    message: 'Brand created',
    payload: { data },
  });
});

export const updateBrand = asyncHandler(async (req: Request, res: Response) => {
  const data = await BrandService.update(req.params.id, req.body);
  successResponse(res, {
    statusCode: 200,
    message: 'Brand updated',
    payload: { data },
  });
});

export const changeBrandStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const data = await BrandService.changeStatus(
      req.params.id,
      req.body.is_active,
    );
    successResponse(res, {
      statusCode: 200,
      message: 'Brand status updated',
      payload: { data },
    });
  },
);

export const deleteBrand = asyncHandler(async (req: Request, res: Response) => {
  const data = await BrandService.remove(req.params.id);
  successResponse(res, {
    statusCode: 200,
    message: 'Brand deleted',
    payload: { data },
  });
});
