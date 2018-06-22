var gulp = require('gulp'),
    debug = require('gulp-debug'),
    nodemon = require('gulp-nodemon'),
    loopbackAngular = require('gulp-loopback-sdk-angular'),
    usemin = require('gulp-usemin'),
    wrap = require('gulp-wrap'),
    connect = require('gulp-connect'),
    watch = require('gulp-watch'),
    minifyCss = require('gulp-cssnano'),
    minifyJs = require('gulp-uglify'),
    sourcemaps = require('gulp-sourcemaps'),
    concat = require('gulp-concat'),
    less = require('gulp-less'),
    rename = require('gulp-rename'),
    minifyHTML = require('gulp-htmlmin');

var paths = {
    server: 'server/**/*.{js,json}',
    models: 'common/**/*.{js,json}',
    scripts: 'client/src/js/**/*.*',
    cssstyles: 'client/src/css/**/*.*',
    styles: 'client/src/less/**/*.*',
    images: 'client/src/img/**/*.*',
    templates: 'client/src/templates/**/*.html',
    index: 'client/src/index.html',
    bower_fonts: 'client/src/components/**/*.{ttf,woff,woff2,eof,svg}'
};


/**
 * Handle bower components from index
 */
gulp.task('usemin', function () {
    return gulp.src(paths.index)
        .pipe(usemin({
            js: [minifyJs(), 'concat'],
            css: [minifyCss({
                keepSpecialComments: 0
            }), 'concat'],
        }))
        .pipe(gulp.dest('client/dist/'));
});

/**
 * Copy assets
 */
gulp.task('build-assets', ['copy-bower_fonts']);

gulp.task('copy-bower_fonts', function () {
    return gulp.src(paths.bower_fonts)
        .pipe(rename({
            dirname: '/fonts'
        }))
        .pipe(gulp.dest('client/dist/lib'));
});

/**
 * Handle custom files
 */
gulp.task('build-custom', ['custom-images', 'custom-js', 'custom-less', 'custom-templates']);

gulp.task('custom-images', function () {
    return gulp.src(paths.images)
        .pipe(gulp.dest('client/dist/img'));
});

gulp.task('custom-js', function () {
    return gulp.src(paths.scripts)
        .pipe(sourcemaps.init())
        .pipe(debug())
        .pipe(minifyJs())
        .pipe(concat('dashboard.min.js'))
        .pipe(sourcemaps.write('../maps'))
        .pipe(gulp.dest('client/dist/js'));
});

gulp.task('custom-less', function () {
    return gulp.src(paths.styles)
        .pipe(less())
        .pipe(gulp.dest('client/dist/css'));
});

gulp.task('custom-templates', function () {
    return gulp.src(paths.templates)
        .pipe(minifyHTML())
        .pipe(gulp.dest('client/dist/templates'));
});

/**
 * auto-generate angular $resource handlers from LoopBack services
 **/
gulp.task('build-strongloop-angular', function () {
    return gulp.src('./server/server.js')
        .pipe(loopbackAngular())
        .pipe(rename('lb-services.js'))
        .pipe(gulp.dest('./client/dist/js'));
;
});

/**
 * Watch custom files
 */
gulp.task('watch', function () {
    gulp.watch([paths.models], ['build-strongloop-angular']);
    gulp.watch([paths.server], ['build-strongloop-angular']);
    gulp.watch([paths.images], ['custom-images']);
    gulp.watch([paths.cssstyles], ['usemin']);
    gulp.watch([paths.styles], ['custom-less']);
    gulp.watch([paths.scripts], ['custom-js']);
    gulp.watch([paths.templates], ['custom-templates']);
    gulp.watch([paths.index], ['usemin']);
});

gulp.task('start', function () {
    nodemon({
            script: 'server/server.js',
            ext: 'js json html',
            env: {
                'NODE_ENV': 'development'
            }
        })
        .on('restart', function () {
            console.log('restarted!')
        })
});

/**
 * Gulp tasks
 */
gulp.task('build', ['usemin', 'build-assets', 'build-custom',
                    'build-strongloop-angular']);
gulp.task('default', ['build', 'start', 'watch']);
