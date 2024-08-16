"use strict";
require("dotenv").config();
const os = require("os");
const handler = require("serve-handler");
const http = require("http");
const socketIO = require("socket.io");
const port = process.env.PORT || 3030;

const app = http
	.createServer(function (req, res) {
		handler(req, res);
	})
	.listen(port, () => {
		console.log(`running signaling server on ${port}`);
	});

const io = socketIO.listen(app);
io.sockets.on("connection", function (socket) {
	// convenience function to log server messages on the client
	function log() {
		const array = ["Message from server:"];
		array.push.apply(array, arguments);
		socket.emit("log", array);
	}

	socket.on("message", function (message) {
		log("Client said: ", message);
		// for a real app, would be room-only (not broadcast)
		socket.broadcast.emit("message", message);
	});

	socket.on("create or join", function (room) {
		log("Received request to create or join room " + room);

		const clientsInRoom = io.sockets.adapter.rooms[room];
		const numClients = clientsInRoom
			? Object.keys(clientsInRoom.sockets).length
			: 0;
		log("Room " + room + " now has " + numClients + " client(s)");

		if (numClients === 0) {
			socket.join(room);
			log("Client ID " + socket.id + " created room " + room);
			socket.emit("created", room, socket.id);
		} else if (numClients === 1) {
			log("Client ID " + socket.id + " joined room " + room);
			io.sockets.in(room).emit("join", room);
			socket.join(room);
			socket.emit("joined", room, socket.id);
			io.sockets.in(room).emit("ready");
		} else {
			// max two clients
			socket.emit("full", room);
		}
	});

	socket.on("ipaddr", function () {
		const ifaces = os.networkInterfaces();
		for (const dev in ifaces) {
			ifaces[dev].forEach(function (details) {
				if (
					details.family === "IPv4" &&
					details.address !== "127.0.0.1" &&
					details.address !== "10.173.1.175"
				) {
					socket.emit("ipaddr", details.address);
				}
			});
		}
	});

	socket.on("bye", function () {
		console.log("received bye");
	});
});