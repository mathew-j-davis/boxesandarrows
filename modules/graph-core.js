const { v4 : uuid } = require('uuid');
const fs = require('fs');
const path = require( 'path');
const {parse} = require('csv-parse/sync');
const Vector = require('victor');

class Node {

    constructor(
        name,
        x,
        y,
        label,
        h,
        w,
        origin,
        namedStyle,
        special,
        hideLabel,
        tags,
        attributes
    ){
        this.name = cleanStringInput(name, Id());
        this.x = cleanNumberInput(x,0);  
        this.y = cleanNumberInput(y,0); 
        this.label = cleanStringInput(label, null); 
        this.h = cleanNumberInput(h, null);  
        this.w = cleanNumberInput(w, null);  
        this.origin = cleanStringInput(origin, null); 
        this.namedStyle = cleanStringInput(namedStyle, null); 
        this.special = cleanStringInput(special, null); 
        this.hideLabel = cleanBooleanInput(hideLabel, false);
        this.tags = cleanStringInput(tags, null); 

        if(undefined == attributes || attributes == null || !(attributes instanceof Map)){
            this.attributes = new Map();
        }
        else{
            this.attributes = attributes;
        }

    }
}


class Edge{
    constructor(
        from_name,
        to_name,
        type,
        start_arrow,
        start_direction,
        start_control,
        start_adjust_x,
        start_adjust_y,
        start_label,
        end_arrow,
        end_direction,
        end_control,
        end_adjust_x,
        end_adjust_y,
        end_label,
        label,
        label_balance,
        label_segment,
        label_adjust_x,
        label_adjust_y,
        label_justify,
        
        isHtml,
        namedStyle,
        special,
        tags,
        label_balance_x, 
        label_balance_y, 
        waypoints,
        radius,
        attributes
    ){
        this.from_name = from_name || null;
        this.to_name = to_name || null;
        this.type = type || null;
        this.start_arrow = start_arrow || null;
        this.start_direction = start_direction || null;
        if(undefined == start_control || isNaN(start_control)){
            this.start_control = null;
        }
        else{
            this.start_control = start_control;
        }
        this.start_adjust_x = start_adjust_x || 0;
        this.start_adjust_y = start_adjust_y || 0;
        this.start_label = start_label || null;
        this.end_arrow = end_arrow || null;
        this.end_direction = end_direction || null;

        if(undefined == end_control || isNaN(end_control)){
            this.end_control = null;
        }
        else{
            this.end_control = end_control;
        }

        this.end_adjust_x = end_adjust_x || 0;
        this.end_adjust_y = end_adjust_y || 0;
        this.end_label = end_label || null;
        this.label = label || null;
        this.label_balance = label_balance || 0;
        this.label_segment = label_segment || 0;
        this.label_adjust_x = label_adjust_x || 0;
        this.label_adjust_y = label_adjust_y || 0;
        this.label_justify = label_justify || 0;
        this.isHtml = isHtml || false;
        this.namedStyle = namedStyle || null;
        this.special = special || null;
        this.tags = tags || null;


        if(undefined == label_balance_x || isNaN(+label_balance_x)){
            this.label_balance_x = 0;
        }
        else{
            this.label_balance_x = +label_balance_x;
        }
        
        if(undefined == label_balance_y || isNaN(+label_balance_y)){
            this.label_balance_y = 0;
        }
        else{
            this.label_balance_y = +label_balance_y;
        }

        if(undefined == waypoints){
            this.waypoints = [];
        }
        else{
            this.waypoints = waypoints;
        }
           

        if(undefined == attributes || attributes == null || !(attributes instanceof Map)){
            this.attributes = new Map();
        }
        else{
            this.attributes = attributes;
        }
    }
}


function isBlank(str) {
    return (!str || str.length === 0 || /^\s*$/.test(str));
}

function isStringisBlank(str) {
    return (typeof str == 'string' && isBlank(str));
}

function cleanNumberInput(x, defaultValue){
    return (undefined == x || null == x  || isStringisBlank(x) || isNaN(+x))? defaultValue : +x;
}

function cleanStringInput(x, defaultValue){
    return (undefined == x || null == x  || isStringisBlank(x)) ? defaultValue : x;
}

function cleanArrayInput(x, defaultValue){
    return (undefined == x || null == x  || typeof x != Array )? defaultValue : x;
}

function clearRead(x, defaultValue){

    // this is a separate function on the assumption that this may evole diff to clear string
    if (undefined == x || null == x  || isStringisBlank(x)){
        return defaultValue;
    }
    return x;
}

function RoundTo (x,p){
    return Number.parseFloat(x).toFixed(p);
}
function cleanBooleanInput(x, defaultValue){
    if (undefined == x || null == x ) {
        return defaultValue;
    }
    
    if (typeof x == 'boolean'){
        return x
    }

    if (typeof x == 'string'){
        switch (x.toLowerCase ()){
            case 'true':
            case 'yes':
            case 'y':
            case '1':
                return true;
            default:
                return false;

        }
    }

    return !!x;
}

function Id(){
    return uuid().toString().replace(/\-/g, '');
}

function readdirrSync (dir){

    // todo : status : maybe one day - prevent endless loops though symbolic links
    // stats.isSymbolicLink();

    var results = [];

    var pass = fs.readdirSync(dir);
    pass.forEach((name)=>{
        file = path.resolve(dir, name);

        const stats = fs.statSync(file);

        if (stats.isDirectory()){
            results = results.concat(readdirrSync (file));
        }

        if(stats.isFile()){
            results.push(file);            
        }
    }
    )
    
    return results;
}



function readPositions(rows){

    var positions = new Map();

    var y = 0;


    for (var row of rows){

        y +=1

        var rowPositions = new Map();

        for (var prop in row){

            

            switch(prop){

            case 'r':

                y = cleanNumberInput(row[prop],y); 
                break; 

            //prop is column x position
            default:
                
                if (isNaN(+prop)){
                    break;
                }

                let nss = row[prop];
                let ns = []

                if (isBlank(nss)){
                    break;   
                }
                
                ns = nss.split(' ');
                
                for (n of ns){

                    if (isBlank(n)){
                        continue;
                    }

                    rowPositions.set(n, +prop)
                }
                break;
                // if has value, put in positions
            }
        }

        for (const [name, x] of rowPositions.entries()) {
            positions.set(name, [x,y])
        }
    }


    return positions;

}

function readNodes(Json){

    const readNodesArray = [];

    for(var i in Json){

        var name = null;
        var x = null;  
        var y = null;  
        var label = null;   
        var h = null;  
        var w = null;  
        var origin = null;  
        var namedStyle = null; 
        var hideLabel = false;
        var special = null;
        var tags = null;
        var attributes = new Map();

        const currentNode = Json[i];

        for(var prop in currentNode){

            switch(prop){
                case 'name':
                    name = currentNode[prop];
                    break;
                case 'x':
                    x = currentNode[prop];
                    break;    
                case 'y':
                    y = currentNode[prop];
                    break;    
                case 'label':
                    label = currentNode[prop];
                    break;    
                case 'h':
                    h = currentNode[prop];
                    break;
                case 'w':
                    w = cleanNumberInput(currentNode[prop], null);  ;
                    break;    
                case 'origin':
                    origin = currentNode[prop];
                    break;    
                case 'namedStyle':
                    namedStyle = currentNode[prop];
                    break;
                case 'noLabel':
                case 'hideLabel':
                    hideLabel = currentNode[prop];
                    break;   
                case 'special':
                    special = currentNode[prop];
                    break;   
                case 'tags':
                        tags = currentNode[prop];
                        break;  
                        
                default:
                    if ( 
                        // ignore fields starting with hash
                        !/^#.*/.exec(prop) && 
                        clearRead(currentNode[prop],null) != null){
                        attributes[prop] = currentNode[prop];
                    }
            }
        }

        if (name){
            var node = new Node(
                name,
                x,
                y,
                label,
                h,
                w,
                origin,
                namedStyle,
                special,
                hideLabel,
                tags,
                attributes
            )
            readNodesArray.push(node);
        }
    }
    return readNodesArray;
}


function readEdges(Json){

    const readEdgesArray = [];

    for(var i in Json){

        var from_name = null;
        var to_name = null;
        var type = null;
        var start_arrow = null;
        var start_direction = null;
        var start_control = null;
        var start_adjust_x = 0;
        var start_adjust_y = 0;
        var start_label = null;
        var end_arrow = null;
        var end_direction = null;
        var end_control = null;
        var end_adjust_x = 0;
        var end_adjust_y = 0;
        var end_label = null;
        var label = null;
        var label_balance = 0;
        var label_segment = 0;
        var label_adjust_x = 0;
        var label_adjust_y = 0;
        var label_justify = 0;
        var isHtml = false;
        var namedStyle = null;
        var special = null;
        var tags = null;
        var label_balance_x = 0;
        var label_balance_y = 0; 
        var waypoints = [];
        var attributes = new Map();


        //add auto curves later on
        var radius = null;

        var currentEdge = Json[i];

        for(var prop in currentEdge){
            //console.log(`READ : ${prop}  ${currentEdge[prop]} typeof ${ typeof currentEdge[prop]} `);
            switch(prop){

                case 'from':
                case 'from_name':                 
                    from_name = currentEdge[prop]; break;
                case 'to': 
                case 'to_name':              
                    to_name = currentEdge[prop]; break;
                case 'type':            type = currentEdge[prop]; break;
                case 'start':
                case 'start_arrow':      start_arrow = currentEdge[prop]; break;
                case 'start_direction': 
                case 'from_direction':  start_direction = currentEdge[prop]; break;
                case 'start_control':   start_control = (undefined == currentEdge[prop] || null == currentEdge[prop]  || isStringisBlank(currentEdge[prop]) || isNaN(+currentEdge[prop]) )? null : +currentEdge[prop]; break;
                case 'start_adjust_x':  start_adjust_x = currentEdge[prop]; break;
                case 'start_adjust_y':  start_adjust_y = currentEdge[prop]; break;
                case 'start_label':     start_label = currentEdge[prop]; break;
                case 'end':       
                case 'end_arrow':       end_arrow = currentEdge[prop]; break;
                case 'end_direction':   end_direction = currentEdge[prop]; break;
                case 'end_control':     end_control = (undefined == currentEdge[prop] || null == currentEdge[prop]  || isStringisBlank(currentEdge[prop]) || isNaN(+currentEdge[prop]) )? null : +currentEdge[prop]; break;
                case 'end_adjust_x':    end_adjust_x = currentEdge[prop]; break;
                case 'end_adjust_y':    end_adjust_y = currentEdge[prop]; break;
                case 'end_label':       end_label = currentEdge[prop]; break;
                case 'label':           label = currentEdge[prop]; break;
                case 'label_balance':   label_balance = currentEdge[prop]; break;
                case 'label_segment':   label_segment = cleanNumberInput(currentEdge[prop],0); break; 
                case 'label_adjust_x':  label_adjust_x = cleanNumberInput(currentEdge[prop],0); break;                
                case 'label_adjust_y':  label_adjust_y = cleanNumberInput(currentEdge[prop],0); break;

                case 'label_balance_x':  label_balance_x = cleanNumberInput(currentEdge[prop],0); break;
                case 'label_balance_y':  label_balance_y = cleanNumberInput(currentEdge[prop],0); break;                

                case 'label_justify':   label_justify = currentEdge[prop]; break;
                case 'isHtml':          isHtml = currentEdge[prop]; break;
                case 'namedStyle':           namedStyle = currentEdge[prop]; break;
                case 'special':         special = currentEdge[prop]; break;
                case 'tags':            tags = currentEdge[prop]; break;

                case 'waypoints' :      waypoints = cleanWaypointStringInput(currentEdge[prop], '') ; break;

                default:

                    if ( 
                        // ignore fields starting with hash
                        !/^#.*/.exec(prop) && 
                        clearRead(currentEdge[prop],null) != null){
                        attributes[prop] = currentEdge[prop];
                    }

            }
        }

        var e;
        if (from_name && to_name){
            e = new Edge(
                from_name,
                to_name,
                type,
                start_arrow,
                start_direction,
                start_control,
                start_adjust_x,
                start_adjust_y,
                start_label,
                end_arrow,
                end_direction,
                end_control,
                end_adjust_x,
                end_adjust_y,
                end_label,
                label,
                label_balance,
                label_segment,
                label_adjust_x,
                label_adjust_y,
                label_justify,
                isHtml,
                namedStyle,
                special,
                tags,
                label_balance_x, 
                label_balance_y, 
                waypoints,
                radius,
                attributes

            )
            readEdgesArray.push(e);
        }
    }

    return readEdgesArray;
}

function readJsonFromCsvFile(csvpath){

    const text = fs.readFileSync(csvpath).toString()

    return parse(text, {
        columns: true,
        skip_empty_lines: true
      });
}

const EdgeType = {
    Linear: 'Linear',
    Curve: 'Curve',
    Rounded: 'Rounded'
  };

  function cleanWaypointStringInput(s, defaultValue){

    s= cleanStringInput(s, defaultValue)

    var points = [];
    
    var ss =  s.split(' ')

    for ( p of ss){

        

        var ps = p.split(',');

        if(ps.length < 2){
            continue;
        }

        if (
            (undefined == ps[0] || null == ps[0]  || isStringisBlank(ps[0]) || isNaN(+ps[0])) ||
            (undefined == ps[1] || null == ps[1]  || isStringisBlank(ps[1]) || isNaN(+ps[1]))
        ){
            continue;
        }

        var in_direction = cleanStringInput(ps[2], null);
        var out_direction = cleanStringInput(ps[3], null);

        var wp = PreassembleMidPoint(+ps[0], +ps[1], in_direction, out_direction)

        points.push(wp);

    }

    return points;
 
}




class PrePoint {
    constructor (
        // x,
        // y
    ){
        this.x = null,
        this.y = null,

        this.pre_x = null;
        this.pre_y = null;

        this.control_in_scale = null,
        this.control_in_x = null,
        this.control_in_y = null,
        this.control_in_angle = null,
        this.control_in_direction = null,
        this.offset_in_direction = null,

        this.control_out_scale = null,
        this.control_out_x = null,
        this.control_out_y = null,
        this.control_out_angle = null,
        this.control_out_direction = null
        this.offset_out_direction = null

        this.in_dx = 0;
        this.in_dy = 0;

        this.out_dx = 0;
        this.out_dy = 0;
    }
}

class EndPrePoint extends PrePoint {
    constructor (){
        super();

        this.x_symbol = null,
        this.y_symbol = null,

        this.name = null;

        this.pre_x_symbol = null;
        this.pre_y_symbol = null;

        this.adjust_x = null;
        this.adjust_y = null;

    }
}

class TailPrePoint extends EndPrePoint {
    constructor (){
        super();



    }
}

class HeadPrePoint extends EndPrePoint {
    constructor (){
        super();


    }
}

class MidPrePoint extends PrePoint {
    constructor (){
        super();

        this.directionsPreset = false;
    }
}

class Point{

    constructor(){

    }

    render (){
        return '';
    }
}

class BezierPoint extends Point{
    constructor (

    ){
        super();

        this.control_in = null,
        this.point = null,

        this.control_out = null,

        this.adjust_x = 0;
        this.adjust_y = 0;
    }
}

class RoundedPoint extends Point{
    constructor (

    ){

        super();

        this.point_in = null,
        this.point = null,
        this.point_out = null,

        this.adjust_x = 0;
        this.adjust_y = 0;
    }
}



function PreassembleStartPoint(n, direction, control_scale, adjust_x, adjust_y){
    var pp = new TailPrePoint();

    pp.pre_x = +n.x + +adjust_x;
    pp.pre_y = +n.y + +adjust_y;
    this.pre_x_symbol = +n.x + +adjust_x;
    this.pre_y_symbol = +n.y + +adjust_y;

    pp.control_out_direction = direction;

    pp.control_out_scale = control_scale;

    pp.adjust_x = +adjust_x;
    pp.adjust_y = +adjust_y;

    return pp;
}

function PreassembleEndPoint(n, direction, control_scale, adjust_x, adjust_y){
    var pp = new HeadPrePoint();

    pp.pre_x = +n.x + +adjust_x;
    pp.pre_y = +n.y + +adjust_y;
    this.pre_x_symbol = +n.x + +adjust_x;
    this.pre_y_symbol = +n.y + +adjust_y;

    pp.control_in_direction = direction;

    pp.control_in_scale = control_scale;

    pp.adjust_x = +adjust_x;
    pp.adjust_y = +adjust_y;

    return pp;

}

function PreassembleMidPoint(pre_x, pre_y, in_direction, out_direction){
    var pp = new MidPrePoint();

    pp.pre_x = pre_x;
    pp.pre_y = pre_y;   


    if (undefined != in_direction && in_direction != null){
        pp.control_in_direction = in_direction;
        pp.directionsPreset = true;
    }

    if (undefined != out_direction && out_direction != null){
        pp.control_out_direction = out_direction;
        pp.directionsPreset = true;
    }

    return pp;
}

// function PreassembleMidPoints(waypoints){

//     if (waypoints == undefined || !(waypoints instanceof Array) || waypoints.length < 1){

//         return [];
//     }

//     var mids = [];

//     for (p of waypoints){
        
//         var m = new PreassembleMidPoint(p.x,p.y);
        
//         mids.push(m);
//     }

//     return mids;
// }

module.exports={

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
    //PreassembleMidPoints


};