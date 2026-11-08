import { Request, Response } from "express";
import { registerSchema, loginSchema } from "../../validations/auth.validation";
import { db } from "../../config/db";
import { eq } from "drizzle-orm";
import { productsTable, usersTable } from "../../config/schema";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import z, { ZodError } from "zod";

export default new (class AuthController {
  register = async (req: Request, res: Response) => {
    try {
      const validatedData = registerSchema.parse(req.body);

      const { username, email, password } = validatedData;

      const existingEmail = await db.query.usersTable.findFirst({
        where: eq(usersTable.email, email),
      });

      if (existingEmail) {
        return res.status(409).json({
          success: false,
          message: "Email already exists",
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const [insertedUser] = await db
        .insert(usersTable)
        .values({
          username,
          email,
          password: hashedPassword,
        })
        .$returningId();

      const newUser = await db.query.usersTable.findFirst({
        where: eq(usersTable.id, insertedUser.id),
      });

      return res.status(201).json({
        success: true,
        message: "Register successful",
        data: {
          user: {
            id: newUser?.id,
            username: newUser?.username,
            email: newUser?.email,
            role: newUser?.role,
          },
        },
      });
    } catch (error) {
      console.error("Register error:", error);

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
        error: error,
      });
    }
  };

  login = async (req: Request, res: Response) => {
    try {
      // 1. VALIDATION
      const validatedData = loginSchema.parse(req.body);
      const { email, password } = validatedData;

      // 2. FIND USER BY EMAIL
      const user = await db.query.usersTable.findFirst({
        where: eq(usersTable.email, email),
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Email or password incorrect",
        });
      }

      // 3. CHECK PASSWORD
      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: "Email or password incorrect",
        });
      }

      const token = jwt.sign(
        {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
        process.env.JWT_SECRET as string,
        {
          expiresIn: "7d",
        },
      );

      return res.status(200).json({
        success: true,
        message: "Login successful",
        data: {
          token,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
          },
        },
      });
    } catch (error) {
      console.error("Login error:", error);

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
        error: error,
      });
    }
  };

  getUserData = async (req: Request, res: Response) => {
    try {
      const userId = Number(req.params.id);

      if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(400).json({
          message: "Invalid user ID",
        });
      }

      const [user] = await db
        .select({
          id: usersTable.id,
          username: usersTable.username,
          email: usersTable.email,
          role: usersTable.role,
          createdAt: usersTable.createdAt,
        })
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .limit(1);

      if (!user) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      const products = await db
        .select()
        .from(productsTable)
        .where(eq(productsTable.userId, userId));

      return res.status(200).json({
        success: true,
        message: "User profile retrieved successfully",
        data: {
          user,
          products,
        },
      });
    } catch (error) {
      console.error("Login error:", error);

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
        error: error,
      });
    }
  };
})();
