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

AWS.config.update({
    region: "us-east-1",
    endpoint: "http://localhost:4000",
    accessKeyId: "AKIAWPBPBWFPYRCUWSWR",
    secretAccessKey: "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"
})

async function validate(token) {
    console.log("here? val")
    // console.log(token)
    if (!token) {
      return {
        statusCode: 401
      }
    }
    try {
      // validate the token from the request
      console.log("trying")
      const decoded = await firebaseTokenVerifier.validate(token, "startupsys-44116")
      console.log('decoded',decoded)
      return {
          statusCode: 201,
          userId: decoded.sub
      }
    } catch (err) {
      // the token was invalid,
        console.error(err)
        return {
          statusCode: 401
      }
    }
    // user is now confirmed to be authorized, return the data
    // console.log('returning')
    // return {
    //   statusCode: 200,
    // }
}


const URL = 'https://api.1forge.com/quotes?pairs=USD/EUR,USD/JPY,EUR/JPY&api_key=Yrk6sYWHHfEA5QFh8xoSLqyOIgeEyuxJ'

app.get('/main', (req, response) => {
    // console.log('headers',req.headers['authorization'])
    const token = req.headers['authorization']
    // let status
    const validation = validate(token)
        .then((status)=>{
            // console.log('status',status)
            if (status.statusCode == 201) {
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
  })



app.post("/save", function (req, res) {
  console.log('apost',req.headers)
  const token = req.headers['authorization'];
  const values = req.body;
  const validation = validate(token)
        .then(async (status)=> {
            console.log('staus', status)
            const params = {
                TableName: USERS_TABLE,
                Key: {
                    userId: status.userId
                },
                Item: {
                    values: values
                }
            };
            console.log('params', params)
            try {
                await dynamoDbClient.put(params);
                  return {
	  statusCode: 201,
      headers,
  }
            } catch (error) {
                console.log(error);
                res.status(500).json({error: "Could not find user"});
            }
        })
})
          ///fill out below



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
