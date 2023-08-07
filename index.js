const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.port || 5000;

app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
    res.send('Travel Application is running')
})


console.log();
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.kyulyzl.mongodb.net/?retryWrites=true&w=majority`;

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

        const userCollection = client.db('travel-application').collection('users')
        const communityCollection = client.db('travel-application').collection('communities')
        const postCollection = client.db('travel-application').collection('posts')

        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();

        app.get('/users', async (req, res) => {
            const users = await userCollection.find().toArray()
            res.send(users)
        })

        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email }
            const existingUser = await userCollection.findOne(query)
            console.log('existing user', existingUser);
            if (existingUser) {
                return res.send({ message: 'User already exits' })
            }
            const result = await userCollection.insertOne(user)
            res.send(result)
        })

        app.get('/communities', async (req, res) => {
            let query = {}
            if (req.query?.owner) {
                query = { owner: req.query.owner }
            }
            const result = await communityCollection.find(query).toArray()
            res.send(result)
        })

        app.get('/communities/:communityId', async (req, res) => {
            const id = req.params.communityId
            const filter = { _id: new ObjectId(id) }
            const singleCommunity = await communityCollection.findOne(filter)

            const member = singleCommunity.member
            const emails = member.map(obj => obj.email)
            console.log(emails);
            const result = await userCollection.find({ email: { $in: emails.map(email => email)} }).toArray()
            // console.log(result);
            res.send(result)
        })

        app.get('/posts', async (req, res) => {
        
            const allcategories = await communityCollection.find({}, { projection: { _id: 1, name: 1 } }).toArray()
            const selectedCommunity = await allcategories[Math.floor(Math.random() * allcategories.length)]
            const comIdString = selectedCommunity._id
            const str = comIdString.toString()
            const communityPosts = await postCollection.find({ communityId: str }).toArray()
            const result = [{ title: selectedCommunity?.name, posts: communityPosts }]

            res.send(result)
        })

        app.post('/posts', async (req, res) => {

            const post = req.body
            const result = await postCollection.insertOne(post)
            res.send()
        })

        app.post('/communities', async (req, res) => {
            const { name, description, owner } = req.body;
            const newCommunity = { name, description, owner, member: [] }
            const result = await communityCollection.insertOne(newCommunity)
            res.send(result)
        })

        app.post('/communities/:communityId', async (req, res) => {
            const userEmail = req.body.owner
            const id = req.params.communityId
            const filter = { _id: new ObjectId(id) }
            const user = await userCollection.findOne({ email: userEmail })
            if (user?.communities) {
                user.communities.push(id)
            } else {
                user.communities = [id]
            }
            const updateUser = await userCollection.updateOne({ email: userEmail }, {
                $set: {
                    communities: user?.communities
                }
            })
            const result = await communityCollection.updateOne(
                filter,
                {
                    $push: {
                        member: {
                            email: userEmail,
                            // other fields you want to add
                        }
                    }
                }
            )
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


app.listen(port, () => {
    console.log(`Travelers are running on port ${port}`);
})