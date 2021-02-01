require('dotenv').config();

var https = require("https");
var express = require("express");
var app = express();
var ms = require("ms");
var argv = require("optimist").argv;
var BoardManager = require("./board-manager.js");
var fs = require("fs");
var Entities = require('html-entities').AllHtmlEntities;
var entities = new Entities();

var port = argv.port || 9000;
var server = null;

if (process.env.NODE_ENV === 'production') {
	var options = {
		key: fs.readFileSync(process.env.SSL_KEY),
		cert: fs.readFileSync(process.env.SSL_CERT),
	}

	server = https.createServer(options, app).listen(port)
}
else {
	server = app.listen(port);
}

var __webroot = __dirname + '/web';

var io = require('socket.io')(server);

app.get("/", function(req, res) {
	res.sendFile(__webroot + '/index.html');
})

app.get("/board", function(req, res) {
	res.sendFile(__webroot + '/board.html');
})

function clean(data) {
	return entities.encode(data)
}

app.get('/scripts/fb.js', function(req, res) {
	var data = fs.readFileSync(__webroot + '/scripts/fb.js', 'utf8');
	res.write(data.replace("%appId%", argv.appId));
	res.end();
})

app.use('/common', express.static( __dirname + '/common', { maxAge: ms('30 days') }));
app.use('/fonts', express.static( __webroot + '/fonts', { dotfiles: 'allow', maxAge: ms('30 days') }));
app.use('/scripts', express.static( __webroot + '/scripts', { maxAge: ms('30 days') }));
app.use('/css', express.static( __webroot + '/css', { dotfiles: 'allow', maxAge: ms('30 days') }));
app.use('/images', express.static( __webroot + '/images', { maxAge: ms('30 days') }));

app.get(/\/images\/*/, function(req, res) {
	if(req.query.board) {
		var board = manager.getBoardById(req.query.board);
		if (board) {
			board.getImage(req.query.img, function(image) {
				if (image) {
					res.writeHead(200, { 'Content-Type' :  image.contentType });
					res.end(image.data, 'binary');
				} else {
					res.writeHead(500);
					res.end();
				}
			});
		} else {
			socket.emit('error', { message: "Board does not exist!" });
		}
	} else {
		serveStatic(req, res);
	}
})


app.get('*', function(req, res){
  res.status(404).sendFile(__webroot + '/notfound.html');
});

var manager = new BoardManager();

function registerJoin(socket) {
	socket.on('join', function (data) {
		var board = manager.getBoardById(data.id);
		if (board) {
			board.join(socket, data);
		} else {
			socket.emit('error', { message: "Board does not exist!" });
		}
	});
}

function registerRejoin(socket) {
	socket.on('rejoin', function (data) {
		var board = manager.getBoardById(data.id);
		if (board) {
			board.rejoin(socket, data.sessionId);
		} else {
			socket.emit('error', { message: "Board does not exist!" });
		}
	});
}

function registerGetBoardInfo(socket) {
	socket.on('getBoardInfo', function (data) {
		var board = manager.getBoardById(data.id);
		if (board) {
			socket.emit('boardInfo', { name: board.name });
		} else {
			socket.emit('errorhandler', { message: "Board does not exist!" });
		}
	});
}


function registerCreate(socket) {
	socket.on('create', function (data) {
		var board = manager.createBoard(data.name);
		console.log("Created a new board: " + board.name + " (" + board.id + ")");
		socket.emit('created', { id: board.id, name: board.name });
		manager.saveBoards();
	});
}

// wait for a connection from a client
io.on('connection', function (socket) {
	console.log(socket.id);
	// add this socket to the clients list
	registerJoin(socket);
	registerRejoin(socket);
	registerCreate(socket);
	registerGetBoardInfo(socket);
});




var Rooms = new Map();

io.of("/player").on("connection", (socket) => {
	socket.on('create', data => { /** {roomId, userId, streams[]} */
		if(!(data.roomId && data.userId)) {
			socket.emit("error", {code: 1, msg: "data type check"});
			return;
		}
			
		var init_room = {
			roomId,
			hostId: userId,
			mainVideo: {
				type: "stream", // stream | user | whiteboard
				id: 0,
			},
			stream: {
				streams: data.streams || [],
				activeVideo: [],
				activeAudio: []
			},
			user: {
				users: [],
				publishers: [],
				activeVideo: [],
				activeAudio: []
			}
		};

		Rooms.set(data.roomId, init_room);
		socket.join(data.roomId);

		socket.emit("create", {code: 200, msg: "success", data: init_room});
	});
	
	socket.on('join', data => {   /** {roomId, userId, userName, isHost, thumbnail} */
		if(!(data.roomId && data.userId && data.feedId)) {
			socket.emit("error", {code: 1, msg: "data type check"});
			return;
		}

		var room = Rooms.get(roomId);
		if(!room) {
			socket.emit("error", {code: 3, msg: "not fonud room"});
		}

		var size = room.user.users.length;

		for(let i=0; i<size; i++) {
			if(room.user.users[i].userId === data.userId) {
				socket.emit("error", {code: 2, msg: "Already Room User"});
				return;
			}
		}

		socket.join(data.roomId);
		
		var newData =  {userId: data.userId, userName: data.userName, isHost: data.isHost, thumbnail: data.thumbnail, feedId: data.feedId}

		room.user.users.push(newData);
		
		Rooms.set(data.roomId, room);
		io.to(data.roomId).emit('join', {data: newData, room});
	});

	socket.on('controlUser', data => {   /** roomId, userId, userName, isHost, thumbnail */
		if(!(data.roomId && data.remoteId && data.userId && data.status && data.isHost && data.type)) {
			socket.emit("error", {code: 1, msg: "data type check"});
			return;
		}
		
		var room = Rooms.get(roomId);
		if(!room) {
			socket.emit("error", {code: 3, msg: "not fonud room"});
		}

		var dataSet = new Set(room.user[data.type]);

		if (data.status) dataSet.add(data.userId);
		else dataSet.delete(data.userId);

		room.user[data.type] = Array.from(dataSet);

		var newData = {remoteId: data.remoteId, status: data.status, type: data.type};
		
		Rooms.set(data.roomId, room);
		io.to(data.roomId).emit('controlUser', {data: newData, room});
	});

	socket.on('controlStream', data => {   /**  */
		if(!(data.roomId && data.streamId && data.userId && data.status && data.isHost && data.type)) {
			socket.emit("error", {code: 1, msg: "data type check"});
			return;
		}
		
		var room = Rooms.get(roomId);
		if(!room) {
			socket.emit("error", {code: 3, msg: "not fonud room"});
		}

		var dataSet = new Set(room.stream[data.type]);

		if (data.status) dataSet.add(data.streamId);
		else dataSet.delete(data.streamId);

		room.stream[data.type] = Array.from(dataSet);

		var newData = {streamId: data.remoteId, status: data.status, type: data.type};
		
		Rooms.set(data.roomId, room);
		io.to(data.roomId).emit('controlStream', {data: newData, room});
	});

	socket.on('controlMain', data => {   /**  */
		if(!(data.roomId && data.userId && data.isHost && data.remoteId && data.type)) {
			socket.emit("error", {code: 1, msg: "data type check"});
			return;
		}
		
		var room = Rooms.get(roomId);
		if(!room) {
			socket.emit("error", {code: 3, msg: "not fonud room"});
		}
		
		room.mainVideo.id = data.remoteId;
		room.mainVideo.type = data.type;

		var newData = {remoteId: data.rmeoteId, type: data.type};

		Rooms.set(data.roomId, room);
		io.to(data.roomId).emit('controlMain', {data: newData, room});
	});

	socket.on('kickUser', data => {   /**  */
		if(!(data.roomId && data.userId && data.isHost && data.remoteId)) {
			socket.emit("error", {code: 1, msg: "data type check"});
			return;
		}
		
		var room = Rooms.get(roomId);
		if(!room) {
			socket.emit("error", {code: 3, msg: "not fonud room"});
		}

		var size = room.user.users.length;
		for(let i=0; i<size; i++) {
			if(room.user.users[i].userId === data.userId) {
				
				room.user.users.splice(i, 1);

				var newData = {remoteId: data.rmeoteId};
				Rooms.set(data.roomId, room);

				io.to(data.roomId).emit('kickUser', {data: newData, room});
				return;
			}
		}
		socket.emit("error", {code: 4, msg: "not fonud user"});
	});

	socket.on('remove', data => {
		if(!(data.roomId && data.userId && data.isHost)) {
			socket.emit("error", {code: 1, msg: "data type check"});
			return;
		}

		Rooms.delete(data.roomId);
		socket.emit('remove', data)
	});

	socket.on('disconnect', () => {

	});
});

