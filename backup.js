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

console.log(config.backups);

module.exports = {
	backup:(type,data)=>{
		return new Promise((resolve,reject) => {
			var waiting = 0;
			config.backups.forEach(ele => {
				if (ele.trigger == type) {
					waiting++;
					var id = ele.id++;
					fs.copy(`./mc/worlds/${config.levelName}`,ele.path + id, err => {
						data.forEach(file=>{
							waiting ++;
							fs.truncate(ele.path + id + file.path, file.length, err=>{
								if(err) console.error(err);
								waiting --;
								if (waiting <= 0) resolve();
							});
						});
						if (err) return console.error(err);
						waiting--;
						if (waiting <= 0) resolve();
					} )
				}
			});
		});
	}
}