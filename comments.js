// Create web server
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { randomBytes } = require('crypto');
const axios = require('axios')

const app = express();
app.use(bodyParser.json());
app.use(cors());

// Create comments object
const commentsByPostId = {};

// Create get request for comments
app.get('/posts/:id/comments', (req, res) => {
    res.send(commentsByPostId[req.params.id] || []);
});

// Create post request for comments
app.post('/posts/:id/comments', async (req, res) => {
    const commentId = randomBytes(4).toString('hex');
    const { content } = req.body;
    // Get comments from commentsByPostId object
    const comments = commentsByPostId[req.params.id] || [];
    // Add new comments to comments object
    comments.push({ id: commentId, content, status: 'pending' });
    // Add comments to commentsByPostId object
    commentsByPostId[req.params.id] = comments;
    // Send event to event bus
    await axios.post('http://localhost:4005/events', {
        type: 'CommentCreated',
        data: {
            id: commentId,
            content,
            postId: req.params.id,
            status: 'pending'
        }
    });
    res.status(201).send(comments);
});

// Create post request for events
app.post('/events', async (req, res) => {
    console.log('Event Received: ', req.body.type);
    const { type, data } = req.body;
    // Check if event type is CommentModerated
    if (type === 'CommentModerated') {
        const { postId, id, status, content } = data;
        // Get comments from commentsByPostId object
        const comments = commentsByPostId[postId];
        // Find comment from comments object
        const comment = comments.find(comment => {
            return comment.id === id;
        });
        // Update comment status
        comment.status = status;
        // Send event to event bus
        await axios.post('http://localhost:4005/events', {
            type: 'CommentUpdated',
            data: {
                id,
                postId,
                status,
                content
            }
        });
    }
    res.send({});
});

// Listen to port
app.listen(400)