const {Users} = require('../model')
const jwt = require('jsonwebtoken')
const config = require('../config')
const crypto = require('crypto')
const sprintf = require('sprintf-js').sprintf
const EmailClient = require('../EmailClient')

const resetPasswordEn = {
    from: 'horizonsgaspesiens@gmail.com',
    subject: 'Change your password',
    content: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.<br><br>' +
        'Please click on the following link, or paste this into your browser to continue the process:<br><br>' +
        '<a href="%s/change-password/%s" target="_blank">%s/change-password/%s</a><br><br>' +
        'If you did not request this, please ignore this email and your password will remain unchanged.<br><br>'
}

const resetPasswordFr = {
    from: 'horizonsgaspesiens@gmail.com',
    subject: 'Modifier votre mot de passe',
    content: 'Vous reçevez ce courriel, parce que vous (ou quelqu\'un d\'autre) a demandé la réinitialisation du mot de passe de votre compte.<br><br>' +
        'Cliquez sur le lien suivant, ou coller le dans votre navigateur pour poursuivre le processus:<br><br>' +
        '<a href="%s/change-password/%s" target="_blank">%s/change-password/%s</a><br><br>' +
        'Si vous n\'avez pas fait cette demande, ignorez ce courriel et votre mot de passe demeurera inchangé.<br>'
}
const TWO_WEEKS = 1209600000;

function jwtSignUser(user) {
    return jwt.sign(user, config.getConfig().authentication.jwtSecret, {})
}

const AuthenticationController = {
        async login(req, res) {
            const {email, password} = req.body
            if (password === undefined || password === null || password.trim() === '') {
                return res.status(403)
            }
            let user = await Users.findOne({
                where: {
                    email: email.trim()
                }
            });
            if (user === undefined || user === null) {
                return res.send(403, {
                    error: 'Login information is incorrect'
                })
            }
            if (user.status === "disabled") {
                return res.send(403, {
                    error: 'disabled'
                });
            }
            const isPasswordValid = await user.comparePassword(password);
            if (!isPasswordValid) {
                return res.send(403, {
                    error: 'Login information is incorrect'
                })
            }
            res.send({
                user: {
                    id: user.id,
                    uuid: user.uuid,
                    firstname: user.firstname,
                    lastname: user.lastname,
                    email: user.email,
                    status: user.status,
                    region: user.region,
                    subRegion: user.subRegion
                },
                token: jwtSignUser(user.toJSON())
            })
        },
        async facebookLogin(req, res) {
            console.log("facebook response " + JSON.stringify(req.body));
            const {email} = req.body;
            console.log("facebook email " + email);
            const user = await Users.findOne({
                attributes: Users.getSafeAttributes(),
                where: {
                    email: email
                }
            });
            if (user) {
                res.send({
                    success: true
                });
            } else {
                res.send({
                    success: false
                });
            }
        },
        async resetPassword(req, res) {
            const {email, locale} = req.body
            const token = await AuthenticationController._resetPassword(email);
            if (!token) {
                return res.sendStatus(400);
            }
            const emailText = locale === 'fr' ? resetPasswordFr : resetPasswordEn
            const emailContent = {
                from: EmailClient.buildFrom(emailText.from),
                to: email,
                subject: emailText.subject,
                html: sprintf(
                    emailText.content,
                    config.getConfig().baseUrl,
                    token,
                    config.getConfig().baseUrl,
                    token
                )
            }
            EmailClient.addEmailNumber(emailContent, locale, '7401e739')
            await EmailClient.send(emailContent).then(() => {
                res.sendStatus(200);
            }).catch((error) => {
                console.log(JSON.stringify(error));
                res.sendStatus(500);
            });
        }
        ,
        _resetPassword: async function (email) {
            const token = crypto.randomBytes(32).toString('hex')
            const user = await Users.findOne({
                where: {
                    email: email
                }
            });
            if (!user) {
                return;
            }
            user.resetPasswordToken = token;
            user.resetPasswordExpires = Date.now() + TWO_WEEKS;
            await user.save();
            return token;
        }
        ,
        isTokenValid: function (req, res) {
            Users.findOne({
                where: {
                    resetPasswordToken: req.body.token,
                    resetPasswordExpires: {$gt: Date.now()}
                }
            }).then(function (user) {
                return res.sendStatus(
                    user ? 200 : 403
                )
            }).catch(function (err) {
                console.log(err)
                res.status(500).send({
                    error: 'error'
                })
            })
        }
        ,
        changePassword: function (req, res) {
            const {token, newPassword} = req.body
            if (!token) {
                return res.sendStatus(
                    403
                )
            }
            Users.findOne({
                where: {
                    resetPasswordToken: token,
                    resetPasswordExpires: {$gt: Date.now()}
                }
            }).then(function (user) {
                if (!user) {
                    return res.sendStatus(
                        403
                    )
                }
                user.password = newPassword
                user.resetPasswordToken = null
                user.resetPasswordExpires = null
                return user.save();
            }).then(function () {
                return res.sendStatus(
                    200
                )
            }).catch(function (err) {
                console.log(err)
                res.status(500).send({
                    error: 'error'
                })
            })
        }
        ,
        emailExists: function (req, res) {
            const {email} = req.body
            if (!email) {
                return res.sendStatus(
                    403
                )
            }
            Users.findOne({
                where: {
                    email: email
                },
                attributes: ['email', 'uuid', 'locale', 'firstName', 'lastName']
            }).then(function (user) {
                if (!user) {
                    return res.sendStatus(
                        204
                    )
                }
                res.send(
                    user
                )
            }).catch(function (err) {
                console.log(err)
                res.status(500).send({
                    error: 'error'
                })
            })
        }
    }
;
module.exports = AuthenticationController;
