import { Request, Response } from "express";
import {
  createProductSchema,
  productIdSchema,
  updateProductSchema,
} from "../../validations/product.validation";
import { db } from "../../config/db";
import { productsTable } from "../../config/schema";
import { eq, like, or } from "drizzle-orm";
import {
  deleteFromCloudinary,
  uploadToCloudinary,
} from "../../services/cloudinary.service";
import z, { ZodError } from "zod";

export default new (class ProductsController {
  createProduct = async (req: Request, res: Response) => {
    try {
      console.log(req.file?.mimetype);
      console.log(req.file?.originalname);

      console.log("D")

      const validatedData = createProductSchema.parse(req.body);
      const { userId, name, description, price, stock, category } =
        validatedData;

      let imageUrl: string | undefined;
      let imagePublicId: string | undefined;

      if (req.file) {
        const uploadResult = await uploadToCloudinary(req.file.buffer);

        imageUrl = uploadResult.secure_url;
        imagePublicId = uploadResult.public_id;
      }

      const [insertedProduct] = await db
        .insert(productsTable)
        .values({
          userId,
          name,
          description,
          price: price.toFixed(2),
          stock,
          category,
          imageUrl,
          imagePublicId,
        })
        .$returningId();

      const newProduct = await db.query.productsTable.findFirst({
        where: eq(productsTable.id, insertedProduct.id),
      });

      return res.status(201).json({
        success: true,
        message: "Product created successfully",
        data: {
          product: newProduct,
        },
      });
    } catch (error) {
      console.error("Create product error:", error);

      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: z.treeifyError(error),
        });
      }

      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error instanceof Error ? error.message : error,
      });
    }
  };

  getProducts = async (req: Request, res: Response) => {
    try {
      const products = await db.query.productsTable.findMany();

      return res.status(200).json({
        success: true,
        message: "Products retrieved successfully",
        data: {
          products,
        },
      });
    } catch (error) {
      console.error("Get products error:", error);

      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error instanceof Error ? error.message : error,
      });
    }
  };

  getProductById = async (req: Request, res: Response) => {
    try {
      const validateParam = productIdSchema.parse(req.params);
      const { id } = validateParam;

      const product = await db.query.productsTable.findFirst({
        where: eq(productsTable.id, id),
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Product retrieved successfully",
        data: {
          product,
        },
      });
    } catch (error) {
      console.error("Get product by ID error:", error);

      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: z.treeifyError(error),
        });
      }

      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error instanceof Error ? error.message : error,
      });
    }
  };

  getProductsByQuery = async (req: Request, res: Response) => {
    try {
      const query = req.query.keyword?.toString().trim();

      if (!query) {
        return res.status(400).json({
          success: false,
          message: "Please input a keyword",
        });
      }

      const keyword = `%${query}%`;

      const products = await db
        .select()
        .from(productsTable)
        .where(
          or(
            like(productsTable.name, keyword),
            like(productsTable.description, keyword),
            like(productsTable.category, keyword),
          ),
        );

      if (!products || products.length <= 0) {
        return res.status(404).json({
          success: false,
          message: "Products not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Products retrieved successfully",
        data: products,
      });
    } catch (error) {
      console.error("Search products error:", error);

      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: z.treeifyError(error),
        });
      }

      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error instanceof Error ? error.message : error,
      });
    }
  };

  updateProduct = async (req: Request, res: Response) => {
    try {
      const validateParam = productIdSchema.parse(req.params);
      const { id } = validateParam;

      const validatedData = updateProductSchema.parse(req.body);
      const { name, description, price, stock, category } = validatedData;

      const [existingProduct] = await db
        .select()
        .from(productsTable)
        .where(eq(productsTable.id, id));

      if (!existingProduct) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      let imageUrl = existingProduct.imageUrl;
      let imagePublicId = existingProduct.imagePublicId;

      if (req.file) {
        const uploadResult = await uploadToCloudinary(req.file.buffer);

        imageUrl = uploadResult.secure_url;
        imagePublicId = uploadResult.public_id;

        if (existingProduct.imagePublicId) {
          await deleteFromCloudinary(existingProduct.imagePublicId);
        }
      }

      await db
        .update(productsTable)
        .set({
          ...(name !== undefined && { name }),

          ...(description !== undefined && { description }),

          ...(price !== undefined && {
            price: price.toFixed(2),
          }),

          ...(stock !== undefined && { stock }),

          ...(category !== undefined && { category }),

          ...(req.file ? { imageUrl, imagePublicId } : {}),
        })
        .where(eq(productsTable.id, id));

      const [updatedProduct] = await db
        .select()
        .from(productsTable)
        .where(eq(productsTable.id, id));

      return res.status(200).json({
        success: true,
        message: "Product updated successfully",
        data: {
          product: updatedProduct,
        },
      });
    } catch (error) {
      console.error("Update product error:", error);

      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: z.treeifyError(error),
        });
      }

      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  deleteProduct = async (req: Request, res: Response) => {
    try {
      const validateParam = productIdSchema.parse(req.params);
      const { id } = validateParam;

      const product = await db.query.productsTable.findFirst({
        where: eq(productsTable.id, id),
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      await db.delete(productsTable).where(eq(productsTable.id, id));

      return res.status(200).json({
        success: true,
        message: "Product deleted successfully",
      });
    } catch (error) {
      console.error("Delete product error:", error);

      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: z.treeifyError(error),
        });
      }

      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error instanceof Error ? error.message : error,
      });
    }
  };
})();
