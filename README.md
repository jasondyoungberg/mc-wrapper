# **mc-wrapper**

## **API**
### **`status`**
Tells you the status of the mc server
#### **response**
```
{
	running:<bool>, // if the mc server is currently running
	backingUp:<bool> // if a backup is in progress
}
```

### **`start`**
Starts the mc server

### **`stop`**
Stops the mc server

### **`quit`**
Closes the server

### **`read`**
Reads from output
#### **args**
`lines = <int>` : how many lines to read from the output (optional)
`from = <int>` : read all lines with ids greater than (optional)

#### **response**
```
[
	{
		type: "stdout"|"stderr" // where this message is from
		id: <int>, // id of this message
		raw: <string>, // the raw content of the message
		meta: <string>, // the metadata of the message, if any
		content: <string> // the content of the message
	},
	{
		type: "close",
		id: <int>,
		code: <int> // exit code
	}
]
```

### **`run`**
Runs command in mc server
#### **args**
`cmd = <string>` : command to run

### **`/backup`**

### **TODO**
 - **`backup_list`**
 - **`restore?id=<string>`**
 - **`update`**
 - **`update?v=<string>`**

## **config file**
### **backups**

`manual`: on get request to `/backup`  
`stop`: when server stops gracefully  
`crash`: when server crashes  
`auto-x`: ran automatically every so often  
(day, 12h, 8h, 4h, 3h, 2h, 1h, 30m, 20m, 15m, 10m, 5m)