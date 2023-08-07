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

        // Show all user
        app.get('/users', async (req, res) => {
            const users = await userCollection.find().toArray()
            res.send(users)
        })

        // Collect all user when they register
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


        // Show all communities, anyone can find his/her created community using query
        app.get('/communities', async (req, res) => {
            let query = {}
            if (req.query?.owner) {
                query = { owner: req.query.owner }
            }
            const result = await communityCollection.find(query).toArray()
            res.send(result)
        })

        // show all user that lies in a definite community, the value will change when parameter change
        app.get('/communities/:communityId', async (req, res) => {
            const id = req.params.communityId
            const filter = { _id: new ObjectId(id) }
            const singleCommunity = await communityCollection.findOne(filter)

            const member = singleCommunity.member
            const emails = member.map(obj => obj.email)
        
            const result = await userCollection.find({ email: { $in: emails.map(email => email) } }).toArray()
            
            res.send(result)
        })

        // show a random community's all post, it will change in every refresh
        app.get('/posts', async (req, res) => {

            const allcategories = await communityCollection.find({}, { projection: { _id: 1, name: 1 } }).toArray()
            const selectedCommunity = await allcategories[Math.floor(Math.random() * allcategories.length)]
            const comIdString = selectedCommunity._id
            const str = comIdString.toString()
            const communityPosts = await postCollection.find({ communityId: str }).toArray()
            const result = [{ title: selectedCommunity?.name, posts: communityPosts }]
            res.send(result)
        })

        // collect all post and store in database
        app.post('/posts', async (req, res) => {

            const post = req.body
            const result = await postCollection.insertOne(post)
            res.send(result)
        })

        // collect all communities and store in database
        app.post('/communities', async (req, res) => {
            const { name, description, owner } = req.body;
            const newCommunity = { name, description, owner, member: [] }
            const result = await communityCollection.insertOne(newCommunity)
            res.send(result)
        })

        // join a definite community, it would store a member email in member array in single community collection
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