/*
  Can only include these Typescript references in the source file, since the paths are 
  different for these files included by the server and the client, via a link.  The
  typescript compiler is fooled to think the referenced files are duplicating declarations.

  /// <reference path="./typings/angular2/angular2.d.ts" />
*/

////////////////////////////////////////////////////////////////////////
//
// Debug output
//

// make typescript compiler happy
declare var global  : any;
// declare var require : any;

let _debug;

if (typeof window !== 'undefined') {
    // Make debug available everywhere in the client browser

    /* tslint:disable:no-string-literal */
    // Commenting out... don't rely on this package.
    // window['debug'] = require("debug/src/browser");
    /* tsslint:enable:no-string-literal */

    //_debug = window['debug'];

    // Enable gvapp debugging by typing into the browser console:
    //   > debug.enable("gvapp:*");

    // window['debug'] = require("/public/libs/node_modules/debug/debug");
    // window.debug.enable("gvapp:*");  // leads to "exports.save is not a function" console error

} else {
    // Fallback debug() function on server in shared code (where I can't get 
    // conditioal require('debug') to work for server-only)

    // global.debug = require("debug/src/node");

    global.debug = function(prefix:string) {
        return function(logStr:string, ...args : any[]) {
            logStr = `[${prefix}] ` + (new Date()) + " " + logStr;
            args.unshift(logStr);
            console.log.apply(console, args);
        };
    };

    // global.debug = function(logStr:string, ...args : any[]) {
    //     logStr = "  gvapp:global " + (new Date()) + " " + logStr;
    //     args.unshift(logStr);
    //     console.log.apply(console, args);
    // };

    _debug = global.debug;
}

export var debug = _debug;

////////////////////////////////////////////////////////////////////////
//
// String & formatting utilities
//
// Also see underscore.string module
// http://epeli.github.io/underscore.string/#api
//

export function camelCase(s:string) : string {
    var parts = s.split('_');
    if (parts.length <= 1) { return s; }

    var res = parts.shift();
    while ( parts.length > 0 ) {
        res += capitalize(parts.shift());
    }
    return res;
}

export function camelCaseToSpaced(s:string) {
    let res = '';

    for (let i = 0; i < s.length; i++) {
        if (res.length > 0 && s[i] >= 'A' && s[i] <= 'Z') {
            // insert space
            res += ' ';
        }
        res += s[i];
    }
    return res;
}

export function capitalize(s:string) {
    if (s.length === 0) { return ''; }
    return s[0].toUpperCase() + s.slice(1);
}

export function endsWith(str:string, suffix:string) {
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
}

export function startsWith(str:string, prefix:string) {
    return str.indexOf(prefix) === 0;
}

export function strJoin(strList:string[], joiner:string) {
    let newList = [];
    let newStr;
    for (let i = 0; i < strList.length; i++) {
        if (strList[i]) {
            newStr = strList[i].trim();
            if (newStr) {
                newList.push(newStr);
            }
        }
    }
    return newList.join(joiner);
}

//
// Format number with comma separators
//

export function formatNumber(x:number) {
    try {
        var parts = x.toString().split(".");
        parts[0]  = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        return parts.join(".");
    } catch (err) {
        console.error("GVUtils.formatNumber: %s", err);
        return x.toString();
    }

    // Browser support unclear & may truncate decimal points?
    // return x.toLocaleString();
}

export function queryArgStr(qArgs:any, options?:any) {
    if (!options) { options = {}; }

    let names = Object.keys(qArgs);
    let res   = '';
    let val;
    for (let i = 0; i < names.length; i++) {
        if (qArgs[names[i]] != null) {
            val = qArgs[names[i]]
            if (!options.skipEncode) {
                val = encodeURIComponent(val);
            }
            if (res) {
                res += `&${names[i]}=${val}`;
            } else {
                res += `?${names[i]}=${val}`;
            }
        }
    }
    return res;
}


////////////////////////////////////////////////////////////////////////
//
// Object conversion utilities
//

export function convertObjOfObjsToList(obj:any, options?:any) {
    if ( !options ) { options = {}; }

    if (!options.keyFieldName) {
        options.keyFieldName = "_object_key_index_";
    }

    var objList = [];
    var indexes = Object.keys(obj);
    var index;

    for (var i = 0; i < indexes.length; i++) {
        index = indexes[i];

        // set the key field on the object too
        obj[index][options.keyFieldName] = index;

        // Add to list
        objList.push(obj[index]);
    }

    // Sort objList by options.keyFieldName
    objList.sort(function(x, y) {
        var v1, v2;
        if ( isNumber(x[options.keyFieldName]) && isNumber(y[options.keyFieldName]) ) {
            v1 = parseFloat(x[options.keyFieldName]);
            v2 = parseFloat(y[options.keyFieldName]);
        } else {
            v1 = x[options.keyFieldName];
            v2 = y[options.keyFieldName];
        }

        if (v1 < v2) { return -1; }
        else         { return  1; }
    });

    return objList;
}

//
// We have an object full of objects to be listed in CSV file
//

export function convertObjOfObjsToCSVStr(obj:any, options?:any) {
    if ( !options ) { options = {}; }

    var objList   = convertObjOfObjsToList(obj, options);
    var fieldList = options.fieldList;

    if (!fieldList) {
        var fields  = {};
        var indexes = Object.keys(obj);
        var index;
        var newFields;

        for (var i = 0; i < indexes.length; i++) {
            index = indexes[i];

            // Check for new fields
            newFields = Object.keys(obj[index]);
            for (var j = 0; j < newFields.length; j++) {
                if (! (newFields[j] in fields)) {
                    fields[newFields[j]] = newFields[j];
                }
            }
        }

        // Convert to fields to list
        var fieldProps = Object.keys(fields);
        fieldList = [];
        for (i = 0; i < fieldProps.length; i++) {
            fieldList.push( {'prop' : fieldProps[i], 'name' : fields[fieldProps[i]]} );
        }

        // Sort by field title
        fieldList.sort(function(x:any, y:any) {
            if (x.name < y.name) { return -1; }
            else                 { return  1; }
        });
    }

    return convertListOfObjsToCSVStr(objList, {fieldList : fieldList});
}

export function convertListOfObjsToCSVStr(objList:any, options?:any) {
    if (!options) { options = {}; }

    if (!options.fieldList) {
        console.error("GVUtils:convertListOfObjsToCSVStr - currently must include fieldList");
        return '';
    }

    function newValue(rowStr:string, value:any, type?:string) {
        var res = '';

        if (rowStr.length > 0) {
            res += ',';   // be sure not to add spaces... can confuse Excel with commas in quoted fields 
        }

        if (value === undefined || value === null) {
            if (type === 'int') { return res + '0'; }
            else                { return res + '';  }
        } else if (isNumber(value)) {
            return res + value;
        } else {
            value = value.replace(/"/g, '""');  // escape double-quotes with two double-quotes
            return res + '"' + value + '"';
        }
    }

    function newRow(rowStr:string) {
        return rowStr + '\n';
    }

    var fields = options.fieldList;
    var res    = '';
    var row;
    var propName;
    var i;

    // Header
    row = '';
    for (i = 0; i < fields.length; i++) {
        row += newValue(row, fields[i].name);
    }
    res += newRow(row);

    // Each record
    for (var j = 0; j < objList.length; j++) {
        row = '';
        for (i = 0; i < fields.length; i++) {
            propName = fields[i].prop;
            row += newValue(row, objList[j][propName], fields[i].type);
        }
        res += newRow(row);
    }

    return res;
}

////////////////////////////////////////////////////////////////////////
//
// Object utilities
//

export function objUpdate(targetObj:any, updateObj:any) {
    if ( ! isSimpleObject(updateObj) ) {
        return updateObj;
    }

    var keys = Object.keys(updateObj);
    var key;

    for (var i = 0; i < keys.length; i++) {
        key = keys[i];
        targetObj[key] = objUpdate(targetObj[key] ? targetObj[key] : {},
                                   updateObj[key]);
    }

    return targetObj;
};

//
// isSimpleObject() return true or false depending
// See http://stackoverflow.com/questions/7893776/the-most-accurate-way-to-check-js-object-type
//

export function  isSimpleObject(value:any) {
    if ( (typeof value !== 'object') ||
         (Array.isArray(value))      ||
         (value === null)            ||
         (value instanceof Date)     ||
         (value instanceof RegExp) ) {
        return false;
    } else {
        return true;
    }
};

//
// Clone object, avoiding inherited properties
//
// BTW, an alternate simple method is: JSON.parse(JSON.stringify(obj));
//

export function clone(obj:any, ignores?:string[]) {
    var copy    : any;
    var newItem : any;
    var props   : string[];
    var prop    : string;
    var i       : number;

    // Always set function values to null across api
    if (typeof(obj) === "function") {
        return null;  //  null rather than undefined so, e.g., objects are set with keys but values set to null
    }

    // Simple types
    if (null == obj || "object" !== typeof obj) {
        return obj;
    }

    // Date
    if (obj instanceof Date) {
        copy = new Date();
        copy.setTime(obj.getTime());
        return copy;
    }

    // Arrays
    if (Array.isArray(obj)) {
        copy = [];
        for (i = 0; i < obj.length; i++) {
            copy[i] = clone(obj[i]);
        }
        return copy;
    }

    // Plain objects
    if (obj instanceof Object) {
        copy = {};
        props = Object.keys(obj);
        for (i = 0; i < props.length; i++) {
            prop = props[i];
            if (!ignores || ignores.indexOf(prop) === -1) {
                newItem    = clone(obj[prop]);
                if (newItem !== undefined) {
                    copy[prop] = newItem;
                }
            }
        }
        return copy;
    }

    throw new Error("Unable to copy obj! Its type isn't supported.");
}

////////////////////////////////////////////////////////////////////////
//
// Miscellaneous
//

export function lastPathSegment(path:string) {
    let parts = path.split('/');

    if (!parts.length) { return path; }

    // skip past trailing slashes
    let res = parts.pop();
    while (!res && parts.length) {
	res = parts.pop();
    }

    return res;
}

export function datePath(options?:any) {
    var now;
    if (options && options.date) {
        if (typeof options.date === 'string') {
            now = new Date(options.date);
        } else {
            now = options.date;
        }
    } else {
        now = new Date();
    }

    var day   = ("0" + now.getUTCDate()).slice(-2);        // 2-digit day
    var month = ("0" + (now.getUTCMonth() + 1)).slice(-2); // 2-digit month
    var year  = now.getUTCFullYear();

    return  `${year}/${month}/${day}`;
}

////////////////////////////////////////////////////////////////////////
//
// Number / string-integer conversion operations
//

//
// check whether a valid number
//
export function isNumber(n:any) {
    if (isNaN(parseFloat(n))) { return false; }
    if (! isFinite(n))        { return false; }

    return true;
}

//
// Doesn't allow other chars (strict version of parseInt())
//

export function parseInteger(stringValue:string) { 
    if ( /^[\d\s]+$/.test(stringValue) )  // allows for digits or whitespace
    {
        return parseIntegerLoose(stringValue);
    }
    else
    {
        return null;
    }
}

//
// Returns null if not parseable to an integer
//
export function parseIntegerLoose(n:string) {
    var res;
    try {
        res = parseInt(n, 10);
        if ( isNaN(res) ) {
            return null;
        } else {
            return res;
        }
    } catch (err) {
        return null;
    }
}

////////////////////////////////////////////////////////////////////////
//
// List/Array operations
//

//
// Does list contain given value
//

export function contains(listValue:any[], v:any, options?:any) {
    if (!options)   { options = {}; }
    if (!listValue) { return false; }

    for (let i = 0; i < listValue.length; i++) {
        if (options.toLower) {
            if ( listValue[i].toLowerCase() === v.toLowerCase() ) {
                return true;
            }
        } else if ( listValue[i] === v ) {
            return true;
        }
    }
    return false;
}

//
// Remove some value from a list (only removes first occurrence found)
//
export function removeFromList(listValue:any[], v:any, options?:any) {
    if (!options)   { options = {}; }
    if (!listValue) { return; }

    function doRemove(index:number) {
        listValue.splice(index, 1);
    }

    for (let i = 0; i < listValue.length; i++) {
        if (options.toLower) {
            if ( listValue[i].toLowerCase() === v.toLowerCase() ) {
                return doRemove(i);
            }
        } else if ( listValue[i] === v ) {
            return doRemove(i);
        }
    }
}

//
// Random integer
//

export function randomInt(min:number, max:number) {
    return Math.floor(Math.random() * (max - min)) + min;
}

export function random(min:number, max:number) {
    return (Math.random() * (max - min)) + min;
}

//
// Beep sound
// 
// Alternatively, for a beep, make a sound file and play that!
//   (new Audio("file.wav")).play();

export function beep() {
    /* tslint:disable:max-line-length */
    var snd = new Audio("data:audio/wav;base64,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qJrx4KOQjahZxWbcZgztj2c49nKmkId44S71j0c8eV9yDK6uPRzx5X18eDvjvQ6yKo9ZSS6l//8elePK/Lf//IInrOF/FvDoADYAGBMGb7FtErm5MXMlmPAJQVgWta7Zx2go+8xJ0UiCb8LHHdftWyLJE0QIAIsI+UbXu67dZMjmgDGCGl1H+vpF4NSDckSIkk7Vd+sxEhBQMRU8j/12UIRhzSaUdQ+rQU5kGeFxm+hb1oh6pWWmv3uvmReDl0UnvtapVaIzo1jZbf/pD6ElLqSX+rUmOQNpJFa/r+sa4e/pBlAABoAAAAA3CUgShLdGIxsY7AUABPRrgCABdDuQ5GC7DqPQCgbbJUAoRSUj+NIEig0YfyWUho1VBBBA//uQZB4ABZx5zfMakeAAAAmwAAAAF5F3P0w9GtAAACfAAAAAwLhMDmAYWMgVEG1U0FIGCBgXBXAtfMH10000EEEEEECUBYln03TTTdNBDZopopYvrTTdNa325mImNg3TTPV9q3pmY0xoO6bv3r00y+IDGid/9aaaZTGMuj9mpu9Mpio1dXrr5HERTZSmqU36A3CumzN/9Robv/Xx4v9ijkSRSNLQhAWumap82WRSBUqXStV/YcS+XVLnSS+WLDroqArFkMEsAS+eWmrUzrO0oEmE40RlMZ5+ODIkAyKAGUwZ3mVKmcamcJnMW26MRPgUw6j+LkhyHGVGYjSUUKNpuJUQoOIAyDvEyG8S5yfK6dhZc0Tx1KI/gviKL6qvvFs1+bWtaz58uUNnryq6kt5RzOCkPWlVqVX2a/EEBUdU1KrXLf40GoiiFXK///qpoiDXrOgqDR38JB0bw7SoL+ZB9o1RCkQjQ2CBYZKd/+VJxZRRZlqSkKiws0WFxUyCwsKiMy7hUVFhIaCrNQsKkTIsLivwKKigsj8XYlwt/WKi2N4d//uQRCSAAjURNIHpMZBGYiaQPSYyAAABLAAAAAAAACWAAAAApUF/Mg+0aohSIRobBAsMlO//Kk4soosy1JSFRYWaLC4qZBYWFRGZdwqKiwkNBVmoWFSJkWFxX4FFRQWR+LsS4W/rFRb/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////VEFHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAU291bmRib3kuZGUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMjAwNGh0dHA6Ly93d3cuc291bmRib3kuZGUAAAAAAAAAACU=");
    /* tslint:enable:max-line-length */

    snd.play();
}
