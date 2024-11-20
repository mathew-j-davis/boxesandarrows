'use  strict';
var fs = require('fs');
var path = require( 'path');
const hb = require('handlebars');
const cmd = require('node-cmd');
const { v4 : uuid } = require('uuid');

const { exit, ppid } = require('process');
const Vector = require('victor');
const pixelWidth = require('string-pixel-width');
const {parse} = require('csv-parse/sync');

const {

    Node,

    EdgeType,
    Edge,
    Id,
    isBlank,
    isStringisBlank,
    cleanNumberInput,
    cleanStringInput,
    cleanArrayInput,
    clearRead,
    cleanBooleanInput,
    readdirrSync,
    readNodes,
    readPositions,
    readEdges,
    readJsonFromCsvFile,
    RoundTo,
    PrePoint,
    TailPrePoint,
    HeadPrePoint,
    MidPrePoint,

    Point,
    BezierPoint,
    RoundedPoint,
    PreassembleStartPoint,
    PreassembleEndPoint,
    PreassembleMidPoint
} = require('./modules/graph-core.js');



/*

TODO, move tag split to read


set direction

set base offset

set control length or position

plot curve

position text

direction and offset may not be the same?

*/



hb.registerHelper('proof', Proof);

var baseDirectory = process.cwd() ;//path.dirname(fs.realpathSync(process.cwd()));
const argv = require('minimist')(process.argv.slice(2));

// verbose
const verbose = (()=>{ 
    if(undefined == argv.v ){
        return 0;
    }
    if (!(argv.v > 1)){
        return 1;
    }
    return argv.v;
})();

// format

const format = (()=>{ 

    if(
            undefined != argv.f && 
            typeof(argv.f) == 'string' && 
            argv.f.length > 0 &&
            (
                argv.f == 'png' ||
                argv.f == 'svg' 
            )
        ){
        return argv.f;
    }
    else{
        return 'png'
    }

})();




if (verbose > 1){
    console.log(`verbose level = ${verbose}`);
}

//data
const data = (()=>{
    if(undefined != argv.d && typeof(argv.d) == 'string' && argv.d.length > 0 ){
        const datapath = argv.d;
        const datatext = fs.readFileSync(datapath).toString();

        return JSON.parse(datatext);
    }
    return {};
})();

if (verbose > 1){
    console.log(`data = ${JSON.stringify(data, null, 2)}`);
}

// style
const style = (()=>{
    const stylepath = (()=>{
        if(undefined != argv.s && typeof(argv.s) == 'string' && argv.s.length > 0 ){
            return argv.s;
        }
        return'./style.json'
    })();
    const styletext = fs.readFileSync(stylepath).toString();

    return JSON.parse(styletext);
})();

if (verbose > 1){
    console.log(`style = ${JSON.stringify(style, null, 2)}`);
}

//partials
(()=>{
    const includespath = (()=>{
        if(undefined != argv.i && typeof(argv.i) == 'string' && argv.i.length > 0 ){
            return argv.i;
        }
        return'./views/'
    })();

    const results = readdirrSync(includespath);

    results.forEach((f)=>{

        var matches = /^["]?([A-z]:)?.*[\\|\/]([^\\|\/]+)\.hbs["]?$/.exec(f);
        if (!matches) {
            return;
        }
        
        hb.registerPartial(matches[2], fs.readFileSync(f, 'utf8'));        
    })

})();

const keepTemp = (()=>{
    return (undefined != argv.k && argv.k );
})();

// two nodes collections exist to handle graphviz behaviour of allowing same node to be overridden
// this is only important within this code for position
// the position may change depending on which nodes from the imported list have been included through tags
// imported is the full list
// nodes is a map of only the most recent used version of the node
// the behaviour isn't perfect as it replaced the whole node instead of overriding attributtes, if this evermatters, i'll change the behaviour

var nodes = new Map();

class Path {
    constructor (
    )
    {
        this.tail = null;
        this.head = null;
        this.points = []
    }
}

const importedNodes = (()=>{
    if(!(undefined != argv.n && typeof(argv.n) == 'string' && argv.n.length > 0 )){
        return [];
    }
    return readNodes(readJsonFromCsvFile(argv.n));
})();


// position map overrides node positions

const importedNodePositions = (()=>{
    if(!(undefined != argv.m && typeof(argv.m) == 'string' && argv.m.length > 0 )){
        return new Map();
    }
    var m = readPositions(readJsonFromCsvFile(argv.m)); //readNodes(readJsonFromCsvFile(argv.n));

    for (i in importedNodes){

        var xy = m.get(importedNodes[i].name)
    
        if (undefined != xy){
    
            importedNodes[i].x = xy[0]
            importedNodes[i].y = xy[1]
        }
    }

    return m;


})();



for (var n of importedNodes){
    nodes.set(n.name, n)
}


// push nodes that exist only in position map into nodes collections

for (const [name, xy] of importedNodePositions.entries()) {

    var n = nodes.get(name)

    if (undefined == n){

        var node = new Node(
            name,
            xy[0],
            xy[1]
        )

        importedNodes.push(node);
        nodes.set(name, node)

    }
}



const importedEdges = (()=>{
    if(!(undefined != argv.e && typeof(argv.e) == 'string' && argv.e.length > 0 )){
        return [];
    }

    return readEdges(readJsonFromCsvFile(argv.e));
})();


function scale(){ return usePointScale? style.scale.point : 1.0 }

function drawImportedNodes(){
    return drawNodes(importedNodes);
}


function drawTaggedNodes(tag){
    
    var tagged = importedNodes.filter(function(e) {
    
        var s = cleanStringInput(e.tags,'')
        var ss =  s.split(' ')

        return  ss.includes(tag);

    });

    // if multiple versions of the same node exist in data set, ensure it is the last one used that is on top
    // to be consistent with graphviz behaviour, this really only matters for position when not overuled by values in position map

    for (n of tagged){
        nodes.set(n.name, n)
    }
    
    return drawNodes(tagged)
}


function drawNodes(nodesToDraw){

    var a = [];

    for (n of nodesToDraw){

        a.push(drawNode(n));        
    }

    return a.join("\n");
}


function drawNode(n){

    var s = `${n.name}  ${writePos (n.x, n.y)} `;

    if (n.hideLabel){
        s += writeLabel('', false)
    }
    else if (n.label){
        s += writeLabel(n.label, n.isHtml) 
    }

    if (n.h ){
        s += H(n.h) 
    }

    if (n.w ){
        s += W(n.w)
    }
    
    if (n.special){
        s += n.special;
    }

    for (var i in n.attributes){
        s += writeAttribute(i, n.attributes[i]);
    }

    return s;

}

function writeAttribute(name, value){
    return `[${name}="${value}"] `;
}


// use inch scale or point scale
// neato -n2 mode expects point scale positions
var usePointScale = true;


hb.registerHelper('nodes', drawImportedNodes);
hb.registerHelper('edges', drawImportedEdges);
hb.registerHelper('taggededges', drawTaggedEdges);
hb.registerHelper('taggednodes', drawTaggedNodes);


// hb.registerHelper('n',  node);
// hb.registerHelper('nl', nodelabel);
// hb.registerHelper('e',  edge);
// hb.registerHelper('el',  edgelabel);
// hb.registerHelper('ec', edgecurve);



// //edgecurvelabel (from_name, start_direction, to_name, end_direction, label) 
// hb.registerHelper('ecl', edgecurvelabel);

// //edgeCurveBezierlabel(from_name, start_direction, from_control_scale, to_name, end_direction, to_control_scale, label)
// hb.registerHelper('eccl', edgeCurveBezierlabel );
// hb.registerHelper('eccla', edgeCurveBezierlabelAdjust );


// hb.registerHelper('eclb', edgeCurveBezierLabelAdjustable );




// hb.registerHelper('elp', edgelabelposition);
// hb.registerHelper('pos', writePos);

// hb.registerHelper('node', node);
// hb.registerHelper('nodelabel', nodelabel);
// hb.registerHelper('edge', edge);

// hb.registerHelper('edgelabel', edgelabel);
// hb.registerHelper('edgecurve', edgecurve);
// hb.registerHelper('edgecurvelabel', edgecurvelabel);
// hb.registerHelper('edgecurvecontrollabel', edgeCurveBezierlabel )
// hb.registerHelper('edgelabelposition', edgelabelposition);



hb.registerHelper('layer', Layer);
hb.registerHelper('namedStyle', NamedStyle);


function drawTaggedEdges(tag){
    
    var taggedEdges = importedEdges.filter(function(e) {
    
        var s = cleanStringInput(e.tags,'')

        return  s.split(' ').includes(tag);

      });
    return drawEdges(taggedEdges)
}

function drawImportedEdges(){
    
    return drawEdges(importedEdges)
}


function drawEdges(edgesToDraw){

    var edgestrings = [];

    for (e of edgesToDraw){

        var from = nodes.get(e.from_name);
        var to = nodes.get(e.to_name);




 
        if (from == null)
        {
            console.log(`ERROR : Edge From Node not found :  ${e.from_name}`)
        }

        if (to == null)
        {
            console.log(`ERROR : Edge To Node not found ${e.to_name}`)
        }

        var s = drawEdgeConnector(from, to, e);

        if (verbose>1){
            console.log(s);
        }

        for (var i in e.attributes){
            s += writeAttribute(i, e.attributes[i]);
        }

        if (e.special){
            s += e.special;
        }

        edgestrings.push(`${s}`);
        
    }

    return edgestrings.join("\n");
}



function drawEdgeConnector(from, to, e){ // isCurve, from_name, start_direction, from_control_scale, to_name, end_direction, to_control_scale, label, balanceCurve, balanceX, balanceY, labelAdjustX, labelAdjustY, from_adjust_x, from_adjust_y, to_adjust_x, to_adjust_y, isHtml, justify, waypoints, start_label, end_label) {
    
    var prePoints = [];

    const startPrePoint = PreassembleStartPoint(from, e.start_direction, e.start_control, e.start_adjust_x, e.start_adjust_y);
    const endPrePoint   = PreassembleEndPoint(to, e.end_direction, e.end_control, e.end_adjust_x, e.end_adjust_y);

    prePoints.push(startPrePoint);
    prePoints = prePoints.concat(e.waypoints);

    prePoints.push(endPrePoint);

    prePoints = SetDirections(e, from, to, prePoints);

    prePoints = SetOffsets(e, from, to, prePoints);

    prePoints = SetPositions(e, from, to, prePoints);

    var points = PlotPoints(e, from, to, prePoints);

    label_balance_x = cleanNumberInput(e.label_balance_x, 0);
    label_balance_y = cleanNumberInput(e.label_balance_y, 0);
    label_adjust_x = cleanNumberInput(e.label_adjust_x, 0);
    label_adjust_y = cleanNumberInput(e.label_adjust_y, 0);
    start_adjust_x = cleanNumberInput(e.start_adjust_x, 0);
    start_adjust_y = cleanNumberInput(e.start_adjust_y, 0);
    end_adjust_x = cleanNumberInput(e.end_adjust_x, 0);
    end_adjust_y = cleanNumberInput(e.end_adjust_y, 0);
    start_label = cleanStringInput(e.start_label,'');
    end_label   = cleanStringInput(e.end_label,'');

    var label = cleanStringInput(e.label,'');
    var text_shift=0;

    var justify = cleanNumberInput(e.label_justify,0);

    if (justify!=0 ){

        pixels = pixelWidth(label, { font: style.font.edge.name, size: style.font.edge.size});
        var margin = X(style.label.justify.margin.x);

        text_shift = justify * ( (margin + ( pixels / 2 )) / style.doc.pixelsperinch );
    }

    var p = DrawDot(e, from, to, prePoints);

    var shift_x = X(((0.5 * label_balance_x) * (to.x - from.x )) + label_adjust_x + text_shift);
    var shift_y = Y(((0.5 * label_balance_y) * (to.y - from.y )) - label_adjust_y);

    p.addScalarX(shift_x);
    p.addScalarY(shift_y);
    
    var out = 
    
        edgelabel(from.name, to.name, label, e.isHtml) +  
        DrawPath(e, from, to, points) +
        DrawLabelPostion(p);


    if (start_label.length > 0){

        out += writeTailLabel(start_label);
    }

    if (end_label.length > 0){

        out += writeHeadLabel(end_label);
    }

    return out;
}



function DrawDot(e, from, to, prePoints){

    if (prePoints.length <= e.label_segment + 1){
        return new Vector(0, 0);
    }

    function plotDot(e, from, to, s0, s1 ){

        var p0 = new Vector(s0.x, s0.y);
        var p1 = new Vector(s0.control_out_x, s0.control_out_y); 
        var p2 = new Vector(s1.control_in_x, s1.control_in_y);
        var p3 = new Vector(s1.x, s1.y);
    
        var t = 0.5 +  (0.5 * e.label_balance );
        var u = 1 - t;
        var tt = t*t;
        var uu = u * u;
        var uuu = u * u * u;
        var ttt = t * t * t;
    
        var p = p0.multiplyScalar(uuu);
        p.add(  p1.multiplyScalar( 3 * uu *  t) );
        p.add(  p2.multiplyScalar( 3 *  u * tt) );
        p.add(  p3.multiplyScalar( ttt) );
    
        return p;
    
    }

    return plotDot(e, from, to, prePoints[e.label_segment], prePoints[e.label_segment+1]);
    
}

function DrawPath(e, from, to, points){

    var s = ``;

    if (points.tail != null){
        s += `s,${points.tail.x.toString()},${points.tail.y.toString()} `
    }

    if (points.head != null){
        s += `e,${points.head.x.toString()},${points.head.y.toString()} `
    }

    for (var p of points.points){
        s += `${p.x.toString()},${p.y.toString()} `
    }

    return ` [pos="${s}" ] `;
    

}

function  PlotPoints(e, from, to, prePoints){
    return PlotPointsCurve(e, from, to, prePoints);
}

function  PlotPointsCurve(e, from, to, prePoints){

    var curve = new Path();
    var start_arrow = null;
    var end_arrow = null;

    if (prePoints.length < 2){
        return [start_arrow, end_arrow, points];
    }

    for (var p of prePoints){
        if ( p instanceof TailPrePoint ){

            var c = new Vector (p.x_symbol, p.y_symbol)
            curve.points.push(c);

            var o = new Vector (p.control_out_x, p.control_out_y)
            curve.points.push(o);

            curve.tail = new Vector (p.x, p.y)
        }
        else if ( p instanceof HeadPrePoint ){
    
            var i = new Vector (p.control_in_x, p.control_in_y)
            curve.points.push(i);

            var c = new Vector (p.x_symbol, p.y_symbol)
            curve.points.push(c);

            curve.head = new Vector (p.x, p.y)

        }
        else{

            var i = new Vector (p.control_in_x, p.control_in_y)
            curve.points.push(i);

            var c = new Vector (p.x, p.y)
            curve.points.push(c);

            var o = new Vector (p.control_out_x, p.control_out_y)
            curve.points.push(o);
        }
    }

    return curve;
}

function SetPositions(e, from, to, prepoints) {

    if (prepoints.length < 2){
        return '';
    }

    for (var i=0; (i + 1) < prepoints.length; i++){

        var cc = SetEdgePointPositions(
            e,
            from, to, 
            prepoints[i],
            prepoints[i + 1]
            
        )

        prepoints[i] = cc[0];    
        prepoints[i + 1] = cc[1];

    }

    return prepoints;
}    


function SetEdgePointPositions(e, from, to, a, b) {

    if (e.type == 'p'){

        return SetEdgePointPositionsCurveProportional(e, from, to, a, b);
    }
    
    if (e.type == 'c'){
        return SetEdgePointPositionsCurve(e, from, to, a, b);
    }
    return SetEdgePointPositionsLinear(e, from, to, a, b);
}

function SetEdgePointPositionsLinear(e, from, to, a, b) {

    a.x = RoundTo(X( a.pre_x) ,4);
    a.y = RoundTo(InvertedY(a.pre_y),4);

    b.x = RoundTo(X( b.pre_x),4);
    b.y = RoundTo(InvertedY(b.pre_y),4);

    if ( a instanceof TailPrePoint ){
        a.x_symbol = RoundTo (X( a.pre_x_symbol ),4);
        a.y_symbol = RoundTo(InvertedY(a.pre_y_symbol),4);
        a.control_out_x = a.x_symbol;
        a.control_out_y = a.y_symbol;
    }

    if (a instanceof MidPrePoint ){
        a.control_out_x = a.x;
        a.control_out_y = a.y;
    }

    if ( b instanceof HeadPrePoint ){
        b.x_symbol = RoundTo(X(  b.pre_x_symbol ),4);
        b.y_symbol =  RoundTo(InvertedY(b.pre_y_symbol ),4);
        b.control_in_x = b.x_symbol;
        b.control_in_y = b.y_symbol;
    }

    if (b instanceof MidPrePoint ){
        b.control_in_x = b.x;
        b.control_in_y = b.y;
    }

    return [a,b]
}   


function SetEdgePointPositionsCurve(e, from, to, a, b) {

    const start_control_length = cleanNumberInput(e.start_control, style.shape.edge.size.control.start);
    const end_control_length = cleanNumberInput(e.end_control, style.shape.edge.size.control.end);

    a.control_out_x =
        RoundTo(
        X(
            a.pre_x  +

            DirectionRoundedX(a.control_out_direction) *
            start_control_length 
        ),4);

    a.control_out_y =
        RoundTo(
            InvertedY(
                a.pre_y +
                DirectionRoundedY(a.control_out_direction) *
                start_control_length 
            ),
        4);


    b.control_in_x = RoundTo(
        X(
            b.pre_x +

            DirectionRoundedX(b.control_in_direction) *
            end_control_length 
        ),4);
    
    b.control_in_y =  
        RoundTo(
        InvertedY(
            b.pre_y  +
            DirectionRoundedY(b.control_in_direction) *
            end_control_length 
        ),4);

        if ( a instanceof TailPrePoint ){
            a.x_symbol = RoundTo (X( a.pre_x_symbol ),4);
            a.y_symbol = RoundTo(InvertedY(a.pre_y_symbol),4);
        }

        if ( b instanceof HeadPrePoint ){
    
            b.x_symbol = RoundTo(X(  b.pre_x_symbol ),4);
            b.y_symbol =  RoundTo(InvertedY(b.pre_y_symbol ),4);
        }

        a.x = RoundTo(X( a.pre_x) ,4);
        a.y = RoundTo(InvertedY(a.pre_y),4);

        b.x = RoundTo(X( b.pre_x),4);
        b.y = RoundTo(InvertedY(b.pre_y),4);

    return [a,b]
}   


function SetEdgePointPositionsCurveProportional(e, from, to, a, b) {

    var distance = Math.sqrt(
        Math.pow( a.pre_x - b.pre_x, 2) +
        Math.pow( a.pre_y - b.pre_y, 2)
    );

    const start_control_length = cleanNumberInput(e.start_control, 1);
    const end_control_length = cleanNumberInput(e.end_control, 1);

    a.control_out_x =
        RoundTo(
        X(
            a.pre_x  +

            DirectionRoundedX(a.control_out_direction) *
            start_control_length *
            style.shape.edge.ratio.control.start *
            distance
        ),4);

    a.control_out_y =
        RoundTo(
            InvertedY(
                a.pre_y +
                DirectionRoundedY(a.control_out_direction) *
                start_control_length *
                style.shape.edge.ratio.control.start *
                distance
            ),
        4);


    b.control_in_x = RoundTo(
        X(
            b.pre_x +

            DirectionRoundedX(b.control_in_direction) *
            end_control_length *
            style.shape.edge.ratio.control.end *
            distance
        ),4);
    
    b.control_in_y =  
        RoundTo(
        InvertedY(
            b.pre_y  +
            DirectionRoundedY(b.control_in_direction) *
            end_control_length *
            style.shape.edge.ratio.control.end *
            distance
        ),4);

        if ( a instanceof TailPrePoint ){
            a.x_symbol = RoundTo (X( a.pre_x_symbol ),4);
            a.y_symbol = RoundTo(InvertedY(a.pre_y_symbol),4);
        }

        if ( b instanceof HeadPrePoint ){
    
            b.x_symbol = RoundTo(X(  b.pre_x_symbol ),4);
            b.y_symbol =  RoundTo(InvertedY(b.pre_y_symbol ),4);
        }

        a.x = RoundTo(X( a.pre_x) ,4);
        a.y = RoundTo(InvertedY(a.pre_y),4);

        b.x = RoundTo(X( b.pre_x),4);
        b.y = RoundTo(InvertedY(b.pre_y),4);

    return [a,b]
}   


function SetDirectionSmooth(e, from, to, before,point,after){

    var start_width  = cleanNumberInput( from.w , style.shape.size.width);
    var start_height = cleanNumberInput( from.h, style.shape.size.height );
    var end_width  = cleanNumberInput( to.w , style.shape.size.width);
    var end_height = cleanNumberInput( to.h, style.shape.size.height );

    function outward(a, b, aIsNode, bIsNode){

        dx = 0;
        dy = 0;
   
        if ( a.pre_x + (aIsNode?(start_width/2):0)
            < 
            b.pre_x - (bIsNode?(end_width/2):0)){
            dx = 1;
        }

        
        if (
            a.pre_x - (aIsNode?(start_width/2):0)
            > 
            b.pre_x + (bIsNode?(end_width/2):0)
            ){
            dx = -1;
        }

        if (
            a.pre_y + (aIsNode?(start_height/2):0)
            < 
            b.pre_y - (bIsNode?(end_height/2):0)
            ){
            dy = 1;
        }

        if (
            a.pre_y - (aIsNode?(start_height/2):0)
            > 
            b.pre_y + (bIsNode?(end_height/2):0)
            ){
            dy = -1;
        }


        if (dx==0 && dy == 0){
            return 'c'
        }

        return `${dy==0?'':dy==1?'s':'n'}${dx==0?'':dx==1?'e':'w'}`
    }


    function inward(a, b, aIsNode, bIsNode){

        dx = 0;
        dy = 0;
   
        if ( a.pre_x + (aIsNode?(start_width/2):0)
            < 
            b.pre_x - (bIsNode?(end_width/2):0)){
            dx = 1;
        }

        
        if (
            a.pre_x - (aIsNode?(start_width/2):0)
            > 
            b.pre_x + (bIsNode?(end_width/2):0)
            ){
            dx = -1;
        }

        if (
            a.pre_y + (aIsNode?(start_height/2):0)
            < 
            b.pre_y - (bIsNode?(end_height/2):0)
            ){
            dy = 1;
        }

        if (
            a.pre_y - (aIsNode?(start_height/2):0)
            > 
            b.pre_y + (bIsNode?(end_height/2):0)
            ){
            dy = -1;
        }


        if (dx==0 && dy == 0){
            return 'c'
        }

        return `${dy==0?'':dy==1?'s':'n'}${dx==0?'':dx==1?'e':'w'}`
    }
    
    function smoothDirection (before,point,after){

        var in_dx = DirectionUnshapedX(point.control_in_direction);
        var in_dy = DirectionUnshapedY(point.control_in_direction);

        var out_dx = DirectionUnshapedX(point.control_out_direction);
        var out_dy = DirectionUnshapedY(point.control_out_direction);

        var s_in_dx = in_dx;
        var s_in_dy = in_dy;

        var s_out_dx = out_dx;
        var s_out_dy = out_dy;

        if (in_dx == -out_dx && in_dy == -out_dy){
            return point;
        }

        if (in_dx!=0 && in_dx == out_dx ) {
            s_in_dx = 0;
            s_out_dx = 0;
            if (before.pre_y < after.pre_y) {
                s_in_dy = -1;
                s_out_dy = 1;
            }
            else if ( before.pre_y > after.pre_y) {
                s_in_dy = 1;
                s_out_dy = -1;
            }
            else{
                s_in_dy = 0;
                s_out_dy = 0;
            }
        }
        else if (in_dy!=0 && in_dy == out_dy ) {
            s_in_dy = 0;
            s_out_dy = 0;
            if (before.pre_x < after.pre_x) {
                s_in_dx = -1;
                s_out_dx = 1;
            }
            else if ( before.pre_x > after.pre_x) {
                s_in_dx = 1;
                s_out_dx = -1;
            }
            else{
                s_in_dx = 0;
                s_out_dx = 0;
            }
        }

        else if (Math.abs(in_dy) != Math.abs(out_dy) && Math.abs(in_dx) != Math.abs(out_dx) ) {

            if ( in_dx == 0) {
                s_in_dx = -out_dx;
            }

            else if ( out_dx == 0) {
                s_out_dx = -in_dx;
            }

            if ( in_dy == 0) {
                s_in_dy = -out_dy;
            }

            else if ( out_dy == 0) {
                s_out_dy = -in_dy;
            }
        }

        point.control_in_direction = `${s_in_dy==0?'':s_in_dy==1?'s':'n'}${s_in_dx==0?'':s_in_dx==1?'e':'w'}`
        point.control_out_direction = `${s_out_dy==0?'':s_out_dy==1?'s':'n'}${s_out_dx==0?'':s_out_dx==1?'e':'w'}`
        return point;
    }

    if ( before instanceof PrePoint && point instanceof PrePoint){
        if ( undefined == point.control_in_direction || point.control_in_direction == null){
            point.control_in_direction = inward(point, before, point instanceof HeadPrePoint, before instanceof TailPrePoint );
        }

        if (undefined == point.offset_in_direction || point.offset_in_direction == null){
            point.offset_in_direction =  point.control_in_direction;
        }
    }

    if ( point instanceof PrePoint && after instanceof PrePoint ){
        if ( undefined == point.control_out_direction || point.control_out_direction == null){
            point.control_out_direction = outward( point, after, point instanceof TailPrePoint, after instanceof HeadPrePoint  );
        }

        if (undefined == point.offset_out_direction || point.offset_out_direction == null){
            point.offset_out_direction =  point.control_out_direction;
        }
    }

    if ( before instanceof PrePoint && point instanceof PrePoint && after instanceof PrePoint && !point.directionsPreset){
        point = smoothDirection(before, point, after);
    }

    return point;
}

var directionSetter = SetDirectionSmooth; 

function SetDirections(e, from, to, prepoints){

    if (prepoints.length < 2){
        return []
    }

    prepoints[0] = directionSetter(e, from, to, null,prepoints[0],prepoints[1]);

    for (var i=1; (i + 1) < prepoints.length; i++){
        prepoints[i] = directionSetter(e, from, to, prepoints[i-1],prepoints[i],prepoints[i+1] );
    }

    prepoints[prepoints.length-1] = directionSetter(e, from, to, prepoints[prepoints.length-2],prepoints[prepoints.length-1],null);

    return prepoints;

}

function Layer(layer){
    return style.layers[layer];

}

function NamedStyle(s){
    return style.namedStyles[s];
}

function DirectionShapedX (direction){
    const angle = style.shape.edge.scale.corner;
    const full = style.shape.edge.scale.top;
    switch (direction) {
        case 'e':
            return full;
        case 'se':
        case 'ne':
            return angle;
        case 'w':
            return -full;
        case 'nw':
        case 'sw':
            return -angle;
        default: return 0;
    }
}
 
function DirectionShapedY (direction) {
    const full = style.shape.edge.scale.side;
    const angle = style.shape.edge.scale.corner;
    switch (direction){
        case 'n':
        return -full;
        case 'nw':
        case 'ne':
        return -angle;
        case 's':
            return full;
        case 'sw':
        case 'se':
            return angle;
        default : return 0;
    }
}
 
function DirectionUnshapedX (direction){
    switch (direction) {
        case 'e':
            return 1.0;
        case 'se':
        case 'ne':
            return 1.0;
        case 'w':
            return -1.0;
        case 'nw':
        case 'sw':
            return -1.0;
        default: 
            return 0.0;
    }
}

function DirectionUnshapedY (direction){
    switch (direction) {
        case 'n':
            return -1.0;
        case 'nw':
        case 'ne':
            return -1.0;
        case 's':
            return 1.0;
        case 'sw':
        case 'se':
            return 1.0;
        default: 
            return 0.0;
    }
}

function DirectionRoundedX (direction){
    const full = style.shape.edge.scale.top;
    const angle = style.shape.edge.scale.round;

    switch (direction) {
        case 'e':
            return full;
        case 'se':
        case 'ne':
            return angle;
        case 'w':
            return -full;
        case 'nw':
        case 'sw':
            return -angle;
        default: 
            return 0.0;
    }
}

function DirectionRoundedY (direction){
    const full = style.shape.edge.scale.side;
    const angle = style.shape.edge.scale.round;
    switch (direction) {
        case 'n':
            return -full;
        case 'nw':
        case 'ne':
            return -angle;
        case 's':
            return full;
        case 'sw':
        case 'se':
            return angle;
        default: 
            return 0.0;
    }
}

function writePos (x, y, x_pixel_adjust, y_pixel_adjust){
    x_pixel_adjust = cleanNumberInput(x_pixel_adjust,0);
    y_pixel_adjust = cleanNumberInput(y_pixel_adjust,0);
    return `[pos="${(X(x)+ +x_pixel_adjust).toString()},${(InvertedY(y) - +y_pixel_adjust ).toString()}!" ] `;
}

function writeHeadLabel (label){
    label = cleanStringInput(label,'')
    return `[headlabel="${label}" ] `;
}

function writeTailLabel (label){
    label = cleanStringInput(label,'')
    return `[taillabel="${label}" ] `;
}

function node(name, x,y) {
    var n = new Node( name, x, y);
    nodes.set(name, n);
    return name + ' ' + writePos(x,y);
}

function writeLabel(label, isHtml) {

    isHtml = isHtml || false;

    if(isHtml){
        return `[label=<${label}> ] `;
    }

    return `[label="${label}" ] `;
}

function edge (from_name, to_name) {
    return `${from_name} -> ${to_name} `;
}


function InvertedY(n){
    return (scale() * (style.doc.h - n) * style.scale.y)
}

function Y(n){
    return (scale() * n * style.scale.y);
}
 
hb.registerHelper('y', function(n) {
    return InvertedY(n).toString();
});

hb.registerHelper('h', CalcH);
 
hb.registerHelper('nodeHeightDefault', NodeHeightDefault);
hb.registerHelper('nodeWidthDefault', NodeWidthDefault);

function NodeHeightDefault () {
    return CalcH(style.shape.size.height);
}

function NodeWidthDefault () {
    return CalcH(style.shape.size.height);
}

function H (n) {
    return `[ height=${CalcH(n) }] `;
}

function W (n) {
    return `[ width=${CalcW(n)}] `;
}

function CalcW (n) {
    return (n * style.scale.w).toString();
}

function CalcH(n) {
    return (n * style.scale.h).toString();
}

hb.registerHelper('w', CalcW );

function X(n){
    return (scale() * n * style.scale.x);
}

hb.registerHelper('x', function(x) {
return X(x).toString();
});

hb.registerHelper('xy', function(x,y) {

return X(x).toString() + ',' + InvertedY(y).toString();
});

hb.registerHelper('hw', function(x,y) {
return X(x).toString() + ',' + Y(y).toString();
});

function edge(from_name, to_name){
    return `${from_name} -> ${to_name} `;
}

function edgelabel(from_name, to_name, text, isHtml){
    
    var s = ` ${edge(from_name, to_name)} `;

    if (text){
        s += `${writeLabel(text, isHtml)} `
    }
    return s;
}

function lp(x,y) {
    return `[ lp="${X(x)},${InvertedY(y)}" ] `;
}

function DrawLabelPostion(v) {
    return `[ lp="${v.x},${v.y}!" ] `;
}

hb.registerHelper('png', function(name) {
    return `[image="${style.image.pngPath + name }.png" ] `;
});
 
hb.registerHelper('svg', function(na){
    return '';
});

function freeLabel (text, x,y) {
    var id = uuid().toString().replace(/\-/g, '');
    return `label_${id} ${X(x).toString()} [shape=none, margin=0, border=0  ] ` + lp(x,y);  //style="solid" fillcolor="transparent"
}


function date (x,y,prefix){
    prefix = cleanStringInput(prefix,"");
    const d = new Date();
    const text = `${prefix} ${d.getDate()}/${(d.getMonth() + 1)}/${d.getFullYear()} `;
    var pixels = pixelWidth(text, { font: style.font.edge.name, size: style.font.edge.size});
    var text_shift = -( pixels / ( 2 * style.doc.pixelsperinch) )
    var id = uuid().toString().replace(/\-/g, '');

    
    return `date_${id} [shape=none margin=0 border=0 label="${text}"] ${writePos (x, y, text_shift)} `;
}

function dateMark(prefix){
    return date(style.doc.h - 0.25, style.doc.w - 0.25, prefix)
}

hb.registerHelper('datemark', dateMark);
hb.registerHelper('fl', freeLabel);
hb.registerHelper('freelabel', freeLabel);

hb.registerHelper('date', function(x,y) {
    return date ( x,y);
});


class DocPaths {
    constructor (base, full){
        this.base = base;
        this.full = full;
    }
}

var docs = []

for (var arg of argv._){

    var inputFilePath = arg;
    var inputFilePathFull = path.resolve(inputFilePath); 
    var inputFilePathParsed = path.parse(inputFilePath);
    var tempFileBase = baseDirectory + '\\' + inputFilePathParsed.name;

    var doc = new DocPaths(tempFileBase, inputFilePathFull);

    docs.push(doc)
}

var outputPathBase = '';

if(undefined != argv.o && typeof(argv.o) == 'string' && argv.o.length > 0 ){
    outputPathBase = argv.o;
}
else{
    outputPathBase = './output'
}

var outputFilePathBase = path.resolve(outputPathBase);

var proof = false; 

if(undefined != argv.p && argv.p == true){
    proof = true
}

function Proof(color){
    return ProofAt (style.doc.h, style.doc.w, color)
}

function ProofAt (h, w, color) {

    if (proof != true){
        color = 'transparent'
    }

    var uid = Id();

    return ` up_left_${uid} [pos="${X(0.5).toString()},${InvertedY(0.5).toString()}!"][label="" height=1 width=1 penwidth=0 fillcolor="${color}" color="${color}"] ` +
        ` down_right_${uid} [pos="${X( w - 0.5).toString()},${InvertedY(h - 0.5).toString()}!"] [label="" height=1 width=1 fillcolor="${color}" penwidth=0 color="${color}"]`;
}

function nDraw(input, outputPath, outputFormat, n){
    var command = `dot -T ${outputFormat} -n${n} ${verbose>1?"-v ":""}-Goverlap-true -Gsplines=false -Kneato -o "${ outputPath }" "${ input }"`;

    runner(command, `to ${outputFormat}`)

}

function runner(command, name){

    if(verbose){
        console.log(command);
    }

    cmd.runSync (command,
        function(err, out, stderr){
                console.log(`${name} out:`, out)
                console.log(`${name} err:`, err)
                console.log(`${name} stderr:`,stderr)
        }
    );
}

var output = (outputFilePathBase + '.' + format);

var temp_dot =[];
var temp_result =[];

var folio = {
    "data" : data,
    "style" : style,
}

if (docs.length == 1){
    var doc = docs[0];

    var text = fs.readFileSync(doc.full).toString();
    usePointScale = true;
    var template = hb.compile(text);
    var DotCompiledPointScale = template(folio);
    var DotCompiledPointScaleFilePath = doc.base +  `.compiled.point.dot`;
    temp_dot.push(DotCompiledPointScaleFilePath);
    fs.writeFileSync(DotCompiledPointScaleFilePath, DotCompiledPointScale) ;
    nDraw(DotCompiledPointScaleFilePath, output, format, 2);
}
else if (docs.length > 1){

    if(format != 'png'){
        console.log('multi document compositing is intended for PNG only, results may be unpredicatable' )
    }
    

    for ( var doc of docs){

        var text = fs.readFileSync(doc.full).toString();
        usePointScale = true;
        var template = hb.compile(text);
        var DotCompiledPointScale = template({});
        var DotCompiledPointScaleFilePath = doc.base +  `.compiled.point.dot`;
        var DotCompiledPointScaleResultFilePath = doc.base + `.compiled.point.` + format;
    
        temp_dot.push(DotCompiledPointScaleFilePath);
        temp_result.push(DotCompiledPointScaleResultFilePath);
    
        fs.writeFileSync(DotCompiledPointScaleFilePath, DotCompiledPointScale) ;
    
        nDraw(DotCompiledPointScaleFilePath, DotCompiledPointScaleResultFilePath, 'png', 2);
    }

    if (temp_result.length >= 2){
        
        var a = temp_result[temp_result.length - 2];
        var b = temp_result[temp_result.length - 1];
    
        var command = `magick composite ${verbose>1?"-verbose ":""}-gravity NorthWest "${a}" "${b}" "${output}"`;
    
        runner(command, `magick`)

    }
    
    // DONT DELETE UNTIL CERTAIN ABCVE IS WORKING 3. 4 + files!!!!!!
    // for (var k=3; k <= pngs.length; k++){
    //     var a = pngs[pngs.length - k]
    //     var command = `magick composite -gravity NorthWest ${2} ${png_output} ${png_output}`;
    //     console.log(command)
    //     cmd.runSync (command,
    //     function(err, data, stderr){
    //     console.log('to svg:',data)
    //     console.log('to svg:',err)
    //     console.log('to svg:',data)
    //     })
    // }
}


if (!keepTemp){
    
    for ( var dot of temp_dot){
        var command = `rm "${dot}"`;
        runner(command, `remove temp dot`)
    }
    for ( var png of temp_result){
        var command = `rm "${png}"`;
        runner(command, `remove temp png`)
    }
}


function SetOffsets(e, from, to, prepoints) {

    if (prepoints.length < 2){
        return '';
    }
    
    var start = prepoints[0]

    var start_width  = cleanNumberInput( from.w , style.shape.size.width);
    var start_height = cleanNumberInput( from.h, style.shape.size.height );
    var end_width  = cleanNumberInput( to.w , style.shape.size.width);
    var end_height = cleanNumberInput( to.h, style.shape.size.height );

    //clumsy but this is what happens if you add a feature too late
    var start_x_offset = (( start_width / 2.0 ) + style.shape.edge.offset.tail.point) * (style.scale.w/style.scale.x) * DirectionShapedX(start.offset_out_direction);
    var start_x_offset_symbol = (( start_width / 2.0 ) + style.shape.edge.offset.tail.symbol) * (style.scale.w/style.scale.x) *  DirectionShapedX(start.offset_out_direction);

    var start_y_offset = ((start_height / 2) + style.shape.edge.offset.tail.point ) * (style.scale.h/style.scale.y) * DirectionShapedY(start.offset_out_direction);
    var start_y_offset_symbol = ((start_height / 2) + style.shape.edge.offset.tail.symbol ) * (style.scale.h/style.scale.y) * DirectionShapedY(start.offset_out_direction);

    start.pre_x_symbol = start.pre_x + start_x_offset_symbol;
    start.pre_y_symbol = start.pre_y + start_y_offset_symbol;

    start.pre_x = start.pre_x + start_x_offset;
    start.pre_y = start.pre_y + start_y_offset;

    prepoints[0] =  start;

    var end = prepoints[prepoints.length-1]


    var end_x_offset = ((end_width/2) + style.shape.edge.offset.head.point) * (style.scale.w/style.scale.x) * DirectionShapedX(end.offset_in_direction);
    var end_x_offset_symbol = ((end_width/2) + style.shape.edge.offset.head.symbol) * (style.scale.w/style.scale.x) * DirectionShapedX(end.offset_in_direction);


    var end_y_offset = ( (end_height/2) + style.shape.edge.offset.head.point) * (style.scale.h/style.scale.y) * DirectionShapedY(end.offset_in_direction);
    var end_y_offset_symbol = ( (end_height/2) + style.shape.edge.offset.head.symbol) * (style.scale.h/style.scale.y) * DirectionShapedY(end.offset_in_direction);

    end.pre_x_symbol = end.pre_x + end_x_offset_symbol;
    end.pre_y_symbol = end.pre_y + end_y_offset_symbol;
    end.pre_x = end.pre_x + end_x_offset;
    end.pre_y = end.pre_y + end_y_offset


    prepoints[prepoints.length-1] = end;

    return prepoints;
}
