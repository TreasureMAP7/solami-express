import express from "express";

import authRouter from "./routes/auth/auth.route";
import productsRouter from "./routes/products/products.route"

const app = express();
const port = 5000;

app.use(express.json());

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/products", productsRouter);

app.get("/", (req, res) => {
  res.send("Welcome to product management");
});

app.listen(port, () => {
  console.log(`http://localhost:${port}`);
});
