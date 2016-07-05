'use strict';
var S3Uploader = require('../aws-wrapper').S3Uploader;
var S3Remover = require('../aws-wrapper').S3Remover;

var crypto = require('crypto');
var DEFAULT_POST_SHARDING_LENGTH = 4;
function genSharding(length) {
  return crypto.randomBytes(Math.ceil(length / 2)).toString('hex');
}

var ObjectStore = module.exports = function(config) {
  this.config = config || {};
  this.bucket = this.config.bucket;

  if (!this.bucket) { throw new Error('Missing property: bucket'); }
  if (this.bucket === 'MOCKUP') {
    this.s3Uploader = new S3Uploader({
      Bucket: this.bucket,
      MockupBucketPath: this.config.mockupBucketPath,
      MockupServerPort: this.config.mockupServerPort
    });
    this.s3Remover = new S3Remover({ Bucket: this.bucket });
  } else {
    this.s3Uploader = new S3Uploader({ Bucket: this.bucket });
    this.s3Remover = new S3Remover({ Bucket: this.bucket });
  }
};

ObjectStore.prototype = {
  create: function(key, object, callback) {
    var objKey;
    if (typeof key === 'string') {
      objKey = key;
    } else if (Array.isArray(key)) {
      if (key.indexOf('SHARDING') !== -1) {
        key = key.map(function(element, callback) {
          if (element.startsWith('SHARDING')) {
            return genSharding(element.split('-')[1] !== undefined ?
                               element.split('-')[1] :
                                 DEFAULT_POST_SHARDING_LENGTH);
          } else {
            return element;
          }
        });
      }
      objKey = key.join('/');
    } else {
      return callback(new Error('Invalid key type'));
    }
    this.s3Uploader.send({
      Key: objKey,
      File: object,
      options: {
        ACL: 'public-read'
      }
    }, function(err, result) {
      if (err) { return callback(err); }
      var key = result.key || result.Key /* XXX: S3 would return either Key or key */;
      var location = result.Location;
      if (!key || !location) {
        return callback(new Error('Failed to create object on object store'));
      }
      callback(null, {
        key: key,
        location: location
      });
    });
  },
  delete: function(key, callback) {
    this.s3Remover.remove({Key: key}, callback);
  }
};
