process.chdir(__dirname);
const { spawn } = require("child_process");
const express = require("express");
const backup = require("./backup");
const config = require("./config.json");
const cron = require("node-cron");

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

		backingUp = true;
		backup.backup("stop").finally(()=>{
			backingUp = false;
			backup.prune();
		});
	});
};

start();

function backupLive(type){
	if (backingUp) return;

	backingUp = true;
	backupData = null;
	mc.stdin.write("save hold\r\n");

	return new Promise((resolve,reject)=>{
		var loop = setInterval(()=>{
			if (backupData) {
				clearInterval(loop);
				backup.backup(type,backupData)
					.then(resolve)
					.finally(()=>{
						backingUp = false;
						mc.stdin.write("save resume\r\n");
						backup.prune();
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
	backupLive("manual");
	res.sendStatus(200);
});

app.listen(config.port,()=>{console.log(`API started`)});

config.backups.forEach(ele => {
	switch (ele.trigger) {
		case "auto-5m":
			cron.schedule("*/5 * * * *",()=>{backupLive("auto-5m")});
			break;
		case "auto-10m":
			cron.schedule("*/10 * * * *",()=>{backupLive("auto-10m")});
			break;
		case "auto-15m":
			cron.schedule("*/15 * * * *",()=>{backupLive("auto-15m")});
			break;
		case "auto-20m":
			cron.schedule("*/20 * * * *",()=>{backupLive("auto-20m")});
			break;
		case "auto-30m":
			cron.schedule("*/30 * * * *",()=>{backupLive("auto-30m")});
			break;
		case "auto-1h":
			cron.schedule("0 * * * *",()=>{backupLive("auto-1h")});
			break;
		case "auto-2h":
			cron.schedule("0 */2 * * *",()=>{backupLive("auto-2h")});
			break;
		case "auto-3h":
			cron.schedule("0 */3 * * *",()=>{backupLive("auto-3h")});
			break;
		case "auto-4h":
			cron.schedule("0 */4 * * *",()=>{backupLive("auto-4h")});
			break;
		case "auto-6h":
			cron.schedule("0 */6 * * *",()=>{backupLive("auto-6h")});
			break;
		case "auto-8h":
			cron.schedule("0 */8 * * *",()=>{backupLive("auto-8h")});
			break;
		case "auto-12h":
			cron.schedule("0 */12 * * *",()=>{backupLive("auto-12h")});
			break;
		case "auto-day":
			cron.schedule("0 0 * * *",()=>{backupLive("auto-day")});
			break;
	}
})