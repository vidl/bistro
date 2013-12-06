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
    ;

module.exports = function(settings) {

    var pdfDirectory = settings.pdfDirectory || 'pdfs';
    var receiptTemplate = ejs.compile(fs.readFileSync(settings.receiptTemplate || 'print/receipt.tex').toString());
    var kitchenOrderTemplate = ejs.compile(fs.readFileSync(settings.kitchenOrderTemplate || 'print/kitchenorder.tex').toString());
    var getPrinterName = settings.getPrinterName;

    if (!fs.existsSync(pdfDirectory)) {
        fs.mkdirSync(pdfDirectory);
    }

    var printFile = function( printer, file, options) {
        var deferred = Q.defer();
        var args = [];
        args.push('-d');
        args.push(printer);
        if (options) {
            args.push(options);
        }
        args.push(file);
        childProcess.exec('lp ' + args.join(' '), function(error, stdout, stderr){
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


    var printOnReceiptPrinter = function(file) {
        var deferred = Q.defer();
        getPrinterName('receiptPrinter', 'Kein Beleg-Drucker definiert').then(function(printerName){
                return printFile(printerName, file);
        }, function(error){
            deferred.reject(error);
        });
        return deferred.promise;
    };

    var printOnOrderPrinter = function(file) {
        var deferred = Q.defer();
        getPrinterName('orderPrinter', 'Kein Bestell-Drucker definiert').then(function(printerName) {
            return printFile(printerName, file, '-o media=a5 -o fit-to-page');
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
        args.push('-output-directory');
        args.push(pdfDirectory);
        args.push('-jobname');
        args.push(jobname);
        args.push(latexFile);

        childProcess.exec('/usr/texbin/pdflatex ' + args.join(' '), function(error, stdout, stderr){
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
                return printJob.printFunc(pdf);
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

    return {
        printKitchenOrder: function(order){
            return print({
                order: order,
                name: 'kitchenorder',
                template: kitchenOrderTemplate,
                printFunc: printOnOrderPrinter,
                errorName: 'Küchen-Bestellung'
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

        }
    };

};
