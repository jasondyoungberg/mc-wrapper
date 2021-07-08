const fs = require("fs-extra");
const config = require("./config.json");

config.backups.map(ele => {
	if (!fs.existsSync(ele.path)) fs.mkdirSync(ele.path, {recursive:true});

	var max = 0;
	fs.readdirSync(ele.path).forEach(name => {
		var id = parseInt(name,10)
		if (id > max) {
			max = id;
		}
	});
	
	var newEle = ele;
	newEle.id = max + 1;
	return newEle;
});

module.exports = {
	backup:(type,data)=>{
		return new Promise((resolve,reject) => {
			var waiting = 0;
			config.backups.forEach(ele => {
				if (ele.trigger == type) {
					waiting++;
					var id = ele.id++;

					console.log(`backing up to: '${ele.path}${id}'`)

					fs.copy(`./mc/worlds/${config.levelName}`,ele.path + id, err => {
						if (data) {
							/*skip due to issues
							data.forEach(file=>{
								waiting ++;
								fs.truncate(ele.path + id + file.path, file.length, err=>{
									if(err) console.error(err);
									waiting --;
									if (waiting <= 0) resolve();
								});
							});*/
						}
						if (err) return console.error(err);
						waiting--;
						if (waiting <= 0) resolve();
					} )
				}
			});
		});
	},
	prune:()=>{
		config.backups.forEach(ele => {
			if (ele.max < 1) return;
			fs.readdir(ele.path,(err,files)=>{
				if (err) return console.error(err);
				if (ele.max >= files.length) return;

				var min = Infinity;
				files.forEach(filename=>{
					var val = parseInt(filename,10);
					if (val < min) min = val;
				});

				if (min == Infinity) return;

				console.log(`pruning ${ele.path}${min}`)
				fs.remove(ele.path+min,err=>{
					if (err) console.error(err);
				});
			});
		});
	},
	list:()=>{
		return new Promise((resolve,reject)=>{
			output = [];
			waiting = 0;

			config.backups.forEach((ele,i)=>{
				fs.readdir(ele.path,(err,files)=>{
					if (err) return console.error(err);

					files.forEach(file=>{
						waiting++;
						fs.stat(ele.path + file,(err,stats)=>{
							if (err) console.error(err);
							else output.push({
								time:stats.birthtimeMs,
								type:ele.trigger,
								id:`${i}|${file}`
							});
							waiting --;

							if (waiting == 0) resolve(output);
						})
					});
				});
			});
		});
	},
	restore:id=>{
		var id = id.split("|");
		var src = config.backups[id[0]].path + id[1];
		var dest = `./mc/worlds/${config.levelName}`;
		
		return new Promise((resolve,reject)=>{
			fs.access(src,err=>{
				if (err) console.trace(err);

				fs.emptyDir(dest,err=>{
					if (err) console.trace(err);

					fs.copy(src,dest,err=>{
						if (err) console.trace(err);

						resolve();
					});
				});
			});
		});
	}
}