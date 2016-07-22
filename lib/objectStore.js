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
  this.cdnBaseUrl = this.config.cdnDomainName ? 'https://' + this.config.cdnDomainName + '/' : null;

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
  create: function(key, object, options, callback) {
    if (typeof options == 'function') {
      callback = options;
      options = {};
    }

    callback = callback || function() {
    };
    options = options || {};

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

    var acl = options.acl || 'public-read';
    var contentType = options.contentType || 'image/jpeg';
    var cdnBaseUrl = this.cdnBaseUrl;
    this.s3Uploader.send({
      Key: objKey,
      File: object,
      options: {
        ACL: acl,
        ContentType: contentType
      }
    }, function(err, result) {
      if (err) { return callback(err); }
      var etag = result.Etag;
      var key = result.key || result.Key; /* XXX: S3 would return either Key or key */
      var location = result.Location;
      var cdnUrl = cdnBaseUrl ? cdnBaseUrl + key : null;
      if (!key || !location) {
        return callback(new Error('Failed to create object on object store'));
      }
      callback(null, {
        etag: etag,
        key: key,
        location: location,
        cdnUrl: cdnUrl
      });
    });
  },
  delete: function(key, callback) {
    if (typeof key !== 'string' && !Array.isArray(key)) {
      return callback(new Error('Invalid key type'));
    }
    this.s3Remover.remove({Key: key}, callback);
  }
};
