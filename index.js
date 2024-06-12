require('dotenv').config()
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;


// middleware
app.use(cors());
app.use(express.json());

const verifyToken = (req, res, next) => { 
  // console.log('inside verifyToken', req.headers.authorization);
  if (!req.headers.authorization) {
    return res.status(401).send({ message: 'unauthorized access' })
  }
  const token = req.headers.authorization.split(' ')[1]
  // console.log('token ---',token)
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      // console.log("This is error",err)
      return res.status(403).send({ message: 'forbidden access from verify  ' })
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
    // app.post('/jwt', async (req, res) => {
    //   const user = req.body;
    //   const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
    //   res.send({ token })
    // })

     
    app.post('/jwt',async(req,res)=>{
      const user = req.body;
      // console.log(user)
      // console.log('user fot token', user)
      const token  = jwt.sign(user,process.env.ACCESS_TOKEN_SECRET,{expiresIn: '1h'})
      res.cookie('token',token,{
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      })
      .send({token})
    })

    

    // use verify admin after verifyToken
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      // console.log('decoded email',email)
      const query = { email: email }
      const user = await userCollection.findOne(query)
      // console.log('This is user admin',user)
      const isAdmin = user?.role === 'admin'
      if (!isAdmin) {
        return res.status(403).send({ message: 'forbidden' })
      }
      next()
    }


    // user verify volunteer api
    const verifyVolunteer = async (req, res, next) => {
      const email = req.decoded.email;
      // console.log('decoded email:',email)
      const query = { email: email }
      const user = await userCollection.findOne(query)
      // console.log('this is users',user)
      const isVolunteer = user?.role === 'volunteer'
      if (!isVolunteer) {
        return res.status(403).send({ message: 'forbidden' })
      }
      next()
    }


    // user related api

    app.get('/users',verifyToken,verifyAdmin,   async (req, res) => {
      const result = await userCollection.find().toArray()
      res.send(result)
    })

    app.get('/users/admin/:email',verifyToken,verifyAdmin,  async (req, res) => {
      const email = req.params.email;
      // console.log('email',email)
      // console.log('decoded email: ',req.decoded.email)
      if (email !== req.decoded.email) { 
        return res.status(403).send({ message: 'forbidden access' })
      }
      const query = { email: email };
      const user = await userCollection.findOne(query)
      let admin = false;
      if (user) {
        admin = user?.role === 'admin'
      }
      res.send({ admin })
    })

    app.get('/user/volunteer/:email',verifyToken,verifyVolunteer,async (req, res) => {
      const email = req.params.email;
      // console.log('email',email,req.decoded.email)
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' })
      }
      const query = { email: email };
      const user = await userCollection.findOne(query)
      let volunteer = false;
      if (user) {
        volunteer = user?.role === 'volunteer'
      }
      res.send({ volunteer })
    })

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

    
    app.patch('/users/admin/:id',verifyToken,verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updatedDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result)
    })

    app.patch('/user/:id',verifyToken,verifyAdmin, async (req, res) => {
      const data = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updatedDoc = {
        $set: {
          status: data.status
        }
      }
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result)
    }) 

    app.patch('/users/volunteer/:id',verifyToken,verifyAdmin,  async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updatedDoc = {
        $set: {
          role: 'volunteer'
        }
      }
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result)
    })

    
    app.delete('/users/:id', verifyToken,verifyAdmin,async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query)
      res.send(result)
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

    app.post('/blog', async (req, res) => {
      const blog = req.body;
      const result = await blogCollection.insertOne(blog);
      res.send(result)
    })

    app.patch('/blog/:id', async (req, res) => { 
      const data = req.body;  
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updateBlog = {
        $set: {
           status: data.status
        }
      } 
      console.log(updateBlog)
      const result = await blogCollection.updateOne(filter, updateBlog)
      res.send(result)

    })

    app.patch('/blogs/:id' , async (req, res) => {
      const data = req.body;
      console.log(data) 
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updateBlog = {
        $set: {
          title: data.title,
          img: data.img,
          description: data.description,
          publishDate: data.publishDate,
          status: data.status
        }
      }
      const result = await blogCollection.updateOne(filter, updateBlog)
      res.send(result)

    })

    app.delete('/blog/:id',async(req,res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await blogCollection.deleteOne(query)
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
          status: data.status
        }
      }
      const result = await requestCollection.updateOne(filter, updateReq)
      res.send(result)

    })

    app.patch('/request/:id',verifyToken,verifyAdmin, async (req, res) => {
      const data = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updateReq = {
        $set: { 
          status: data.status
        }
      }
      const result = await requestCollection.updateOne(filter, updateReq)
      res.send(result)

    })


    app.delete('/requests/:id',verifyToken,verifyAdmin, async (req, res) => {
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