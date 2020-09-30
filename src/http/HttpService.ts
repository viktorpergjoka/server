import * as core from "express-serve-static-core";
import * as expressPino from "express-pino-logger";
import Auth from "../auth/IAuthentication";
import Model from "../storage/mongo/model.mongo";
import * as express from "express";
import * as pino from "pino";

const logger = pino({level: process.env.LOG_LEVEL || 'info'});

namespace HttpService {
    import IAuthentication = Auth.IAuthentication;
    import RouterModel = Model.RouterModel;
    import ProducerModel = Model.ProducerModel;
    export const init = (app: core.Express, authentication: IAuthentication) => {
        app.use(expressPino());
        
        app.get('/beat', function (req, res) {
            res.send('Boom!');
        });

        app.post('/stages/create', function (req, res) {
            res.send('Hello World!');
        });

        // GET ALL AVAILABLE ROUTERS
        app.get('/routers', function (req, res) {
            return RouterModel.find().lean().exec()
                .then(routers => {
                    res.status(200).json(routers)
                });
        });

        app.post('/routers/create', express.json(), function (req, res) {
            console.log("routers/create");
            if (
                !req.body.ipv4
                || typeof req.body.ipv4 !== 'string'
                || !req.body.ipv6
                || typeof req.body.ipv6 !== 'string'
                || !req.body.port
                || typeof req.body.port !== 'string'
                || !req.body.url
                || typeof req.body.url !== 'string'
            ) {
                console.log(req.body);
                return res.sendStatus(400);
            }
            return authentication.authorizeRequest(req)
                .then(async () => {
                    let router = await RouterModel.findOne({url: req.body.url}).exec();
                    if (!router) {
                        logger.debug("[HTTP SERVICE] Creating new router " + req.body.url);
                        router = new RouterModel();
                        router.url = req.body.url;
                    } else {
                        logger.debug("[HTTP SERVICE] Updating existing router " + req.body.url);
                    }
                    router.ipv4 = req.body.ipv4;
                    router.ipv6 = req.body.ipv6;
                    router.port = req.body.port;
                    return router.save()
                        .then(router => res.status(200).json(router.toObject()));
                })
                .catch((error) => {
                    console.log(error);
                    return res.sendStatus(401);
                });
        });

        // GET SPECIFIC PUBLIC PRODUCER
        app.get('/producers/:id', function (req, res) {
            if (
                !req.params.id
                || typeof req.params.id !== 'string'
            ) {
                return res.sendStatus(400);
            }
            console.log(req.params);
            return authentication.authorizeRequest(req)
                .then(() => {
                    return ProducerModel.findOne({_id: req.params.id, stageMemberId: {$ne: null}}).lean().exec()
                        .then(producer => {
                            if (producer) {
                                return res.status(200).json(producer);
                            }
                            return res.sendStatus(404);
                        })
                })
                .catch((error) => {
                    console.log(error);
                    return res.sendStatus(401);
                });
        });
    }

}
export default HttpService;