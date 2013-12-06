/*
 * Copyright 2000-2013 Namics AG. All rights reserved.
 */
/**
 * @author: dnyffenegger
 * @since 06.12.13
 */


var fs = require('fs')
    , childProcess = require('child_process')
    , moment = require('moment')
    , Q = require('q')
    , ejs = require('ejs')
    , shellescape = require('shell-escape')
    ;

module.exports = function(settings) {

    var pdfDirectory = settings.pdfDirectory || 'pdfs';
    var receiptTemplate = ejs.compile(fs.readFileSync(settings.receiptTemplate || 'print/receipt.tex').toString());
    var orderTemplate = ejs.compile(fs.readFileSync(settings.orderTemplate || 'print/order.tex').toString());
    var getPrinterName = settings.getPrinterName;
    var receiptPrinterSettingName = settings.receiptPrinterSettingName || 'receiptPrinter';
    var orderPrinterSettingName = settings.orderPrinterSettingName || 'orderPrinter';

    if (!fs.existsSync(pdfDirectory)) {
        fs.mkdirSync(pdfDirectory);
    }

    var printFile = function(printer, jobname, file, options) {
        var deferred = Q.defer();
        var args = [];
        args.push('lp');
        args.push('-d');
        args.push(printer);
        args.push('-t'); // job name
        args.push(jobname);
        if (options) {
            args.push(options);
        }
        args.push(file);
        childProcess.exec(shellescape(args), function(error, stdout, stderr){
            if (error != null) {
                var errorMsg = 'Fehler beim Drucken auf ' + printer + ': ' + stderr;
                console.log(errorMsg);
                deferred.reject(errorMsg);
            } else {
                deferred.resolve(stdout);
            }
        });
        return deferred.promise;

    };


    var printOnReceiptPrinter = function(file, jobname) {
        var deferred = Q.defer();
        getPrinterName(receiptPrinterSettingName, 'Kein Beleg-Drucker definiert').then(function(printerName){
                return printFile(printerName, jobname, file);
        }, function(error){
            deferred.reject(error);
        });
        return deferred.promise;
    };

    var printOnOrderPrinter = function(file, jobname) {
        var deferred = Q.defer();
        getPrinterName(orderPrinterSettingName, 'Kein Bestell-Drucker definiert').then(function(printerName) {
            return printFile(printerName, jobname, file, '-o media=a5 -o fit-to-page');
        }, function(error){
            deferred.reject(error);
        });
        return deferred.promise;
    };

    function createJobname(order, suffix) {
        var orderId = moment(order._id.getTimestamp()).format('YYYYMMDD-HHmmss');
        if (order.no)
            orderId += '-' + order.no;
        var jobname = orderId + '-' + suffix;
        return jobname;
    }

    function createLatexFile(order, jobname, template) {
        var filenameTex = pdfDirectory + '/' + jobname + '.tex';
        fs.writeFileSync(filenameTex, template({
            order: order,
            formatCurrency: function (amount) {
                return (amount / 100).toFixed(2);
            },
            moment: moment
        }));
        return filenameTex;
    }

    var createPdf = function(latexFile, jobname) {
        var deferred = Q.defer();
        var args = [];
        args.push('/usr/texbin/pdflatex')
        args.push('-output-directory');
        args.push(pdfDirectory);
        args.push('-jobname');
        args.push(jobname);
        args.push(latexFile);

        childProcess.exec(shellescape(args), function(error, stdout, stderr){
            if (error != null) {
                deferred.reject(error);
            } else {
                deferred.resolve(pdfDirectory + '/' + jobname + '.pdf');
            }
        });
        return deferred.promise;
    };

    var createPdfAndPrint = function(printJob) {
        var deferred = Q.defer();
        createPdf(printJob.latexFile, printJob.jobname).then(
            function (pdf) {
                return printJob.printFunc(pdf, printJob.jobname);
            },
            function (error) {
                console.log('Error while creating PDF from ' + printJob.latexFile + ': ' + error);
                deferred.reject(printJob.errorName + ' konnte nicht erstellt werden: ' + JSON.stringify(error));
            }
        );

        return deferred.promise;
    }

    var print = function(printJob) {
        var jobname = createJobname(printJob.order, printJob.name);
        var latexFile = createLatexFile(printJob.order, jobname, printJob.template);
        return createPdfAndPrint({
            jobname: jobname,
            latexFile: latexFile,
            printFunc: printJob.printFunc,
            errorName: printJob.errorName
        });
    };

    var getQueue = function() {
        var deferred = Q.defer();
        childProcess.exec('lpq -a', function(error, stdout, stderr){
            if (error != null) {
                deferred.reject(error);
            } else {
                var queue = stdout.split('\n');
                queue.shift(); // removes the first element (header)
                queue.pop(); // remove the last (empty) element
                deferred.resolve(queue);
            }
        });
        return deferred.promise;
    }

    return {
        printOrder: function(order){
            return print({
                order: order,
                name: 'order',
                template: orderTemplate,
                printFunc: printOnOrderPrinter,
                errorName: 'Bestellung'
            });
        },
        printReceipt: function(order) {
            return print({
                order: order,
                name: 'receipt',
                template: receiptTemplate,
                printFunc: printOnReceiptPrinter,
                errorName: 'Beleg'
            });

        },
        getQueue: function() {
            return getQueue();
        }
    };

};
