require('dotenv').config();

var https = require("https");
var express = require("express");
var redis = require('redis');

var app = express();
var ms = require("ms");
var argv = require("optimist").argv;
var BoardManager = require("./board-manager.js");
var fs = require("fs");
var port = argv.port || 9000;
var server = null;

var subscriber = redis.createClient({host: process.env.REDIS_HOST, password: process.env.REDIS_PASSWORD, db: process.env.REDIS_DB, port: process.env.REDIS_PORT});


subscriber.subscribe("test");
  
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

var io = require('socket.io')(server, {
	cors: {
	  origin: "*",
	  methods: ["GET", "POST"]
	}
});

app.get("/", function(req, res) {
	res.sendFile(__webroot + '/index.html');
})

app.get("/board", function(req, res) {
	res.sendFile(__webroot + '/board.html');
})
app.get("/boardc", function(req, res) {
	res.sendFile(__webroot + '/board2.html');
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

  xxstreams = [];
  xxuserStreams = [];
  xxstreams.push({streamId: 22104, streamName: '메인'});
  xxstreams.push({streamId: 22108, streamName: '서브1'});
  xxstreams.push({streamId: 22116, streamName: '서브2'});
  xxstreams.push({streamId: 22120, streamName: '서브3'});
  xxstreams.push({streamId: 22124, streamName: '서브4'});
  xxstreams.push({streamId: 22128, streamName: '서브5'});
  xxstreams.push({streamId: 22140, streamName: '서브6'});
  xxstreams.push({streamId: 22152, streamName: '서브7'});

  xxuserStreams.push({streamId: 22112, userId: 'xero', userName: 'xero'});
  xxuserStreams.push({streamId: 22132, userId: 'zakal', userName: 'zakal'});
  xxuserStreams.push({streamId: 22136, userId: 'fatorial', userName: 'fatorial'});
  xxuserStreams.push({streamId: 22144, userId: 'koream', userName: 'koream'});
  xxuserStreams.push({streamId: 22148, userId: 'oldboy', userName: 'oldboy'});

  unity = {
	roomId: 1005,
	hostId: 'admin',
	mainVideo: { type: 'stream', id: 22104 },
	stream: {
	  streams: xxstreams,
	  activeVideo: [],
	  activeAudio: []
	},
	user: {
	  users: xxuserStreams,
	  publishers: [],
	  activeVideo: [],
	  activeAudio: []
	},
	file: {
		files: []
	}
  }

  Rooms.set(1005, unity);

var player = io.of("/player");
player.on("connection", (socket) => {
	socket.on('create', data => { /** {roomId, userId, streams[]} */
		if(!(data.roomId && data.userId && data.isHost && data.streams[0].streamId)) {
			socket.emit("error", {code: 1, event: 'create', msg: "data type check"});
			return;
		}
		
		if(Rooms.has(data.roomId)) {
			socket.emit("error", {code: 4, event: 'create', msg: "already room"});
			return;
		}

		// console.log(data);

		var users = data.users.map((user) => ({...user, isActive: false}));
			
		var init_room = {
			roomId: data.roomId,
			hostId: data.userId,
			mainVideo: {
				type: "stream", // stream | user | whiteboard | youtube
				id: data.streams[0].streamId,
			},
			stream: {
				streams: data.streams || [], // [{streamId, streamName}]
				activeVideo: [],
				activeAudio: []
			},
			user: {
				users:  users || [],	// [{streamId, userId, userName}]
				publishers: [], //  userId
				activeVideo: [],
				activeAudio: []
			},
			file: {
				files: []
			}
		};


		Rooms.set(data.roomId, init_room);

		socket.emit("create", {code: 200, event: 'create', msg: "success", data: init_room});
	});
	
	socket.on('join', data => {   /** {roomId, userId, userName, isHost, thumbnail} */
		var isExist = false;
		if(!(data.roomId && data.userId)) {
			socket.emit("error", {code: 1, event: 'join', msg: "data type check"});
			return;
		}

		var room = Rooms.get(data.roomId);
		if(!room) {
			socket.emit("error", {code: 3, event: 'join', msg: "not fonud room"});
			return;
		}

		var size = room.user.users.length;

		console.log(room.user.users);

		for(let i=0; i<size; i++) {
			if(room.user.users[i].userId === data.userId) {
				isExist = true;
				room.user.users[i].isActive = true;
				room.user.users[i].isHost = data.isHost;
				room.user.users[i].thumbnail = data.thumbnail;
			}
		}

		if(!isExist && !data.isHost) {
			socket.emit("error", {code: 5, event: 'join', msg: "not room user"});
		}

		socket.join(data.roomId);
		
		var newData =  {userId: data.userId, userName: data.userName, isHost: data.isHost, thumbnail: data.thumbnail, isActive: true};

		Rooms.set(data.roomId, room);
		console.log("Pre rooms: ", socket.rooms);
		player.to(data.roomId).emit('join', {data: newData, room});
	});

	socket.on('controlUser', data => {   /** roomId, userId, userName, isHost, thumbnail */
		if(!data.isHost) {
			socket.emit("error", {code: 6, event: 'controlUser', msg: "permission check"});
			return;
		}

		if(!(data.roomId && data.remoteId && data.userId && data.type)) {
			socket.emit("error", {code: 1, event: 'controlUser', msg: "data type check"});
			return;
		}
		
		var room = Rooms.get(data.roomId);
		
		socket.join(data.roomId);

		if(!room) {
			socket.emit("error", {code: 3, event: 'controlUser', msg: "not fonud room"});
			return;
		}

		console.log(data);
		if(data.type === 'publishers' && !data.status) {
			var audioSet = new Set(room.user.activeAudio);
			audioSet.delete(data.remoteId);
			room.user.activeAudio = Array.from(audioSet);

			var videoSet = new Set(room.user.activeVideo);
			videoSet.delete(data.remoteId);
			room.user.activeAudio = Array.from(videoSet);
		}

		var dataSet = new Set(room.user[data.type]);
		if (data.status) dataSet.add(data.remoteId);
		else dataSet.delete(data.remoteId);

		room.user[data.type] = Array.from(dataSet);

		var newData = {remoteId: data.remoteId, status: data.status, type: data.type};
		console.log(newData);
		console.log(room);
		Rooms.set(data.roomId, room);
		player.to(data.roomId).emit('controlUser', {data: newData, room});
	});

	socket.on('controlStream', data => {   /**  */
		if(!data.isHost) {
			socket.emit("error", {code: 6, event: 'controlStream', msg: "permission check"});
			return;
		}

		socket.join(data.roomId);
		if(!(data.roomId && data.streamId && data.userId && data.type)) {
			socket.emit("error", {code: 1, event: 'controlStream', msg: "data type check"});
			return;
		}
		
		var room = Rooms.get(data.roomId);
		if(!room) {
			socket.emit("error", {code: 3, event: 'controlStream', msg: "not fonud room"});
			return;
		}

		var dataSet = new Set(room.stream[data.type]);

		if (data.status) dataSet.add(data.streamId);
		else dataSet.delete(data.streamId);

		room.stream[data.type] = Array.from(dataSet);

		var newData = {streamId: data.streamId, status: data.status, type: data.type};
		
		Rooms.set(data.roomId, room);
		player.to(data.roomId).emit('controlStream', {data: newData, room});
	});

	socket.on('controlMain', data => {   /**  */
		if(!data.isHost) {
			socket.emit("error", {code: 6, event: 'controlMain', msg: "permission check"});
			return;
		}
		
		if(!(data.roomId && data.userId && data.id && data.type)) {
			socket.emit("error", {code: 1, event: 'controlMain', msg: "data type check"});
			return;
		}
		
		var room = Rooms.get(data.roomId);
		if(!room) {
			socket.emit("error", {code: 3, event: 'controlMain', msg: "not fonud room"});
			return;
		}

		socket.join(data.roomId);
		
		room.mainVideo.id = data.id;
		room.mainVideo.type = data.type;

		var newData = {remoteId: data.id, type: data.type};

		Rooms.set(data.roomId, room);
		player.to(data.roomId).emit('controlMain', {data: newData, room});
	});

	socket.on('chatSend', data => {   /**  */
		if(!data.isHost) {
			socket.emit("error", {code: 6, event: 'chat', msg: "permission check"});
			return;
		}

		if(!(data.roomId && data.userId && data.msg && data.thumbnail)) {
			socket.emit("error", {code: 1, event: 'chat', msg: "data type check"});
			return;
		}
		
		var room = Rooms.get(data.roomId);
		
		if(!room) {
			socket.emit("error", {code: 3, event: 'chat', msg: "not fonud room"});
			return;
		}

		socket.join(data.roomId);

		var newData = {userId: data.id, msg: data.msg, isHost: data.isHsot, thumbnail: data.thumbnail};
		player.to(data.roomId).emit('chatRecv', {data: newData, room});
	});

	socket.on('kickUser', data => {   /**  */
		if(!data.isHost) {
			socket.emit("error", {code: 6, event: 'kickUser', msg: "permission check"});
			return;
		}

		if(!(data.roomId && data.userId && data.remoteId)) {
			socket.emit("error", {code: 1, event: 'kickUser', msg: "data type check"});
			return;
		}
		
		var room = Rooms.get(data.roomId);
		if(!room) {
			socket.emit("error", {code: 3, event: 'kickUser',  msg: "not fonud room"});
			return;
		}

		socket.join(data.roomId);

		var size = room.user.users.length;
		for(let i=0; i<size; i++) {
			if(room.user.users[i].userId === data.remoteId) {
				room.user.users.splice(i, 1);

				var audioSet = new Set(room.user.activeAudio);
				audioSet.delete(data.remoteId);
				room.user.activeAudio = Array.from(audioSet);

				var videoSet = new Set(room.user.activeVideo);
				videoSet.delete(data.remoteId);
				room.user.activeAudio = Array.from(videoSet);

				var newData = {remoteId: data.remoteId};
				Rooms.set(data.roomId, room);

				player.to(data.roomId).emit('kickUser', {data: newData, room});
				return;
			}
		}
		socket.emit("error", {code: 4, msg: "not fonud user"});
	});

	socket.on('update_rtmp', data => {
		if(!(data.roomId && data.userId && data.isHost && data.remoteId)) {

		}

		socket.join(data.roomId);

		// request -> PHP -> DB & redis -> ndoe -> rtmp
	})

	socket.on('remove', data => {
		if(!(data.roomId && data.userId && data.isHost)) {
			socket.emit("error", {code: 1, event: 'remove',  msg: "data type check"});
			return;
		}

		Rooms.delete(data.roomId);
		socket.emit('remove', data)
	});

	socket.on('disconnect', () => {
		// Rooms.delete(1000);
	});
});



subscriber.on("message", function(channel, message) { 
	console.log("Subscriber received message in channel '" + channel + "': " + message);
  
	var data = JSON.parse(message);
  
	var room = Rooms.get(Number(data.roomId)); // data.roomId, data.filename, data.downloadUrl
  
	if(!room) {
	  console.log("file: room not found");
	  return;
	}
  
	var newData = {filename: data.filename, downloadUrl: data.downloadUrl};
  
	room.file.files.push(newData);
  
	Rooms.set(Number(data.roomId), room);
  
	player.emit('file', {data: newData, room});
  });