let Connection = require('./Connection')
let Player = require('./Player')

let LobbyBase = require('./Lobbies/LobbyBase')
let GameLobby = require('./Lobbies/GameLobby')
let GameLobbySettings = require('./Lobbies/GameLobbySettings')

module.exports = class Server {
    constructor() {
        this.connections = [];
        this.lobbies = [];

        this.lobbies[0] = new LobbyBase(0);
    }

    onUpdate() {
        let server = this;

        for(let id in server.lobbies) {
            server.lobbies[id].onUpdate();
        }
    }

    onConnected(socket) {
        let server = this;
        let connection = new Connection();
        connection.socket = socket;
        connection.player = new Player();
        connection.server = server;

        let player = connection.player;
        let lobbies = server.lobbies;

        console.log('Player connected (' + player.id + ')');
        server.connections[player.id] = connection;

        socket.join(player.lobby);
        connection.lobby = lobbies[player.lobby];
        connection.lobby.onEnterLobby(connection);

        return connection;
    }
    
    onDisconnected(connection = Connection) {
        let server = this;
        let id = connection.player.id;

        delete server.connections[id];
        console.log('Player ' + connection.player.displayPlayerInfo() + ' has disconnected');

        connection.socket.broadcast.to(connection.player.lobby).emit('disconnected', {
            id: id
        });

        let currentLobbyIndex = connection.player.lobby;
        server.lobbies[currentLobbyIndex].onLeaveLobby(connection);

        if (currentLobbyIndex != 0 && server.lobbies[currentLobbyIndex].connections.length == 0) {
            console.log('Closing down lobby (' + currentLobbyIndex + ')');
            server.lobbies.splice(currentLobbyIndex, 1);
        }
    }

    onAttemptToJoinGame(connection = Connection) {
        let server = this;
        let lobbyFound = false;

        let gameLobbies = server.lobbies.filter(item => {
            return item instanceof GameLobby;
        });
        console.log('Found (' + gameLobbies.length + ') lobbies on the server');

        gameLobbies.forEach(lobby => {
            if(!lobbyFound) {
                let canJoin = lobby.canEnterLobby(connection);

                if(canJoin) {
                    lobbyFound = true;
                    server.onSwitchLobby(connection, lobby.id);
                }
            }
        });

        if(!lobbyFound) {
            console.log('Making a new Game Lobby');
            let gamelobby = new GameLobby(gameLobbies.length + 1, new GameLobbySettings('FFA', 1));
            server.lobbies.push(gamelobby);
            server.onSwitchLobby(connection, gamelobby.id);
        }
    }

    onSwitchLobby(connection = Connection, lobbyID) {
        let server = this;
        let lobbies = server.lobbies;

        connection.socket.join(lobbyID);
        connection.lobby = lobbies[lobbyID];

        lobbies[connection.player.lobby].onLeaveLobby(connection);
        lobbies[lobbyID].onEnterLobby(connection);
    }
}