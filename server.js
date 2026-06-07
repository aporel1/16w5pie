const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const qrcode = require('qrcode-terminal');
const os = require('os'); // <-- Changed: Using Node's native OS module instead of internal-ip

app.use(express.static('public'));

// --- HELPER FUNCTION TO GET LOCAL IP IN WSL/LINUX ---
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // Filter out loopback (127.0.0.1) and non-IPv4 addresses
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return '127.0.0.1'; // Fallback if no network interface is active
}

// --- GAME STATE ---
let players = [];
let gameInProgress = false;
let round = 1;
let votes = {}; 

const wordPacks = [
    { normal: "BEACH", impostor: "POOL" },
    { normal: "DOG", impostor: "WOLF" },
    { normal: "CINEMA", impostor: "THEATER" },
    { normal: "PIZZA", impostor: "HAMBURGER" },
    { normal: "PLANE", impostor: "HELICOPTER" }
];

// --- LOGIC ---
io.on('connection', (socket) => {
    
    // 1. CONNECTION AND LOBBY
    socket.on('join', (name) => {
        if (gameInProgress) return;
        players.push({ 
            id: socket.id, 
            name: name, 
            role: 'SPECTATOR', 
            alive: true,
            isImpostor: false 
        });
        io.emit('updateList', players);
    });

    // 2. START GAME
    socket.on('startGame', (desiredImpostors) => {
        if (players.length < 3) return; 
        
        gameInProgress = true;
        round = 1;
        votes = {};
        
        const pack = wordPacks[Math.floor(Math.random() * wordPacks.length)];
        players.sort(() => Math.random() - 0.5);

        players.forEach((player, index) => {
            player.alive = true;
            if (index < desiredImpostors) {
                player.role = 'IMPOSTOR';
                player.isImpostor = true;
                player.word = pack.impostor;
            } else {
                player.role = 'NORMAL';
                player.isImpostor = false;
                player.word = pack.normal;
            }
            
            io.to(player.id).emit('gameStart', {
                role: player.role,
                word: player.word,
                round: round
            });
        });

        io.emit('systemMessage', `The game has started! Round ${round}`);
        io.emit('updateList', players);
    });

    // 3. VOTING PROCESS
    socket.on('vote', (targetId) => {
        if (!gameInProgress) return;
        const voter = players.find(p => p.id === socket.id);
        if (voter && voter.alive) {
            votes[socket.id] = targetId; 
            io.emit('someoneVoted', { voterId: socket.id }); 
        }
    });

    // 4. END VOTING ROUND
    socket.on('nextRound', () => {
        if (!gameInProgress) return;

        let voteTally = {};
        Object.values(votes).forEach(targetId => {
            voteTally[targetId] = (voteTally[targetId] || 0) + 1;
        });

        let mostVotedId = null;
        let maxVotes = 0;
        let tie = false;

        for (const [id, numVotes] of Object.entries(voteTally)) {
            if (numVotes > maxVotes) {
                maxVotes = numVotes;
                mostVotedId = id;
                tie = false;
            } else if (numVotes === maxVotes) {
                tie = true;
            }
        }

        let resultMessage = "";
        if (tie || maxVotes === 0 || !mostVotedId) {
            resultMessage = "It's a tie or nobody voted. No one was eliminated.";
        } else {
            const eliminated = players.find(p => p.id === mostVotedId);
            if (eliminated) {
                eliminated.alive = false;
                resultMessage = `${eliminated.name} has been eliminated. Role was: ${eliminated.role}`;
            }
        }

        votes = {}; 
        io.emit('systemMessage', resultMessage);
        io.emit('updateList', players);

        const alivePlayers = players.filter(p => p.alive);
        const aliveImpostors = alivePlayers.filter(p => p.isImpostor).length;
        const aliveNormals = alivePlayers.filter(p => !p.isImpostor).length;

        if (aliveImpostors === 0) {
            endGame("CITIZENS WIN! All impostors have been eliminated.");
        } else if (aliveImpostors >= aliveNormals) {
            endGame("IMPOSTORS WIN! They have equaled or outnumbered the citizens.");
        } else {
            round++;
            io.emit('newRound', round);
        }
    });

    // 5. DISCONNECT
    socket.on('disconnect', () => {
        players = players.filter(p => p.id !== socket.id);
        io.emit('updateList', players);
        if (players.length === 0) {
            gameInProgress = false;
            votes = {};
        }
    });
});

function endGame(message) {
    gameInProgress = false;
    io.emit('gameOver', message);
}

// --- BOOTSTRAP SERVER ---
const PORT = 3000;
http.listen(PORT, () => { // <-- Changed: Removed 'async' since we don't await internal-ip anymore
    console.clear();
    const ip = getLocalIP(); // <-- Instantly resolves native network interfaces
    const url = `http://${ip}:${PORT}`;
    console.log('Impostor Game is running.');
    qrcode.generate(url, { small: true });
    console.log(`Join at: ${url}`);
});
