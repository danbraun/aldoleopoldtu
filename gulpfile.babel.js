'use strict';

import plugins  from 'gulp-load-plugins';
import yargs    from 'yargs';
import browser  from 'browser-sync';
import gulp     from 'gulp';
// import panini   from 'panini';
// import rimraf   from 'rimraf';
// import sherpa   from 'style-sherpa';
import yaml     from 'js-yaml';
import fs       from 'fs';

// Load all Gulp plugins into one variable
const $ = plugins();

// Check for --production flag
const PRODUCTION = !!(yargs.argv.production);

// Load settings from settings.yml
const { PROXY, PORT, COMPATIBILITY, PATHS } = loadConfig();

function loadConfig() {
  let ymlFile = fs.readFileSync('config.yml', 'utf8');
  return yaml.load(ymlFile);
}

// Build the "dist" folder by running all of the below tasks
gulp.task('build',
 gulp.series(gulp.parallel(sass, javascript)));

// Build the site, run the server, and watch for file changes
gulp.task('default',
  gulp.series('build', server, watch));


// Compile Sass into CSS
// In production, the CSS is compressed
function sass() {
  return gulp.src('src/scss/app.scss')
    .pipe($.sourcemaps.init())
    .pipe($.sass({
      includePaths: PATHS.sass
    })
      .on('error', $.sass.logError))
    .pipe($.autoprefixer({
      browsers: COMPATIBILITY
    }))
    // Comment in the pipe below to run UnCSS in production
    //.pipe($.if(PRODUCTION, $.uncss(UNCSS_OPTIONS)))
    .pipe($.if(PRODUCTION, $.cssnano()))
    .pipe($.if(!PRODUCTION, $.sourcemaps.write()))
    .pipe(gulp.dest('css'))
    .pipe(browser.reload({ stream: true }))
}

// Combine JavaScript into one file
// In production, the file is minified
function javascript() {
  return gulp.src(PATHS.javascript)
      .pipe($.sourcemaps.init())
      .pipe($.babel())
      .pipe($.concat('app.js'))
      .pipe($.if(PRODUCTION, $.uglify()
              .on('error', e => { console.log(e); })
      ))
      .pipe($.if(!PRODUCTION, $.sourcemaps.write()))
      .pipe(gulp.dest('js'));
}

// Start a server with BrowserSync to preview the site in
function server(done) {
  browser.init({
    proxy: PROXY,
    port: PORT
  });
  done();
}

// Watch for changes to static assets, pages, Sass, and JavaScript
function watch() {
  gulp.watch('*.php').on('all', browser.reload);
  gulp.watch('templates/**/*.twig').on('all', browser.reload);
  gulp.watch('src/scss/**/*.scss').on('all', gulp.series(sass));
  gulp.watch('src/js/**/*.js').on('all', gulp.series(javascript, browser.reload));
}
