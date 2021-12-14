import express = require("express");
import * as cors from "cors";

import { Response, Request } from "express";
import { createConnection } from "typeorm";
import * as amqp from "amqplib/callback_api";
import { Product } from "./entity/product";
import axios from "axios";

// import {c}

createConnection().then((db) => {
  const productRepository = db.getMongoRepository(Product);
  amqp.connect(
    "amqps://iazosnux:5qmCFfTX21sjDh4ZISz-FABCLW06Blpb@jaguar.rmq.cloudamqp.com/iazosnux",
    (err, connection) => {
      if (err) {
        throw err;
      }

      connection.createChannel((error, channel) => {
        if (error) {
          throw error;
        }

        channel.assertQueue("product_created", { durable: false });
        channel.assertQueue("product_updated", { durable: false });
        channel.assertQueue("product_deleted", { durable: false });
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

        channel.consume(
          "product_created",
          async (message) => {
            const eventProduct: Product = JSON.parse(
              message.content.toString()
            );
            const product = new Product();
            product.admin_id = parseInt(eventProduct.id);
            product.title = eventProduct.title;
            product.image = eventProduct.image;
            product.likes = eventProduct.likes;

            await productRepository.save(product);
            console.log("product created");
          },
          { noAck: true }
        );

        channel.consume(
          "product_updated",
          async (message) => {
            const eventProduct: Product = JSON.parse(
              message.content.toString()
            );
            const product = await productRepository.findOne({
              admin_id: parseInt(eventProduct.id),
            });

            productRepository.merge(product, {
              title: eventProduct.title,
              image: eventProduct.image,
              likes: eventProduct.likes,
            });

            await productRepository.save(product);
            console.log("product updated");
          },
          { noAck: true }
        );

        channel.consume("product_deleted", async (message: any) => {
          // const eventProduct: Product = JSON.parse(message.content.toString());
          const admin_id = parseInt(message.content.toString());
          await productRepository.deleteOne({ admin_id });
          console.log("product deleted");
        });

        app.get("/api/products", async (req, res) => {
          const products = await productRepository.find();
          return res.send(products);
        });

        app.post("/api/product/:id/like", async (req, res) => {
          const product = await productRepository.findOne(req.params.id);

          await axios.post(
            `https://localhost:8080/api/products/${product.admin_id}/like`,
            {}
          );
          product.likes++; //
          await productRepository.save(product);
          return res.send(product);
        });

        app.listen(8001);

        console.log("starting on port 8001");

        process.on("beforeExit", () => {
          connection.close();
        });
      });
    }
  );
});
