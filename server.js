var http = require('http');
var path = require('path');
var fs = require('fs');
var colors={};
var app = http.createServer(function (request, response) {
	console.log('request starting...');	
	var filePath = '.' + request.url;
	if (filePath == './')
		filePath = './client.html';	
	path.exists(filePath, function(exists) {	
		if (exists) {
			fs.readFile(filePath, function(error, content) {
				if (error) {
					response.writeHead(500);
					response.end();
				}
				else {
					response.writeHead(200, { 'Content-Type': 'text/html' });
					response.end(content, 'utf-8');
				}
			});
		}
		else {
			response.writeHead(404);
			response.end();
		}
	});	
}).listen(80);
var io = require('socket.io').listen(app);
var player_info = new Array();
var position;
var t, max_no_players =6, min_no_players=2;
var xy = 0;
var ladder_start = [14,24,32,48,75,62];
var ladder_end = [45,36,51,95,85,97];
var snake_start = [17,38,57,79,89,93,96];
var snake_end = [7,34,56,67,30,73];
io.sockets.on('connection',function(socket)
{
	socket.on('getUrl', function()
	{
		var room = '';
		var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
		for( var i=0; i < 5; i++ )
		{
			room += possible.charAt(Math.floor(Math.random() * possible.length));
		}
		var url_val = 'http://snasnakesandladders.nodejitsu.com/'+'#'+room;
			io.sockets.emit('sendRoom', {url_val: url_val});
			player_info[room] = new Array();
			player_info[room][0] = room;
			player_info[room]['no_players'] = 0;
			player_info[room]['gameStatus'] = false;
	});
	/*---
	------ incomingPlayer
	---*/	
	
	
	socket.on("colors1",function()
	{
	console.log('-----'+colors);
	socket.emit("remove1",colors);
	});
	socket.on('incomingPlayer',function(data)
	{ 
	var i;
			var roomName = data['roomv'];
			if(player_info[roomName]['gameStatus'] == false)
			{
				if(player_info[roomName]!=undefined)
				{				
					if(player_info[roomName]['no_players'] < max_no_players)
					{							
						var count = player_info[roomName]['no_players'];
						player_info[roomName][count] = new Array();
						player_info[roomName][count]['userName'] = data['usernamev'];
						player_info[roomName][count]['socket'] = socket.id;
						player_info[roomName][count]['color'] = data['colorv'];
						player_info[roomName][count]['position'] = 0;
						player_info[roomName][count]['alive'] = false;
						socket.join(roomName);
						colors[data['colorv']]=data['colorv'];
						 					//colors.push(data['colorv']);
                         socket.broadcast.to(roomName).emit("remove1",colors);
						io.sockets.socket(player_info[roomName][0]['socket']).emit("PlayEvent",{no_players:player_info[roomName]['no_players']});
						io.sockets.in(roomName).except(player_info[roomName][0]['socket']).emit('message');
						
						var playerList = { id:player_info[roomName][count]['socket'] , room:roomName , no_players:player_info[roomName]['no_players'], un:player_info[roomName][count]['userName'],col:player_info[roomName][count]['color'],pos:player_info[roomName][count]['position'],alive:player_info[roomName][count]['alive']};
						
						io.sockets.in(roomName).emit("PlayerValue",playerList);
						io.sockets.socket(socket.id).emit("youAre",{id:player_info[roomName][count]['socket']});
						player_info[roomName]['no_players'] = player_info[roomName]['no_players']+1;
						console.log(data['colorv']);
						
					}
					else
					{
						io.sockets.socket(socket.id).emit("rejectMsg");
					}
				}
			}
			else
			{
				io.sockets.socket(socket.id).emit("rejectMsg");
			}
	});
	// socket.on("load",function()
	// {
	// io.sockets.emit("remove1",colors);
	// });
	socket.on('gameStart', function(data)
	{
		var roomName = data['r'];
		player_info[roomName]['gameStatus'] = true;
		player_info[roomName]['turn'] = 0;			
		io.sockets.in(roomName).emit("gameStarted");
		
		t = player_info[roomName]['turn'];
		 io.sockets.in(roomName).except(player_info[roomName][t]['socket']).emit('messagex');
		io.sockets.socket(player_info[roomName][t]['socket']).emit('yourMove',{sd:true});
	  
	});	
	socket.on('updateMoveServer',function(data1)
		{	
			var isalive = data1['alive'];
			var player = data1['player'];
			var move = data1['dice_val'];
			var room = data1['room'];
			roomName = room;
			// io.sockets.in(roomName).emit("DrawBoard");
			var totPlayers = player_info[roomName]['no_players'];
			var i =0;
			if(isalive == true)
			{
				if(player_info[room][t]['socket'] == player)
				{
					player_info[room][t]['alive'] = true;
					player_info[room][t]['position'] = player_info[roomName][t]['position'] + move;
				}
			}
			else
			{
				// console.log('Player is still dead');
			}			
			// io.sockets.in(roomName).emit("DrawBoard");
			for(var i=0 ; i < totPlayers ; i++)
			{				
				var playerList = { total_Players:totPlayers, i:i,id:player_info[roomName][i]['socket'] , room:roomName , no_players:player_info[roomName]['no_players'], un:player_info[roomName][i]['userName'],col:player_info[roomName][i]['color'],pos:player_info[roomName][i]['position'],alive:player_info[roomName][i]['alive'], nextmove:true};
				io.sockets.in(roomName).emit("PlayerList",playerList);
				io.sockets.socket(player_info[roomName][i]['socket']).emit('yourMove',{sd:false});
			}
			if(player_info[room][t]['position'] >=100 || player_info[room][t]['position']==100)
			{
				io.sockets.in(roomName).emit("GameEnd",{name:player_info[roomName][t]['userName']});
			}
		});
	socket.on('diceSelect',function(data)
	{		
		var roomName = data['r'];
		var dice1 = data['diceVal'];
		var totPlayers = player_info[roomName]['no_players'];
		var i =0;
		io.sockets.emit("diceSelected",{message:data, turn:player_info[roomName][t]['socket']});	
	});
	socket.on('dicex',function(dice)
	{
	io.sockets.emit('dicey',dice);
	});
	socket.on('nextmove',function(data){
		xy++;
		var room = data['room'];
		var totalPlayers = player_info[roomName]['no_players'];
		if(totalPlayers==xy)
		{
			var current_position = player_info[room][t]['position'];
			var start_val, end_val, user_future_position=current_position;
			if(ladder_start.indexOf(current_position)>=0)
			{
				start_val = ladder_start.indexOf(current_position);
				user_future_position = ladder_end[start_val];
			}
			if(snake_start.indexOf(current_position)>=0)
			{
				start_val = snake_start.indexOf(current_position);
				user_future_position = snake_end[start_val];
			}
			var overlap = false;			
			if(user_future_position!=current_position)
			{				
				player_info[room][t]['position'] = user_future_position;				
				for(var i=0 ; i < totalPlayers ; i++)
				{				
					if(player_info[roomName][i]['position']==user_future_position && player_info[roomName][i]['alive']==true && i!=t)
					{	console.log("overlap here");
						overlap= true;
						player_info[roomName][i]['position'] =1;
					}
					var playerList = { total_Players:totalPlayers, i:i,id:player_info[roomName][i]['socket'] , room:roomName , no_players:player_info[roomName]['no_players'], un:player_info[roomName][i]['userName'],col:player_info[roomName][i]['color'],pos:player_info[roomName][i]['position'],alive:player_info[roomName][i]['alive'], nextmove:false};
					io.sockets.in(roomName).emit("PlayerList",playerList);					
					io.sockets.socket(player_info[roomName][i]['socket']).emit('yourMove',{sd:false});
				}				
			}
			if(overlap==false)
			{
				if(t < totalPlayers-1 ) { t++; }
				else { t = 0; }			
			}
			io.sockets.socket(player_info[room][t]['socket']).emit('yourMove',{sd:true});
			xy=0;			
		}
	});
	 socket.on('disconnect', function () { 
		var socketid=  socket.id;
		for (var key in player_info) {
			var no_players_room = player_info[key]['no_players'];
			for(var i=0; i<no_players_room; i++)
			{
				if(player_info[key][i]['socket']==socketid)
				{
					for(var j=i; j<no_players_room-1;j++)
					{
						var new_k = j+1;
						player_info[key][j]['userName']	= player_info[key][new_k]['userName'];
						player_info[key][j]['socket']	= player_info[key][new_k]['socket'];
						player_info[key][j]['color'] 	= player_info[key][new_k]['color'];
						player_info[key][j]['position']	= player_info[key][new_k]['position'];
						player_info[key][j]['alive']	= player_info[key][new_k]['alive'];
					}
					var t;
					t=player_info[key][i]['color'];
					delete colors[t];
					player_info[key]['no_players'] = player_info[key]['no_players']-1;
					if(player_info[key]['no_players']<2)
					{
						player_info[key]['gameStatus']=false;
						io.sockets.in(key).emit("GameOver");
					}
				}
			}
			io.sockets.emit("remove1",colors);
		}
	 });
});
