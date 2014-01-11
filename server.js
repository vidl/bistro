//setup Dependencies
var connect = require('connect')
    , express = require('express')
    , Io = require('socket.io')
    , port = (process.env.PORT || 8081)
    , MongoClient = require('mongodb').MongoClient
    , ObjectID = require('mongodb').ObjectID
    , _ = require('underscore')
    , moment = require('moment')
    , Q = require('q')
    , ejs = require('ejs')
    , print = require('./app/print.js')
    , bistro = require('./app/bistro.js')
    ;


//Setup Express
var server = express.createServer();
server.configure(function(){
    server.set('views', __dirname + '/views');
    server.set('view options', { layout: false });
    server.set("view engine", 'ejs');
    server.use(connect.bodyParser());
    server.use(express.cookieParser());
    server.use(express.session({ secret: 'N6/G0L6oqTKw+IGLRNoR2ImpH9AdpmHU5Xun2BV7Rw3RLvOnpFoiRjXEZbILcr+b'}));
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
                 ,error: err
                },status: 500 });
    }
});
server.listen(port);

//Setup Socket.IO
var io = Io.listen(server);
io.set('log level', 1);

var sendErrorMessage = function(msg) {
    io.sockets.emit('message', {type: 'error', msg: msg});
};

var sendInfoMessage = function(req, msg) {
    io.sockets.emit('message', {type: 'info', msg: msg});
};

var bistroService = bistro({
    db: 'mongodb://127.0.0.1:27017/bistro'
});


var getPrinterName = function(printerName, errorMsg) {
    return bistroService.getSettings().then(function(settings){
        var deferred = Q.defer();
        if (settings && settings[printerName]) {
            deferred.resolve(settings[printerName]);
        } else {
            deferred.reject(errorMsg);
        }
        return deferred.promise;
    }, function(error) {
        throw error; // rejects the promise
    });
};

var printerService = print({
    pdfDirectory: 'pdfs',
    receiptTemplate: 'print/receipt.tex',
    orderTemplate: 'print/order.tex',
    getPrinterName: getPrinterName
});

io.sockets.on('connection', function (socket) {
    printerService.getQueue().then(function(queue){
        socket.emit('printerJobsChanged', {queue: queue});
    });
});

var lastQueue = [];

setInterval(function(){
    printerService.getQueue().then(function(queue){
        if (!_.isEqual(lastQueue, queue)) {
            lastQueue = queue;
            io.sockets.emit('printerJobsChanged', {queue: queue});
        }
    }, function(error){
        sendErrorMessage(error);
    });
}, 1000);
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

var handleError = function(err, res) {
    console.log(err.toString());
    res.status(500).send(err.toString());
};

var returnArticles = function(res, callback) {
    bistroService.getArticles().then(function (articles) {
        if (callback) {
            callback(articles);
        } else {
            res.json(articles);
        }
    }, function (err) {
        handleError(err, res);
    });
};

server.get('/articles', function(req, res){
    returnArticles(res);
});

server.delete('/articles/:id', function(req, res){
    bistroService.removeArticle(req.params.id).then(function(){
        returnArticles(res);
    }, function(err){
        handleError(err, res);
    });
});

server.post('/articles', function(req, res){
    bistroService.saveArticle(req.body).then(function(){
        returnArticles(res, function(articles){
            res.json({saved: req.body, articles: articles});
        });
    }, function(err){
        handleError(err, res);
    });
});


var returnLimits = function(res, callback) {
    bistroService.getLimits().then(function (limits) {
        if (callback) {
            callback(limits);
        } else {
            res.json(limits);
        }
    }, function (err) {
        handleError(err, res);
    });
};

server.get('/limits', function(req, res){
    returnLimits(res);
});

server.delete('/limits/:id', function(req, res){
    bistroService.removeLimit(req.params.id).then(function(){
        returnLimits(res);
    }, function(err){
        handleError(err, res);
    });
});

server.post('/limits', function(req, res){
    bistroService.saveLimit(req.body).then(function(){
        returnLimits(res, function(limits){
            res.json({saved: req.body, limits: limits});
        });
    }, function(err){
        handleError(err, res);
    });
});

server.get('/orders', function(req, res){
    bistroService.getOrders().then(function(orders){
        _.each(orders, function(order){
            order.ts = order._id.getTimestamp();
        });

        var beginOfToday = moment().startOf('day');
        res.json(_.filter(orders, function(order){
            return moment(order.ts).isAfter(beginOfToday);
        }));
    }, function(err){
        handleError(err, res);
    });
});

server.post('/orders', function(req, res){
    bistroService.insertOrder(req.body).then(function(order){
        printerService.printReceipt(order).fail(function(error){ sendErrorMessage(error); });
        if (order.kitchen) {
            printerService.printOrder(order).fail(function(error){ sendErrorMessage(error); });
        }
        res.json({_id: order._id, no: order.no});
    }, function(err){
        handleError(err, res);
    });
});

server.delete('/orders/:id', function(req, res){
    bistroService.removeOrder(req.params.id).then(function(){
        res.send('done');
    }, function(err){
        handleError(err, res);
    });
});

server.get('/deleteorders', function(req, res){
    bistroService.removeAllOrders().then(function(){
        res.send('done');
    }, function(err){
        handleError(err, res);
    });
});

server.get('/printers', function(req, res){
    printerService.getPrinters().then(function(printers){
        res.json(printers);
    }, function(err){
        handleError(err, res);
    });
});


server.get('/settings', function(req, res){
    bistroService.getSettings().then(function(settings){
        res.json(settings);
    }, function(err){
        handleError(err, res);
    });
});

server.post('/settings', function(req, res){
    bistroService.saveSettings(req.body).then(function(){
        res.send('done');
    }, function(err){
        handleError(err, res);
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
