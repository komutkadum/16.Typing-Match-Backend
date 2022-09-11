const app = require('express')();
const server = require('http').createServer(app);

const io = require('socket.io')(server,{
    cors:{
        origin:"*"
    }
})

// unique id
const crypto = require('crypto')
const randomId = () => crypto.randomBytes(8).toString("hex");

const game = {};
const users = {};

// middle ware
io.use((socket,next)=>{
    let user = {username : socket.handshake.auth.username}
    users[socket.id] = user;
    console.log(users);
    next();
})

io.on('connection',(socket)=>{

    // when a new socket is connected
    console.log(socket.handshake.auth.username,'is connected')

    // when a player wants to create a new game id
    socket.on('create',(res)=>{
        const gameId = randomId();
        game[gameId] = {
            id : gameId,
            players : [socket.id],
            username : [socket.handshake.auth.username]
        }
        io.to(socket.id).emit('create',{gameId});
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
        console.log(socket.handshake.auth.username,'disconnected')
    })
})

const PORT = process.env.PORT || 5000;
server.listen(PORT,()=>{
    console.log("server is listening on port 5000")
})