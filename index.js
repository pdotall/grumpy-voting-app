const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",  // Adjust as necessary for production
        methods: ["GET", "POST"]
    }
});

// Serve static files (CSS, JS, images)
app.use(express.static('public'));

// Route to serve the index.html file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

let questions = [];
let votes = {};
let userModes = {};  // Tracking user modes: 'Ops' or 'Angel'

io.on('connection', (socket) => {
    socket.on('registerUser', (username) => {
        userModes[username] = (username === 'pedro' || username === 'dino') ? 'Ops' : 'Angel';
        socket.username = username;
        socket.emit('modeUpdate', userModes[username]);
        socket.emit('update', { questions, votes });  // Emit existing questions and votes to new user
    });

    socket.on('toggleMode', (username) => {
        if (username === 'pedro' || username === 'dino') {
            userModes[username] = userModes[username] === 'Ops' ? 'Angel' : 'Ops';
            socket.emit('modeUpdate', userModes[username]);
        }
    });

    socket.on('newQuestion', (question) => {
        const questionId = questions.length;
        questions.push({ id: questionId, text: question });
        votes[questionId] = { yes: [], no: [], maybe: [] };
        io.emit('update', { questions, votes });  // Broadcast the new question to all clients
    });

    socket.on('vote', ({ questionId, vote, username }) => {
        if (userModes[username] === 'Angel') {
            ['yes', 'no', 'maybe'].forEach(voteType => {
                const index = votes[questionId][voteType].indexOf(username);
                if (index !== -1) {
                    votes[questionId][voteType].splice(index, 1);
                }
            });
            votes[questionId][vote].push(username);
            io.emit('update', { questions, votes });
        }
    });

    socket.on('disconnect', () => {
        console.log(`${socket.username} disconnected`);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
