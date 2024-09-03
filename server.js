var express = require("express");
var { createHandler } = require("graphql-http/lib/use/express");
var { buildSchema } = require("graphql");
var { ruruHTML } = require("ruru/server");

var schema = buildSchema(`
    type Query {
        hello: String
    }
`);

var root = {
    hello() {
        return "Hello World!";
    }
};

var app = express();

app.get("/", (_req, res) => {
    res.type("html");
    res.end(ruruHTML({ endpoint: "/graphql" }));
});

app.all(
    "/graphql",
    createHandler({
        schema: schema,
        rootValue: root
    })
);

app.listen(4000);
console.log("Running a GraphQL API server at http://localhost:4000/graphql");
