'use strict';

var path    = require('path');

module.exports = function(grunt) {

  var sassError = 'scss/error.scss';
  var jshintFiles = [
    'Gruntfile.js',
    'app.js'
  ];

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    autoprefixer: {
      dist: {
        options: {
          browsers: ['last 2 versions']
        },
        files: {
          'public/stylesheets/error.css' : 'public/stylesheets/error.css'
        }
      }
    },
    sass: {
      compile: {
        options: {
          style: 'compressed'
        },
        files: {
          'public/stylesheets/error.css': sassError
        }
      },
      dev: {
        options: {
          lineNumbers: true,
          style: 'expanded'
        },
        files: {
          'public/stylesheets/error.css': sassError
        }
      }
    },
    jshint: {
      prod: {
        options: {
          jshintrc: '.jshintrc-prod'
        },
        src: jshintFiles
      },
      dev: {
        options: {
          jshintrc: '.jshintrc'
        },
        src: jshintFiles
      }
    },
    bgShell: {
      server: {
        cmd: 'NODE_PATH=. node ./node_modules/nodemon/bin/nodemon.js -e js,hbs index.js',
        bg: true,
        execOpts: {
          maxBuffer: 1000*1024
        }
      },
      'npm-install': {
        bg: false,
        cmd: 'echo \'installing dependencies...\n\' && npm install --silent'
      }
    }
  });

  grunt.loadNpmTasks('grunt-bg-shell');
  grunt.loadNpmTasks('grunt-contrib-sass');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-jade-plugin');
  grunt.loadNpmTasks('grunt-autoprefixer');
  grunt.registerTask('default', [
    'bgShell:npm-install',
    'sass:compile',
    'autoprefixer',
    'jshint:dev'
  ]);

};
