/*
 * Copyright 2000-2013 Namics AG. All rights reserved.
 */
/**
 * @author: dnyffenegger, Namics AG
 * @since 07.12.13
 */

var MongoClient = require('mongodb').MongoClient
    , ObjectID = require('mongodb').ObjectID
    , _ = require('underscore')
    , moment = require('moment')
    , Q = require('q')
    ;

module.exports = function(settings) {

    var resolveOrReject = function(deferred, err, errMsg, value) {
        if (err) {
            deferred.reject(errMsg + ': ' + err.message);
        } else {
            if (value && typeof value === "function" )
                deferred.resolve(value());
            else
                deferred.resolve(value);
        }
    };

    var getDb = function() {
        var deferred = Q.defer();
        MongoClient.connect(settings.db, function(err, db) {
            resolveOrReject(deferred, err, 'Fehler beim Verbinden auf die Datenbank', db);
        });
        return deferred.promise;
    };

    var getCollection = function(collectionName) {
        return getDb().then(function(db){
            var deferred = Q.defer();
            db.collection(collectionName, function(err, collection){
                var ctx = {collection: collection, db: db};
                resolveOrReject(deferred, err, 'Fehler beim Zugriff auf ' + collectionName, ctx);
            });
            return deferred.promise;
        });
    };

    var findWithCursor = function(collectionName, query, options) {
        return getCollection(collectionName).then(function(ctx){
            var deferred = Q.defer();
            ctx.collection.find(query, options, function(err, cursor){
                ctx.cursor = cursor;
                resolveOrReject(deferred, err, 'Fehler bei der Abfrage von ' + collectionName, ctx);
            });
            return deferred.promise;
        });
    };

    var findAsArray = function(collectionName, query, options) {
        return getCollection(collectionName).then(function(ctx){
            var deferred = Q.defer();
            ctx.collection.find(query, options).toArray(function(err, docs){
                ctx.docs = docs;
                resolveOrReject(deferred, err, 'Fehler bei der Abfrage von ' + collectionName, ctx);
            });
            return deferred.promise;
        });
    };


    // ATTENTION: assumes the there are no orders on days in future
    var getNextOrderNo = function() {
        // select only orders with order numbers
        var query = { no: { $gt: 0} };
        var sort = [
            ['_id', -1], // first by id descending which means the most recent order
            ['no', -1] // then by order number
        ];
        return findWithCursor("orders", query, {sort: sort, limit: 1}).then(function(ctx){
            var deferred = Q.defer();
            ctx.cursor.nextObject(function(err, doc){
                resolveOrReject(deferred, err, 'Fehler beim Bestimmen der nächsten Bestellnummer', function(){
                    var orderNo = 1;
                    if (doc && moment().startOf('day').isBefore(moment(doc._id.getTimestamp()))) {
                        //console.log('Found an order today with a order.no: ' + doc.no);
                        orderNo = doc.no + 1;
                    } else {
                        //console.log('No orders yet with an no, use 1');
                    }
                    ctx.orderNo = orderNo;
                    return ctx;
                });
            });
            return deferred.promise;
        });
    };

    var getIdQuery = function(id) {
        return {_id: ObjectID(id)}
    };


    var getAllDocsAsArray = function(collectionName, options) {
        return findAsArray(collectionName, {}, options).then(function(ctx){
            var deferred = Q.defer();
            deferred.resolve(ctx.docs);
            deferred.promise.finally(function(){ ctx.db.close(); });
            return deferred.promise;
        });
    };

    var removeDoc = function(collectionName, id) {
        return getCollection(collectionName).then(function(ctx){
            var deferred = Q.defer();
            ctx.collection.remove(getIdQuery(id), {w: 1}, function(err){
                resolveOrReject(deferred, err, 'Fehler beim Löschen des Dokuments mit der Id ' + id + ' von ' + collectionName, {});
            });
            deferred.promise.finally(function(){ ctx.db.close(); });
            return deferred.promise;
        });

    };

    var insertDoc = function(collectionName, doc) {
        return getCollection(collectionName).then(function(ctx){
            var deferred = Q.defer();
            ctx.collection.insert(doc, {w: 1}, function(err, result){
                resolveOrReject(deferred, err, 'Fehler beim Einfügen des Dokuments ' + JSON.stringify(doc) + ' in ' + collectionName, doc);
            });
            deferred.promise.finally(function(){ ctx.db.close(); });
            return deferred.promise;
        });
    };

    var updateDoc = function(collectionName, id, doc) {
        return getCollection(collectionName).then(function(ctx){
            var deferred = Q.defer();
            ctx.collection.update(getIdQuery(id), doc, {w: 1}, function(err, result){
                resolveOrReject(deferred, err, 'Fehler beim Aktualisieren des Dokuments mit der Id ' + id + ' in ' + collectionName, doc);
            });
            deferred.promise.finally(function(){ ctx.db.close(); });
            return deferred.promise;
        });
    };

    var insertOrUpdateDoc = function(collectionName, doc) {
        if (doc._id) {
            var id = doc._id;
            doc._id = ObjectID(doc._id);
            return updateDoc(collectionName, id, doc);
        } else {
            return insertDoc(collectionName, doc);
        }
    };

    var updateAvailability = function(order) {
        var limitIds = _.map(order.articles, function(article) { return ObjectID(article.limit); });
        return findAsArray("limits", {_id: {$in: limitIds}}, {}).then(function(ctx){
            var promises = [];
            _.each(ctx.docs, function(limit){
                var limitId = limit._id.toHexString();
                var ordered = _.reduce(order.articles, function(ordered, article){
                    return ordered + (article.limit == limitId ? article.ordered : 0);
                }, 0);
                if (ordered > 0) {
                    var deferred = Q.defer();
                    promises.push(deferred.promise);
                    limit.available -= ordered;
                    ctx.collection.save(limit, {w:1}, function(err, result){
                        resolveOrReject(deferred, err, 'Fehler beim Aktualisieren der Limite ' + limit.name);
                    });
                }
            });
            return Q.all(promises);
        });
    };

    var prepareOrderForInsert = function(order, nextOrderNo) {
        order.kitchen = _.findWhere(order.articles, {kitchen: true}) != undefined;
        order.articles = _.map(order.articles, function(article){
            return _.pick(article, 'name', 'receipt', 'price', 'ordered', 'kitchen');
        });
        if (order.kitchen) {
            order.no = nextOrderNo;
        }
    };

    var insertOrder = function(order) {
        return updateAvailability(order).then(function(){
            return getNextOrderNo().then(function(ctx){
                var deferred = Q.defer();
                prepareOrderForInsert(order, ctx.orderNo);
                ctx.collection.insert(order, {w: 1}, function(err, result){
                    resolveOrReject(deferred, err, 'Fehler beim Erstellen der Bestellung', order);
                });
                deferred.promise.finally(function(){ ctx.db.close(); });
                return deferred.promise;
            });
        });
    };


    var removeLimitFromArticles = function(id) {
        return getCollection('articles').then(function(ctx){
            var deferred = Q.defer();
            ctx.collection.update({limit: id}, {$unset:{ limit: ''}}, {w: 1, multi: true}, function(err, result){
                resolveOrReject(deferred, err, 'Fehler beim Entfernen der Limite von Artikeln', result);
            });
            deferred.promise.finally(function(){ ctx.db.close(); });
            return deferred.promise;
        });
    };

    return {
        getSettings: function() {
            return getCollection('settings').then(function(ctx){
                var deferred = Q.defer();
                ctx.collection.findOne({}, {}, function(err, doc){
                    resolveOrReject(deferred, err, 'Fehler beim Abfragen der Einstellungen', doc || {});
                });
                deferred.promise.finally(function(){ ctx.db.close(); });
                return deferred.promise;
            });
        },
        saveSettings: function(settings) {
            return insertOrUpdateDoc('settings', settings);
        },
        getArticles: function() {
            return getAllDocsAsArray('articles', {sort: {name: 1}});
        },
        removeArticle: function(id) {
            return removeDoc('articles', id);
        },
        saveArticle: function(article) {
            return insertOrUpdateDoc('articles', article);
        },

        getLimits: function() {
            return getAllDocsAsArray('limits', {sort: {name: 1}});
        },
        removeLimit: function(id){
            return removeLimitFromArticles(id).then(function(){
                return removeDoc('limits', id);
            });
        },
        saveLimit: function(limit) {
            return insertOrUpdateDoc('limits', limit);
        },

        getOrders: function() {
            return getAllDocsAsArray('orders', {sort: {_id:-1}});
        },
        insertOrder: insertOrder,
        removeOrder: function(id) {
            // TODO: availablity is not updated...!?
            return removeDoc('orders', id);
        },
        removeAllOrders: function() {
            return getCollection('orders').then(function(ctx){
                var deferred = Q.defer();
                ctx.collection.remove({}, {w: 1}, function(err, result){
                    resolveOrReject(deferred, err, 'Fehler beim Löschen aller Bestellungen', result);
                });
                deferred.promise.finally(function(){ ctx.db.close(); });
                return deferred.promise;
            });
        }
    };
};