const app = require('express')();
const server = require('http').createServer(app);
const fs = require('fs');

const io = require('socket.io')(server,{
    cors:{
        origin:"*"
    }
})

// unique id
const crypto = require('crypto')
const randomId = () => crypto.randomBytes(8).toString("hex");
// generate random number for the text input to display the typed text
const randomNumberGenerator = () => Math.floor(Math.random() * 11);

const game = {};
const users = {};

app.get('/',(req,res)=>{
    fs.readFile('./log.txt','utf-8',(err,data)=>{
    if(err) {
        res.send("Couldn't not read file");
        return;
    }
    res.send(data);
})
})

// middle ware
io.use((socket,next)=>{
    let user = {username : socket.handshake.auth.username}
    users[socket.id] = user;
    console.log(users);
    fs.appendFile('./log.txt',`\nusername : ${socket.handshake.auth.username} - joined\n`,(err,data)=>{
        if(err) console.log('failed to write');
        console.log('successfull');
    })
    next();
})

io.on('connection',(socket)=>{

    console.log(socket.conn.transport.name)
    // when a new socket is connected
    console.log(socket.handshake.auth.username,'is connected')

    socket.conn.on("upgrade", () => {
        const upgradedTransport = socket.conn.transport.name; // in most cases, "websocket"
    });

    // when a player wants to create a new game id
    socket.on('create',(res)=>{
        const gameId = randomId();
        let randomTextIndex = randomNumberGenerator();
        game[gameId] = {
            id : gameId,
            players : [socket.id],
            username : [socket.handshake.auth.username],
            textIndex : randomTextIndex
        }
        io.to(socket.id).emit('create',{gameId,randomTextIndex});
    })

    // when a player joins with a gameid
    socket.on('join',(res)=>{
        const gameId = res.gameId;
        const clientId = res.clientId;
        const username = res.username;
        if(!(gameId in game)){
            console.log('wrong gameid');
            errorMessage(socket.id,"wrong game id");
            return;
        }
        // if user exceed the limit of 2, dont do anything
        if(game[gameId].players.length>=2) {
            console.log('max player already reached')
            errorMessage(socket.id,"max player already reached");
            return;
        }
        // else
        game[gameId].players.push(clientId);
        game[gameId].username.push(username);
        console.log(game[gameId])
        io.to(clientId).to(game[gameId].players[0]).emit('join',game[gameId]);
    })

    function errorMessage(to, message){
        io.to(to).emit('error',{message});
    }

    // when a player types, emit the players value to other player
    socket.on('play',(res)=>{
        io.to(res.otherId).emit('play',res.value);
    })

    // when the user disconnects from socket
    socket.on('disconnect',()=>{
        // delete user from object user
        delete users[socket.id];
        console.log(users);
        console.log(socket.handshake.auth.username,'disconnected')
    })
})

const PORT = process.env.PORT || 5000;
server.listen(PORT,()=>{
    console.log("server is listening on port 5000")
})
