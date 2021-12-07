# boxesandarrows
create diagrams from text descriptions

to run these scripts you need to install

graphviz
imagemagick

and set them up so you can can run them from a copmmandline / terminal window

inkscape and its commandline tools are also useful if you want to produce svgs


if you have this set up the follwing will produce the image ```my-test.png```
that will match ```draw-test.png```

```
node ./draw.js -v1 -n ./data/nodes.csv -e ./data/edges.csv -o my-test ./views/test.dot 
```
