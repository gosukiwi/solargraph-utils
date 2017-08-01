import {Configuration} from './Configuration';
import {Server} from './Server';
import * as path from 'path';
import * as fs from 'fs';

export {
    Configuration,
    Server
}

export function nearestWorkspace(file:string, parent?:string):string {
    var result:string = null;
    var cursor = path.dirname(file);
    if (parent == cursor) {
        result = cursor;
    } else {
        var root = parent || cursor;
        while (cursor.startsWith(root)) {
            var sy = path.join(cursor, '.solargraph.yml');
            if (fs.existsSync(sy) && fs.lstatSync(sy).isFile()) {
                result = cursor;
                break;
            }
            cursor = path.dirname(cursor);
        }
        if (!result) result = parent;
    }
    return result;
}
