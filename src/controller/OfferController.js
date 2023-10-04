const {Offers} = require('../model')
const {Users} = require('../model')
const THUMB_IMAGE_WIDTH = 300
const IMAGE_WIDTH = 800
const config = require('../config')
const RegionLabel = require('../RegionLabel')
const uuid = require('uuid')
const fs = require('fs')
const sharp = require('sharp');
const axios = require('axios');
const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const elasticsearch = require("@elastic/elasticsearch")
const elasticSearchConfig = config.getConfig().elasticSearch;
const elasticSearch = new elasticsearch.Client({
    node: elasticSearchConfig.host,
    auth: {
        username: elasticSearchConfig.username,
        password: elasticSearchConfig.password
    },
    tls: {
        rejectUnauthorized: false
    }
})
const OfferController = {
    async list(req, res) {
        const offset = parseInt(req.params.offset);
        const offers = await Offers.findAll({
            include: [{
                model: Users,
                attributes: ['subRegion'],
                where: {
                    status: {
                        [Op.ne]: 'disabled'
                    }
                }
            }],
            where: {
                isAvailable: true
            },
            order: [
                ['createdAt', 'DESC']
            ],
            offset: offset,
            limit: 9
        })
        res.send(offers);
    },
    async listForUser(req, res) {
        const userUuid = req.params['userUuid'];
        if (req.user.uuid !== userUuid) {
            return res.sendStatus(401);
        }
        await OfferController.listFilterAvailableOrNotForUser(false, req, res);
    },
    async listAvailableForUser(req, res) {
        await OfferController.listFilterAvailableOrNotForUser(true, req, res);
    },
    async listFilterAvailableOrNotForUser(isFilterAvailable, req, res) {
        const userUuid = req.params['userUuid'];
        const User = await Users.findOne({
            attributes: ['id'],
            where: {
                uuid: userUuid
            }
        });
        const whereClause = {
            UserId: User.id
        };
        if (isFilterAvailable) {
            whereClause.isAvailable = true;
        }
        const offers = await Offers.findAll({
            where: whereClause,
            order: [
                ['createdAt', 'DESC']
            ]
        });
        res.send(offers);
    },
    uploadImage(req, res) {
        if (!req.files || !req.files.images) {
            return res.status(400).send('No files were uploaded.')
        }

        let uploadedFile = req.files.images
        const imageInfo = {
            originalName: uploadedFile.name,
            fileName: uuid(),
            mimetype: uploadedFile.mimetype
        }
        const imageBasePath = config.getConfig().imageBasePath;
        const fullSizeImagePath = imageBasePath + '/fullsize_' + imageInfo.fileName
        uploadedFile.mv(fullSizeImagePath, function (err) {
            if (err) {
                return res.status(500).send(err)
            }
            sharp(fullSizeImagePath)
                .resize(IMAGE_WIDTH)
                .toFile(imageBasePath + '/medium_' + imageInfo.fileName, (err, info) => {
                    if (err) throw err
                });
            sharp(fullSizeImagePath)
                .resize(THUMB_IMAGE_WIDTH)
                .toFile(imageBasePath + '/thumb_' + imageInfo.fileName, (err, info) => {
                    if (err) throw err
                    imageInfo.base64 = base64_encode(imageBasePath + '/thumb_' + imageInfo.fileName)
                    res.send(imageInfo)
                });
            // imageMagick.resize({
            //     srcPath: fullSizeImagePath,
            //     dstPath: imageBasePath + '/thumb_' + imageInfo.fileName,
            //     width: IMAGE_WIDTH
            // }, function (err, stdout, stderr) {
            //     if (err) throw err
            //     console.log('resized image to fit within 200x200px')
            // })
        })
    },
    getImage(req, res) {
        OfferController._sendImageByUuid(
            req.params['uuid'].split('/').pop(),
            res
        );
    },
    getMediumImage(req, res) {
        OfferController._sendImageByUuid(
            req.params['uuid'].split('/').pop(),
            res,
            'medium'
        );
    },
    _sendImageByUuid(uuid, res, size) {
        size = size || 'thumb';
        const img = fs.readFileSync(config.getConfig().imageBasePath + '/' + size + '_' + uuid)
        res.writeHead(200, {'Content-Type': 'image/jpg'})
        res.end(img, 'binary')
    },
    async getImageByOfferId(req, res) {
        const offerId = req.params['offerId'];
        const offer = await Offers.findOne({
            attributes: ['customImage', 'image'],
            where: {
                id: offerId
            }
        });
        res.send(offer);
    },
    // getDetails(req, res) {
    //     const productId = parseInt(req.params['productId'])
    //     return Products.findOne({
    //         where: {
    //             id: productId
    //         }
    //     }).then(function (product) {
    //         res.send(product)
    //     })
    // },
    async createOffer(req, res) {
        let offer = req.body
        offer = await Offers.create({
            title_fr: offer.description,
            image: offer.image ? offer.image.name : null,
            customImage: offer.customImage,
            UserId: offer.UserId,
            isAvailable: offer.isAvailable,
            experience_fr: offer.experience,
            additionalFees_fr: offer.additionalFees
        });
        OfferController._indexOffer(offer);
        // OfferController._sendOfferToFacebook(
        //     offer
        // );
        res.send(offer);
    },
    async search(req, res) {
        const searchText = req.body.searchText;
        const offers = await elasticSearch.search({
            index: "offers",
            query: {
                multi_match: {
                    query: searchText,
                    fields: ["title_fr", "firstname", "lastname", "subRegion"]
                }
            }
        })
        res.send(offers);
    },
    async indexAllOffers(req, res) {
        const indexExists = await elasticSearch.indices.exists({
            index: 'offers'
        })
        if (indexExists === true) {
            await elasticSearch.indices.delete({
                index: 'offers',
            })
        }
        const offers = await Offers.findAll();
        let indexCreated = false;
        for (const offer of offers) {
            await OfferController._indexOffer(offer)
            if(!indexCreated){
                await elasticSearch.indices.putMapping({
                    index: 'offers',
                    body: {
                        properties: {
                            customImage: {
                                type: 'object',
                                index: false
                            }
                        }
                    }
                })
            }
            indexCreated = true;
        }
        res.sendStatus(200);
    },
    async updateOffer(req, res) {
        let offer = req.body;
        await Offers.update({
            title_fr: offer.description,
            image: offer.image ? offer.image.name : null,
            customImage: offer.customImage,
            isAvailable: offer.isAvailable,
            experience_fr: offer.experience,
            additionalFees_fr: offer.additionalFees
        }, {
            where: {
                id: offer.id,
                UserId: req.user.id
            }
        });
        offer = await Offers.findById(offer.id);
        OfferController._indexOffer(offer);
        res.send(offer);
    }
    ,
    async removeOffer(req, res) {
        const offerId = parseInt(req.params.offerId);
        await Offers.destroy({
            where: {
                id: offerId,
                UserId: req.user.id
            },
            limit: 1
        });
        res.sendStatus(200);
    }
    ,
    async get(req, res) {
        const offerId = req.params['offerId']
        const offer = await Offers.findOne({
            where: {
                id: offerId
            },
            include: [{
                model: Users,
                attributes: Users.getSafeAttributes()
            }]
        });
        res.send(offer);
    }
    ,
    async _sendOfferToFacebook(offer) {
        // console.log(config.getConfig().appId);
        // console.log(config.getConfig().fb);
        // const accessResponse = await axios({
        //     method: "get",
        //     url: "https://graph.facebook.com/oauth/access_token" +
        //         "?client_id=" + config.getConfig().appId +
        //         "&client_secret=" + config.getConfig().fb +
        //         "&grant_type=client_credentials"
        // });
        // console.log(accessResponse.data);
        // console.log(accessResponse.data.access_token);
        // const token = accessResponse.data.access_token;
        console.log(config.getConfig().fbAccessToken);
        console.log("url " + "https://graph.facebook.com/" + config.getConfig().fbGroupId + "/feed")
        await axios({
            method: "post",
            url: "https://graph.facebook.com/" + config.getConfig().fbGroupId + "/feed",
            data: {
                access_token: config.getConfig().fbAccessToken,
                message: offer.title_fr,
            }
        });
    },
    async _indexOffer(offer) {
        if (!offer.isAvailable) {
            return elasticSearch.delete({
                index: 'offers',
                id: offer.id,
            })
        }
        const owner = await Users.findOne({
            attributes: ['firstname', 'lastname', 'subRegion'],
            where: {
                id: offer.UserId
            }
        });
        console.log("start indexing " + offer.title_fr)
        await elasticSearch.index({
            index: 'offers',
            id: offer.id,
            refresh: true,
            document: {
                id: offer.id,
                title_fr: offer.title_fr,
                firstname: owner.firstname,
                lastname: owner.lastname,
                image: offer.image,
                customImage: offer.customImage,
                subRegion: RegionLabel.getForRegion(owner.subRegion),
                UserId: owner.id,
                User: {
                    subRegion: owner.subRegion
                }
            }
        })
        console.log("done indexing " + offer.title_fr)
    }
};
module.exports = OfferController;

function base64_encode(file) {
    // read binary data
    let bitmap = fs.readFileSync(file);
    // convert binary data to base64 encoded string
    return new Buffer(bitmap).toString('base64');
}
