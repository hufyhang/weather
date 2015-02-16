module.exports = function (grunt) {
  'use strict';

  require('time-grunt')(grunt);

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    connect: {
      server: {
        options: {
          port: 8090,
          base: '.'
        }
      }
    },

    open: {
      dev: {
        path: 'http://localhost:8090'
      }
    },

    watch: {
      all: {
        files: ['*.html', 'css/*.css', 'js/*.js', 'vendor/**/*.*'],
        options: {
          livereload: true
        }
      }
    },

    uglify: {
      dist: {
        files: {
          'dist/js/main.js': ['js/main.js'],
          'dist/js/chop-bundle.js': ['js/chop-bundle.js']
        }
      }
    },

    htmlmin: {
      dist: {
        options: {
          removeComments: true,
          collapseWhitespace: true
        },
        files: {
          'dist/index.html': 'index.html',
          'dist/weather_template.html': 'weather_template.html',
          'dist/weather_forecast_template.html': 'weather_forecast_template.html',
          'dist/weather_item_template.html': 'weather_item_template.html',
          'dist/details_template.html': 'details_template.html'
        }
      }
    },

    cssmin: {
      dist: {
        files: {
          'dist/css/style.css': ['css/style.css']
        }
      }
    },

    copy: {
      dist: {
        files: [
          {expand: true, src: ['vendor/**/*'], dest: 'dist/'},
          {expand: true, src: ['img/*.png'], dest: 'dist/'},
          {expand: true, src: ['img/icons/*'], dest: 'dist/'}
        ]
      }
    },

    imagemin: {
      dist: {
        options: {
          optimizationLevel: 3
        },

        files: [{
          expand: true,
          cwd: 'dist/img/',
          src: ['**/*.{png,jpg,gif}'],
          dest: 'dist/img/'
        }]
      }
    },


    ftpush: {
      dist: {
        auth: {
          host: 'feifeihang.info',
          port: 21,
          authKey: 'host'
        },
        src: './dist',
        dest: '/public_html/weather'
      }
    }

  });

  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-open');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-newer');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-htmlmin');
  grunt.loadNpmTasks('grunt-contrib-cssmin');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-imagemin');
  grunt.loadNpmTasks('grunt-ftpush');

  grunt.registerTask('serve', ['connect:server', 'open:dev', 'watch']);
  grunt.registerTask('build', ['newer:uglify', 'newer:htmlmin', 'newer:cssmin', 'newer:copy', 'newer:imagemin']);
  grunt.registerTask('deploy', ['ftpush:dist']);

};
