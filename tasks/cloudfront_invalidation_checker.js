/*
 * grunt-cloudfront-invalidation-checker
 * https://github.com/simplereach/grunt-cloudfront-invalidation-checker
 *
 * Copyright (c) 2014 Andre Malan
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {

  // Please see the Grunt documentation for more information regarding task
  // creation: http://gruntjs.com/creating-tasks

  grunt.registerMultiTask('cloudfront_invalidation_checker', 'Checks to see if Amazon Cloudfront invalidations are complete and alerting once they are.', function() {
    // Merge task-specific and/or target-specific options with these defaults.
    var options = this.options({
      punctuation: '.',
      separator: ', '
    });
  //
  //   // Iterate over all specified file groups.
  //   this.files.forEach(function(f) {
  //     // Concat specified files.
  //     var src = f.src.filter(function(filepath) {
  //       // Warn on and remove invalid source files (if nonull was set).
  //       if (!grunt.file.exists(filepath)) {
  //         grunt.log.warn('Source file "' + filepath + '" not found.');
  //         return false;
  //       } else {
  //         return true;
  //       }
  //     }).map(function(filepath) {
  //       // Read file source.
  //       return grunt.file.read(filepath);
  //     }).join(grunt.util.normalizelf(options.separator));
  //
  //     // Handle options.
  //     src += options.punctuation;
  //
  //     // Write the destination file.
  //     grunt.file.write(f.dest, src);
  //
  //     // Print a success message.
  //     grunt.log.writeln('File "' + f.dest + '" created.');
  //   });
  // });
    var done = this.async();
    var data = this.data;
    var incompleteValidations = [];
    var distributionId = data.distributionId;
    var notifierOptions = data.notifier;
    var AWS = require('aws-sdk');
    var everythingDeployed = true;

    var NotificationCenter = require('node-notifier').NotificationCenter;

    var notifier = new NotificationCenter({
     withFallback: true // use Growl if <= 10.8?
    });

    AWS.config.update({
      region: this.data.region,
      accessKeyId: this.data.accessKeyId,
      secretAccessKey: this.data.secretAccessKey
    });

    var CloudFront = new AWS.CloudFront();

    var checkValidations = function(){
      incompleteValidations = [];
      CloudFront.listInvalidations({
        DistributionId: distributionId
      },
      function(err, data) {
        if(err) {
          console.log(err);
        }
        else {
          var invalidations = data.Items;
          for(var i=0;i<invalidations.length;i++) {
            if(invalidations[i].Status === 'InProgress') {
              incompleteValidations.push(invalidations[i]);
            }
          }

          if (incompleteValidations.length) {
            for(var i=0;i<incompleteValidations.length;i++) {
              grunt.log.writeln(
                incompleteValidations[i].Id,
                ": ", incompleteValidations[i].Status,
                ", created: ", incompleteValidations[i].CreateTime
              );
              setTimeout(checkValidations, 5000);
            }
          } else {
            notifier.notify(notifierOptions, function(error, response) {
              done();
            });
          }
        }
      });
    };

    grunt.log.writeln("checking CloudFront for inProgress validations...");
    checkValidations();
  });
};
