import { Router } from "express";
import ProductsController from "../../controllers/products/products.controller";
import { uploadSingleImage } from "../../middlewares/upload.middleware";
import { authenticate } from "../../middlewares/auth.middleware";

const router = Router();

router.post(
  "/",
  authenticate,
  uploadSingleImage,
  ProductsController.createProduct,
);

router.get("/", authenticate, ProductsController.getProducts);
router.get("/search", authenticate, ProductsController.getProductsByQuery);
router.get("/:id", authenticate, ProductsController.getProductById);

router.patch(
  "/:id",
  authenticate,
  uploadSingleImage,
  ProductsController.updateProduct,
);
router.delete("/:id", authenticate, ProductsController.deleteProduct);

export default router;
