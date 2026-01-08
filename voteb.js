const mongoose = require('./db');

const voteSchema = new mongoose.Schema({
    partyA:{type:Number,default:0},
    partyB:{type:Number,default:0},
    partyC:{type:Number,default:0},
})
module.exports = mongoose.model('VoteCount',voteSchema);
