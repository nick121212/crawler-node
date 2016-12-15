import Eureca from "eureca.io";
import { EventEmitter } from "events";

export class Context extends EventEmitter {
    constructor(config) {
        super();
        this.init(config);
    }

    init(config) {
        this.eurecaServer = new Eureca.Server({
            allow: config.allow || [],
            transport: config.transport || ""
        });
        this.sockets = {};
        this.eurecaServer.on("connect", (socket) => {
            this.sockets[socket.id] = socket;
        });
        this.eurecaServer.on("disconnect", (socket) => {
            delete this.sockets[socket.id];
        });
        // this.eurecaServer.on("error", (message, socket) => {
        //     let client = this.eurecaServer.getClient(socket.id);

        //     client.disconnect();

        //     this.emit("contextError", new Error(message));
        // });
    }
}