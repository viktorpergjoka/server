import {Device, DeviceId, GroupId, Producer, ProducerId, RouterId, StageId, User, UserId} from "../model.common";
import * as socketIO from "socket.io";
import Server from "../../src/model.server";
import {DeviceType} from "../storage/mongoose/mongo.types";

interface IEventReactor {

    addStage(userId: UserId, initialStage: Partial<Server.Stage>): Promise<any>;

    changeStage(userId: UserId, id: StageId, stage: Partial<Server.Stage>): Promise<any>;

    leaveStage(userId: UserId): Promise<any>;

    joinStage(userId: UserId, stageId: StageId, groupId: GroupId, password?: string): Promise<any>;

    removeStage(userId: UserId, id: StageId): Promise<any>;

    addGroup(user: User, stageId: StageId, name: string): Promise<any>;

    changeGroup(user: User, groupId: GroupId, group: Partial<Server.Group>): Promise<any>;

    removeGroup(user: User, groupId: GroupId): Promise<any>;

    addProducer(device: Device, kind: "audio" | "video" | "ov", routerId?: RouterId, routerProducerId?: string): Promise<Producer>;

    changeProducer(deviceId: DeviceId, producerId: ProducerId, update: Partial<Producer>): Promise<Producer>;

    removeProducer(deviceId: DeviceId, producerId: ProducerId): Promise<Producer>;

    getUserIdsByStageId(stageId: StageId): Promise<UserId[]>;

    getUserIdsByStage(stage: Server.Stage): Promise<UserId[]>;

    sendInitialToDevice(socket: socketIO.Socket, user: User): Promise<any>;
}

export default IEventReactor;