const {Organisations} = require('../model')
const THUMB_IMAGE_WIDTH = 300
const IMAGE_WIDTH = 800
const config = require('../config')
const uuid = require('uuid')
const sharp = require('sharp');
const fs = require('fs')

const OrganisationController = {
    async list(req, res) {
        const organisations = await Organisations.findAll({
            order: [
                ['createdAt', 'DESC']
            ]
        });
        res.send(organisations);
    },
    async get(req, res) {
        const organisationId = req.params['organisationId']
        if (req.user.status !== 'admin') {
            return res.send(401);
        }
        const organisation = await Organisations.findOne({
            where: {
                id: organisationId
            }
        });
        res.send(organisation);
    },
    async createOrganisation(req, res) {
        let organisation = req.body
        organisation = await Organisations.create({
            name: organisation.name,
            url: organisation.url,
            customImage: organisation.customImage
        });
        res.send(organisation);
    },
    async updateOrganisation(req, res) {
        let organisation = req.body;
        organisation = await Organisations.update({
            name: organisation.name,
            url: organisation.url,
            customImage: organisation.customImage
        }, {
            where: {
                id: organisation.id
            }
        });
        res.send(organisation);
    },
    uploadImage(req, res) {
        // console.log(Object.entries(req.files.file));
        if (!req.files) {
            return res.status(400).send('No files were uploaded.')
        }

        let uploadedFile = req.files.file;
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
}

function base64_encode(file) {
    // read binary data
    let bitmap = fs.readFileSync(file);
    // convert binary data to base64 encoded string
    return new Buffer(bitmap).toString('base64');
}

module.exports = OrganisationController;
