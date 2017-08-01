"use strict";

import * as child_process from 'child_process';
import * as cmd from './commands';
import * as request from 'request';

export class Server {
	private child:child_process.ChildProcess = null;
	private _port:number = null;
	private pid:number = null;

    private useBundler:boolean = false;
    private commandPath:string = null;
    private views:string = null;
    private workspace:string = null;

	public constructor() {
		this.configure();
	}

	public isRunning():Boolean {
		return (this.child != null && this.port != null && this.pid != null);
	}

	get port():number {
		return this._port;
	}

	get url():string {
		return 'http://localhost:' + this.port;
	}

    public configure(options = {}) {
        this.commandPath = options['commandPath'] || 'solargraph';
        this.useBundler = options['useBundler'] || false;
        this.views = options['views'] || null;
        this.workspace = options['workspace'] || null;
    }

	public start():Promise<Object> {
		return new Promise((resolve, reject) => {
			var started = false;
			if (this.child) {
				console.warn('There is already a process running for the Solargraph server.');
			} else {
				console.log('Starting the server');
				var args = ['server', '--port', '0'];
				if (this.views) {
					args.push('--views', this.views);
				}
				this.child = cmd.solargraphCommand(args, this.workspace, this.useBundler);
				this.child.stderr.on('data', (data) => {
					var out = data.toString();
					console.log(out);
					if (!this.port) {
						var match = out.match(/port=([0-9]*)/);
						if (match) {
							this._port = parseInt(match[1]);
						}
						match = out.match(/pid=([0-9]*)/);
						if (match) {
							this.pid = parseInt(match[1]);
						}
					}
					if (this.isRunning() && !started) {
						started = true;
						return resolve();
					}
				});
				this.child.on('exit', () => {
					this._port = null;
					if (!started) {
						return reject();
					}
				});
			}
		});
	}

	public stop() {
		if (!this.child) {
			console.warn('The server is not running.');
		} else {
			this.child.kill();
			if (this.pid) {
				process.kill(this.pid);
			}
			this.pid = null;
			this._port = null;
			this.child = null;
		}
	}

	public restart(options?:Object):Promise<Object> {
		this.stop();
		if (options) {
			this.configure(options);
		}
		return this.start();
	}

	public prepare(workspace:string):Promise<Object> {
		return new Promise((resolve, reject) => {
			//let prepareStatus = vscode.window.setStatusBarMessage('Analyzing Ruby code in workspace ' + workspace);
			request.post({url: this.url + '/prepare', form: {
				workspace: workspace
			}}, function(err, response, body) {
				if (err) {
					reject();
				} else {
					resolve();
				}
			});
		});
	}

	public suggest(text:string, line:number, column:number, filename?:string, workspace?:string, withSnippets?:boolean):Promise<Object> {
		return new Promise((resolve, reject) => {
			if (this.isRunning()) {
				request.post({url: this.url + '/suggest', form: {
					text: text,
					line: line,
					column: column,
					filename: filename || null,
					workspace: workspace || null,
					with_snippets: withSnippets || false}
				}, function(err, response, body) {
					if (err) {
						reject({status: "err", message: err});
					} else {
						resolve(JSON.parse(body));
					}
				});
			} else {
				reject({status: "err", message: "The server is not running"});
			}
		});
    }

	public hover(text:string, line:number, column:number, filename?:string, workspace?:string):Promise<Object> {
		return new Promise((resolve, reject) => {
			if (this.isRunning()) {
				request.post({url: this.url + '/hover', form: {
					text: text,
					line: line,
					column: column,
					filename: filename || null,
					workspace: workspace || null
				}}, function(err, httpResponse, body) {
					if (err) {
						// TODO Handle error
						reject(err);
					} else {
						resolve(JSON.parse(body));
					}
				});
			} else {
				// TODO Handle error
				reject();
			}
		});
	}

    public signify(text:string, line:number, column:number, filename?:string, workspace?:string): Promise<Object> {
        return new Promise<Object>((resolve, reject) => {
            if (this.isRunning()) {
				request.post({url: this.url + '/signify', form: {
					text: text,
					filename: filename || null,
					line: line,
					column: column,
					workspace: workspace || null}
				}, function(err,httpResponse,body) {
					if (err) {
						console.log(err);
					} else {
						if (httpResponse.statusCode == 200) {
							return resolve(JSON.parse(body));
						} else {
							// TODO: Handle error
						}
					}
				});
            }
        });
    }
}
