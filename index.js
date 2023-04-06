const http = require("http");
const ws = require('websocket');
const app = require('express')();

app.get('/', (req, res) => res.sendFile(__dirname + "/index.html"));

app.listen("9090", console.log("Listening to http port 9090"))

const WebSocketServer = ws.server;

const httpServer = http.createServer()

httpServer.listen(8080, () => console.log(`Listening on 8080`))

const clients = {} //hashmap  {"clientId1":{} , "clientId2":{}}
const games = {}; //{"gameId1":{} , "gameId2":{}}

const wsServer = new WebSocketServer({
    "httpServer": httpServer
});

wsServer.on("request", (request) => {

    const connection = request.accept(null, request.origin);
    connection.on("open", () => console.log("OPENED"));
    connection.on("close", () => console.log("CLOSED"))
    connection.on("message", (message) => {

        //Recieved message from the client

        const result = JSON.parse(message.utf8Data);

        //I have recieved a message from the client 

        console.log(result);

        if (result.method === 'create') {

            const clientId = result.clientId;
            const gameId = guid();
            games[gameId] = {
                "id": gameId,
                "balls": 20,
                "clients": []
            }

            const payLoad = {
                "method": "create",
                "game": games[gameId]
            }

            const conn = clients[clientId].connection;
            conn.send(JSON.stringify(payLoad));
        }

        if (result.method === 'join') {

            const clientId = result.clientId;


            const gameId = result.gameId;
            const game = games[gameId];

            console.log("nam1", clientId);
            console.log("nam2", game)

            if (game.clients.length >= 3) {
                return;
            }
            const color = {
                "0": "Red",
                "1": "Blue",
                "2": "Green"
            } [game.clients.length];

            game.clients.push({
                "clientId": clientId,
                "color": color
            });

            if (game.clients.length === 3) updateGameState();

            const payLoad = {
                "method": "join",
                "game": game
            }

            game.clients.forEach(c => {
                console.log(c, "here")
                clients[c.clientId].connection.send(JSON.stringify(payLoad))
            });


        }

        if (result.method === 'play') {
            const clientId = result.clientId;
            const gameId = result.gameId;
            const ballId = result.ballId;
            const color = result.color;
            let state = games[gameId].state;

            if (!state) {
                state = {}
            }

            state[ballId] = color
            games[gameId].state = state;
        }




    })

    const clientId = guid();
    clients[clientId] = {
        "connection": connection
    }

    const payLoad = {
        "method": "connect",
        "clientId": clientId
    }

    //send back the client connect
    connection.send(JSON.stringify(payLoad))
})

const guid = () => {
    const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    return `${s4() + s4()}-${s4()}-${s4()}-${s4()}-${s4() + s4() + s4()}`;
}

//BroadCast event

function updateGameState() {

    for (const g of Object.keys(games)) {

        const game = games[g];

        const payLoad = {
            "method": "update",
            "game": game
        }

        game.clients.forEach(c => {
            clients[c.clientId].connection.send(JSON.stringify(payLoad))
        });

    }

    setTimeout(updateGameState, 500)
}