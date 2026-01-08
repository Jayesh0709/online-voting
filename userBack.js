const mongoose = require('./db');


const userSchema = new mongoose.Schema({
    aadhaar:String,
    name:String,
    password:String,
    isVoted:{type:Boolean,default:false},
})

module.exports = mongoose.model('users',userSchema);
