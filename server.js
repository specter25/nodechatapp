const express = require('express');
const path = require('path');
const publicPath = path.join(__dirname, './public');
const port = process.env.PORT || 3000;
const ejs = require('ejs');
const socketIO = require('socket.io');
const http = require('http');
var app = express();
const { generateMessage, generateLocationMessage } = require('./utils/message');
const { isRealString } = require('./utils/validation');
const { Users } = require('./utils/users');
var users = new Users();

//set io http server
const server = http.createServer(app);

app.use(express.static(publicPath));

app.set('view engine', 'ejs');

//socket 
var io = socketIO(server);
io.on('connection', function (socket) {
    console.log('new user conected');




    socket.on('join', (params, callback) => {

        if (!isRealString(params.name) || !isRealString(params.room)) {
            return callback('name and Room are required');
        }
        socket.join(params.room);

        users.removeUser(socket.id)
        users.addUser(socket.id, params.name, params.room);
        io.to(params.room).emit('updateUsersList', users.getUserList(params.room))

        socket.emit('newMessage', generateMessage('Admin', 'Welcome to the chat app'));
        socket.broadcast.to(params.room).emit('newMessage', generateMessage('Admin', `${params.name} has joined.`));
        callback();

    });



    // send the create message event
    socket.on('createMessage', function (message, callback) {
        var user = users.getUser(socket.id);
        if (user && isRealString(message.text)) {
            io.to(user.room).emit('newMessage', generateMessage(user.name, message.text));
        }

        callback();
    });

    socket.on('createLocationMessage', (coords) => {
        var user = users.getUser(socket.id);
        if (user) {
            io.to(user.room).emit('newLocationMessage', generateLocationMessage(user.name, coords.latitude, coords.longitude));
        }

    })

    socket.on('disconnect', function () {
        console.log('disconnected the user');

        var user = users.removeUser(socket.id);
        if (user) {
            io.to(user.room).emit('updateUsersList', users.getUserList(user.room));
            io.to(user.room).emit('newMessage', generateMessage('Admin', `${user.name} has left`));

        }
    })
})




//routes



app.get('/', (req, res) => {
    res.render('index.ejs');
})

app.get('/chat', (req, res) => {
    res.render('chat.ejs');
})









server.listen(port, () => {
    console.log(`listening to port ${port}`)
})


