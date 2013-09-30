'use strict';

describe('Bistro App', function() {

    beforeEach(function(){
        browser().navigateTo('/');
    });

    it('should redirect index.html to index.html#/cashbox', function() {
        expect(browser().location().url()).toBe('/cashbox');
    });

});