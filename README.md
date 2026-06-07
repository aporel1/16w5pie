# 🕵️ The Impostor Game

A real-time, local multiplayer party social deduction game built with **Node.js**, **Express**, and **Socket.io**. Players receive secret words on their devices, debate, and vote to uncover the hidden Impostor among them.

---

## 📋 Table of Contents
1. [What is this Game?](#-what-is-this-game)
2. [Game Rules & Gameplay Logic](#-game-rules--gameplay-logic)
3. [How to Run and Install](#-how-to-run-and-install)
4. [How to Connect (Local Network Requirements)](#-how-to-connect-local-network-requirements)
5. [Tech Stack & Architecture](#-tech-stack--architecture)
6. [How to Add More Word Packs](#-how-to-add-more-word-packs)
7. [Complete Source Code](#-complete-source-code)
    * [Backend: server.js](#backend-serverjs)
    * [Frontend: public/index.html](#frontend-publicindexhtml)

---

## 🎮 What is this Game?

This project is a web-based, real-time social deduction party game designed to be played with friends in the same room using mobile phones or computers. It is heavily inspired by board games and social party games like *Spyfall* or *Undercover*, where communication, deception, and deduction are the core mechanics.

---

## 🕹️ Game Rules & Gameplay Logic

### 1. Secret Roles & Words
When a match begins, the server randomly selects a word pack. The game instantly splits players into two secret roles:
* **Citizens (NORMAL):** They receive the standard secret word (e.g., `BEACH`).
* **The Impostor (IMPOSTOR):** They receive a highly similar but slightly different decoy word (e.g., `POOL`). 

> **The Catch:** Nobody knows what role the other players have, and the Impostor *does not know* they are the Impostor at first—they believe their word is the correct one!

### 2. The Discussion Phase
Players take turns describing their word using a single sentence, concept, or adjective without saying the word out loud. 
* **Citizens** want to find others who have the same word while staying subtle so the Impostor doesn't guess it.
* **The Impostor** wants to blend in and must pay close attention to descriptions to deduce the Citizens' word if they realize their own word feels slightly "off".

### 3. The Voting Process
* At any point during the discussion, players can cast a vote on the person they find most suspicious.
* Players can dynamically change or switch their vote during the round based on new arguments.
* The room host manages the game and clicks **Close Voting / Next Round** to freeze the data and check the results.

### 4. Round Resolution & Win Conditions
The server automatically tallies the active votes and processes the outcome:
* **Elimination:** The player with the highest unique vote count is eliminated, and their true identity/role is broadcasted to everyone.
* **Tie/Skipped:** If there is a tie or no votes are cast, the round ends with no casualties.

**The game instantly ends when:**
* **Citizens Win:** All Impostors are successfully voted out and eliminated.
* **Impostors Win:** The number of remaining alive Impostors becomes **equal to or greater than** the number of alive Citizens (meaning they can no longer be voted out mathematically).

---

## 🚀 How to Run and Install

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed on your host machine.

### Installation Steps
1. Create a project directory and make sure your code files match this folder structure:
   ```text
   ├── server.js
   └── public/
       └── index.html

    Open your terminal or command prompt in the project root folder and install the required NPM dependencies:
    Bash

    npm install express socket.io qrcode-terminal internal-ip

    Start the application:
    Bash

    node server.js

Once started, the console will automatically clear and display a QR Code alongside a local network URL (e.g., http://192.168.1.50:3000).
🌐 How to Connect (Local Network Requirements)

Because this game is designed to be a local party game, players connect using their smartphones or computers via your local area network (LAN).
The "Same Wi-Fi Network" Rule

    The Host: Running node server.js binds the server instance to your machine's local IP address.

    The Players: For friends to join, all devices (phones, laptops, tablets) must be connected to the exact same Wi-Fi network as the host computer.

    Connecting: Players can simply scan the QR code generated on the host's terminal screen or manually type the displayed network URL (e.g., http://192.168.X.X:3000) into any mobile browser.

    Testing alone: If you want to play test the mechanics on a single computer, simply open multiple browser tabs/windows and navigate to http://localhost:3000.

🛠️ Tech Stack & Architecture

The application architecture relies on an event-driven design to ensure real-time responsiveness without unnecessary overhead:

    Backend Engine (server.js): Built with Express and native Node HTTP modules. It serves static client files, securely manages the global memory state parameters (players array, active votes), evaluates game-over win conditions on demand, and implements network lookups to automatically parse the active network interfaces.

    Real-time Pipeline (Socket.io): Avoids messy HTTP polling or REST routes. It utilizes persistent WebSocket tunnels to handle bidirectional event emission (join, startGame, vote, nextRound) with atomic JSON payloads.

    Client Interface (public/index.html): Developed as a lightweight Single Page Application (SPA) using clean HTML5, modern CSS3 animations (@keyframes), and vanilla JavaScript. Screen switching is managed on the client side via custom event triggers that toggle visibility utility classes (.screen vs .screen.active).

📝 How to Add More Word Packs

The game logic is fully automated and decoupling-friendly. You do not need to modify any HTML, client scripts, or structural engine code to expand the game's dictionary.
Steps to Expand Vocabulary:

    Open server.js.

    Locate the wordPacks array constant near the top of the script.

    Append a new object inside the array matching this explicit syntax:

JavaScript

const wordPacks = [
    { normal: "BEACH", impostor: "POOL" },
    { normal: "DOG", impostor: "WOLF" },
    // --- ADD YOUR NEW WORD PACKS HERE ---
    { normal: "COFFEE", impostor: "TEA" },
    { normal: "IPHONE", impostor: "ANDROID" },
    { normal: "BATMAN", impostor: "SPIDERMAN" },
    { normal: "GUITAR", impostor: "PIANO" }
];

💡 Design Tips for Great Word Packs:

    Keep them related: The words for normal (Citizens) and impostor must belong to the exact same category or concept.

    The Difficulty Balance: If the words are too different (e.g., Apple vs Submarine), the Impostor will be exposed immediately on turn one. If the words are well-matched (e.g., Laptop vs Tablet), the descriptions will overlap heavily, leading to much funnier debates, double bluffs, and intense voting rounds!