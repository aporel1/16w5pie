const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const qrcode = require('qrcode-terminal');
const { internalIpV4 } = require('internal-ip');

app.use(express.static('public'));

// --- GAME STATE ---
let players = [];
let gameInProgress = false;
let round = 1;
let votes = {}; // Stores { "voterId": "targetId" }

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
        
        // Register or reset the player upon joining/reconnecting
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
        if (players.length < 3) return; // Minimum 3 players required
        
        gameInProgress = true;
        round = 1;
        votes = {};
        
        // Select a random word pack
        const pack = wordPacks[Math.floor(Math.random() * wordPacks.length)];
        
        // Shuffle players array randomly
        players.sort(() => Math.random() - 0.5);

        players.forEach((player, index) => {
            player.alive = true;
            
            // The first N players are assigned as impostors
            if (index < desiredImpostors) {
                player.role = 'IMPOSTOR';
                player.isImpostor = true;
                player.word = pack.impostor;
            } else {
                player.role = 'NORMAL';
                player.isImpostor = false;
                player.word = pack.normal;
            }
            
            // Send private game data to each specific player
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
        
        // Only living players can vote, and they can change their vote during the round
        if (voter && voter.alive) {
            votes[socket.id] = targetId; 
            io.emit('someoneVoted', { voterId: socket.id }); // Visual feedback without revealing the choice
        }
    });

    // 4. END VOTING ROUND & CALCULATE RESULTS
    socket.on('nextRound', () => {
        if (!gameInProgress) return;

        // --- TALLY VOTES ---
        let voteTally = {};
        Object.values(votes).forEach(targetId => {
            voteTally[targetId] = (voteTally[targetId] || 0) + 1;
        });

        // Find the player with the highest vote count
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

        // --- RESOLUTION ---
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

        // --- CLEANUP AND ADVANCE ---
        votes = {}; // Reset votes container
        io.emit('systemMessage', resultMessage);
        io.emit('updateList', players);

        // --- CHECK WIN CONDITIONS ---
        const alivePlayers = players.filter(p => p.alive);
        const aliveImpostors = alivePlayers.filter(p => p.isImpostor).length;
        const aliveNormals = alivePlayers.filter(p => !p.isImpostor).length;

        if (aliveImpostors === 0) {
            endGame("CITIZENS WIN! All impostors have been eliminated.");
        } else if (aliveImpostors >= aliveNormals) {
            endGame("IMPOSTORS WIN! They have equaled or outnumbered the citizens.");
        } else {
            // Proceed to next round if no victory conditions are met
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
http.listen(PORT, async () => {
    console.clear();
    const ip = await internalIpV4();
    const url = `http://${ip}:${PORT}`;
    console.log('Impostor Game is running.');
    qrcode.generate(url, { small: true });
    console.log(`Join at: ${url}`);
});