This project uses babel to compile javascript that utilizes the latest features back to a version of javascript that node supports.

Fortify cannot handle the modern javascript before it is compiled. It will fail to parse it correctly, generate a warning, and not analyze the file.

In order for Fortify to successfully run, the fortify.sh script uses gulp to compile everything to a version of javascript that Fortify supports, and then runs
sourceanalyzer on the compiled version.

The compiled source is put into the dist directory. If you would like to generate it from the code present in the zip file, run `yarn build`.

The compiled source in the dist directory WILL NOT match the uncompiled source.

If you need to find the line in the original file that corresponds to a line in a compiled file,
use sourcemaptool.js.
