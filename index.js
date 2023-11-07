const express = require('express')
const app = express()
const cors = require('cors')
const jwt = require('jsonwebtoken')
const { MongoClient, ServerApiVersion ,ObjectId} = require('mongodb');
const port = process.env.PORT || 5000
require('dotenv').config()
app.use(cors({
  credentials:true,
  origin:['http://localhost:5173','https://pageturnerlibrary.surge.sh'],
  // methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
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
    const borrowedBookCollection = client.db('librarymanagementDB').collection('borrowedBookCollection')

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
    app.get('/filteredBooks',async(req,res)=>{
      const cursor = bookCollection.find({quantity:{$ne:0}})
      const result = await cursor.toArray()
      res.send(result)
    })
    app.get('/category/:cat',async(req,res)=>{
      const cat = req.params.cat
      const cursor = bookCollection.find({category : cat})
      const result = await cursor.toArray()
      res.send(result)
    })
    app.get('/book/:id',async(req,res)=>{
      const id = req?.params?.id
      const result = await bookCollection.findOne({_id: new ObjectId(id)})
      res.send(result)
    })
    app.get('/borrowedBooks/:email',async(req,res)=>{
      const email = req.params.email 
      const cursor = borrowedBookCollection.find({userEmail:email})
      const result = await cursor?.toArray()
      res.send(result)
    })
    app.post('/addBook',async(req,res)=>{
      const bookInfo = req.body
      const result = await bookCollection.insertOne(bookInfo)
      res.send(result)
    })
    app.post('/addToBorrowed',async(req,res)=>{
      const borrowInfo = req.body
      const findExisting = await borrowedBookCollection.findOne({
        userEmail : borrowInfo.userEmail,
        bookName : borrowInfo.bookName
      })
      if(findExisting){
        return res.status(400).send({message:'This book is already borrowed by you'})
      }
      else{
        const result = await borrowedBookCollection.insertOne(borrowInfo)
        res.send(result) 
      }
      
    })
    app.put('/update/:id',async(req,res)=>{
      const id = req.params.id
      const {name,author_name,category,image,rating} = req.body
      const option = {upsert:true}
      const updatedBook ={
        $set:{
          name:name,
          author_name:author_name,
          category:category,
          image:image,
          rating:rating
        }
      }
      const result = await bookCollection.updateOne({_id:new ObjectId(id)},updatedBook,option)
      res.send(result)
    })

    app.patch('/updateQuantity/:id',async(req,res)=>{
      const id = req.params.id 
      const {quantity} = req.body
      const filter = {_id:new ObjectId(id)}
      const updatedQuantity = quantity === null ? 0 : quantity
      const update = {
        $set:{
          quantity: updatedQuantity
        }
      }
      const result = await bookCollection.updateOne(filter,update)
      res.send(result)
    })
    app.delete('/returnBook/:id',async(req,res)=>{
        const id = req.params.id 
        const result =await borrowedBookCollection.deleteOne({_id:new ObjectId(id)})
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
