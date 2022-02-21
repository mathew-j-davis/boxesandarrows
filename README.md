# boxesandarrows
create diagrams from text descriptions

to run these scripts you need to install

graphviz
imagemagick

and set them up so you can can run them from a copmmandline / terminal window

inkscape and its commandline tools are also useful if you want to produce svgs


if you have this set up the following will produce the image ```my-test.png```
that will match ```test.png```

```
node ./draw.js -v -k -n ./data/nodes.csv  -e ./data/edges.csv -m ./data/map.csv -o ./my-test ./views/test.dot 
```

-v verbose include information on program behaviour
-v1 same as above
-v2 provide more detailed information


-k keep temporary files after execution

-n path to csv file defining the nodes or 'boxes'
-m path to csv file defining the position of the nodes, this can be done in the nodes file, but map allows nodes to be placed visually
-e path to cvs defining the edges or 'arrows' between boxes
-o base path for the output file

path the the chart template