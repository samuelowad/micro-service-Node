"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express = require("express");
var cors = require("cors");
var typeorm_1 = require("typeorm");
(0, typeorm_1.createConnection)().then(function (db) {
    console.log(db);
    var app = express();
    app.use(cors({
        origin: [
            "http://localhost:3000",
            "http://localhost:8080",
            "http://localhost:4200",
        ],
    }));
    app.use(express.json());
    app.listen(8000);
    console.log("starting on port 8000");
});
