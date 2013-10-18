//setup Dependencies
var connect = require('connect')
    , express = require('express')
    , io = require('socket.io')
    , port = (process.env.PORT || 8081)
    , MongoClient = require('mongodb').MongoClient
    , ObjectID = require('mongodb').ObjectID;


//Setup Express
var server = express.createServer();
server.configure(function(){
    server.set('views', __dirname + '/views');
    server.set('view options', { layout: false });
    server.set("view engine", 'ejs');
    server.use(connect.bodyParser());
    server.use(express.cookieParser());
    server.use(express.session({ secret: "shhhhhhhhh!"}));
    server.use(connect.static(__dirname + '/static'));
    server.use(server.router);
    //server.engine('html', require('ejs').renderFile);
});

//setup the errors
server.error(function(err, req, res, next){
    if (err instanceof NotFound) {
        res.render('404.jade', { locals: { 
                  title : '404 - Not Found'
                 ,description: ''
                 ,author: ''
                 ,analyticssiteid: 'XXXXXXX' 
                },status: 404 });
    } else {
        res.render('500.jade', { locals: { 
                  title : 'The Server Encountered an Error'
                 ,description: ''
                 ,author: ''
                 ,analyticssiteid: 'XXXXXXX'
                 ,error: err 
                },status: 500 });
    }
});
server.listen( port);

//Setup Socket.IO
var io = io.listen(server);
io.sockets.on('connection', function(socket){
  console.log('Client Connected');
  socket.on('message', function(data){
    socket.broadcast.emit('server_message',data);
    socket.emit('server_message',data);
  });
  socket.on('disconnect', function(){
    console.log('Client Disconnected.');
  });
});

var withDb = function(callback) {
    MongoClient.connect('mongodb://127.0.0.1:27017/bistro', function(err, db) {
        if(err) throw err;
        callback(db);
    });
};

var withArticles = function(callback) {
  withDb(function(db){
     callback(db.collection('articles'));
  });
};

var getIdQuery = function(id) {
    return {_id: ObjectID.createFromHexString(id)}
};

///////////////////////////////////////////
//              Routes                   //
///////////////////////////////////////////

/////// ADD ALL YOUR ROUTES HERE  /////////

server.get('/', function(req,res){
  res.redirect('/index.html');
  /*res.render('index.ejs', {
    locals : {
              title : 'Your Page Title'
             ,description: 'Your Page Description'
             ,author: 'Your Name'
             ,analyticssiteid: 'XXXXXXX'
            }
  });*/
});

server.get('/articles', function(req, res){
    withArticles(function(articles){
        articles.find({}, {sort: {name: 1}}).toArray(function(err, docs){
            if (err)throw err;
            res.json(docs);
        });
    });
});

server.delete('/articles/:id', function(req, res){
    console.log(req.params.id);
    withArticles(function(articles){
        articles.remove(getIdQuery(req.params.id), {w: 1}, function(err){
            if (err) {
                res.status(500).json(err);
            } else {
                res.send(200);
            }
        });
    });
});

server.post('/articles', function(req, res){

    withArticles(function(articles){

        var id = articles.save(req.body, {w: 1}, function(err, result){
           if (err){
               res.status(500).json(err);
           }  else {
               res.send(200, id);
           }
        });
    });

});

server.get('/articles/fixture', function(req, res){

    withArticles(function(articles){
       articles.insert([
           { name: 'Menü 1', price: { chf: 510, eur: 340},  available:  2 },
           { name: 'Menü 2', price: { chf: 780, eur: 530},  available: -1 },
           { name: 'Menü 3', price: { chf: 1230, eur: 890}, available: -1 },
           { name: 'Menü 4', price: { chf: 940, eur: 780},  available: -1 },
           { name: 'Menü 5', price: { chf: 510, eur: 340},  available:  2 },
           { name: 'Menü 6', price: { chf: 780, eur: 530},  available: -1 },
           { name: 'Menü 7', price: { chf: 1230, eur: 890}, available: -1 },
           { name: 'Menü 8', price: { chf: 940, eur: 780},  available: -1 }
       ], function(err, docs){
           if (err)throw err;
           res.json(docs);
       });
    });

});

//A Route for Creating a 500 Error (Useful to keep around)
server.get('/500', function(req, res){
    throw new Error('This is a 500 Error');
});

//The 404 Route (ALWAYS Keep this as the last route)
server.get('/*', function(req, res){
    throw new NotFound;
});

function NotFound(msg){
    this.name = 'NotFound';
    Error.call(this, msg);
    Error.captureStackTrace(this, arguments.callee);
}


console.log('Listening on http://0.0.0.0:' + port );
