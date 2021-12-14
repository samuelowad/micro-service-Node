import * as express from "express";
import * as cors from "cors";
import { createConnection } from "typeorm";
import { Product } from "./entity/product";
import { Response, Request } from "express";
import * as amqp from "amqplib/callback_api";

createConnection().then((db) => {
  const productRepository = db.getRepository(Product);

  amqp.connect("AMQ_URL", (err, connection) => {
    if (err) {
      throw err;
    }

    connection.createChannel((error, channel) => {
      if (error) {
        throw error;
      }

      //   console.log(db);

      const app = express();
      app.use(
        cors({
          origin: [
            "http://localhost:3000",
            "http://localhost:8080",
            "http://localhost:4200",
          ],
        })
      );

      app.use(express.json());

      app.get("/api/products", async (req: Request, res: Response) => {
        const products = await productRepository.find();

        res.json(products);
      });

      app.post("/api/products", async (req: Request, res: Response) => {
        const product = await productRepository.create(req.body);
        const result = await productRepository.save(product);
        channel.sendToQueue(
          "product_created",
          Buffer.from(JSON.stringify(result))
        );

        return res.send(result);
      });

      app.get("/api/products/:id", async (req: Request, res: Response) => {
        const product = await productRepository.findOne(req.params.id);
        return res.send(product);
      });

      app.put("/api/products/:id", async (req: Request, res: Response) => {
        const product = await productRepository.findOne(req.params.id);
        productRepository.merge(product, req.body);
        const result = await productRepository.save(product);
        channel.sendToQueue(
          "product_updated",
          Buffer.from(JSON.stringify(result))
        );
        return res.send(result);
      });

      app.delete("/api/products/:id", async (req: Request, res: Response) => {
        const result = await productRepository.delete(req.params.id);
        channel.sendToQueue("product_deleted", Buffer.from(req.params.id));
        return res.send("deleted");
      });

      app.post(
        "/api/products/:id/like",
        async (req: Request, res: Response) => {
          const product = await productRepository.findOne(req.params.id);

          product.likes++;
          const result = await productRepository.save(product);
          res.send(result);
        }
      );

      app.listen(8000);

      console.log("starting on port 8000");
      process.on("beforeExit", () => {
        connection.close();
      });
    });
  });
});
