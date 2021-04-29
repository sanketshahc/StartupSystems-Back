const AWS = require("aws-sdk");
const express = require("express");
const serverless = require("serverless-http");
const app = express();
const firebaseTokenVerifier = require('firebase-token-verifier')
const https = require("https")
const USERS_TABLE = process.env.USERS_TABLE;
const dynamoDbClient = new AWS.DynamoDB.DocumentClient();

app.use(express.json());

//q any better way to do the callback?
//asignment
app.get('/test', (req,res,next) => {
  const x = require("./data.json");
  x.extrastuff = "morethings, api call worked!";
  res.json(x)
})

// app.get('/',(req,res)=>{})


async function validate(token) {
    console.log("here? val")
    console.log(token)
    if (!token) {
      return {
        statusCode: 401
      }
    }
    try {
      // validate the token from the request
      console.log("trying")
      const decoded = await firebaseTokenVerifier.validate(token, "startupsys-44116")
    } catch (err) {
      // the token was invalid,
      console.error(err)
        return {
          statusCode: 401
      }
    }
    // user is now confirmed to be authorized, return the data
    console.log('returning')
    return {
      statusCode: 200,
    }
}

//todo fix the current user issue....test the console logs agsin

const URL = 'https://api.1forge.com/quotes?pairs=USD/EUR,USD/JPY,EUR/JPY&api_key=Yrk6sYWHHfEA5QFh8xoSLqyOIgeEyuxJ'

app.get('/main', (req, response) => {
  const token = req.headers['Authorization']
  const status = validate(token)
  if (status.statusCode == 200) {
      console.log("got200")
      https.get(URL, (res) => {
        let x
        res.setEncoding('utf8');
        res.on('data', (body) => {x = body});
        res.on('end', () => {response.json(x)})
      });
  }
  if (status.statusCode == 401) {
      console.log("unauthorized")
      response.json("Sorry, Unauthorized")
  }
  })
// q how do you debug this thing?


app.post("/save", async function (req, res) {
  const token = req.headers['Authorization']
  const status = validate(token)

  const { userId, values } = req.body;
  // run auth check above

  ///fill out below
  const params = {
    TableName: USERS_TABLE,
    Item: {
      userId: userId,
      USD: name,
      EUR: name,
      JPY: name,
    },
  };

  try {
    await dynamoDbClient.update(params).promise();

  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Could not find user" });
  }
});

app.use((req, res, next) => {
  return res.status(404).json({
    error: "Not Found",
  });
});


//for testing when deployed...
app.get("/whoami", async function (req, res) {
  const params = {
    TableName: USERS_TABLE,
    Key: {
      userId: "someUserId",
    },
  };

  try {
    const { Item } = await dynamoDbClient.get(params).promise();
    if (Item) {
      const { userId, name } = Item;
      res.json({ userId, name });
    } else {
      res
        .status(404)
        .json({ error: 'Could not find user with provided "userId"' });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Could not retreive user" });
  }
});



// for testing
app.get("/users/:userId", async function (req, res) {
  const params = {
    TableName: USERS_TABLE,
    Key: {
      userId: req.params.userId,
    },
  };

  try {
    const { Item } = await dynamoDbClient.get(params).promise();
    if (Item) {
      const { userId, name } = Item;
      res.json({ userId, name });
    } else {
      res
        .status(404)
        .json({ error: 'Could not find user with provided "userId"' });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Could not retreive user" });
  }
});

//for testing.
app.post("/users", async function (req, res) {
  const { userId, name } = req.body;
  if (typeof userId !== "string") {
    res.status(400).json({ error: '"userId" must be a string' });
  } else if (typeof name !== "string") {
    res.status(400).json({ error: '"name" must be a string' });
  }

  const params = {
    TableName: USERS_TABLE,
    Item: {
      userId: userId,
      name: name,
    },
  };

  try {
    await dynamoDbClient.put(params).promise();
    res.json({ userId, name });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Could not create user" });
  }
});

app.use((req, res, next) => {
  return res.status(404).json({
    error: "Not Found",
  });
});





module.exports.handler = serverless(app);
