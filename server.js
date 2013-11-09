//setup Dependencies
var connect = require('connect')
    , express = require('express')
    , Io = require('socket.io')
    , port = (process.env.PORT || 8081)
    , MongoClient = require('mongodb').MongoClient
    , ObjectID = require('mongodb').ObjectID
    , _ = require('underscore')
    , phantom = require('phantom')
    , fs = require('fs')
    , childProcess = require('child_process')
    , moment = require('moment')
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

var pdfDirectory = 'pdfs';

if (!fs.existsSync(pdfDirectory)) {
    fs.mkdirSync(pdfDirectory);
}

var phantom_instance = null;
var phantom_receipt_page = null;
var phantom_order_page = null;
phantom.create("--web-security=no", "--ignore-ssl-errors=yes", { port: 12345 }, function (ph) {
    console.log("Phantom Bridge Initiated");
    phantom_instance = ph;
    ph.createPage(function(page){
        console.log("Phantom receipt page created");
       phantom_receipt_page = page;
    });
    ph.createPage(function(page){
        console.log("Phantom order page created");
        phantom_order_page = page;
    });
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

var sendErrorMessage = function(req, msg) {
    io.sockets.emit('message', {type: 'error', msg: msg});
};

var sendInfoMessage = function(req, msg) {
    io.sockets.emit('message', {type: 'info', msg: msg});
};

var withDb = function(callback) {
    MongoClient.connect('mongodb://127.0.0.1:27017/bistro', function(err, db) {
        if(err) throw err;
        callback(db);
    });
};

var withCollection = function(collection, callback) {
  withDb(function(db){
     callback(db.collection(collection), db);
  });
};

var getIdQuery = function(id) {
    return {_id: ObjectID(id)}
};

var fetchArticles = function(articles, callback) {
    articles.find({}, {sort: {name: 1}}).toArray(function(err, docs){
        if (err) throw err;
        callback(docs);
    });
};


// ATTENTION: assumes the there are no orders on days in future
var withNextOrderNo = function(callback) {
    withCollection('orders', function(orders, db){
        // select only orders with order numbers
        var query = {
            no: { $gt: 0}
        };

        var sort = [
            ['_id', -1], // first by id descending which means the most recent order
            ['no', -1] // then by order number
        ];

        orders.find(query, {sort: sort, limit: 1}, function(err, cursor){
            if (err) throw err;
            cursor.nextObject(function(err, doc){
                var orderNo = 1;
                if (doc && moment().startOf('day').isBefore(moment(doc._id.getTimestamp()))) {
                    console.log('Found an order today with a order.no: ' + doc.no);
                    orderNo = doc.no + 1;
                } else {
                    console.log('No orders yet with an no, use 1');
                }
                callback(orders, db, orderNo);
            });
        });
    });
};


var getSettings = function(callback) {
    withCollection('settings', function(settings, db){
        settings.findOne({}, {}, function(err, doc){
            db.close();
            if (err) throw err;
            callback(doc || {});
        });
    });
};

var printFile = function(req, printer, file, options) {
    var args = [];
    args.push('-d');
    args.push(printer);
    if (options) {
        args.push(options);
    }
    args.push(file);
    childProcess.exec('lp ' + args.join(' '), function(error, stdout, stderr){
        if (error != null) {
            var errorMsg = 'Fehler beim Drucken auf ' + settings.receiptPrinter + ': ' + stderr;
            console.log(errorMsg);
            sendErrorMessage(req, errorMsg);
        }
    });
};

var printOnReceiptPrinter = function(req, file) {
    getSettings(function(settings){
        if (settings.receiptPrinter) {
            printFile(req, settings.receiptPrinter, file);
        } else {
            sendErrorMessage(req, 'Kein Beleg-Drucker definiert');
        }
    });
};

var printOnOrderPrinter = function(req, file) {
    getSettings(function(settings){
        if (settings.orderPrinter) {
            printFile(req, settings.orderPrinter, file, '-o media=a5 -o fit-to-page');
        } else {
            sendErrorMessage(req, 'Kein Bestell-Drucker definiert');
        }
    });
};

var printReceipt = function(req, order) {
    var orderId = moment(order._id.getTimestamp()).format('YYYYMMDD-HHmmss');
    if (order.no)
        orderId += '-' + order.no;
    var url = (req.connection.encrypted ? 'https' : 'http')+ '://' +  req.header('host') + '/receipts/' + order._id.toHexString();
    phantom_receipt_page.open(url, function (status) {
        if (status == "success") {
            phantom_receipt_page.evaluate(function() {
                return {
                    width: 500, //document.getElementById("container").offsetWidth,
                    height: document.getElementById("container").offsetHeight * 2
                };
            }, function(size) {
                phantom_receipt_page.set('viewportSize', size, function(){
                    var filename = pdfDirectory + '/' + orderId + '-receipt.pdf';
                    phantom_receipt_page.render(filename, function(){
                        //printOnReceiptPrinter(req, filename);
                    });
                });
            });
        } else {
            console.log('Error while opening ' + url + ': ' + status);
            sendErrorMessage(req, 'Beleg konnte nicht erstellt werden: ' + JSON.stringify(status));
        }
    })
};

var printKitchenOrder = function(req, order) {
    var orderId = moment(order._id.getTimestamp()).format('YYYYMMDD-HHmmss') + '-' + order.no;
    var url = (req.connection.encrypted ? 'https' : 'http')+ '://' +  req.header('host') + '/kitchenorder/' + order._id.toHexString();
    phantom_order_page.open(url, function (status) {
        if (status == "success") {
            phantom_order_page.evaluate(function() {
                return {
                    width: document.getElementById("container").offsetWidth,
                    height: document.getElementById("container").offsetHeight * 2
                };
            }, function(size) {
                phantom_order_page.set('viewportSize', size, function(){
                    var filename = pdfDirectory + '/' + orderId + '-kitchenorder.pdf';
                    phantom_order_page.render(filename, function(){
                        printOnOrderPrinter(req, filename);
                    });
                });
            });
        } else {
            console.log('Error while opening ' + url + ': ' + status);
            sendErrorMessage(req, 'Küchen-Bestellung konnte nicht erstellt werden: ' + JSON.stringify(status));
        }
    });
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
    withCollection('articles', function(articles, db){
        fetchArticles(articles, function(docs){
            res.json(docs);
            db.close();
        });
    });
});

server.delete('/articles/:id', function(req, res){
    withCollection('articles', function(articles, db){
        articles.remove(getIdQuery(req.params.id), {w: 1}, function(err){
            if (err) throw err;
            fetchArticles(articles, function(docs){
                res.json(docs);
                db.close();
            });
        });
    });
});

server.post('/articles', function(req, res){
    withCollection('articles', function(articles, db){
        var insertOrUpdateHandler = function (err, result) {
            if (err) throw err;
            fetchArticles(articles, function (docs) {
                res.json({saved: req.body, articles: docs});
                db.close();
            });
        };

        if (req.body._id) {
            var id = req.body._id;
            req.body._id = ObjectID(req.body._id);
            articles.update(getIdQuery(id), req.body, {w: 1}, insertOrUpdateHandler);
        } else {
            articles.insert(req.body, {w: 1}, insertOrUpdateHandler);
        }
    });
});

server.get('/orders', function(req, res){
    withCollection('orders', function(orders, db){
        orders.find({}, {sort: {_id: -1}}).toArray(function(err, docs){
            if (err) throw err;
            _.each(docs, function(order){
               order.ts = order._id.getTimestamp();
            });
            res.json(docs);
            db.close();
        });
    });
});

server.post('/orders', function(req, res){
    function removeUnsuedFieldsFromArticles(articles) {
        return _.map(articles, function(article){
            return _.pick(article, 'name', 'receipt', 'price', 'ordered', 'kitchen');
        });
    }
    var order = req.body;
    order.kitchen = _.findWhere(order.articles, {kitchen: true}) != undefined;
    withNextOrderNo(function(orders, db, nextOrderNo){
        var articleIds = _.map(order.articles, function(article) { return ObjectID(article._id); });
        db.collection('articles').update({_id: {$in: articleIds}, available: {$gt: 0}}, {$inc:{ available: -1}}, {w: 1, multi: true}, function(err, result){
            if (err) throw err;
            if (order.kitchen) {
                console.log('Next order no is ' + nextOrderNo);
                order.no = nextOrderNo;
            }
            order.articles = removeUnsuedFieldsFromArticles(order.articles);
            orders.insert(order, {w: 1}, function(err){
                db.close();
                if (err) throw err;
                printReceipt(req, order);
                if (order.kitchen) {
                    printKitchenOrder(req, order);
                }
                res.json({_id: order._id, no: order.no});
            });

        });

    });

});

server.delete('/orders/:id', function(req, res){
    withCollection('orders', function(orders, db){
        orders.remove(getIdQuery(req.params.id), {w: 1}, function(err){
            db.close();
            if (err) throw err;
            res.send('done');
        });
    });
});

server.get('/deleteorders', function(req, res){
    withCollection('orders', function(orders, db){
        orders.remove({}, {w: 1}, function(err){
            db.close();
            if (err) throw err;
            res.send('done');
        });
    });
});


server.get('/receipts/:id', function(req, res){
   withCollection('orders', function(orders, db){
       orders.findOne(getIdQuery(req.params.id), {}, function(err, doc){
           db.close();
           if (err) throw err;
            res.render('receipt.ejs', {
                locals: {
                    order: doc,
                    formatCurrency: function(amount) {
                        return (amount / 100).toFixed(2);
                    },
                    moment: moment
                }
            });
       });
   });
});

server.get('/kitchenorder/:id', function(req, res){
    withCollection('orders', function(orders, db){
        orders.findOne(getIdQuery(req.params.id), {}, function(err, doc){
            db.close();
            if (err) throw err;
            res.render('kitchenorder.ejs', {
                locals: {
                    order: doc,
                    moment: moment
                }
            });
        });
    });
});

server.get('/printers', function(req, res){
    childProcess.exec('lpstat -a | cut -d " " -f 1', function(error, stdout, stderr) {
        var printers = stdout.split(/\n/);
        printers.splice(printers.length - 1 , 1); // remove the last (empty) item
        res.json(printers);
    });
});

server.get('/settings', function(req, res){
    getSettings(function(settings){
        res.json(settings);
    });
});

server.post('/settings', function(req, res){
    withCollection('settings', function(settings, db){
        var insertOrUpdateHandler = function(err, result) {
            if (err) throw err;
            db.close();
            res.send('done');
        };
        if (req.body._id) {
            var id = req.body._id;
            req.body._id = ObjectID(req.body._id);
            settings.update(getIdQuery(id), req.body, {w: 1}, insertOrUpdateHandler);
        } else {
          settings.insert(req.body, {w: 1}, insertOrUpdateHandler);
        }

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
