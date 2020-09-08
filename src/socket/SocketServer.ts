import * as socketIO from "socket.io";
import Auth from "../auth/IAuthentication";
import {authentication} from "../auth/Authentication";
import Server from "../model.server";
import {storage} from "../storage/Storage";
import SocketDeviceEvent from "./SocketDeviceEvent";
import SocketStageEvent from "./SocketStageEvent";
import * as pino from "pino";
import * as https from "https";
import * as http from "http";

const logger = pino({level: process.env.LOG_LEVEL || 'info'});
const DEBUG_PAYLOAD: boolean = true;


namespace SocketServer {
    let io: socketIO.Server;

    export const sendToDevice = (socket: socketIO.Socket, event: string, payload?: any) => {
        if (DEBUG_PAYLOAD) {
            logger.debug("SEND TO DEVICE '" + socket.id + "' " + event + ": " + JSON.stringify(payload));
        } else {
            logger.debug("SEND TO DEVICE '" + socket.id + "' " + event);
        }
        socket.emit(event, payload);
    }

    export const sendToUser = (_id: string, event: string, payload?: any) => {
        if (DEBUG_PAYLOAD) {
            logger.debug("SEND TO USER '" + _id + "' " + event + ": " + JSON.stringify(payload));
        } else {
            logger.debug("SEND TO USER '" + _id + "' " + event);
        }
        io.to(_id).emit(event, payload);
    };

    export const init = (server: https.Server | http.Server) => {
        io = socketIO(server);
        logger.info("[SOCKETSERVER] Initializing socket server...");
        io.on("connection", (socket: socketIO.Socket) => {
            logger.debug("Incoming socket request " + socket.id);
            authentication.authorizeSocket(socket)
                .then(async (authUser: Auth.User) => {
                    /**
                     * USER MANAGEMENT
                     */
                    let user: Server.User = await storage.getUserByUid(authUser.id);
                    if (!user) {
                        user = await storage.createUser(authUser.id, authUser.name, authUser.avatarUrl);
                    }

                    /**
                     * DEVICE MANAGEMENT
                     */
                    SocketDeviceEvent.loadDeviceEvents(user._id, socket);

                    /**
                     * STAGE MANAGEMENT
                     */
                    SocketStageEvent.loadStageEvents(user, socket);

                    return Promise.all([
                        SocketDeviceEvent.generateDevice(user._id, socket),
                        SocketStageEvent.generateStage(user, socket)
                    ])
                        .then(() => {
                            // Finally join user stream
                            return socket.join(user._id, err => {
                                if (err)
                                    logger.error("Could not join room: " + err);
                                logger.debug("Joined room: " + user._id);
                                logger.debug("Ready");
                            });
                        })
                        .catch((error) => {
                            socket.error(error.message);
                            logger.error("Internal error");
                            logger.error(error);
                            socket.disconnect();
                        })
                })
                .catch((error) => {
                    socket.error("Invalid authorization");
                    logger.error("INVALID CONNECTION ATTEMPT");
                    logger.error(error);
                    socket.disconnect();
                })
        });
        logger.info("[SOCKETSERVER] DONE initializing socket server.");
    }
}
export default SocketServer;