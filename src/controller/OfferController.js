const {Offers} = require('../model')
const {Users} = require('../model')
const IMAGE_WIDTH = 300
const config = require('../config')
const uuid = require('uuid')
const fs = require('fs')
const sharp = require('sharp');

module.exports = {
    list(req, res) {
        return Offers.findAll({
            include: [{
                model: Users,
                attributes: ['subRegion'],
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
        const secureFileName = req.params['uuid'].split('/').pop()
        const img = fs.readFileSync(config.getConfig().imageBasePath + '/thumb_' + secureFileName)
        res.writeHead(200, {'Content-Type': 'image/jpg'})
        res.end(img, 'binary')
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
        res.send(offer);
    },
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
    },
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
}

function base64_encode(file) {
    // read binary data
    let bitmap = fs.readFileSync(file);
    // convert binary data to base64 encoded string
    return new Buffer(bitmap).toString('base64');
}
