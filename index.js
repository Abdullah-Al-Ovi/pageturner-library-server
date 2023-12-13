const express = require('express')
const app = express()
const cors = require('cors')
const nodemailer = require('nodemailer');
const cookieParser = require('cookie-parser');
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
app.use(cookieParser());

const verifyingToken = (req,res,next)=>{
  const token = req.cookies.token
  console.log(token);
  console.log(process.env.ACCESS_TOKEN);
  if(!token){
   return res.status(401).send({message:'User unauthorized'})
  }
  jwt.verify(token,process.env.ACCESS_TOKEN,(err,decoded)=>{
    if(err){
      return res.status(401).send({message:'User unauthorized'})
    }
    req.user = decoded 
    next()
  })
}

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
    // await client.connect();
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

    const categoryCollection= client.db('librarymanagementDB').collection('categoryCollection')
    const bookCollection = client.db('librarymanagementDB').collection('bookCollection')
    const borrowedBookCollection = client.db('librarymanagementDB').collection('borrowedBookCollection')
    const userCollection = client.db('librarymanagementDB').collection('userCollection')

    app.get('/users',async(req,res)=>{
      const cursor =  userCollection.find({})
      const result = await cursor.toArray()
      res.send(result) 
    }) 
    app.get('/categories',async(req,res)=>{
      const cursor =  categoryCollection.find({})
      const result = await cursor.toArray()
      res.send(result) 
    })
    app.get('/allBooks',verifyingToken,async(req,res)=>{
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
      console.log(req.user);

      const email = req.params.email 
      // if(email !== req?.user.email){
      //   return res.status(403).send({message:'Access denied'})
      // }
      const cursor = borrowedBookCollection.find({userEmail:email})
      const result = await cursor?.toArray()
      res.send(result)
    })
    app.get('/increaseQuantity/:bookName',async(req,res)=>{
      const bookName = req.params.bookName
      const result = await bookCollection.findOne({name:bookName })
      res.send(result)
    })

    app.post('/send-email',  (req, res) => {
      const { to, subject, text } = req.body;
      console.log(to, subject, text);
      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: process.env.NODEMAILER_USER,
          pass: process.env.NODEMAILER_PASS,
        },
      });
      const mailOptions = {
        from: process.env.NODEMAILER_USER,
        to: to,
        subject: subject,
        text: text,
      };
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.log(error);
          return res.status(500).send(error.toString());
        }
        res.status(200).send(info.response);
      });
    });

    app.post('/users', async (req, res) => {
      const userInfo = req.body
      const existUser = await userCollection.findOne({ email: userInfo.email })
      if (existUser) {
        return res.send({ message: 'user already exist', insertedId: null })
      }
      const result = await userCollection.insertOne(userInfo)
      res.send(result)
    })
    app.post('/addBook',verifyingToken,async(req,res)=>{
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
      const borrowedBookCount = await borrowedBookCollection.find({userEmail : borrowInfo.userEmail}).toArray()
      if(!findExisting && borrowedBookCount?.length <5){
        const result = await borrowedBookCollection.insertOne(borrowInfo)
        res.send(result)
      }
      else{
        return res.send({message:'This book is already borrowed by you'})
      }
      
    })

    app.post('/jwt',async(req,res)=>{
      const user = req.body 
      const token = jwt.sign(user,process.env.ACCESS_TOKEN,{
        expiresIn: '1h'
      })
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', 
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',

    }).send({success:true})
    })

    app.post('/logOut',(req,res)=>{
      const loggesUser = req.body
      console.log(loggesUser);
      res.clearCookie('token', { maxAge: 0, secure: true, sameSite:'none' });
      res.send({success:true})
    })

    app.put('/update/:id',verifyingToken,async(req,res)=>{
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
      let {quantity} = req.body
      console.log(quantity,id);
      const filter = {_id:new ObjectId(id)}
      // const updatedQuantity = quantity === null ? 0 : quantity
      if (quantity === null) {
        quantity = 0;
      }
      const update = {
        $set:{
          quantity: quantity
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
