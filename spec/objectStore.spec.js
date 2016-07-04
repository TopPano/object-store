'use strict';
var assert = require('assert');
var Store = require('../lib');
var fs = require('fs');

describe('Object Store', function() {
  var store;
  before(function(done) {
    store = new Store({ bucket: 'MOCKUP' });
    done();
  });

  it('should create a new object in the store', function(done) {
    var key = ['posts', 'aad2d60bb2d54400', 'SHARDING', 'pano', 'src', '2016-07-01', 'test.jpg'];
    var file = fs.readFileSync(__dirname + '/fixtures/1.jpg');
    store.create(key, file, function(err, result) {
      if (err) { return done(err); }
      var regex = /(posts)\/(aad2d60bb2d54400)\/([a-z0-9]{4})\/(pano)\/(src)\/([0-9-]+\/([a-z.]+))/;
      assert(result['Key'].match(regex), true);
      done();
    });
  });
});
