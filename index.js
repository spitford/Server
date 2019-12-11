var io = require('socket.io')(process.env.PORT || 52300);

// Custom Classes
var Player = require('./Classes/Player.js');

console.log('Server Started');

var players = [];
var sockets = [];

io.on('connection', function(socket) {
    console.log('Client Connected');

    var player = new Player();
    var thisPlayerID = player.id;

    players[thisPlayerID] = player;
    sockets[thisPlayerID] = socket;

    // Tell client ID
    socket.emit('register', {id: thisPlayerID});
    socket.emit('spawn', player);
    socket.broadcast.emit('spawn', player);

    // Get info on other players
    for(var playerID in players) {
        if(playerID != thisPlayerID) {
            socket.emit('spawn', players[playerID]);
        }
    }

    socket.on('disconnect', function() {
        console.log('Player Disconnected');
        delete players[thisPlayerID];
        delete socket[thisPlayerID];
        socket.broadcast.emit('disconnected', player);
    });
});