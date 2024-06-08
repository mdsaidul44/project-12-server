const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000;


// middleware
app.use(cors());
app.use(express.json());

const verifyToken = (req,res,next)=>{
  console.log('inside verifyToken',req.headers.authorization);
  if(!req.headers.authorization){
    return req.status(401).send({message: 'unauthorized access'})
  }
  const token =req.headers.authorization.split(' '[1])
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET ,(err,decoded)=>{
    if(err){
      return req.status(403).send({message: 'forbidden access'})
    }
    req.decoded = decoded;
    next()
  })
}


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.pb63j1a.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    // collections 
    const blogCollection = client.db('bloodWavedb').collection('blog')
    const userCollection = client.db('bloodWavedb').collection('user')
    const requestCollection = client.db('bloodWavedb').collection('request')

    // jwt related api
    app.post('/jwt',async(req,res)=>{
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET,{expiresIn: '1hr'})
      res.send({token})
    })


    // blog api
    app.get('/blog', async (req, res) => {
      const cursor = blogCollection.find()
      const result = await cursor.toArray()
      res.send(result)
    })

    app.get('/blog/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await blogCollection.findOne(query)
      res.send(result)
    })

    // user related api
    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email }
      const existingUser = await userCollection.findOne(query)
      if (existingUser) {
        return res.send({ message: 'user already exists', insertedId: null })
      }
      const result = await userCollection.insertOne(user)
      res.send(result)
    })

    app.get('/users', async (req, res) => {
      const result = await userCollection.find().toArray()
      res.send(result)
    })

    // request related api

    app.get('/request', async (req, res) => {
      const result = await requestCollection.find().toArray()
      res.send(result)
    })

    app.get('/request/:email', async (req, res) => {
      const email = req.params.email;
      const query = { requesterEmail: email }
      const result = await requestCollection.find(query).toArray()
      res.send(result)
    })

    app.get('/requests/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await requestCollection.findOne(query)
      res.send(result)
    })

    app.post('/request', async (req, res) => {
      const request = req.body;
      const result = await requestCollection.insertOne(request);
      res.send(result)
    })

    app.patch('/requests/:id', async (req, res) => {
      const data = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updateReq = {
        $set: {
          requesterName: data.requesterName,
          requesterEmail: data.requesterEmail,
          recipientName: data.recipientName,
          recipientAddress: data.recipientAddress, 
          donationDate: data.donationDate,
          donationTime: data.donationTime,
          bloodGroup: data.bloodGroup,
          requestMessage: data.requestMessage, 
        }
      }
      const result = await requestCollection.updateOne(filter,updateReq)
      res.send(result)

    })

    
    app.delete('/requests/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await requestCollection.deleteOne(query)
      res.send(result)
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('blood wave is running')
})

app.listen(port, () => {
  console.log(`blood wave server is running on port ${port}`)
})