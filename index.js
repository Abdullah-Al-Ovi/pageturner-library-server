const express = require('express')
const app = express()
const cors = require('cors')
const jwt = require('jsonwebtoken')
const { MongoClient, ServerApiVersion ,ObjectId} = require('mongodb');
const port = process.env.PORT || 5000
require('dotenv').config()
app.use(cors({
  credentials:true,
  origin:['http://localhost:5173']
}))
app.use(express.json())

// configuring mongodb connection:


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.wukhoja.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

    const categoryCollection= client.db('librarymanagementDB').collection('categoryCollection')
    const bookCollection = client.db('librarymanagementDB').collection('bookCollection')

    app.get('/categories',async(req,res)=>{
      const cursor =  categoryCollection.find({})
      const result = await cursor.toArray()
      res.send(result) 
    })
    app.get('/allBooks',async(req,res)=>{
      const cursor =  bookCollection.find({})
      const result = await cursor.toArray()
      res.send(result) 
    })
    app.get('/category/:cat',async(req,res)=>{
      const cat = req.params.cat
      const cursor = bookCollection.find({category : cat})
      const result = await cursor.toArray()
      res.send(result)
    })
    
  } 
  
  
  finally {
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/',(req,res)=>{
    res.send('Server is running')
})
app.listen(port,()=>{
    console.log('Server is running on',port);
})
