const {Offers} = require('../model')
const {Users} = require('../model')
const THUMB_IMAGE_WIDTH = 300
const IMAGE_WIDTH = 800
const config = require('../config')
const uuid = require('uuid')
const fs = require('fs')
const sharp = require('sharp');
const axios = require('axios');
const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const OfferController = {
    list(req, res) {
        return Offers.findAll({
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
            ]
        }).then((offers) => {
            res.send(offers);
        })
    },
    async listForUser(req, res) {
        const userId = parseInt(req.params.userId);
        if (req.user.id !== userId) {
            return res.sendStatus(401);
        }
        const offers = await Offers.findAll({
            where: {
                UserId: userId
            },
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
        OfferController._sendOfferToFacebook(
            offer
        );
        res.send(offer);
    }
    ,
    async updateOffer(req, res) {
        let offer = req.body;
        offer = await Offers.update({
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
    }
    // updateProduct(req, res) {
    //     const product = req.body
    //     if (!product.nbInStock || product.nbInStock === '') {
    //         product.nbInStock = 0
    //     }
    //     return Products.update({
    //         name: product.name,
    //         image: product.image,
    //         format: product.format,
    //         description: product.description,
    //         unitPrice: product.unitPrice,
    //         nbInStock: product.nbInStock,
    //         isAvailable: product.isAvailable
    //     }, {
    //         where: {
    //             id: product.id
    //         }
    //     }).then(function (product) {
    //         res.send(product)
    //     })
    // }
};
module.exports = OfferController;

function base64_encode(file) {
    // read binary data
    let bitmap = fs.readFileSync(file);
    // convert binary data to base64 encoded string
    return new Buffer(bitmap).toString('base64');
}
