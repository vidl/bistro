'use strict';

/* jasmine specs for controllers go here */
describe('Bistro controllers', function() {

    describe('CashboxController', function(){
        var scope = {};
        var ctrl = new CashboxController(scope);

        beforeEach(function(){
            scope.articles =  [
                { id: 1, name: 'Menü 1', price: { chf: 510, eur: 340}, available: 10, ordered: 0},
                { id: 2, name: 'Menü 2', price: { chf: 780, eur: 530}, available: -1, ordered: 0}
            ];
            scope.total = {chf: 0, eur: 0};
        });

        it('should be nothing ordered', function() {
            expect(scope.total.eur).toEqual(0);
            expect(scope.total.chf).toEqual(0);
            expect(scope.articles.length).toEqual(2);
            expect(scope.articles[0].ordered).toEqual(0);
            expect(scope.articles[1].ordered).toEqual(0);
        });

        it('should order one article', function() {
            scope.add(scope.articles[0]);
            expect(scope.articles[0].ordered).toEqual(1);
            expect(scope.articles[0].available).toEqual(9);
            expect(scope.total.chf).toEqual(510);
            expect(scope.total.eur).toEqual(340);
            expect(scope.isOrdered(scope.articles[0])).toEqual(true);
            expect(scope.isOrdered(scope.articles[1])).toEqual(false);
        });

        it('should order more articles', function() {
            scope.add(scope.articles[0]);
            scope.add(scope.articles[1]);
            expect(scope.articles[0].ordered).toEqual(1);
            expect(scope.articles[0].available).toEqual(9);
            expect(scope.articles[1].ordered).toEqual(1);
            expect(scope.articles[1].available).toBeLessThan(0);
            expect(scope.total.chf).toEqual(1290);
            expect(scope.total.eur).toEqual(870);
            expect(scope.isOrdered(scope.articles[0])).toEqual(true);
            expect(scope.isOrdered(scope.articles[1])).toEqual(true);

            scope.add(scope.articles[0]);
            expect(scope.articles[0].ordered).toEqual(2);
            expect(scope.articles[0].available).toEqual(8);
            expect(scope.articles[1].ordered).toEqual(1);
            expect(scope.articles[1].available).toBeLessThan(0);
            expect(scope.total.chf).toEqual(1800);
            expect(scope.total.eur).toEqual(1210);
            expect(scope.isOrdered(scope.articles[0])).toEqual(true);
            expect(scope.isOrdered(scope.articles[1])).toEqual(true);
        });

        it('should remove an ordered article', function() {
            scope.add(scope.articles[0]);
            scope.add(scope.articles[0]);
            scope.remove(scope.articles[0]);
            expect(scope.total.chf).toEqual(510);
            expect(scope.total.eur).toEqual(340);
            expect(scope.isOrdered(scope.articles[0])).toEqual(true);
            expect(scope.isOrdered(scope.articles[1])).toEqual(false);
        });

    });
});

