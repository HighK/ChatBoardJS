require('dotenv').config();
const exec =  require('child_process').exec;

var express = require("express");
var app = express();
const DB = require('./DB');

var port = 8080;

app.use(express.urlencoded({ extended: false }));
app.use(express.json());


app.get('/', (req, res, next) => {
	console.log('get');
	res.send('get');

});


app.post('/exec/:id', (req, res, next) => {
	const id = req.params.id;
	if(!id) {
		res.status(400);
		next();
	}

	DB.query(`SELECT * FROM xe_stream_manager WHERE stream_key = ?`, [id], (err, results) => {
		console.log(results);

		if(true) return;

		results.forEach(stream => {
			if(stream.type === 0)
				exec(`ffmpeg -y -i rtmp://0.0.0.0/lives/${id} -acodec libopus -vn -f rtp rtp://0.0.0.0:${stream.id}`);
			else if(stream.type === 1)
				exec(`ffmpeg -y -i rtmp://0.0.0.0/lives/${id} -c:v copy -preset:v ultrafast -tune zerolatency -g 60 -an -f rtp rtp://0.0.0.0:${stream.id}?pkt_size=1300`);
			else if(stream.type === 2)
				exec(`ffmpeg -y -i rtmp://0.0.0.0/lives/${id} -c:v libx264 -preset:v ultrafast -s 480x270 -tune zerolatency -an -g 60 -f rtp rtp://0.0.0.0:${stream.id}?pkt_size=1300`);
		});
	})
	res.status(200);
});

app.listen(port);
