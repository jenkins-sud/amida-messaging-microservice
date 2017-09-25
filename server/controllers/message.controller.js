import httpStatus from 'http-status';
import db from '../../config/sequelize';

const Message = db.Message;

/**
 * Load message and append to req.
 */
function load(req, res, next, id) {
    Message.findById(id)
    .then((message) => {
        if (!message) {
            const e = new Error('Message does not exist');
            e.status = httpStatus.NOT_FOUND;
            return next(e);
        }
        req.message = message; // eslint-disable-line no-param-reassign
        return next();
    })
    .catch(e => next(e));
}

/**
 * Get message
 * @returns {Message}
 */
function get(req, res) {
    return res.json(req.message);
}

/**
 * Send new message
 * @property {Array} req.body.to - Array of user IDs to send the message to.
 * @property {string} req.body.from - The user ID of the sender
 * @property {string} req.body.subject - Subject line of the message
 * @property {string} req.body.message - Body of the message
 * @returns {Message}
 */
function send(req, res, next) {
    // Each iteration saves the recipient's name from the to[] array as the owner to the db.
    const createdTime = new Date();
    const messageArray = [];

    // Saves separate instance where each recipient is the owner
    for (let i = 0; i < req.body.to.length; i += 1) {
        messageArray.push({
            to: req.body.to,
            from: req.body.from,
            subject: req.body.subject,
            message: req.body.message,
            owner: req.body.to[i],
            createdAt: createdTime,
        });
    }

    const bulkCreate = Message.bulkCreate(messageArray);

    // Saves an instance where the sender is owner and readAt=current time
    const messageCreate = Message.create({
        to: req.body.to,
        from: req.body.from,
        subject: req.body.subject,
        message: req.body.message,
        owner: req.body.from,
        createdAt: createdTime,
        readAt: createdTime,
    });

    // once the bulkCreate and create promises resolve, send the sender's saved message or an error
    Promise
        .join(bulkCreate, messageCreate, (bulkResult, messageResult) => res.json(messageResult))
        .catch(e => next(e));
}

function list() {}

function count() {}

function remove() {}

export default { send, get, list, count, remove, load };
