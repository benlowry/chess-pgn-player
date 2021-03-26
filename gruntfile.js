module.exports = function (grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    standard: {
      app: {
        src: [
          'src'
        ]
      }
    },
    concat: {
      dist: {
        options: {
          separator: '\n\n\n\n'
        },
        src: [
          'src/*.js',
          '!**/*.test.js',
          './node_modules/pgn-parser/src/parser.js'
        ],
        dest: '../example/player.js'
      }
    }
  })
  grunt.loadNpmTasks('grunt-contrib-concat')
  grunt.loadNpmTasks('grunt-contrib-uglify')
  grunt.loadNpmTasks('grunt-standard')
  grunt.registerTask('default', ['concat'])
}
