import { Router } from "express";
import AuthController from "../../controllers/auth/auth.controller";
import { authenticate } from "../../middlewares/auth.middleware";

const router = Router();

router.post("/register", AuthController.register);
router.post("/login", AuthController.login);

router.get("/users/:id", authenticate, AuthController.getUserData)

export default router;