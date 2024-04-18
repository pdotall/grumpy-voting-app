const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
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
            // Remove previous votes from all categories
            ['yes', 'no', 'maybe'].forEach(voteType => {
                const index = votes[questionId][voteType].indexOf(username);
                if (index !== -1) votes[questionId][voteType].splice(index, 1);
            });

            // Add new vote
            votes[questionId][vote].push(username);
            io.emit('update', { questions, votes });  // Update all clients with new vote status
        }
    });

    socket.on('disconnect', () => {
        console.log(`${socket.username} disconnected`);
        // Clean up user data if necessary
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
