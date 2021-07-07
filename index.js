process.chdir(__dirname);
const { spawn } = require("child_process");
const express = require("express");
const { listeners } = require("process");
const backup = require("./backup");
const config = require("./config.json");

// --- Server --- //
var mc;
var running = false;
var backingUp = false;
var backupData = null;
var output = [];
var stdoutBuffer = "";
var stderrBuffer = "";
var idCounter = 0;

function start(){
	mc = spawn("./mc/bedrock_server.exe");
	running = true;

	mc.stdout.on("data", (data) => {
		stdoutBuffer += data;
		
		var parts = stdoutBuffer.split("\r\n")
		stdoutBuffer = parts.pop();

		parts.forEach(line=>{
			var content, meta;

			content = line.match(/(?:\[.*\] )?(.+)/);
			content = content ? content[1] : "";
			content = content.match(/\[.*\]/) ? "" : content;
			
			meta = line.match(/\[(.+)\]/);
			meta = meta ? meta[1] : "";

			if (backingUp && output[0]?.content == "Data saved. Files are now ready to be copied.") {
				backupData = content.split(", ").map(ele=>{
					var x = ele.split(":");

					return {
						path:x[0].replace(config.levelName,""),
						size:parseInt(x[1],10)
					}
				});
			}

			output.unshift({
				type:"stdout",
				id:idCounter++,
				raw:line,
				meta:meta,
				content:content,
			});

			if (backupData == "waiting") {
				backingData = ""
			}

			if (output.length > config.linesStored) output.pop();
		});
	});
	
	mc.stderr.on("data", (data) => {
		stderrBuffer += data;
		
		var parts = stderrBuffer.split("\r\n")
		stderrBuffer = parts.pop();

		parts.forEach(line=>{
			var content, meta;

			content = line.match(/(?:\[.*\] )?(.+)/);
			content = content ? content[1] : "";
			content = content.match(/\[.*\]/) ? "" : content;
			
			meta = line.match(/\[(.+)\]/);
			meta = meta ? meta[1] : "";

			output.unshift({
				type:"stderr",
				id:idCounter++,
				raw:line,
				meta:meta,
				content:content
			});

			if (output.length > config.linesStored) output.pop();
		});
	});

	mc.on("close", (code) => {
		running = false;
		output.unshift({
			type:"close",
			id:idCounter++,
			code:code
		});
	});
};

start();

function backupLive(){
	if (backingUp) return;

	backingUp = true;
	backupData = null;
	mc.stdin.write("save hold\r\n");

	return new Promise((resolve,reject)=>{
		var loop = setInterval(()=>{
			if (backupData) {
				clearInterval(loop);
				backup.backup("manual",backupData)
					.then(resolve)
					.finally(()=>{
						backingUp = false;
						mc.stdin.write("save resume\r\n");
					})
			} else {
				mc.stdin.write("save query\r\n");
			}
		},100);
	});
}

// --- API --- //
const app = express();

app.get("/", (req, res) => {
	res.sendFile(`${__dirname}/gui.html`);
});

app.get("/read", (req, res) => {
	var qFrom = req.query.from;
	var qLines = req.query.lines;
	
	if (qFrom) {
		var tmp = [];
		for (var i = 0; i < output.length; i++){
			if (output[i].id <= qFrom) break;
			tmp.push(output[i]);
		}
		res.json(tmp);

	} else {
		var linesToRead = qLines || config.linesSent;
		res.json(output.slice(0,linesToRead));
	}
});

app.get("/run", (req, res) => {
	mc.stdin.write(req.query.cmd+"\r\n");
	res.sendStatus(200);
});

app.get("/status", (req, res) => {
	res.json({
		running:running,
		backingUp:backingUp
	});
});

app.get("/start", (req, res) => {
	if (running) return res.sendStatus(405);

	start();
	res.sendStatus(200);
});

app.get("/stop", (req, res) => {
	if (!running) return res.sendStatus(405);

	mc.stdin.write("stop\r\n");
	res.sendStatus(200);
});

app.get("/backup", (req, res) => {
	if (backingUp || !running) return res.sendStatus(405);
	backupLive();
	res.sendStatus(200);
});

app.listen(config.port,()=>{console.log(`API started`)});